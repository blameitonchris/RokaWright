import {readFile, writeFile} from 'node:fs/promises';
const html=await readFile('index.html','utf8');
const pdfLibrary=(await readFile('pdf-library.js','utf8')).replace(/<\/script/gi,'<\\/script');
const css=await readFile('style.css','utf8');
const core=(await readFile('core.js','utf8')).replace(/^export /gm,'');
const app=(await readFile('app.js','utf8')).replace(/^import\s*\{[\s\S]*?\}\s*from\s*['"]\.\/core\.js['"];?\s*/, '');
const result=html.replace('<script src="pdf-library.js"></script>',()=>`<script>${pdfLibrary}</script>`).replace(/<link rel="stylesheet" href="style.css"\s*\/?\s*>/,()=>`<style>${css}</style>`).replace(/<script type="module" src="app.js"><\/script>/,()=>`<script type="module">${core}\n${app}</script>`);
await writeFile('RokaWright.html',result);
console.log('Built RokaWright.html — open this file directly in a browser.');
