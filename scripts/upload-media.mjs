// Uploads the Prieto "Rhythmic Synchronicity" audio examples from media/prieto/
// to the private Vercel Blob store. Run once from learnform-app:
//   node scripts/upload-media.mjs
// Needs BLOB_READ_WRITE_TOKEN in .env.local. Files already in the store are
// skipped; pass --force to upload them again.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import { list, put } from "@vercel/blob";

config({ path: ".env.local" });
config();

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("BLOB_READ_WRITE_TOKEN is not set. Add it to .env.local first.");
  process.exit(1);
}

const force = process.argv.includes("--force");
const dir = path.join("media", "prieto");
const files = (await readdir(dir)).filter((f) => /^Example (\d+),.*\.mp3$/i.test(f));
if (files.length === 0) {
  console.error(`No "Example N, ….mp3" files found in ${dir}.`);
  process.exit(1);
}

const existing = new Set();
let cursor;
do {
  const page = await list({ prefix: "prieto/", cursor });
  page.blobs.forEach((b) => existing.add(b.pathname));
  cursor = page.hasMore ? page.cursor : undefined;
} while (cursor);

let uploaded = 0;
let skipped = 0;
for (const file of files.sort((a, b) => parseInt(a.slice(8)) - parseInt(b.slice(8)))) {
  const n = Number(file.match(/^Example (\d+)/i)[1]);
  const pathname = `prieto/example-${n}.mp3`;
  if (existing.has(pathname) && !force) {
    skipped++;
    continue;
  }
  await put(pathname, await readFile(path.join(dir, file)), {
    access: "private",
    contentType: "audio/mpeg",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  uploaded++;
  process.stdout.write(`\ruploaded ${uploaded}, skipped ${skipped} (example ${n})   `);
}
console.log(`\nDone: ${uploaded} uploaded, ${skipped} already there, ${files.length} total.`);
