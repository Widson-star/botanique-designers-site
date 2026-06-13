import sharp from "sharp";
import { readdir, stat, writeFile } from "fs/promises";
import { join, extname, relative } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "../public");
const MAX_BYTES = 200 * 1024; // 200KB

async function getImageFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getImageFiles(full)));
    } else if (/\.(jpe?g|png)$/i.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

async function compressImage(filePath) {
  const { size } = await stat(filePath);
  if (size <= MAX_BYTES) return null;

  const ext = extname(filePath).toLowerCase();
  const rel = relative(PUBLIC_DIR, filePath);
  const originalKB = (size / 1024).toFixed(0);

  const meta = await sharp(filePath).metadata();
  let output;

  // Try progressively lower quality + width until under MAX_BYTES
  const attempts = [
    { quality: 75, width: null },
    { quality: 65, width: null },
    { quality: 55, width: 1800 },
    { quality: 50, width: 1600 },
    { quality: 45, width: 1400 },
    { quality: 40, width: 1200 },
    { quality: 35, width: 1000 },
    { quality: 30, width: 900 },
  ];

  for (const { quality, width } of attempts) {
    const maxWidth = width ? Math.min(width, meta.width || 9999) : (meta.width || 9999);
    const img = sharp(filePath).resize({ width: maxWidth, withoutEnlargement: true });
    if (ext === ".png") {
      output = await img.png({ quality, compressionLevel: 9 }).toBuffer();
    } else {
      output = await img.jpeg({ quality, mozjpeg: true }).toBuffer();
    }
    if (output.length <= MAX_BYTES) break;
  }

  await writeFile(filePath, output);
  const newKB = (output.length / 1024).toFixed(0);
  return { rel, originalKB, newKB };
}

const files = await getImageFiles(PUBLIC_DIR);
console.log(`Found ${files.length} image(s) in public/`);

let compressed = 0;
let skipped = 0;

for (const file of files) {
  try {
    const result = await compressImage(file);
    if (result) {
      console.log(`  ✓ ${result.rel}: ${result.originalKB}KB → ${result.newKB}KB`);
      compressed++;
    } else {
      skipped++;
    }
  } catch (err) {
    const rel = relative(PUBLIC_DIR, file);
    console.warn(`  ⚠ skipped ${rel}: ${err.message.split("\n")[0]}`);
  }
}

console.log(`\nDone. Compressed: ${compressed}, already ≤200KB: ${skipped}`);
