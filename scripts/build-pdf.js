import { build } from "esbuild";
import { transformAsync } from "@babel/core";
import { minify } from "terser";
import { parse } from "acorn";
import { writeFile } from "node:fs/promises";
const result = await build({
  entryPoints: ["scripts/pdf-entry.js"],
  bundle: true,
  write: false,
  minify: true,
  format: "iife",
  globalName: "RokaPDF",
  target: "esnext",
  legalComments: "inline",
});
const source = result.outputFiles[0].text;
const licenses = (source.match(/\/\*![\s\S]*?\*\//g) || []).join("\n");
const transformed = await transformAsync(source, {
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
  comments: false,
  sourceType: "script",
});
const output = await minify(transformed.code, {
  ecma: 5,
  format: { ecma: 5, ascii_only: true },
  compress: true,
  mangle: true,
});
parse(output.code, { ecmaVersion: 5 });
await writeFile("pdf-library.js", output.code + "\n" + licenses);
console.log("PDF bundle parsed as ES5; third-party license notices retained.");
