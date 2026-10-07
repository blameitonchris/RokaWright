import { build } from "esbuild";
import { transformAsync } from "@babel/core";
import { minify } from "terser";
import { readFile, writeFile } from "node:fs/promises";
import postcss from "postcss";
import customProperties from "postcss-custom-properties";
import discardComments from "postcss-discard-comments";
import { parse } from "acorn";
const result = await build({
  entryPoints: ["scripts/compat-entry.js"],
  bundle: true,
  write: false,
  format: "iife",
  target: "esnext",
});
const transformed = await transformAsync(result.outputFiles[0].text, {
  babelrc: false,
  configFile: false,
  presets: [
    [
      "@babel/preset-env",
      {
        targets: { chrome: "18", opera: "12" },
        modules: false,
        useBuiltIns: false,
      },
    ],
  ],
  sourceType: "script",
  comments: false,
});
const compressed = await minify(transformed.code, {
  ecma: 5,
  compress: { passes: 1 },
  mangle: true,
  format: { ecma: 5, ascii_only: true },
});
parse(compressed.code, { ecmaVersion: 5 });
const license = await readFile("node_modules/core-js/LICENSE", "utf8");
await writeFile(
  "app-compat.js",
  compressed.code + "\n/*! core-js license\n" + license + "\n*/",
);
const css = await postcss([
  customProperties({ preserve: true }),
  discardComments(),
]).process(await readFile("style.css", "utf8"), {
  from: "style.css",
  to: "style-compat.css",
});
await writeFile(
  "style-compat.css",
  css.css.replace(/#20271fcc/g, "rgba(32,39,31,.8)"),
);
console.log("ES5-parsed classic app bundle and CSS color fallbacks built.");
