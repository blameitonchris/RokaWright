import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
// Publish only application assets; records, backups and tests are never copied.
const assets = ["index.html", "style-compat.css", "app-compat.js", "pdf-library.js"];
for (const [directory, key, title] of [
  ["dist", "rokawright.v1", ""],
  ["dist-compat", "rokawright.compat.v1", ""],
  ["dist-sales", "rokawright.salespreview.v2", "Sales &amp; stock preview"],
  ["dist-compat-sales", "rokawright.compat.salespreview.v2", "Tablet sales &amp; stock preview"],
]) {
  await mkdir(directory, { recursive: true });
  const unknown = (await readdir(directory)).filter(name => ![...assets, ".nojekyll"].includes(name));
  if (unknown.length) throw Error("Unexpected files in " + directory + ". Review before publishing.");
  for (const asset of assets) {
    let content = await readFile(asset);
    if (asset === "index.html") {
      content = content.toString().replace(/window.ROKA_STORAGE_KEY = "[^"]+"/, 'window.ROKA_STORAGE_KEY = "' + key + '"');
      if (title) content = content.replace('<main id="app">', '<div class="compat-preview-banner" role="status"><b>' + title + '</b> · Separate preview storage. Records never synchronize; use a private backup/import to transfer them.</div><main id="app">');
    }
    await writeFile(directory + "/" + asset, content);
  }
  await writeFile(directory + "/.nojekyll", "");
  console.log(directory + " built from public asset allowlist.");
}
