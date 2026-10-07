import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
const directory = "dist-compat";
const assets = [
  "index.html",
  "style-compat.css",
  "app-compat.js",
  "pdf-library.js",
];
await mkdir(directory, { recursive: true });
const unknown = (await readdir(directory)).filter(
  (name) => ![...assets, ".nojekyll"].includes(name),
);
if (unknown.length)
  throw Error(
    "Unexpected files in dist. Review and remove them before building a public release.",
  );
for (const asset of assets)
  await writeFile(directory + "/" + asset, await readFile(asset));
await writeFile(directory + "/.nojekyll", "");
console.log(
  "Public release built from explicit allowlist: " +
    assets.join(", ") +
    ", .nojekyll",
);
