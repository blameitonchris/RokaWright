import { readFile, writeFile } from "node:fs/promises";
const html = await readFile("index.html", "utf8");
const css = await readFile("style-compat.css", "utf8");
const app = (await readFile("app-compat.js", "utf8")).replace(
  /<\/script/gi,
  "<\\/script",
);
const pdf = (await readFile("pdf-library.js", "utf8")).replace(
  /<\/script/gi,
  "<\\/script",
);
const result = html
  .replace(
    /<link rel="stylesheet" href="style-compat.css"\s*\/?\s*>/,
    () => `<style>${css}</style>`,
  )
  .replace(
    '<script src="app-compat.js"></script>',
    () =>
      `<script>window.ROKA_PDF_SOURCE=${JSON.stringify(pdf)};</script><script>${app}</script>`,
  );
await writeFile("RokaWright.html", result);
console.log("Single-file compatibility preview rebuilt.");
