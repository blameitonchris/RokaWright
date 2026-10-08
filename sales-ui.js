import { amount, quantity, money } from './core.js';
import { categoryFor, copyJob, stock, saleValue, refundValue, paymentsFor, lineValue, period, report, reportCSV } from './sales-core.js';

export function salesScreens(c) {
  const { $, esc, input, area, select, intro, id, today, commit, toast, askConfirm } = c;
  const get = () => c.data();
  let editing = null, stockEdit = null, filter = 'month', start = today(), end = today(), category = 'all';
  const buttons = (selector, fn) => document.querySelectorAll(selector).forEach(b => b.onclick = () => fn(b));
  const dollars = n => (n / 100).toFixed(2);
  const panel = html => '<section class="panel">'+html+'</section>';
  const fail = e => { const el = $('#sales-message'); if (el) el.textContent=e.message; toast(e.message); };
  const save = (fn) => {
    let error;
    const result = commit(d => { try { fn(d); } catch(e) { error=e; throw e; } });
    if (!result && $('#sales-message')) $('#sales-message').textContent=error ? error.message : c.error();
    return result;
  };
  function blank() { return {id:id(),reference:'Sale-'+today()+'-'+id().slice(0,6),date:today(),customerId:'',customerName:'',notes:'',jobId:'',status:'active',lines:[],payments:[],returns:[]}; }
  function freshLine() { return {id:id(),name:'',quantity:1,cents:0,extraCents:0,extraNote:'',details:'',category:'service',productId:''}; }
  function paymentFixes(r) {
    return !r.undated.length ? '' : panel(`<h2>Payments need dates</h2><p>${r.undated.length} undated payment(s) are excluded from every dated report. Supply the actual date from your records; no date has been guessed.</p>${r.undated.map(p => `<div class="line"><b>${esc(p.reference)} · ${money(p.cents)}</b><div class="fields">${input('Actual payment date','fix:'+p.sourceId+':'+p.paymentId,'','date')}</div><button type="button" data-fix-date="${p.paymentId}" data-source="${p.sourceId}" data-type="${p.type}">Save payment date</button></div>`).join('')}`);
  }
  function renderSales() {
    if (editing) return editor();
    const range = period(filter,today(),start,end), r = report(get(),range,category);
    $('#app').innerHTML = intro('The work, counted.','Sales, returns and money received. Business costs are not tracked.') +
      `<div class="actions"><button id="new-sale" type="button">+ Record a sale</button></div>`+
      panel(`<h2>Sales dashboard</h2><div class="fields">${select('Reporting period','report-period',filter,[['today','Today'],['week','This week'],['month','This month'],['year','This year'],['custom','Custom dates']])}${select('Include','report-category',category,[['all','All sales'],['item','Made items'],['service','Alterations / other services']])}${filter === 'custom' ? input('Start date (included)','report-start',start,'date')+input('End date (included)','report-end',end,'date')+'<button type="button" id="apply-range">Apply dates</button>' : ''}</div><p id="report-period-label"><b>${range.start} through ${range.end}</b> · Both dates included · Weeks start Monday.</p>`+
      `<div class="report-metrics">${[['Sales value',money(r.sales)],['Refunds / credits',money(r.refunds)],['Net sales',money(r.net)],['Number of sales',r.count],['Made item units sold',r.items],['Service units sold',r.services],['Money received',money(r.received)],['Money paid back',money(r.cashRefunds)],['Net money received',money(r.received-r.cashRefunds)]].map(([name,value])=>`<div><span>${name}</span><strong>${value}</strong></div>`).join('')}</div><p class="hint">Sales use the sale date. Returns and refunds use the return/refund date. Money received is gross payments by payment date, including job deposits. Refund value includes customer credit; money paid back shows actual cash refunds. Mixed payments are allocated by item/service value when filtered. Cancelled sales are excluded from sales figures; their actual receipts stay in the payment record. These figures are not profit.</p><div class="actions"><button id="report-print" type="button">Printable summary</button><button id="report-csv" type="button" class="quiet">Export CSV</button></div>`)+
      panel(summary(r,range,category)) + paymentFixes(r) +
      panel('<h2>Sales records</h2><input id="sale-search" aria-label="Search sales" placeholder="Search reference, customer, item or service"><div id="sale-list" class="records"></div>');
    $('#new-sale').onclick = () => {editing=blank();editor();};
    $('[name="report-period"]').onchange = e => { filter=e.target.value; renderSales(); };
    $('[name="report-category"]').onchange = e => {category=e.target.value;renderSales();};
    if ($('#apply-range')) $('#apply-range').onclick = () => {
      try { const a=$('[name="report-start"]').value,b=$('[name="report-end"]').value; period('custom',today(),a,b);start=a;end=b;renderSales(); } catch(e){toast(e.message);}
    };
    $('#report-csv').onclick = () => RokaCompat.saveText(reportCSV(r,range,category),'RokaWright-sales-'+range.start+'-to-'+range.end+'.csv','text/csv;charset=utf-8');
    $('#report-print').onclick = () => printable(r,range,category);
    buttons('[data-fix-date]', b => {
      const date=$('[name="fix:'+b.dataset.source+':'+b.dataset.fixDate+'"]').value;
      if (!date) return toast('Supply the actual payment date.');
      if (save(d => {const source=(b.dataset.type === 'job' ? d.jobs : d.sales).find(x => x.id===b.dataset.source); source.payments.find(p=>p.id===b.dataset.fixDate).date=date;})) renderSales();
    });
    const list = () => {
      const query=$('#sale-search').value.toLowerCase();
      $('#sale-list').innerHTML=get().sales.slice().reverse().filter(s => (s.reference+' '+s.customerName+' '+s.lines.map(l=>l.name).join(' ')).toLowerCase().includes(query)).map(s=>`<article class="record"><div class="eyebrow">${esc(s.reference)} · ${s.date}</div><h3>${esc(s.customerName || 'Walk-in sale')}</h3><p>${s.lines.map(l=>esc(l.name)+' × '+l.quantity).join('<br>')}</p><p><b>${money(saleValue(s))}</b> · ${s.status}${s.returns.length ? ' · Refunds '+money(refundValue(s)) : ''}</p><p class="muted">${s.jobId ? 'Linked job · payments shared with original job' : 'Standalone sale'}</p><button type="button" class="small" data-sale-open="${s.id}">View / edit sale</button></article>`).join('') || '<p class="empty">No matching sales. Saved jobs become sales only when you choose Record sale.</p>';
      buttons('[data-sale-open]',b=>{editing=structuredClone(get().sales.find(s=>s.id===b.dataset.saleOpen));editor();});
    };
    list(); $('#sale-search').oninput=list;
  }
  function table(headers,rows) {
    return `<div class="table-scroll" tabindex="0" role="region" aria-label="Scrollable report table"><table class="sales-table"><thead><tr>${headers.map(h=>'<th scope="col">'+h+'</th>').join('')}</tr></thead><tbody>${rows.map(row=>'<tr>'+row.map(v=>'<td>'+v+'</td>').join('')+'</tr>').join('')}</tbody></table></div>`;
  }
  function summary(r,range,cat) {
    const max=Math.max(1,...r.days.map(d=>Math.max(d.sales,d.refunds)));
    return `<h2>Sales over time</h2><p>${range.start} through ${range.end} · ${cat === 'all' ? 'All sales' : cat === 'item' ? 'Made items' : 'Alterations / other services'}</p><p class="hint">Days without sales or refunds have zero activity and are omitted. Bars show sales before refunds. The table below provides exact amounts.</p><div class="sales-chart" role="img" aria-label="Sales by date; exact values in the following table">${r.days.map(d=>`<div class="chart-row"><span>${d.date}</span><div class="chart-track"><div class="chart-bar" style="width:${Math.round(d.sales/max*100)}%"></div></div><b>${money(d.sales)}</b></div>`).join('') || '<p>No sales in this period.</p>'}</div><details open><summary>Sales over time — table</summary>${table(['Date','Sales','Refunds','Net sales'],r.days.map(d=>[d.date,money(d.sales),money(d.refunds),money(d.net)]))}</details><h2>Item / service breakdown</h2>${table(['Item / service','Category','Units sold','Units returned','Sales','Refunds','Net sales'],r.rows.map(x=>[esc(x.name),x.category==='item'?'Made item':'Service',x.quantity,x.returned,money(x.sales),money(x.refunds),money(x.net)]))}<p><b>Best seller by net units:</b> ${r.bestQuantity ? esc(r.bestQuantity.name)+' · '+(r.bestQuantity.quantity-r.bestQuantity.returned) : 'No activity'}<br><b>Best seller by net sales value:</b> ${r.bestValue ? esc(r.bestValue.name)+' · '+money(r.bestValue.net) : 'No activity'}</p>`;
  }
  function printable(r,range,cat) {
    const html=`<h1>RokaWright · Sales summary</h1><p>${range.start} through ${range.end} (inclusive) · Weeks start Monday.</p><p>Sales value: ${money(r.sales)}<br>Refunds / credits: ${money(r.refunds)}<br>Net sales: ${money(r.net)}<br>Number of sales: ${r.count}<br>Made item units sold: ${r.items}<br>Service units sold: ${r.services}<br>Money received by payment date: ${money(r.received)}<br>Money paid back: ${money(r.cashRefunds)}<br>Net money received: ${money(r.received-r.cashRefunds)}<br>Undated payments excluded: ${r.undated.length}</p><p>Money received is gross receipts, including deposits. Refund value includes customer credit; money paid back is the actual cash refunded. Cancelled sales excluded; their receipts retained. Category-filtered payments allocated by line value. No costs or profit tracked.</p>${summary(r,range,cat)}`;
    document.querySelector('.print-only')?.remove();
    const sheet=document.createElement('section');sheet.className='print-only sales-print';sheet.innerHTML=html;document.body.appendChild(sheet);
    const dialog=document.createElement('dialog');dialog.className='report-dialog';
    dialog.innerHTML='<h2>Your report is ready</h2><div class="actions"><button type="button" data-report-full>View full summary</button><button type="button" data-report-text class="quiet">Copy summary text</button><button type="button" data-report-paper class="quiet">Print / Save as PDF</button><button type="button" data-report-close class="quiet">Close</button></div><p>Older tablets: use the full summary, copy text, or screenshots. Transfer a private backup to a newer device for printing.</p>';
    document.body.appendChild(dialog);RokaCompat.showDialog(dialog);
    dialog.querySelector('[data-report-close]').onclick=()=>{RokaCompat.closeDialog(dialog);dialog.remove();};
    dialog.querySelector('[data-report-text]').onclick=()=>RokaCompat.textAlternative(sheet.innerText || sheet.textContent,'Copy sales summary','Select and copy this summary. The CSV export also provides the complete figures as copyable text when downloads are unavailable.');
    dialog.querySelector('[data-report-paper]').hidden=RokaCompat.legacy || typeof window.print !== 'function';
    dialog.querySelector('[data-report-paper]').onclick=()=>window.print();
    dialog.querySelector('[data-report-full]').onclick=()=>{
      RokaCompat.closeDialog(dialog);document.body.className+=' quote-view';
      const controls=document.createElement('div');controls.className='quote-controls';controls.innerHTML='<button type="button">Back to sales</button>';
      controls.querySelector('button').onclick=()=>{document.body.className=document.body.className.replace(/\s*quote-view\b/g,'');controls.remove();window.scrollTo(0,0);};
      sheet.insertBefore(controls,sheet.firstChild);window.scrollTo(0,0);
    };
  }
  function capture() {
    const form=$('#sale-form'),s=editing;
    for (const k of ['reference','date','customerId','customerName','notes']) s[k]=form.elements[k].value.trim();
    s.lines.forEach(l=>{
      for(const k of ['name','category','productId','extraNote','details']) l[k]=form.elements[l.id+':'+k].value.trim();
      l.quantity=quantity(form.elements[l.id+':quantity'].value); l.cents=amount(form.elements[l.id+':cents'].value);l.extraCents=amount(form.elements[l.id+':extraCents'].value);
    });
    return s;
  }
  function storeDraft() {
    try {
      capture();
      return save(d=>{ const i=d.sales.findIndex(s=>s.id===editing.id);if(i<0)d.sales.push(structuredClone(editing));else d.sales[i]=structuredClone(editing); });
    } catch(e) {fail(e); return false;}
  }
  function editor() {
    const s=editing,d=get(),exists=d.sales.some(x=>x.id===s.id),linked=s.jobId ? d.jobs.find(j=>j.id===s.jobId) : null;
    const receipts=exists ? paymentsFor(d,d.sales.find(x=>x.id===s.id)).reduce((n,p)=>n+p.cents,0) : (linked ? linked.payments : s.payments).reduce((n,p)=>n+p.cents,0);
    $('#app').innerHTML=intro(exists?'Sale details.':'Record the finished work.','Actual prices are saved with the sale; extra-work charges apply once per line.')+
      `<form id="sale-form" novalidate>${panel(`<h2>${esc(s.reference)}</h2><p>Status: <b>${s.status}</b>${linked ? ' · Linked to '+esc(linked.reference)+' · Payments belong to the original job.' : ''}</p><div class="fields">${input('Sale reference','reference',s.reference)}${input('Sale date','date',s.date,'date')}${select('Customer (optional)','customerId',s.customerId,[['','No customer profile'],...d.customers.map(x=>[x.id,x.name]),...(s.customerId&&!d.customers.some(x=>x.id===s.customerId)?[[s.customerId,s.customerName+' (removed profile)']]:[])])}${input('Customer name','customerName',s.customerName)}</div>${area('Sale notes','notes',s.notes)}${linked ? '<button type="button" id="refresh-job" class="quiet">Update lines explicitly from original job</button><p class="hint">Later job edits never change these sale lines automatically. Copied made items are made-to-order; select a stocked product only if fulfilling from ready-made stock.</p>' : ''}`)}
      ${panel(`<h2>Items and services</h2><div class="fields">${select('Add from price list','add-service','',[['','Choose a service'],...d.services.map(x=>[x.id,x.name])])}${select('Add ready-made stock','add-product','',[['','Choose a stocked product'],...d.products.map(p=>[p.id,p.name+(p.variant?' · '+p.variant:'')+' · '+stock(d,p.id).available+' available'])])}</div><button type="button" id="add-sale-line" class="quiet">+ Add custom item / service</button>${s.lines.map(l=>`<div class="line"><div class="fields">${input('Item / service name',l.id+':name',l.name)}${select('Category',l.id+':category',l.category,[['item','Made item'],['service','Alteration / other service']])}${select('Stock use',l.id+':productId',l.productId,[['','Made to order / service — no stock used'],...d.products.map(p=>[p.id,p.name+(p.variant?' · '+p.variant:'')])])}${input('Quantity',l.id+':quantity',l.quantity,'number','min="1" step="1"')}${input('Actual unit price ($)',l.id+':cents',dollars(l.cents),'number','min="0" step="0.01"')}${input('Extra work ($, once for this line)',l.id+':extraCents',dollars(l.extraCents),'number','min="0" step="0.01"')}</div>${input('Extra-work explanation',l.id+':extraNote',l.extraNote)}${input('Item / service details',l.id+':details',l.details)}<p>Saved line total: ${money(lineValue(l))}</p><button type="button" class="danger small" data-remove-line="${l.id}">Remove line</button></div>`).join('')}`)}
      ${panel(`<h2>Sale total: <span id="sale-total">${money(saleValue(s))}</span></h2><p>Refunds: ${money(refundValue(s))} · Gross received: ${money(receipts)} · Money paid back: ${money(s.returns.reduce((n,r)=>n+r.cashCents,0))} · ${(s.status==='cancelled'?0:saleValue(s)-refundValue(s))-receipts+s.returns.reduce((n,r)=>n+r.cashCents,0) < 0 ? 'Overpayment / refund due' : 'Balance remaining'}: ${money(Math.abs((s.status==='cancelled'?0:saleValue(s)-refundValue(s))-receipts+s.returns.reduce((n,r)=>n+r.cashCents,0)))}</p><p id="sales-message" role="status"></p><div class="actions"><button id="save-sale" type="button">Save sale</button><button id="close-sale" type="button" class="quiet">Back to sales</button>${exists ? `<button id="cancel-sale" type="button" class="danger">${s.status==='cancelled'?'Reactivate sale':'Cancel sale'}</button><button id="delete-sale" type="button" class="danger">Delete sale</button>` : ''}</div><p class="hint">Save changes to update totals and stock. Closing discards unsaved edits. Cancelling excludes the sale from reports and releases its stock; received payments remain in the audit record. For an actual customer refund, record a return/refund instead of cancelling.</p>`)}
      </form>${exists ? paymentsPanel(d.sales.find(x=>x.id===s.id),linked)+returnsPanel(d.sales.find(x=>x.id===s.id)) : '<p class="hint">Save this sale before recording payments or returns.</p>'}`;
    $('#sale-form').oninput=()=>{try{capture();$('#sale-total').textContent=money(saleValue(s));}catch(e){$('#sale-total').textContent='Check amounts / quantities';}};
    $('#sale-form').onsubmit=e=>{e.preventDefault();storeDraft();};
    $('#save-sale').onclick=()=>{if(storeDraft()){toast('Sale saved. Stock and reports updated.');editing=structuredClone(get().sales.find(x=>x.id===s.id));editor();}};
    $('#close-sale').onclick=async()=>{if(await askConfirm('Close this sale? Unsaved edits will be discarded.')){editing=null;renderSales();}};
    $('[name="customerId"]').onchange=e=>{const customer=get().customers.find(x=>x.id===e.target.value);if(customer)$('[name="customerName"]').value=customer.name;};
    const add = l => {try {capture();s.lines.push(l);editor();}catch(e){fail(e);}};
    $('#add-sale-line').onclick=()=>add(freshLine());
    $('[name="add-service"]').onchange=e=>{const source=d.services.find(x=>x.id===e.target.value);if(source)add(Object.assign(freshLine(),{name:source.name,cents:source.cents || 0,category:categoryFor(source.name)}));};
    $('[name="add-product"]').onchange=e=>{const p=d.products.find(x=>x.id===e.target.value);if(p)add(Object.assign(freshLine(),{name:p.name+(p.variant?' · '+p.variant:''),cents:p.cents,category:'item',productId:p.id}));};
    buttons('[data-remove-line]',async b=>{if(await askConfirm('Remove this sale line?')){try{capture();s.lines=s.lines.filter(l=>l.id!==b.dataset.removeLine);editor();}catch(e){fail(e);}}});
    if($('#refresh-job'))$('#refresh-job').onclick=async()=>{if(await askConfirm('Replace sale lines with the job’s current lines and actual prices? Save the sale to apply this change. Existing returns must be reversed first.')){if(s.returns.length)return toast('Reverse existing returns first.');try{capture();s.lines=copyJob(linked,id,s.date).lines;editor();}catch(e){fail(e);}}};
    if(!exists)return;
    $('#cancel-sale').onclick=async()=>{
      if(!(await savedTransaction()))return;
      if(await askConfirm(s.status==='active'?'Cancel this sale, exclude its sales value, and release stock? Payments remain recorded; issue any actual refund before cancellation instead. Returned sales must keep their return history.':'Reactivate this sale and consume its ready-made stock again?')){
        if(save(d=>{d.sales.find(x=>x.id===s.id).status=s.status==='active'?'cancelled':'active';})) {editing=structuredClone(get().sales.find(x=>x.id===s.id));editor();}
      }
    };
    $('#delete-sale').onclick=async()=>{
      if(s.jobId || paymentsFor(get(),s).length || s.returns.length) return toast('Keep this sale’s linked job, payment or return history. Use Cancel for an unreturned sale, or record a return/refund instead.');
      if(await askConfirm('Permanently delete this unpaid sale and release its stock? Its historical sales figures will be removed.')){
        if(save(d=>{d.sales=d.sales.filter(x=>x.id!==s.id);})){editing=null;renderSales();}
      }
    };
    bindPayments(s,linked);bindReturns(s);
  }
  function paymentsPanel(s,linked) {
    const payments=paymentsFor(get(),s);
    return panel(`<h2>Payments</h2><p>${linked ? 'These are the original job’s payments, linked once. To add or remove a payment, edit and save the original job in Saved Jobs.' : 'Payments use their actual receipt date, independently of the sale date.'}</p>${payments.map(p=>`<div class="line"><b>${money(p.cents)}</b> · ${esc(p.date || 'Undated — excluded from dated reports')} · ${esc(p.note)}${!p.date ? `<div class="fields">${input('Actual payment date','payment-fix:'+p.id,'','date')}</div><button type="button" data-sale-payment-fix="${p.id}">Save actual date</button>` : ''}${!linked ? `<button type="button" class="danger small" data-sale-payment-remove="${p.id}">Remove payment</button>` : ''}</div>`).join('') || '<p>No payments recorded.</p>'}${!linked ? `<div class="fields">${input('Payment received ($)','sale-payment-amount','','number','min="0.01" step="0.01"')}${input('Actual payment date','sale-payment-date',today(),'date')}${input('Payment note','sale-payment-note','')}</div><button type="button" id="sale-payment-add">Record payment</button>` : ''}<p class="hint">Save sale edits before making payment or return changes; those actions reload the saved sale.</p>`);
  }
  async function savedTransaction() {
    try {
      capture();
      const stored=get().sales.find(s=>s.id===editing.id);
      if(JSON.stringify(editing)!==JSON.stringify(stored))
        return await askConfirm('This action uses the saved sale and discards unsaved sale edits. Continue? Choose Cancel and Save sale first to keep your edits.');
      return true;
    } catch(e) {fail(e);return false;}
  }
  function reloadEditing() {editing=structuredClone(get().sales.find(x=>x.id===editing.id));editor();}
  function bindPayments(s,linked) {
    if($('#sale-payment-add'))$('#sale-payment-add').onclick=async()=>{
      if(!(await savedTransaction()))return;
      try {
        const p={id:id(),cents:amount($('[name="sale-payment-amount"]').value),date:$('[name="sale-payment-date"]').value,note:$('[name="sale-payment-note"]').value};
        if(!p.date || !p.cents)throw Error('Enter a positive payment and its actual date.');
        if(save(d=>d.sales.find(x=>x.id===s.id).payments.push(p)))reloadEditing();
      }catch(e){fail(e);}
    };
    buttons('[data-sale-payment-fix]',async b=>{
      if(!(await savedTransaction()))return;
      const date=$('[name="payment-fix:'+b.dataset.salePaymentFix+'"]').value;
      if(!date)return toast('Enter the actual payment date.');
      if(save(d=>{const source=linked?d.jobs.find(j=>j.id===linked.id):d.sales.find(x=>x.id===s.id);source.payments.find(p=>p.id===b.dataset.salePaymentFix).date=date;}))reloadEditing();
    });
    buttons('[data-sale-payment-remove]',async b=>{if(!(await savedTransaction()))return;if(await askConfirm('Remove this payment record? This corrects an entry; it does not issue a customer refund.'))if(save(d=>{const sale=d.sales.find(x=>x.id===s.id);sale.payments=sale.payments.filter(p=>p.id!==b.dataset.salePaymentRemove);}))reloadEditing();});
  }
  function returnsPanel(s) {
    return panel(`<h2>Returns and refunds</h2><p>Use quantity 0 for a price refund without returned goods. Enter the value refunded or credited, and the money actually paid back separately (0 for credit against an unpaid balance). Extra-work charges are not automatically multiplied or refunded. Restock only usable ready-made goods physically returned.</p>${s.returns.map(r=>{const l=s.lines.find(l=>l.id===r.lineId);return `<div class="line">${r.date} · ${esc(l.name)} · Returned ${r.quantity} · Refund / credit ${money(r.cents)} · Paid back ${money(r.cashCents)}${r.restock?' · Restocked':''}<br>${esc(r.reason)}<br><button type="button" class="danger small" data-return-remove="${r.id}">Reverse mistaken return / refund</button></div>`;}).join('') || '<p>No returns or refunds.</p>'}${s.status==='active' ? `<div class="fields">${select('Returned / refunded line','return-line',s.lines[0].id,s.lines.map(l=>[l.id,l.name]))}${input('Return / refund date','return-date',today(),'date')}${input('Quantity returned (0 for refund only)','return-quantity','0','number','min="0" step="1"')}${input('Refund / credit value ($)','return-amount','0.00','number','min="0" step="0.01"')}${input('Money actually paid back ($)','return-cash','0.00','number','min="0" step="0.01"')}${select('Return usable goods to stock?','return-restock','no',[['no','No'],['yes','Yes — ready-made goods only']])}${input('Reason (required)','return-reason','')}</div><button type="button" id="return-add">Record return / refund</button>` : '<p>Reactivate a cancelled sale before recording a return.</p>'}`);
  }
  function bindReturns(s) {
    if($('#return-add'))$('#return-add').onclick=async()=>{
      if(!(await savedTransaction()))return;
      try{
        const q=$('[name="return-quantity"]').value;
        if(!/^\d+$/.test(q))throw Error('Return quantity must be a whole number, including zero.');
        const r={id:id(),lineId:$('[name="return-line"]').value,date:$('[name="return-date"]').value,quantity:Number(q),cents:amount($('[name="return-amount"]').value),cashCents:amount($('[name="return-cash"]').value),restock:$('[name="return-restock"]').value==='yes',reason:$('[name="return-reason"]').value.trim()};
        if(await askConfirm(`Record ${r.quantity} returned unit(s) and ${money(r.cents)} refunded/credited, including ${money(r.cashCents)} actually paid back? ${r.restock?'Returned goods will be restocked.':''}`))if(save(d=>d.sales.find(x=>x.id===s.id).returns.push(r)))reloadEditing();
      }catch(e){fail(e);}
    };
    buttons('[data-return-remove]',async b=>{if(!(await savedTransaction()))return;if(await askConfirm('Reverse this mistaken return/refund record? This may remove previously restocked units. It does not collect money from a customer.'))if(save(d=>{const sale=d.sales.find(x=>x.id===s.id);sale.returns=sale.returns.filter(r=>r.id!==b.dataset.returnRemove);}))reloadEditing();});
  }
  function recordJob(jobId) {
    const existing=get().sales.find(s=>s.jobId===jobId);
    editing=existing ? structuredClone(existing) : copyJob(get().jobs.find(j=>j.id===jobId),id,today());
    c.show('sales');
  }
  function renderStock() {
    const d=get(),p=stockEdit ? structuredClone(d.products.find(p=>p.id===stockEdit)) : {id:id(),name:'',variant:'',cents:0};
    $('#app').innerHTML=intro('Made, sold, ready.','Stock is optional. Made-to-order work and alterations never use ready-made stock.')+
      panel(`<h2>${stockEdit?'Edit stocked product':'Add a stocked product'}</h2><div id="product-form"><div class="fields">${input('Product name','product-name',p.name)}${input('Variant (optional size / color)','product-variant',p.variant)}${input('Suggested selling price ($)','product-price',dollars(p.cents),'number','min="0" step="0.01"')}</div><div class="actions"><button type="button" id="product-save">Save product</button><button type="button" id="product-clear" class="quiet">Clear product form</button></div></div><p class="hint">Names, variants and actual prices are copied into each sale. Editing this product leaves historical sales unchanged.</p>`)+
      panel(`<h2>Record production / stock count</h2><p>Opening stock adds the initial quantity. An adjustment is a signed change, not a replacement count: for example, enter −2 for two damaged items. Every stock entry needs a reason.</p><div class="fields">${select('Stocked product','movement-product','',d.products.map(p=>[p.id,p.name+(p.variant?' · '+p.variant:'')]))}${select('Stock entry','movement-kind','production',[['production','Production — newly made'],['opening','Opening stock'],['adjustment','Adjustment — signed change']])}${input('Production / adjustment date','movement-date',today(),'date')}${input('Quantity (signed for adjustments)','movement-quantity','1','number','step="1"')}${input('Reason','movement-reason','Made ahead of time')}</div><button type="button" id="movement-save">Save stock entry</button><p id="sales-message" role="status"></p>`)+
      `<div class="records">${d.products.map(p=>{const s=stock(d,p.id);return `<article class="record" data-stock-card="${p.id}"><h2>${esc(p.name)}</h2><p>${esc(p.variant || 'No variant')}</p><div class="big-total">${s.available} available</div><p>Made: ${s.made} · Opening: ${s.opening} · Adjustments: ${s.adjustments}<br>Sold: ${s.sold} · Returned to stock: ${s.returned}</p><button type="button" class="small" data-product-edit="${p.id}">Edit product</button></article>`;}).join('') || '<p class="empty">No stocked products yet. Add a product and record five made units to start.</p>'}</div>`+
      panel(`<h2>Production and adjustments</h2><p>Corrections must leave available stock non-negative. If an entry cannot be removed, correct the related sale or record a reasoned adjustment first.</p>${d.movements.slice().reverse().map(m=>{const p=d.products.find(p=>p.id===m.productId);return `<div class="line">${m.date} · <b>${esc(p.name)}${p.variant?' · '+esc(p.variant):''}</b> · ${m.kind}: ${m.quantity}<br>${esc(m.reason)}<br><button type="button" class="quiet small" data-movement-edit="${m.id}">Correct entry</button><button type="button" class="danger small" data-movement-remove="${m.id}">Remove mistaken entry</button></div>`;}).join('') || '<p>No stock entries.</p>'}`);
    $('#product-save').onclick=()=>{try{p.name=$('[name="product-name"]').value.trim();p.variant=$('[name="product-variant"]').value.trim();p.cents=amount($('[name="product-price"]').value);if(save(d=>{const i=d.products.findIndex(x=>x.id===p.id);if(i<0)d.products.push(p);else d.products[i]=p;})){stockEdit=null;renderStock();}}catch(e){fail(e);}};
    $('#product-clear').onclick=()=>{stockEdit=null;renderStock();};
    buttons('[data-product-edit]',b=>{stockEdit=b.dataset.productEdit;renderStock();window.scrollTo(0,0);});
    $('#movement-save').onclick=()=>{try{const q=$('[name="movement-quantity"]').value;if(!/^-?\d+$/.test(q))throw Error('Enter a whole quantity; adjustments can be negative.');const m={id:id(),productId:$('[name="movement-product"]').value,kind:$('[name="movement-kind"]').value,date:$('[name="movement-date"]').value,quantity:Number(q),reason:$('[name="movement-reason"]').value.trim()};if(save(d=>d.movements.push(m)))renderStock();}catch(e){fail(e);}};
    $('[name="movement-kind"]').onchange=e=>{$('[name="movement-reason"]').value=e.target.value==='production'?'Made ahead of time':'';};
    buttons('[data-movement-remove]',async b=>{if(await askConfirm('Remove this mistaken stock entry? Sales and available stock will be validated first.'))if(save(d=>{d.movements=d.movements.filter(m=>m.id!==b.dataset.movementRemove);}))renderStock();});
    buttons('[data-movement-edit]',b=>editMovement(b.dataset.movementEdit));
  }
  function editMovement(mid) {
    const m=structuredClone(get().movements.find(x=>x.id===mid)),dialog=document.createElement('dialog');
    dialog.innerHTML=`<h2>Correct stock entry</h2><div class="fields">${input('Correct date','correct-date',m.date,'date')}${input('Correct quantity','correct-quantity',m.quantity,'number','step="1"')}${input('Correction reason','correct-reason',m.reason)}</div><p data-correction-status role="status"></p><div class="actions"><button type="button" data-correction-save>Save correction</button><button type="button" class="quiet" data-correction-close>Close</button></div>`;
    document.body.appendChild(dialog);RokaCompat.showDialog(dialog);
    const close=()=>{RokaCompat.closeDialog(dialog);dialog.remove();};dialog.querySelector('[data-correction-close]').onclick=close;
    dialog.querySelector('[data-correction-save]').onclick=async()=>{
      const q=dialog.querySelector('[name="correct-quantity"]').value;
      if(!/^-?\d+$/.test(q))return dialog.querySelector('[data-correction-status]').textContent='Enter a whole quantity.';
      m.quantity=Number(q);m.date=dialog.querySelector('[name="correct-date"]').value;m.reason=dialog.querySelector('[name="correct-reason"]').value.trim();
      if(await askConfirm('Apply this correction to stock?')){
        if(save(d=>{d.movements[d.movements.findIndex(x=>x.id===mid)]=m;})){close();renderStock();}
        else dialog.querySelector('[data-correction-status]').textContent=c.error();
      }
    };
  }
  async function dashboard() {
    if (editing) {
      let changed;
      try { if ($('#sale-form')) capture(); changed=JSON.stringify(editing)!==JSON.stringify(get().sales.find(s=>s.id===editing.id)); }
      catch(e) { changed=true; }
      if (changed && !(await askConfirm('Return to the dashboard and discard unsaved sale edits?'))) return false;
    }
    editing=null; return true;
  }
  return {renderSales,renderStock,recordJob,dashboard};
}
