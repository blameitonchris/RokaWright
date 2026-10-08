import { test, expect, chromium } from '@playwright/test';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec=promisify(execFile);
const url=()=>process.env.ROKA_OFFLINE_URL || 'http://127.0.0.1:3100/compatibility-offline-preview/';
const nav=(page,name)=>page.locator('nav').getByRole('button',{name,exact:true}).click();
const field=(page,name,value)=>page.locator('[name="'+name+'"]').fill(value);
async function prepared(page){await page.goto(url());await page.locator('#offline-prepare').click();await expect(page.locator('#offline-status')).toContainText('Ready for offline use',{timeout:30000});}
async function data(page){return page.evaluate(()=>JSON.parse(localStorage.getItem(window.ROKA_STORAGE_KEY)));}

test('prepare, completely offline browser restarts, all data workflows, PDF and backup, then reconnect',async()=>{
 test.setTimeout(90000);
 const profile=await mkdtemp(path.join(tmpdir(),'rokawright-offline-profile-'));
 const launch=()=>chromium.launchPersistentContext(profile,{executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox'],viewport:{width:800,height:600}});
 let context;
 try{
  context=await launch();let page=await context.newPage();await prepared(page);
  await page.evaluate(()=>{localStorage.setItem('rokawright.v1','protected-modern');localStorage.setItem('rokawright.compat.v1','protected-tablet');});
  // Network is disabled before closing the browser, then disabled before navigating after launch.
  await context.setOffline(true);await context.close();context=await launch();await context.setOffline(true);page=await context.newPage();await page.goto(url());await page.locator('#offline-check').click();await expect(page.locator('#offline-status')).toContainText('Ready for offline use');
  await nav(page,'Customers');await page.getByLabel('Name',{exact:true}).fill('Offline synthetic customer');await page.getByLabel('Waist (in)',{exact:true}).fill('32');await page.getByRole('button',{name:'Save customer'}).click();
  await nav(page,'New Job');await page.getByRole('button',{name:/Alter pants/}).click();await page.getByLabel('Quantity',{exact:true}).fill('2');await page.getByLabel('Extra work ($, total for this line)',{exact:true}).fill('3');await page.getByRole('button',{name:/Add both pockets/}).click();await expect(page.locator('.big-total')).toHaveText('$18.00');await page.getByLabel('Deposit / additional payment').fill('5');await page.getByRole('button',{name:'Record payment'}).click();await page.locator('#save-job').click();
  // PDF was never opened online: lazy PDF tools must load from the prepared cache.
  await page.locator('#print').click();const download=page.waitForEvent('download');await page.locator('#quote-print').click();const pdf=await download;expect((await readFile(await pdf.path())).subarray(0,5).toString()).toBe('%PDF-');await page.locator('#quote-close').click();
  await nav(page,'Stock');await field(page,'product-name','Do-rag');await field(page,'product-price','10');await page.locator('#product-save').click();await field(page,'movement-quantity','5');await page.locator('#movement-save').click();const product=(await data(page)).products[0].id;
  await nav(page,'Sales');await page.locator('#new-sale').click();await page.locator('[name="add-product"]').selectOption(product);await page.locator('[name$=":quantity"]').fill('2');await page.locator('[name="add-service"]').selectOption('service-6');await page.locator('#save-sale').click();await expect(page.locator('#sale-total')).toHaveText('$32.00');await field(page,'sale-payment-amount','32');await page.locator('#sale-payment-add').click();await nav(page,'Stock');await expect(page.locator('[data-stock-card]')).toContainText('3 available');
  const saved=await data(page);expect(saved.customers[0].measurements.values.Waist).toBe('32');expect(saved.jobs[0].payments[0].cents).toBe(500);
  await page.locator('#backup-open').click();const backupDownload=page.waitForEvent('download');await page.locator('#export').click();const backup=await backupDownload;expect(JSON.parse(await readFile(await backup.path(),'utf8'))).toEqual(saved);await page.locator('#backup-close').click();
  await context.close();context=await launch();await context.setOffline(true);page=await context.newPage();await page.goto(url());expect(await data(page)).toEqual(saved);await nav(page,'Saved Jobs');await expect(page.locator('#job-list')).toContainText('$18.00');await nav(page,'Sales');await expect(page.locator('#sale-list')).toContainText('$32.00');await nav(page,'Stock');await expect(page.locator('[data-stock-card]')).toContainText('3 available');
  await context.setOffline(false);await page.reload();expect(await data(page)).toEqual(saved);expect(await page.evaluate(()=>localStorage.getItem('rokawright.v1'))).toBe('protected-modern');expect(await page.evaluate(()=>localStorage.getItem('rokawright.compat.v1'))).toBe('protected-tablet');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }finally{if(context)await context.close();await rm(profile,{recursive:true,force:true});}
});

test('unsupported service workers never report ready and the app remains usable online',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'serviceWorker',{value:undefined}));await page.goto(url());await expect(page.locator('#offline-status')).toContainText('offline use is unavailable');await expect(page.locator('#offline-prepare')).toBeDisabled();await page.getByRole('button',{name:/Alter pants/}).click();await expect(page.locator('.big-total')).toHaveText('$5.00');
});

test('forced old-tablet layout works offline with readable quotes and copy/paste backups',async({page,context})=>{
 await page.goto(url()+'?legacy=1');await page.locator('#offline-prepare').click();await expect(page.locator('#offline-status')).toContainText('Ready for offline use',{timeout:30000});await context.setOffline(true);await page.reload();await page.getByRole('button',{name:/Alter pants/}).click();await page.locator('#save-job').click();await page.locator('#print').click();await expect(page.locator('#quote-print')).toBeHidden();await page.locator('#quote-copy').click();await expect(page.locator('.text-alternative textarea')).toHaveValue(/\$5.00/);await page.locator('.text-alternative [data-close]').click();await page.locator('#quote-close').click();await page.locator('#backup-open').click();await page.locator('#export-copy').click();const backup=await page.locator('.text-alternative textarea').inputValue();await page.locator('.text-alternative [data-close]').click();await page.getByText('Paste backup text (alternative to a file)',{exact:true}).click();await page.locator('#pasted-backup').fill(backup);await page.locator('#validate-pasted-backup').click();await page.locator('#restore').click();await page.locator('.confirmation [data-yes]').click();expect((await data(page)).jobs.length).toBe(1);
});

test('missing cached asset removes readiness; online preparation repairs it without changing records',async({page})=>{
 await prepared(page);await page.getByRole('button',{name:/Alter pants/}).click();await page.locator('#save-job').click();const saved=await data(page);
 await page.evaluate(async()=>{for(const name of await caches.keys()){if(name.startsWith('rokawright-tablet-offline-')){const cache=await caches.open(name);for(const key of await cache.keys())if(/\/pdf\./.test(key.url))await cache.delete(key);}}});
 await page.locator('#offline-check').click();await expect(page.locator('#offline-status')).toContainText('Not ready');await page.locator('#offline-prepare').click();await expect(page.locator('#offline-status')).toContainText('Ready for offline use',{timeout:30000});expect(await data(page)).toEqual(saved);
});

test('failed new preparation does not falsely report ready or overwrite records',async({page,context})=>{
 await page.goto(url());await page.getByRole('button',{name:/Alter pants/}).click();await page.locator('#save-job').click();const saved=await data(page);await context.setOffline(true);await page.locator('#offline-prepare').click();await expect(page.locator('#offline-status')).toContainText('failed',{timeout:20000});expect(await data(page)).toEqual(saved);
});

test('updates wait for saved edits and other tabs; explicit activation preserves records offline',async({page,context})=>{
 test.skip(!!process.env.ROKA_OFFLINE_URL,'Local fixture generates a new version; live release is read-only.');test.setTimeout(90000);
 const filename='scripts/offline-worker.js',original=await readFile(filename,'utf8');
 try{
  await prepared(page);const initial=await page.evaluate(()=>window.ROKA_OFFLINE_RELEASE);
  await page.getByRole('button',{name:/Alter pants/}).click();await page.locator('#save-job').click();const saved=await data(page);
  await writeFile(filename,original+'\n// Synthetic update test.\n');await exec('node',['scripts/build-offline.js']);await page.locator('#offline-prepare').click();await expect(page.locator('#offline-update')).toBeVisible({timeout:30000});
  await nav(page,'Sales');await page.locator('#new-sale').click();await page.locator('[name="add-service"]').selectOption('service-0');await page.locator('#offline-update').click();await expect(page.locator('#offline-status')).toContainText('Save or close unfinished');await page.locator('#close-sale').click();await page.locator('.confirmation [data-yes]').click();
  await nav(page,'Stock');await field(page,'product-name','Unsaved product');await page.locator('#offline-update').click();await expect(page.locator('#offline-status')).toContainText('Save or close unfinished');await page.locator('#product-clear').click();await field(page,'movement-quantity','3');await page.locator('#offline-update').click();await expect(page.locator('#offline-status')).toContainText('Save or close unfinished');await field(page,'movement-quantity','1');
  await nav(page,'Customers');await page.getByLabel('Name',{exact:true}).fill('Unsaved customer');await page.locator('#offline-update').click();await expect(page.locator('#offline-status')).toContainText('Save or close unfinished');await page.locator('#cancel-customer').click();await nav(page,'New Job');
  await page.getByLabel('Name on this quote').fill('Unsaved edit');await page.locator('#offline-update').click();await expect(page.locator('#offline-status')).toContainText('Save or close unfinished');expect(await page.evaluate(()=>window.ROKA_OFFLINE_RELEASE)).toBe(initial);await page.getByLabel('Name on this quote').fill('');await page.locator('#save-job').click();
  const second=await context.newPage();await second.goto(url());await page.locator('#offline-update').click();await page.locator('.confirmation [data-yes]').click();await expect(page.locator('#offline-status')).toContainText('Close other offline-test tabs');await second.close();
  await context.setOffline(true);await page.locator('#offline-update').click();await page.locator('.confirmation [data-yes]').click();await expect.poll(()=>page.evaluate(()=>window.ROKA_OFFLINE_RELEASE).catch(()=>initial)).not.toBe(initial);await expect(page.locator('#offline-status')).toContainText('Ready for offline use',{timeout:30000});expect(await data(page)).toEqual(saved);
 }finally{await writeFile(filename,original);await exec('node',['scripts/build-offline.js']);}
});


test('a corrupted update leaves the active cached release and saved records intact',async({page,context})=>{
 test.skip(!!process.env.ROKA_OFFLINE_URL,'Local corrupted-build fixture only.');test.setTimeout(60000);
 const filename='scripts/offline-worker.js',original=await readFile(filename,'utf8');let shell,body;
 try{
  await prepared(page);const initial=await page.evaluate(()=>window.ROKA_OFFLINE_RELEASE);await page.getByRole('button',{name:/Alter pants/}).click();await page.locator('#save-job').click();const saved=await data(page);
  await writeFile(filename,original+'\n// Synthetic bad update test.\n');await exec('node',['scripts/build-offline.js']);const html=await readFile('dist-offline/index.html','utf8');const release=html.match(/ROKA_OFFLINE_RELEASE = "([^"]+)"/)[1];shell='dist-offline/workroom.'+release+'.html';body=await readFile(shell);await writeFile(shell,'Corrupted test response');
  await page.locator('#offline-prepare').click();await expect(page.locator('#offline-status')).toContainText('failed',{timeout:30000});expect(await page.evaluate(()=>window.ROKA_OFFLINE_RELEASE)).toBe(initial);await page.locator('#offline-check').click();await expect(page.locator('#offline-status')).toContainText('Ready for offline use');await context.setOffline(true);await page.reload();expect(await data(page)).toEqual(saved);expect(await page.evaluate(()=>window.ROKA_OFFLINE_RELEASE)).toBe(initial);
 }finally{if(shell&&body)await writeFile(shell,body);await writeFile(filename,original);await exec('node',['scripts/build-offline.js']);}
});


test('unwritable local storage prevents readiness and preparation',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.setItem=function(){throw Error('Synthetic storage denial');};});await page.goto(url());await page.locator('#offline-prepare').click();await expect(page.locator('#offline-status')).toContainText('Not ready for offline use');await expect(page.locator('#offline-status')).toContainText('storage');expect(await page.evaluate(()=>navigator.serviceWorker.getRegistration('./').then(reg=>!!reg))).toBe(false);
});
