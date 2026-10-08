import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fresh,validate,defaults } from '../core.js';
import { stock, saleValue, report, period, reportCSV, copyJob, paymentsFor } from '../sales-core.js';
const clone=x=>JSON.parse(JSON.stringify(x));
const line=(id,name,quantity,cents,category='item',productId='')=>({id,name,quantity,cents,category,productId,extraCents:0,extraNote:'',details:''});
const sale=(id,date,lines)=>({id,reference:id,date,lines,customerId:'',customerName:'',notes:'',jobId:'',status:'active',payments:[],returns:[]});
const payment=(id,cents,date)=>({id,cents,date,note:''});
const job=()=>({id:'job-1',reference:'RW-1',created:'2026-10-08',due:'',customerId:'',customerName:'Old customer',kind:'Job',status:'Waiting',notes:'original',instructions:'fit',measurements:{unit:'in',values:{Chest:'32'}},lines:[Object.assign(line('jl','Alter pants',1,500,'service'),{serviceId:'service-0'})],payments:[payment('deposit',200,'2026-10-07')]});
const stocked=()=>{const d=fresh();d.products=[{id:'rag',name:'Do-rag',variant:'Blue',cents:1000}];d.movements=[{id:'m',productId:'rag',date:'2026-10-01',kind:'production',quantity:5,reason:'Batch sewn'}];return d;};

test('five made minus two sold leaves three; totals, edits, returns, cancellation and negative stock are derived exactly once',()=>{
 const d=stocked();d.sales=[sale('s','2026-10-08',[line('l','Do-rag · Blue',2,1000,'item','rag'),line('h','Hoodie',1,1200)])];validate(d);
 assert.equal(saleValue(d.sales[0]),3200);assert.equal(stock(d,'rag').available,3);
 d.sales[0].lines[0].quantity=3;validate(d);assert.equal(stock(d,'rag').available,2);validate(d);assert.equal(stock(d,'rag').available,2);
 const invalid=clone(d);invalid.sales[0].lines[0].quantity=6;assert.throws(()=>validate(invalid),/Not enough stock/);assert.equal(stock(d,'rag').available,2);
 d.sales[0].returns=[{id:'r',lineId:'l',date:'2026-10-09',quantity:1,cents:1000,cashCents:0,restock:true,reason:'Unused return / credit'}];validate(d);assert.equal(stock(d,'rag').available,3);
 const r=report(d,{start:'2026-10-08',end:'2026-10-09'});assert.equal(r.sales,4200);assert.equal(r.refunds,1000);assert.equal(r.net,3200);assert.equal(r.rows.find(x=>x.name.startsWith('Do-rag')).returned,1);
 d.sales[0].returns=[];d.sales[0].status='cancelled';validate(d);assert.equal(stock(d,'rag').available,5);assert.equal(report(d,{start:'2026-10-01',end:'2026-10-31'}).count,0);
 d.sales[0].status='active';validate(d);assert.equal(stock(d,'rag').available,2);
 d.sales=[];validate(d);assert.equal(stock(d,'rag').available,5);
});
test('opening counts, reasoned adjustments, corrections, excess returns and refund validations',()=>{
 const d=stocked();d.movements.push({id:'o',productId:'rag',date:'2026-09-01',kind:'opening',quantity:2,reason:'Initial count'},{id:'a',productId:'rag',date:'2026-10-08',kind:'adjustment',quantity:-1,reason:'Damaged'});validate(d);assert.equal(stock(d,'rag').available,6);
 d.sales=[sale('s','2026-10-08',[line('l','rag',6,1000,'item','rag')])];validate(d);assert.equal(stock(d,'rag').available,0);
 const correction=clone(d);correction.movements[0].quantity=4;assert.throws(()=>validate(correction),/Not enough stock/);
 const noReason=clone(d);noReason.movements[0].reason='';assert.throws(()=>validate(noReason));
 d.sales[0].payments=[payment('p',6000,'2026-10-08')];d.sales[0].returns=[{id:'r',lineId:'l',date:'2026-10-09',quantity:1,cents:1000,cashCents:1000,restock:true,reason:'Refund'}];validate(d);
 let r=report(d,{start:'2026-10-09',end:'2026-10-09'});assert.equal(r.sales,0);assert.equal(r.net,-1000);assert.equal(r.cashRefunds,1000);assert.equal(r.received,0);
 const bad=clone(d);bad.sales[0].returns[0].quantity=7;assert.throws(()=>validate(bad));
 bad.sales[0].returns[0].quantity=1;bad.sales[0].returns[0].cashCents=1001;assert.throws(()=>validate(bad));
 bad.sales[0].returns[0].cashCents=1000;bad.sales[0].payments=[];assert.throws(()=>validate(bad),/Money refunded exceeds/);
 bad.sales[0].payments=d.sales[0].payments;bad.sales[0].status='cancelled';assert.throws(()=>validate(bad),/returned sale/);
});
test('job sale is explicit, payments shared once, historical prices frozen and duplicate links rejected',()=>{
 const d=stocked();d.jobs=[job()];let n=0;const s=copyJob(d.jobs[0],()=>`copy-${++n}`,'2026-10-08');d.sales.push(s);validate(d);
 assert.equal(stock(d,'rag').available,5);assert.equal(report(d,{start:'2026-10-01',end:'2026-10-31'}).received,200);
 assert.equal(paymentsFor(d,s),d.jobs[0].payments);d.jobs[0].payments.push(payment('more',300,'2026-10-09'));d.jobs[0].lines[0].cents=900;d.services[0].cents=9900;validate(d);
 assert.equal(saleValue(s),500);let r=report(d,{start:'2026-10-08',end:'2026-10-08'});assert.equal(r.sales,500);assert.equal(r.services,1);assert.equal(r.items,0);assert.equal(r.received,0);
 r=report(d,{start:'2026-10-01',end:'2026-10-31'});assert.equal(r.received,500);assert.equal(r.count,1);
 const bad=clone(d);bad.sales.push(copyJob(d.jobs[0],()=>`copy-${++n}`,'2026-10-09'));assert.throws(()=>validate(bad),/already has a sale/);
 const duplicated=clone(d);duplicated.sales[0].payments.push(payment('dup',200,'2026-10-07'));assert.throws(()=>validate(duplicated),/duplicate payments/);
 const missing=clone(d);missing.jobs=[];assert.throws(()=>validate(missing));
});
test('inclusive local day, Monday week, month, leap-year and custom boundaries',()=>{
 assert.deepEqual(period('today','2026-10-08'),{start:'2026-10-08',end:'2026-10-08'});
 assert.deepEqual(period('week','2026-10-11'),{start:'2026-10-05',end:'2026-10-11'});
 assert.deepEqual(period('week','2026-10-12'),{start:'2026-10-12',end:'2026-10-18'});
 assert.deepEqual(period('week','2026-01-01'),{start:'2025-12-29',end:'2026-01-04'});
 assert.deepEqual(period('month','2024-02-29'),{start:'2024-02-01',end:'2024-02-29'});
 assert.deepEqual(period('year','2026-10-08'),{start:'2026-01-01',end:'2026-12-31'});
 assert.throws(()=>period('custom','2026-10-08','2026-02-30','2026-10-08'));
 assert.throws(()=>period('custom','2026-10-08','2026-10-09','2026-10-08'));
 const d=fresh();['2025-12-31','2026-01-01','2026-10-05','2026-10-08','2026-10-11','2026-10-12','2026-10-31','2026-11-01','2026-12-31','2027-01-01'].forEach((date,i)=>d.sales.push(sale('s'+i,date,[line('l'+i,'Item',1,100)])));
 for(const [kind,count] of [['today',1],['week',3],['month',5],['year',8]])assert.equal(report(d,period(kind,'2026-10-08')).count,count);
 assert.equal(report(d,period('custom','2026-10-08','2026-10-08','2026-10-12')).count,3);
});
test('migration preserves existing sections, missing dates remain undated, backups round-trip and malformed imports never mutate input',()=>{
 const old={version:1,customers:[{id:'c',name:'Customer',phone:'123',email:'',notes:'note',measurements:{unit:'cm',values:{Chest:'81.28'}}}],jobs:[job()],services:clone(defaults)};
 delete old.jobs[0].payments[0].date;
 const original=clone(old),migrated=validate(old);assert.deepEqual(old,original);assert.equal(migrated.version,2);assert.deepEqual(migrated.customers,old.customers);assert.deepEqual(migrated.services,old.services);assert.equal(migrated.jobs[0].payments[0].date,'');assert.equal(migrated.jobs[0].lines[0].cents,500);assert.equal(migrated.jobs[0].measurements.values.Chest,'32');
 const r=report(migrated,{start:'2026-01-01',end:'2026-12-31'});assert.equal(r.undated.length,1);assert.equal(r.received,0);assert.equal(r.count,0);
 assert.deepEqual(validate(JSON.parse(JSON.stringify(migrated))),migrated);
 const invalid=clone(migrated);invalid.sales=[sale('s','2026-02-30',[line('l','Item',1,100)])];const before=clone(invalid);assert.throws(()=>validate(invalid));assert.deepEqual(invalid,before);
});
test('category reporting conserves mixed payment cents, standalone balances and CSV period/value/escaping',()=>{
 const d=fresh();const s=sale('s','2026-10-08',[line('l','Do-rag',2,1000),line('h','Hoodie',1,1200),line('a','=SUM(A1) "alter", pants',1,500,'service')]);s.lines[0].extraCents=300;s.payments=[payment('p',901,'2026-10-09'),payment('undated',200,'')];d.sales=[s];validate(d);
 const range={start:'2026-10-08',end:'2026-10-09'},all=report(d,range),items=report(d,range,'item'),services=report(d,range,'service');
 assert.equal(all.sales,4000);assert.equal(all.items,3);assert.equal(all.services,1);assert.equal(all.received,901);assert.equal(all.undated.length,1);assert.equal(items.received+services.received,all.received);assert.equal(items.sales+services.sales,all.sales);
 const csv=reportCSV(all,range,'all');assert.match(csv,/2026-10-08/);assert.match(csv,/2026-10-09/);assert.match(csv,/"40.00"/);assert.match(csv,/"9.01"/);assert.match(csv,/"'=SUM\(A1\) ""alter"", pants"/);
});
