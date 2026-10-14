import { test, expect, type Page } from "@playwright/test";

// Controlled player clock and synthetic text exercise app behavior without streaming music or spending API credits.
async function fixture(
  page: Page,
  options: {
    plain?: boolean;
    translationFails?: boolean;
    ambiguous?: boolean;
    noLyrics?: boolean;
    videoError?: boolean;
  } = {},
) {
  await page.route("https://i.ytimg.com/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#302c47"/><circle cx="100" cy="100" r="58" fill="#49445f"/><circle cx="100" cy="100" r="13" fill="#c9a7ff"/></svg>',
    }),
  );
  await page.route("https://www.youtube.com/iframe_api", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `window.YT={Player:class {constructor(el,opts){this.t=0;this.s=2;this.opts=opts;window.testPlayer=this;const frame=document.createElement('iframe');frame.title='YouTube video player';el.replaceWith(frame);setTimeout(()=>{opts.events.onReady({target:this});${options.videoError ? "opts.events.onError({target:this,data:150});" : ""}},20);} getCurrentTime(){return this.t;} getDuration(){return 180;} getPlayerState(){return this.s;} playVideo(){this.set(this.t,1);} pauseVideo(){this.set(this.t,2);} getVolume(){return this.v??100;} setVolume(v){this.v=v;} isMuted(){return !!this.m;} mute(){this.m=true;} unMute(){this.m=false;} seekTo(t){this.t=t;} destroy(){} set(t,s=2){this.t=t;this.s=s;this.opts.events.onStateChange({target:this,data:s});}}};window.onYouTubeIframeAPIReady?.();`,
    }),
  );
  await page.route("**/api/track/identify", (route) =>
    route.fulfill({
      json: {
        videoId: "AbCdEf123_-",
        youtubeUrl: "https://youtu.be/AbCdEf123_-",
        videoTitle: "Test Artist - Quiet morning",
        trackTitle: "Quiet morning",
        artist: "Test Artist",
        metadataSource: "oembed",
      },
    }),
  );
  await page.route("**/api/lyrics/search?**", (route) => {
    const params = new URL(route.request().url()).searchParams;
    expect(params.get("title")).toBe("Quiet morning");
    expect(params.get("artist")).toBe("Test Artist");
    return route.fulfill({
      json: {
        selectedId: options.ambiguous || options.noLyrics ? null : 1,
        candidates: options.noLyrics
          ? []
          : [
              {
                id: 1,
                trackName: "Quiet morning",
                artistName: "Test Artist",
                albumName: "Test record",
                duration: 180,
                synced: !options.plain,
                hasLyrics: true,
                instrumental: false,
                score: 0.97,
              },
            ],
      },
    });
  });
  await page.route("**/api/lyrics/1", (route) =>
    route.fulfill({
      json: {
        record: {
          id: 1,
          trackName: "Quiet morning",
          artistName: "Test Artist",
          instrumental: false,
        },
        lyricMode: options.plain ? "plain" : "synced",
        lines: Array.from({ length: 14 }, (_, i) => ({
          id: `l${i}`,
          startMs: options.plain ? null : i * 10000 + 1000,
          originalText: `Palabras del momento ${i + 1}`,
        })),
      },
    }),
  );
  await page.route("**/api/translate", (route) => {
    if (options.translationFails)
      return route.fulfill({
        status: 503,
        json: {
          code: "TRANSLATION_FAILED",
          message: "Translation is unavailable. Original lyrics are ready.",
        },
      });
    const body = route.request().postDataJSON();
    return route.fulfill({
      json: {
        sourceLanguage: "es",
        targetLanguage: "en",
        translationVersion: "v1",
        lines: body.lines.map((l: { id: string }, i: number) => ({
          id: l.id,
          englishText: `Words for this moment ${i + 1}`,
        })),
      },
    });
  });
}
async function open(page: Page) {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "YouTube song link" })
    .fill("https://youtu.be/AbCdEf123_-");
  await page.getByRole("button", { name: "Open song" }).click();
}
async function clock(page: Page, time: number, state = 2) {
  await page.evaluate(
    ({ time, state }) => {
      (
        window as unknown as { testPlayer: { set(t: number, s: number): void } }
      ).testPlayer.set(time, state);
    },
    { time, state },
  );
}
test("empty home, invalid links, settings and install guidance", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Feel the music. Understand every word.",
    }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "YouTube song link" })
    .fill("https://evil.test/watch?v=AbCdEf123_-");
  await page.getByRole("button", { name: "Open song" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "doesn’t look like" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Make yourself at home." }).click();
  await expect(page.getByRole("dialog")).toContainText("Add to Home Screen");
});
test("real timing calculations, pause, seek, offsets, view modes, follow and cache", async ({
  page,
}) => {
  await fixture(page);
  await open(page);
  await expect(page.getByText("Translated with context")).toBeVisible();
  await expect(page.locator(".track-card h1")).toHaveText("Quiet morning");
  await expect(page.locator(".track-card .artist")).toHaveText("Test Artist");
  await clock(page, 11, 1);
  await expect(page.locator("[aria-current=true]")).toContainText(
    "Words for this moment 2",
  );
  await clock(page, 11, 2);
  await page.waitForTimeout(600);
  await expect(page.locator("[aria-current=true]")).toContainText(
    "Words for this moment 2",
  );
  // Paused native scrubbing can change the clock without emitting a state event.
  await page.evaluate(() => {
    (window as unknown as { testPlayer: { t: number } }).testPlayer.t = 21;
  });
  await expect(page.locator("[aria-current=true]")).toContainText(
    "Words for this moment 3",
    { timeout: 400 },
  );
  await clock(page, 11, 2);
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.locator(".lyric-original")).toHaveCount(0);
  await page.getByRole("button", { name: "Original", exact: true }).click();
  await expect(page.locator("[aria-current=true]")).toContainText(
    "Palabras del momento 2",
  );
  await page.getByRole("button", { name: "Both", exact: true }).click();
  await page.getByRole("button", { name: "Sync", exact: true }).click();
  const plus = page
    .getByRole("button", { name: "Lyrics 0.5 seconds later" })
    .filter({ visible: true });
  for (let i = 0; i < 24; i++) await plus.click();
  await expect(
    page.getByLabel("Sync offset").filter({ visible: true }),
  ).toHaveText("+12.0 s");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await clock(page, 13);
  await expect(page.locator("[aria-current=true]")).toContainText(
    "Words for this moment 1",
  );
  await page.getByRole("button", { name: "All lyrics", exact: true }).click();
  await page.locator(".lyric-line").nth(1).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { testPlayer: { t: number } }).testPlayer.t,
      ),
    )
    .toBe(23);
  await page.locator(".lyrics-scroll").hover();
  await page.mouse.wheel(0, 150);
  await expect(
    page.getByRole("button", { name: "Follow", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Follow", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Follow", exact: true }),
  ).toHaveCount(0);
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "Back to home" }).click();
  await expect(
    page.getByRole("button", { name: /Quiet morning.*Test Artist/ }),
  ).toBeVisible();
  let translations = 0;
  page.on("request", (req) => {
    if (req.url().endsWith("/api/translate")) translations++;
  });
  await page
    .getByRole("button", { name: /Quiet morning.*Test Artist/ })
    .click();
  await expect(page.getByText("Translated with context")).toBeVisible();
  expect(translations).toBe(0);
});

test("thumbnail mode controls the YouTube player and fits a phone screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page);
  await open(page);
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".song-thumbnail")).toBeVisible();
  await expect(page.locator(".video-viewport")).toBeHidden();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  const volume = page.getByRole("slider", { name: "Volume", exact: true });
  await volume.focus();
  await volume.press("Home");
  await volume.press("ArrowRight");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { testPlayer: { v: number } }).testPlayer.v,
      ),
    )
    .toBe(1);
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Unmute", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { testPlayer: { m: boolean } }).testPlayer.m,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Unmute", exact: true }).click();
  const progress = page.getByRole("slider", { name: "Playback position" });
  await progress.focus();
  await progress.press("End");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { testPlayer: { t: number } }).testPlayer.t,
      ),
    )
    .toBe(180);
  await page.getByRole("button", { name: "Rewind 10 seconds" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { testPlayer: { t: number } }).testPlayer.t,
      ),
    )
    .toBe(170);
  await page.getByRole("button", { name: "Forward 10 seconds" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { testPlayer: { t: number } }).testPlayer.t,
      ),
    )
    .toBe(180);
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeInViewport();
  await expect(volume).toBeInViewport();
  await expect(page.locator(".track-card")).toBeInViewport();
  await page.getByRole("button", { name: "Show video", exact: true }).click();
  await expect(page.locator(".video-viewport")).toBeVisible();
  await page.getByRole("button", { name: "Hide video", exact: true }).click();
  await expect(page.locator(".video-viewport")).toBeHidden();
});

test("blocked scripted playback reveals the video for a native Play tap", async ({
  page,
}) => {
  await fixture(page);
  await open(page);
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeEnabled();
  await page.evaluate(() =>
    (
      window as unknown as {
        testPlayer: { opts: { events: { onAutoplayBlocked(): void } } };
      }
    ).testPlayer.opts.events.onAutoplayBlocked(),
  );
  await expect(page.locator(".video-viewport")).toBeVisible();
  await expect(
    page.getByText("Your browser needs a tap on the video", { exact: false }),
  ).toBeVisible();
  await clock(page, 1, 1);
  await expect(
    page.getByText("Your browser needs a tap on the video", { exact: false }),
  ).toHaveCount(0);
});
test("plain lyrics do not synchronize or seek", async ({ page }) => {
  await fixture(page, { plain: true });
  await open(page);
  await expect(
    page.getByText("Lyrics found — timing unavailable.", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".lyric-line").first()).toBeDisabled();
  await expect(page.locator("[aria-current=true]")).toHaveCount(0);
  await page.getByRole("button", { name: "Sync", exact: true }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Lyrics 0.5 seconds later" }),
  ).toBeDisabled();
});
for (const version of [undefined, "title-only-v2"]) {
  test(`unsuccessful cached songs retry identification (${version || "legacy"})`, async ({
    page,
  }) => {
    await fixture(page);
    await page.goto("/");
    await page.evaluate(async (identificationVersion) => {
      const request = indexedDB.open("versara", 2);
      request.onupgradeneeded = () => {
        for (const [name, keyPath] of [
          ["songs", "videoId"],
          ["resources", "key"],
        ]) {
          if (!request.result.objectStoreNames.contains(name))
            request.result.createObjectStore(name, { keyPath });
        }
      };
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const transaction = database.transaction("songs", "readwrite");
      transaction.objectStore("songs").put({
        videoId: "AbCdEf123_-",
        youtubeUrl: "https://youtu.be/AbCdEf123_-",
        videoTitle: "Video with a misleading title",
        trackTitle: "Old wrong title",
        artist: "Uploader name",
        metadataSource: "oembed",
        identificationVersion,
        lyricMode: "unavailable",
        targetLanguage: "en",
        offsetSeconds: 0,
        lines: [],
        updatedAt: Date.now(),
      });
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      database.close();
    }, version);
    await page.reload();
    let identifications = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/track/identify")) identifications++;
    });
    await page.getByRole("button", { name: /Old wrong title/ }).click();
    await expect(page.getByText("Translated with context")).toBeVisible();
    await expect(page.locator(".track-card h1")).toHaveText("Quiet morning");
    expect(identifications).toBe(1);
  });
}
test("failed translation leaves original lyrics synchronized and retryable", async ({
  page,
}) => {
  await fixture(page, { translationFails: true });
  await open(page);
  await expect(
    page.getByRole("button", { name: "Retry translation" }),
  ).toBeVisible();
  await clock(page, 1);
  await expect(page.locator("[aria-current=true]")).toContainText(
    "Palabras del momento 1",
  );
});
test("ambiguous results can be selected by the listener", async ({ page }) => {
  await fixture(page, { ambiguous: true });
  await open(page);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: /Quiet morning.*Synced/ }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Translated with context")).toBeVisible();
});
test("missing lyrics and unavailable video have recovery controls", async ({
  page,
}) => {
  await fixture(page, { noLyrics: true, videoError: true });
  await open(page);
  await expect(page.getByRole("dialog")).toContainText("No lyrics match found");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(
    page.getByRole("button", { name: "Find lyrics", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry player" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Open YouTube" })).toBeVisible();
});
test("manifest, icons and offline shell are served", async ({
  page,
  request,
  context,
}) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toContain(
    "512x512",
  );
  for (const icon of manifest.icons)
    expect((await request.get(icon.src)).ok()).toBeTruthy();
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page.locator("h1")).toBeVisible();
  const cachedUrls = await page.evaluate(async () => {
    const names = await caches.keys();
    const urls: string[] = [];
    for (const name of names)
      for (const req of await (await caches.open(name)).keys())
        urls.push(req.url);
    return urls;
  });
  const origin = new URL(page.url()).origin;
  expect(
    cachedUrls.every(
      (url) =>
        new URL(url).origin === origin &&
        !new URL(url).pathname.startsWith("/api/"),
    ),
  ).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Feel the music. Understand every word.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("offline");
});
for (const width of [360, 390, 430, 1024, 1440]) {
  test(`home and listening fit ${width}px without horizontal overflow`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await fixture(page);
    await page.goto("/");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/home-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("textbox", { name: "YouTube song link" })
      .fill("https://youtu.be/AbCdEf123_-");
    await page.getByRole("button", { name: "Open song" }).click();
    await expect(page.getByText("Translated with context")).toBeVisible();
    await clock(page, 21);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/listening-${width}.png`,
      fullPage: true,
    });
  });
}
