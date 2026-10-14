"use client";
import { useEffect, useState } from "react";
type InstallEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export function usePwa() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    const media = window.matchMedia("(display-mode: standalone)");
    const updateInstalled = () =>
      setStandalone(
        media.matches ||
          !!(navigator as Navigator & { standalone?: boolean }).standalone,
      );
    const capture = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallEvent);
    };
    update();
    updateInstalled();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", updateInstalled);
    media.addEventListener("change", updateInstalled);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production")
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* Browser may disable storage in private mode. */
      });
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", updateInstalled);
      media.removeEventListener("change", updateInstalled);
    };
  }, []);
  async function install() {
    if (!prompt) return false;
    await prompt.prompt();
    const result = await prompt.userChoice;
    setPrompt(null);
    if (result.outcome === "accepted") setStandalone(true);
    return true;
  }
  return { standalone, offline, install };
}
