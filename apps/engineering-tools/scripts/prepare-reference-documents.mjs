import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "reference-documents");
const output = path.join(root, "public", "manuals");
const manifest = JSON.parse(await readFile(path.join(source, "manifest.json"), "utf8"));
await mkdir(output, { recursive: true });
for (const doc of manifest) {
  const data = Buffer.concat(await Promise.all(doc.parts.map(part => readFile(path.join(source, part)))));
  if (data.length !== doc.bytes || createHash("sha256").update(data).digest("hex") !== doc.sha256 || data.subarray(0, 5).toString() !== "%PDF-") throw new Error(`Invalid reference document: ${doc.filename}`);
  await writeFile(path.join(output, doc.filename), data);
}
console.log(`Prepared ${manifest.length} verified reference PDFs.`);
