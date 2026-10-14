import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const folder = fileURLToPath(new URL("../public/icons/", import.meta.url));
mkdirSync(folder, { recursive: true });
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const tag = Buffer.from(type),
    len = Buffer.alloc(4),
    crc = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([tag, data])));
  return Buffer.concat([len, tag, data, crc]);
}
function icon(size, name) {
  const data = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = x / size,
        v = y / size;
      const head = ((u - 0.405) / 0.12) ** 2 + ((v - 0.655) / 0.085) ** 2 <= 1;
      const stem = u > 0.477 && u < 0.538 && v > 0.285 && v < 0.655;
      const flag =
        u >= 0.52 &&
        u < 0.7 &&
        v > 0.285 + (u - 0.52) * 0.22 &&
        v < 0.375 + (u - 0.52) * 0.22;
      const color = head || stem || flag ? [201, 167, 255] : [34, 32, 51];
      const i = y * (size * 4 + 1) + 1 + x * 4;
      data[i] = color[0];
      data[i + 1] = color[1];
      data[i + 2] = color[2];
      data[i + 3] = 255;
    }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  writeFileSync(
    `${folder}/${name}.png`,
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", header),
      chunk("IDAT", deflateSync(data)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}
icon(192, "icon-192");
icon(512, "icon-512");
icon(512, "icon-maskable-512");
icon(180, "apple-touch-icon");
