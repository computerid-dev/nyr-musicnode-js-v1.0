import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "public");

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// halaman pagar di root
for (const file of ["index.html", "anti-clone.js"]) {
  cpSync(resolve(root, file), resolve(out, file));
}

// halaman project: hanya index.html, css/, js/ dari musicnode/
// (proxy/, api/, backend/ tidak ikut karena itu kode server)
const siteDir = resolve(out, "musicnode");
mkdirSync(siteDir, { recursive: true });
cpSync(resolve(root, "musicnode", "index.html"), resolve(siteDir, "index.html"));
for (const folder of ["css", "js"]) {
  cpSync(resolve(root, "musicnode", folder), resolve(siteDir, folder), { recursive: true });
}

console.log("public/ siap");
