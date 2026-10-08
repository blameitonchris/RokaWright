import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { defaults } from '../../core.js';

async function confirm(page) {await page.locator('.confirmation [data-yes]').click();}
async function nav(page,name){await page.locator('nav').getByRole('button',{name,exact:true}).click();}
async function field(page,name,value){await page.locator('[name="'+name+'"]').fill(value);}
async function range(page){await page.locator('[name="report-period"]').selectOption('custom');await field(page,'report-start','2026-10-01');await field(page,'report-end','2026-10-31');await page.locator('#apply-range').click();}
async function records(page){return page.evaluate(()=>JSON.parse(localStorage.getItem(window.ROKA_STORAGE_KEY)));}

for(const legacy of [false,true]){
 test.describe(legacy?'tablet fallback (simulated)':'modern sales preview',()=>{
  test.beforeEach(async({page})=>{
   // Check the same shared engine in two isolated storage configurations.
   if(!process.env.ROKA_BASE_URL)await page.route('http://127.0.0.1:3100/',async route=>{
    const response=await route.fetch();const html=(await response.text()).replace('rokawright.salespreview.v2',legacy?'rokawright.compat.salespreview.v2':'rokawright.salespreview.v2');await route.fulfill({response,body:html});
   });
   await page.addInitScript(()=>{
    localStorage.setItem('rokawright.v1','protected-modern');localStorage.setItem('rokawright.compat.v1','protected-tablet');
   });
   if(legacy)await page.addInitScript(()=>{
    delete window.structuredClone;delete window.Promise;delete Object.entries;delete Array.prototype.includes;delete Array.prototype.find;delete String.prototype.padStart;delete Element.prototype.remove;
   });
   // The route above also handles queries explicitly in local tests.
   if(legacy&&!process.env.ROKA_BASE_URL)await page.route('http://127.0.0.1:3100/?legacy=1',async route=>{
    const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('rokawright.salespreview.v2','rokawright.compat.salespreview.v2')});
   });
   await page.setViewportSize(legacy?{width:800,height:600}:{width:1280,height:900});
   await page.goto(legacy?'./?legacy=1':'./');
  });
  test('production, multi-line sales, payments, returns, edit, cancellation, CSV and print',async({page})=>{
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await nav(page,'Stock');await field(page,'product-name','Do-rag');await field(page,'product-variant','Blue');await field(page,'product-price','10');await page.locator('#product-save').click();
   await field(page,'movement-quantity','5');await field(page,'movement-date','2026-10-01');await page.locator('#movement-save').click();await expect(page.locator('[data-stock-card]')).toContainText('5 available');
   const pid=(await records(page)).products[0].id;
   await nav(page,'Sales');await page.locator('#new-sale').click();await field(page,'date','2026-10-08');
   await page.locator('[name="add-product"]').selectOption(pid);
   let qty=page.locator('[name$=":quantity"]');await qty.first().fill('2');
   await page.locator('[name="add-service"]').selectOption('service-6');await expect(page.locator('#sale-total')).toHaveText('$32.00');await page.locator('#save-sale').click();
   await expect(page.locator('#sale-total')).toHaveText('$32.00');
   await field(page,'sale-payment-amount','32');await field(page,'sale-payment-date','2026-10-08');await page.locator('#sale-payment-add').click();
   await nav(page,'Stock');await expect(page.locator('[data-stock-card]')).toContainText('3 available');
   await nav(page,'Sales');await range(page);await expect(page.locator('.report-metrics')).toContainText('$32.00');await expect(page.locator('.report-metrics')).toContainText('Made item units sold3');
   await page.locator('[data-sale-open]').click();await field(page,'return-date','2026-10-09');await field(page,'return-quantity','1');await field(page,'return-amount','10');await field(page,'return-cash','10');await field(page,'return-reason','Returned unused');await page.locator('[name="return-restock"]').selectOption('yes');await page.locator('#return-add').click();await confirm(page);
   await expect(page.locator('#app')).toContainText('Refunds: $10.00');
   await nav(page,'Stock');await expect(page.locator('[data-stock-card]')).toContainText('4 available');
   await nav(page,'Sales');await range(page);await expect(page.locator('.report-metrics')).toContainText('Net sales$22.00');await expect(page.locator('.report-metrics')).toContainText('Net money received$22.00');
   if(legacy){await page.locator('#report-csv').click();await expect(page.locator('dialog[open] textarea')).toHaveValue(/"32.00"/);await page.locator('dialog[open] button').last().click();}
   else{const download=page.waitForEvent('download');await page.locator('#report-csv').click();const file=await download;const csv=await readFile(await file.path(),'utf8');expect(csv).toContain('"32.00"');expect(csv).toContain('"22.00"');expect(csv).toContain('2026-10-01');expect(csv).toContain('2026-10-31');}
   await page.locator('#report-print').click();
   if(!legacy){await page.evaluate(()=>window.print=()=>window.reportPrinted=true);await page.locator('[data-report-paper]').click();expect(await page.evaluate(()=>window.reportPrinted)).toBe(true);await page.emulateMedia({media:'print'});await expect(page.locator('header')).toBeHidden();await expect(page.locator('.sales-print .sales-table').first()).toBeVisible();await page.pdf({path:'test-results/sales-summary.pdf',format:'A4'});await page.emulateMedia({media:'screen'});}
   await page.locator('[data-report-full]').click();await expect(page.locator('.sales-print')).toBeVisible();await expect(page.locator('.sales-print')).toContainText('Net sales: $22.00');await page.locator('.quote-controls button').click();
   await page.locator('[data-sale-open]').click();await page.locator('[data-remove-line]').first().click();await confirm(page);await page.locator('#save-sale').click();await expect(page.locator('#sales-message')).toContainText('Invalid sales');await nav(page,'Sales');await confirm(page);
   await page.locator('[data-sale-open]').click();await page.locator('[name$=":quantity"]').first().fill('3');await page.locator('#save-sale').click();await expect(page.locator('#sale-total')).toHaveText('$42.00');
   await page.locator('[name$=":quantity"]').first().fill('7');await page.locator('#save-sale').click();await expect(page.locator('#sales-message')).toContainText('Not enough stock');expect((await records(page)).sales[0].lines[0].quantity).toBe(3);
   await page.locator('[name$=":quantity"]').first().fill('3');await page.locator('[data-return-remove]').click();await confirm(page);
   await page.locator('#cancel-sale').click();await confirm(page);await nav(page,'Stock');await expect(page.locator('[data-stock-card]')).toContainText('5 available');
   await nav(page,'Sales');await range(page);await expect(page.locator('.report-metrics')).toContainText('Number of sales0');await expect(page.locator('.report-metrics')).toContainText('Money received$32.00');
   await nav(page,'Sales');await page.locator('#new-sale').click();await page.locator('[name="add-service"]').selectOption('service-0');await page.locator('#save-sale').click();await page.locator('#delete-sale').click();await confirm(page);expect((await records(page)).sales.length).toBe(1);
   await page.reload();await nav(page,'Stock');await expect(page.locator('[data-stock-card]')).toContainText('5 available');
   for(const size of [{width:375,height:812},{width:600,height:800}]){await page.setViewportSize(size);await nav(page,'Sales');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.locator('#backup-open').scrollIntoViewIfNeeded();await expect(page.locator('#backup-open')).toBeVisible();}
   expect(errors).toEqual([]);expect(await page.evaluate(()=>localStorage.getItem('rokawright.v1'))).toBe('protected-modern');expect(await page.evaluate(()=>localStorage.getItem('rokawright.compat.v1'))).toBe('protected-tablet');
  });
  test('older backup migration, dated correction, job sale and deposit without duplication, frozen price, new backup restore',async({page})=>{
   const old={version:1,customers:[{id:'c',name:'Customer',phone:'123',email:'',notes:'Test only',measurements:{unit:'in',values:{Chest:'32'}}}],services:structuredClone(defaults),jobs:[{id:'j',reference:'RW-old',created:'2026-10-01',due:'',customerId:'c',customerName:'Customer',kind:'Job',status:'Ready',notes:'private test note',instructions:'internal',measurements:{unit:'in',values:{Chest:'32'}},lines:[{id:'l',serviceId:'service-0',name:'Alter pants',quantity:1,cents:500,extraCents:0,extraNote:'',details:''}],payments:[{id:'p',cents:200,note:'Undated deposit'}]}]};
   await page.locator('#backup-open').click();await page.locator('#pasted-backup').locator('..').locator('..').evaluate(el=>el.open=true);await page.locator('#pasted-backup').fill(JSON.stringify(old));await page.locator('#validate-pasted-backup').click();await expect(page.locator('#backup-message')).toContainText('0 sales');await page.locator('#restore').click();await confirm(page);
   await nav(page,'Sales');await expect(page.locator('#app')).toContainText('1 undated payment(s)');await field(page,'fix:j:p','2026-10-07');await page.locator('[data-fix-date]').click();
   await nav(page,'Saved Jobs');await page.locator('[data-record-sale]').click();await field(page,'date','2026-10-08');await page.locator('#save-sale').click();await expect(page.locator('#app')).toContainText('Gross received: $2.00');
   await nav(page,'Saved Jobs');await expect(page.locator('[data-record-sale]')).toHaveText('View linked sale');await page.locator('[data-record-sale]').click();await expect(page.locator('#sale-total')).toHaveText('$5.00');expect((await records(page)).sales.length).toBe(1);
   await nav(page,'Prices');await page.locator('[data-price="service-0"] [name="price"]').fill('99');await page.locator('[data-price="service-0"] button').first().click();await nav(page,'Sales');await range(page);await expect(page.locator('.report-metrics')).toContainText('Sales value$5.00');await expect(page.locator('.report-metrics')).toContainText('Money received$2.00');await expect(page.locator('.report-metrics')).toContainText('Service units sold1');
   await page.locator('[name="report-category"]').selectOption('item');await expect(page.locator('.report-metrics')).toContainText('Sales value$0.00');await page.locator('[name="report-category"]').selectOption('service');await expect(page.locator('.report-metrics')).toContainText('Money received$2.00');
   for(const kind of ['today','week','month','year']){await page.locator('[name="report-period"]').selectOption(kind);await expect(page.locator('#report-period-label')).toContainText('Weeks start Monday');}
   const saved=await records(page);expect(saved.customers).toEqual(old.customers);expect(saved.jobs[0].measurements).toEqual(old.jobs[0].measurements);expect(saved.jobs[0].lines).toEqual(old.jobs[0].lines);expect(saved.jobs[0].payments[0].date).toBe('2026-10-07');
   await page.reload();await page.locator('#backup-open').click();await page.locator('#pasted-backup').locator('..').locator('..').evaluate(el=>el.open=true);await page.locator('#pasted-backup').fill(JSON.stringify(saved));await page.locator('#validate-pasted-backup').click();await expect(page.locator('#backup-message')).toContainText('1 sales');await page.locator('#restore').click();await confirm(page);expect(await records(page)).toEqual(saved);
   await page.locator('#backup-open').click();await page.locator('#pasted-backup').locator('..').locator('..').evaluate(el=>el.open=true);const bad=structuredClone(saved);bad.sales[0].lines[0].quantity=0;await page.locator('#pasted-backup').fill(JSON.stringify(bad));await page.locator('#validate-pasted-backup').click();await expect(page.locator('#restore')).toBeHidden();expect(await records(page)).toEqual(saved);
   await page.locator('#backup-close').click();await nav(page,'Saved Jobs');await page.locator('[data-job-delete]').click();await expect(page.locator('#notice')).toContainText('linked sale');
   await page.locator('[data-open]').click();await page.locator('[name$=":cents"]').fill('9');await page.locator('#save-job').click();await nav(page,'Saved Jobs');await page.locator('[data-record-sale]').click();await expect(page.locator('#sale-total')).toHaveText('$5.00');await page.locator('#refresh-job').click();await confirm(page);await page.locator('#save-sale').click();await expect(page.locator('#sale-total')).toHaveText('$9.00');expect((await records(page)).sales.length).toBe(1);
  });
 });
}

test('saving refuses to overwrite records changed by another tab',async({page})=>{
 await page.goto('./');await nav(page,'Stock');await field(page,'product-name','Unsaved product');
 await page.evaluate(()=>{const next=JSON.parse(localStorage.getItem(window.ROKA_STORAGE_KEY) || '{"version":2,"services":[],"jobs":[],"customers":[],"sales":[],"products":[],"movements":[]}');next.products.push({id:'other-tab',name:'Product from another tab',variant:'',cents:100});localStorage.setItem(window.ROKA_STORAGE_KEY,JSON.stringify(next));});
 await page.locator('#product-save').click();await expect(page.locator('#sales-message')).toContainText('another tab');expect((await records(page)).products.map(p=>p.name)).toEqual(['Product from another tab']);await page.reload();await nav(page,'Stock');await expect(page.locator('#app')).toContainText('Product from another tab');
});
