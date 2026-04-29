/**
 * Post-build script: generates dist/client/index.html for static SPA deployment.
 * Reads asset filenames (with content hashes) from the build output directory.
 */
import { readdir, writeFile, stat } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, "../dist/client/assets");
const clientDir = join(__dirname, "../dist/client");

const files = await readdir(assetsDir);

// Pick files by naming convention
const mainCss = files.find((f) => f.startsWith("styles") && f.endsWith(".css"));
const leafletCss = files.find((f) => f.startsWith("RiskMap") && f.endsWith(".css"));

// Main JS bundle: starts with "index-", largest by file size
const indexJsFiles = files.filter((f) => f.startsWith("index-") && f.endsWith(".js"));
const indexJsSizes = await Promise.all(
  indexJsFiles.map(async (f) => ({ f, size: (await stat(join(assetsDir, f))).size }))
);
const mainJs = indexJsSizes.sort((a, b) => b.size - a.size)[0]?.f;

if (!mainJs) {
  console.error("❌ Could not find main JS bundle in dist/client/assets/");
  process.exit(1);
}

const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AgroSync — Sistema Operativo de Cumplimiento Agroambiental</title>
  <meta name="description" content="Predice deriva de agroquímicos, protege apiarios y automatiza certificados fitosanitarios." />
${mainCss ? `  <link rel="stylesheet" crossorigin href="/assets/${mainCss}" />` : ""}
${leafletCss ? `  <link rel="stylesheet" crossorigin href="/assets/${leafletCss}" />` : ""}
</head>
<body>
  <script type="module" crossorigin src="/assets/${mainJs}"></script>
</body>
</html>`;

await writeFile(join(clientDir, "index.html"), html, "utf-8");
console.log(`✓ Generated dist/client/index.html`);
console.log(`  CSS: ${mainCss ?? "—"}, ${leafletCss ?? "—"}`);
console.log(`  JS:  ${mainJs}`);
