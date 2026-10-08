import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
// Only these public application assets may enter a preview release.
const assets = ["index.html", "style-compat.css", "app-compat.js", "pdf-library.js"];
for (const [directory, key, title] of [
  ["dist-sales", "rokawright.salespreview.v2", "Sales &amp; stock preview"],
  ["dist-compat-sales", "rokawright.compat.salespreview.v2", "Tablet sales &amp; stock preview"],
]) {
  await mkdir(directory, { recursive: true });
  const unknown = (await readdir(directory)).filter(name => ![...assets, ".nojekyll"].includes(name));
  if (unknown.length) throw Error("Unexpected files in " + directory + ". Review before publishing.");
  for (const asset of assets) {
    let content = await readFile(asset);
    if (asset === "index.html") content = content.toString().replace("rokawright.salespreview.v2", key).replace("Sales &amp; stock review preview", title);
    await writeFile(directory + "/" + asset, content);
  }
  await writeFile(directory + "/.nojekyll", "");
  console.log(directory + " built from public asset allowlist.");
}
