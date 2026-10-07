import {mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
const assets=['index.html','style.css','app.js','core.js','pdf-library.js'];
await mkdir('dist',{recursive:true});
const unknown=(await readdir('dist')).filter(name=>![...assets,'.nojekyll'].includes(name));
if(unknown.length)throw Error('Unexpected files in dist. Review and remove them before building a public release.');
for(const asset of assets)await writeFile('dist/'+asset,await readFile(asset));
await writeFile('dist/.nojekyll','');
console.log('Public release built from explicit allowlist: '+assets.join(', ')+', .nojekyll');
