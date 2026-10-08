// All financial amounts are integer cents. Stock is derived, never decremented in-place.
export const lineValue = (l) => l.cents * l.quantity + l.extraCents;
export const saleValue = (s) => s.lines.reduce((n, l) => n + lineValue(l), 0);
export const refundValue = (s) => s.returns.reduce((n, r) => n + r.cents, 0);
export const categoryFor = (name) => /^make\b/i.test(name) ? 'item' : 'service';
export function validDate(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
}
export function calendarDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function period(kind, current, start, end) {
  if (!validDate(current)) throw Error('Choose a valid local date.');
  const [y,m,d] = current.split('-').map(Number);
  const day = new Date(y,m-1,d,12);
  let a = current, b = current;
  if (kind === 'week') {
    day.setDate(day.getDate() - (day.getDay()+6)%7);
    a = calendarDate(day); day.setDate(day.getDate()+6); b = calendarDate(day);
  } else if (kind === 'month') {
    a = calendarDate(new Date(y,m-1,1,12)); b = calendarDate(new Date(y,m,0,12));
  } else if (kind === 'year') { a = `${y}-01-01`; b = `${y}-12-31`; }
  else if (kind === 'custom') {
    if (!validDate(start) || !validDate(end) || start > end) throw Error('Choose valid start and end dates, in order.');
    a = start; b = end;
  } else if (kind !== 'today') throw Error('Choose a reporting period.');
  return {start:a, end:b};
}
export function stock(data, productId) {
  let made=0, opening=0, adjustments=0, sold=0, returned=0;
  data.movements.filter(m => m.productId === productId).forEach(m => {
    if (m.kind === 'production') made += m.quantity;
    else if (m.kind === 'opening') opening += m.quantity;
    else adjustments += m.quantity;
  });
  data.sales.filter(s => s.status === 'active').forEach(s => {
    s.lines.filter(l => l.productId === productId).forEach(l => {
      sold += l.quantity;
      s.returns.filter(r => r.lineId === l.id && r.restock).forEach(r => returned += r.quantity);
    });
  });
  return {made, opening, adjustments, sold, returned, available:made+opening+adjustments-sold+returned};
}
export function paymentsFor(data, sale) {
  return sale.jobId ? data.jobs.find(j => j.id === sale.jobId).payments : sale.payments;
}
export function copyJob(job, makeId, date) {
  return { id:makeId(), reference:'Sale · '+job.reference, date,
    customerId:job.customerId, customerName:job.customerName, notes:'', jobId:job.id,
    status:'active', payments:[], returns:[], lines:job.lines.map(l => ({
      id:makeId(), name:l.name, quantity:l.quantity, cents:l.cents, extraCents:l.extraCents,
      extraNote:l.extraNote, details:l.details, category:categoryFor(l.name), productId:''
    })) };
}
export function validateSales(data) {
  const fail = (message) => { throw Error(message || 'Invalid sales or stock data. No data was replaced.'); };
  const text = v => typeof v === 'string' && v.length <= 20000;
  const cash = v => Number.isSafeInteger(v) && v >= 0 && v <= 100000000;
  const qty = v => Number.isInteger(v) && v > 0 && v <= 100000;
  const list = (items, fn) => {
    if (!Array.isArray(items) || items.length > 10000) fail();
    const seen = new Set();
    items.forEach(x => {
      if (!x || !/^[a-zA-Z0-9_-]{1,100}$/.test(x.id) || typeof x.id !== 'string' || seen.has(x.id) || !fn(x)) fail();
      seen.add(x.id);
    });
  };
  list(data.products, p => text(p.name) && p.name.trim() && text(p.variant) && cash(p.cents));
  list(data.movements, m => data.products.some(p => p.id === m.productId) && validDate(m.date) &&
    ['production','opening','adjustment'].includes(m.kind) && text(m.reason) && m.reason.trim() &&
    Number.isInteger(m.quantity) && Math.abs(m.quantity) <= 100000 && m.quantity !== 0 &&
    (m.kind === 'adjustment' || m.quantity > 0));
  const linked = new Set();
  list(data.sales, s => {
    if (!(text(s.reference) && s.reference.trim() && validDate(s.date) && text(s.customerId) && text(s.customerName) &&
      text(s.notes) && text(s.jobId) && ['active','cancelled'].includes(s.status))) return false;
    if (s.jobId) {
      if (!data.jobs.some(j => j.id === s.jobId) || linked.has(s.jobId)) fail('This job already has a sale, or its original job is missing. Open the linked sale instead.');
      linked.add(s.jobId);
    }
    list(s.lines, l => text(l.name) && l.name.trim() && qty(l.quantity) && cash(l.cents) && cash(l.extraCents) &&
      text(l.extraNote) && text(l.details) && ['item','service'].includes(l.category) && text(l.productId) &&
      (!l.productId || (l.category === 'item' && data.products.some(p => p.id === l.productId))));
    if (!s.lines.length || !Number.isSafeInteger(saleValue(s)) || saleValue(s) > 1000000000000) return false;
    list(s.payments, p => cash(p.cents) && p.cents > 0 && (p.date === '' || validDate(p.date)) && text(p.note));
    if (s.jobId && s.payments.length) fail('Linked sales use original job payments; duplicate payments are not allowed.');
    list(s.returns, r => {
      const l = s.lines.find(l => l.id === r.lineId);
      return l && validDate(r.date) && cash(r.cents) && Number.isInteger(r.quantity) && r.quantity >= 0 && r.quantity <= l.quantity &&
        cash(r.cashCents) && r.cashCents <= r.cents && typeof r.restock === 'boolean' && (!r.restock || (!!l.productId && r.quantity > 0)) &&
        (r.quantity > 0 || r.cents > 0) && text(r.reason) && r.reason.trim();
    });
    s.lines.forEach(l => {
      const rs = s.returns.filter(r => r.lineId === l.id);
      if (rs.reduce((n,r) => n+r.quantity,0) > l.quantity || rs.reduce((n,r) => n+r.cents,0) > lineValue(l))
        fail('Returned quantities or refunds exceed the original sale line. Correct the return before editing this sale.');
    });
    if (s.returns.reduce((n,r) => n+r.cashCents,0) > paymentsFor(data,s).reduce((n,p) => n+p.cents,0)) fail('Money refunded exceeds recorded receipts. Correct payments or the amount paid back.');
    // A cancellation releases stock once and removes sale value. Keep receipts as an audit record.
    if (s.status === 'cancelled' && s.returns.length) fail('A returned sale cannot be cancelled. Keep its returns, or reverse them explicitly first.');
    return true;
  });
  const sums = [
    data.sales.reduce((n,s) => n+saleValue(s),0),
    data.jobs.reduce((n,j) => n+j.payments.reduce((a,p) => a+p.cents,0),0) + data.sales.reduce((n,s) => n+s.payments.reduce((a,p) => a+p.cents,0),0)
  ];
  if (sums.some(n => !Number.isSafeInteger(n) || n > 1000000000000)) fail('Total recorded values are too large to report safely.');
  data.products.forEach(p => {
    if (stock(data,p.id).available < 0) fail(`Not enough stock for ${p.name}${p.variant ? ' · '+p.variant : ''}. Record production, opening stock, or a reasoned adjustment in Stock, or reduce the ready-made quantity. Nothing was saved.`);
  });
  return data;
}
// Allocate integer cents exactly once between the two categories, including mixed-job deposits.
function allocated(cents, lines, category) {
  if (category === 'all') return cents;
  const sum = lines.reduce((n,l) => n+lineValue(l),0);
  if (!sum) return category === 'service' ? cents : 0;
  const items = lines.filter(l => (l.category || categoryFor(l.name)) === 'item').reduce((n,l) => n+lineValue(l),0);
  const portion = Math.round(cents * items/sum);
  return category === 'item' ? portion : cents-portion;
}
export function report(data, range, category='all') {
  const inside = date => date && date >= range.start && date <= range.end;
  const include = l => category === 'all' || l.category === category;
  const rows = {}, days = {};
  const result = {sales:0, refunds:0, net:0, count:0, items:0, services:0, received:0, cashRefunds:0, undated:[], rows:[], days:[]};
  function row(l) {
    const key = l.category + ':' + (l.productId || l.name.toLowerCase());
    if (!rows[key]) rows[key] = {name:l.name, category:l.category, quantity:0, returned:0, sales:0, refunds:0, net:0};
    return rows[key];
  }
  function day(date) { if (!days[date]) days[date] = {date,sales:0,refunds:0,net:0}; return days[date]; }
  data.sales.filter(s => s.status === 'active').forEach(s => {
    const lines = s.lines.filter(include);
    if (inside(s.date) && lines.length) {
      result.count++;
      lines.forEach(l => {
        const value = lineValue(l); result.sales += value;
        result[l.category === 'item' ? 'items' : 'services'] += l.quantity;
        const r = row(l); r.sales += value; r.quantity += l.quantity; day(s.date).sales += value;
      });
    }
    s.returns.forEach(r => {
      const l = s.lines.find(l => l.id === r.lineId);
      if (inside(r.date) && include(l)) {
        result.refunds += r.cents; const entry = row(l); entry.refunds += r.cents; entry.returned += r.quantity;
        day(r.date).refunds += r.cents;
      }
    });
  });
  // Job payments counted once even before a job is explicitly recorded as a sale.
  const sources = data.jobs.map(j => ({type:'job',id:j.id,reference:j.reference,lines:(data.sales.find(s => s.jobId === j.id) || j).lines,payments:j.payments}))
    .concat(data.sales.filter(s => !s.jobId).map(s => ({type:'sale',id:s.id,reference:s.reference,lines:s.lines,payments:s.payments})));
  sources.forEach(source => source.payments.forEach(p => {
    const value = allocated(p.cents, source.lines, category);
    if (!p.date) { if (category === 'all' || value) result.undated.push({type:source.type,sourceId:source.id,reference:source.reference,paymentId:p.id,cents:p.cents}); }
    else if (inside(p.date)) result.received += value;
  }));
  data.sales.forEach(s => s.returns.forEach(r => {
    const l=s.lines.find(l=>l.id===r.lineId);
    if (inside(r.date) && include(l)) result.cashRefunds += r.cashCents;
  }));
  result.net = result.sales-result.refunds;
  result.rows = Object.keys(rows).map(k => { const r=rows[k]; r.net=r.sales-r.refunds; return r; });
  result.days = Object.keys(days).sort().map(k => { const d=days[k]; d.net=d.sales-d.refunds; return d; });
  result.bestQuantity = result.rows.slice().sort((a,b) => (b.quantity-b.returned)-(a.quantity-a.returned))[0] || null;
  result.bestValue = result.rows.slice().sort((a,b) => b.net-a.net)[0] || null;
  return result;
}
export function reportCSV(r, range, category) {
  const quote = v => '"'+String(v).replace(/"/g,'""')+'"';
  // Text cells are prefixed when spreadsheet formula injection could be interpreted.
  const safe = v => /^(?:\s*[=+\-@]|[\t\r\n])/.test(String(v)) ? "'"+v : v;
  const decimal = n => (n/100).toFixed(2);
  const rows = [ ['RokaWright sales summary'], ['Start',range.start,'End',range.end,'Category',category],
    ['Weeks start Monday; both dates included'], ['Sales value',decimal(r.sales)],['Refunds / credits',decimal(r.refunds)],['Net sales',decimal(r.net)],
    ['Number of sales',r.count],['Made item units sold',r.items],['Service units sold',r.services],['Money received by payment date',decimal(r.received)],
    ['Money paid back by refund date',decimal(r.cashRefunds)], ['Net money received',decimal(r.received-r.cashRefunds)], ['Undated payments excluded',r.undated.length], ['Money received is gross receipts; credits and money paid back shown separately. No costs or profit tracked.'], ['Best seller by net quantity', r.bestQuantity ? safe(r.bestQuantity.name) : '', r.bestQuantity ? r.bestQuantity.quantity-r.bestQuantity.returned : 0], ['Best seller by net sales value', r.bestValue ? safe(r.bestValue.name) : '', decimal(r.bestValue ? r.bestValue.net : 0)],
    [],['Item / service','Category','Units sold','Units returned','Sales USD','Refunds USD','Net sales USD'],
    ...r.rows.map(x => [safe(x.name),x.category,x.quantity,x.returned,decimal(x.sales),decimal(x.refunds),decimal(x.net)]),
    [],['Date','Sales USD','Refunds USD','Net sales USD'], ...r.days.map(d => [d.date,decimal(d.sales),decimal(d.refunds),decimal(d.net)]) ];
  return '\uFEFF'+rows.map(row => row.map(quote).join(',')).join('\r\n');
}
