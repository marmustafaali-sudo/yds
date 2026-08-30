/* Web varlıklarını repo kökünden www/ içine toplar (Capacitor webDir). */
import { rmSync, mkdirSync, cpSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const www = join(root, "www");

const FILES = [
  "index.html",
  "app.js",
  "post.js",
  "auth.js",
  "mobile.js",
  "daily.js",
  "styles.css",
  "words.json",
  "ydbackground.jpg",
  "ydbg-soft.jpg",
  "lale-header.jpg",
];
const DIRS = ["fonts"];

rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });

for (const f of FILES) {
  const src = join(root, f);
  if (!existsSync(src)) {
    console.error(`! eksik: ${f}`);
    process.exit(1);
  }
  cpSync(src, join(www, f));
}
for (const d of DIRS) {
  const src = join(root, d);
  if (existsSync(src)) cpSync(src, join(www, d), { recursive: true });
}

console.log(`www/ hazır — ${FILES.length} dosya + ${DIRS.join(", ")}`);
