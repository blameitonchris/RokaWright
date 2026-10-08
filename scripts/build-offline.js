import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parse } from 'acorn';
const dir=process.env.ROKA_OFFLINE_DIST || 'dist-offline';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const names={'app':'app-compat.js','style':'style-compat.css','pdf':'pdf-library.js','offline-client':'scripts/offline-client.js'};
const content={};for(const [kind,file] of Object.entries(names))content[kind]=await readFile(file);
parse(content['offline-client'].toString(),{ecmaVersion:5});
const template=await readFile('index.html','utf8'),worker=await readFile('scripts/offline-worker.js','utf8');
const release=hash(template+worker+Object.values(content).map(bytes=>hash(bytes)).join('')).slice(0,16);
const filenames={};for(const [kind,bytes]of Object.entries(content))filenames[kind]=kind+'.'+hash(bytes).slice(0,16)+(kind==='style'?'.css':'.js');
const shell='workroom.'+release+'.html';
let html=template.replace('href="style-compat.css"','href="'+filenames.style+'"').replace('src="app-compat.js"','src="'+filenames.app+'"')
  .replace(/window.ROKA_STORAGE_KEY = "[^"]+";/,`window.ROKA_STORAGE_KEY = "rokawright.compat.offlinepreview.v2";\n      window.ROKA_OFFLINE_RELEASE = "${release}";\n      window.ROKA_PDF_URL = "${filenames.pdf}";`)
  .replace('<main id="app">',`<section class="panel offline-panel" aria-label="Offline setup" style="margin:20px 5%;"><h2>Tablet offline test</h2><p>This test has separate browser records. Neither published app is changed. Copy a private backup here only if needed; records never synchronize. Back up your published records before testing, and avoid clearing browser data.</p><p id="offline-status" role="status" aria-live="polite">Checking offline support…</p><p id="offline-connection" class="hint"></p><div class="actions"><button type="button" id="offline-prepare">Prepare for offline use</button><button type="button" class="quiet" id="offline-check">Check offline readiness</button><button type="button" id="offline-update" hidden>Apply prepared update</button></div><details><summary>Setup, backups and safe updates</summary><ol><li>While connected, choose Prepare. Wait for Ready for offline use. Bookmark this exact link.</li><li>Save every unfinished job or sale before closing. Back up regularly with the footer’s Backup &amp; restore. JSON downloads or copy/paste text work without internet when supported by the browser. Keep backups private.</li><li>Test airplane mode, browser reopening and a full tablet restart with disposable records. Ready verifies assets now; the browser can still clear cached files or local records. Avoid private browsing and clearing browser data.</li><li>For updates, reconnect, save all work and export a private backup. Choose Prepare / check for updates. If an update downloads, close other test tabs and use Apply prepared update. Never update during unfinished work.</li></ol><p>PDF tools, logos and styles are bundled. Older layouts offer readable/copyable quotes; printing and downloads depend on the tablet browser and available apps. Records stay on this device. Preview backups replace records when imported; they do not merge.</p><p>If this browser cannot prepare offline use, test full Chrome. If neither browser works reliably, use a separately developed and tested Android 4.2.2 app with bundled assets and native storage; simply wrapping the website is insufficient.</p></details></section><main id="app">`)
  .replace('</body>',`<script src="${filenames['offline-client']}"></script></body>`);
const assets=[{name:shell,sha256:hash(html)},...Object.entries(content).map(([kind,bytes])=>({name:filenames[kind],sha256:hash(bytes)}))];
const sw=worker.replace('__RELEASE__',JSON.stringify(release)).replace('__ASSETS__',JSON.stringify(assets)).replace('__SHELL__',JSON.stringify(shell));
parse(sw,{ecmaVersion:5});
await mkdir(dir,{recursive:true});
// Retain immutable files so previously prepared clients can finish an update safely.
for(const name of await readdir(dir))if(!/^(index\.html|offline-worker\.js|\.nojekyll|workroom\.[a-f0-9]{16}\.html|(app|style|pdf|offline-client)\.[a-f0-9]{16}\.(js|css))$/.test(name))throw Error('Unexpected file in offline public build: '+name);
await writeFile(dir+'/index.html',html);await writeFile(dir+'/'+shell,html);await writeFile(dir+'/offline-worker.js',sw);await writeFile(dir+'/.nojekyll','');
for(const [kind,bytes]of Object.entries(content))await writeFile(dir+'/'+filenames[kind],bytes);
console.log('Offline preview '+release+' built with '+assets.length+' verified local assets; no records embedded.');
