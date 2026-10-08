import { validateSales } from "./sales-core.js";
export const defaults = [
  ["Alter pants", 500],
  ["Add both pockets to pants", 500],
  ["Alter a shirt", 400],
  ["Make shorts", 300],
  ["Make a do-rag", 1000],
  ["Make sweatpants", 3000],
  ["Make a hoodie", 1200],
  ["Make a pillowcase", 300],
  ["Make a sleep mask", 400],
  ["Replace zipper", null],
  ["Repair tear", null],
  ["Add sleeves to shirt", null],
].map(([name, cents], i) => ({ id: "service-" + i, name, cents }));
export const statuses = ["Waiting", "In progress", "Ready", "Collected"];
export function amount(value) {
  if (!/^\d+(\.\d{1,2})?$/.test(String(value).trim()))
    throw Error("Enter a non-negative amount with up to two decimal places.");
  const [a, b = ""] = String(value).trim().split(".");
  const n = Number(a) * 100 + Number(b.padEnd(2, "0"));
  if (!Number.isSafeInteger(n) || n > 100000000)
    throw Error("Amount is too large.");
  return n;
}
export function quantity(value) {
  if (
    !/^\d+$/.test(String(value)) ||
    Number(value) < 1 ||
    Number(value) > 100000
  )
    throw Error("Quantity must be a positive whole number (up to 100,000).");
  return Number(value);
}
export function lineTotal(l) {
  return l.cents * l.quantity + l.extraCents;
}
export function total(job) {
  const n = job.lines.reduce((n, l) => n + lineTotal(l), 0);
  if (!Number.isSafeInteger(n) || n > 1000000000000)
    throw Error("Job total is too large. Reduce the price or quantity.");
  return n;
}
export function paid(job) {
  return job.payments.reduce((n, p) => n + p.cents, 0);
}
export const money = (c) => {
  if (typeof Intl !== "undefined" && Intl.NumberFormat)
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(c / 100);
  const negative = c < 0;
  const absolute = Math.abs(c);
  const dollars = String(Math.floor(absolute / 100)).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ",",
  );
  return (
    (negative ? "-$" : "$") +
    dollars +
    "." +
    String(absolute % 100).padStart(2, "0")
  );
};
export const fresh = () => ({
  version: 2,
  sales: [],
  products: [],
  movements: [],
  customers: [],
  jobs: [],
  services: structuredClone(defaults),
});
export function validate(data) {
  const fail = () => {
    throw Error(
      "This file is not a valid RokaWright backup (version 1 or 2). No data was replaced.",
    );
  };
  const str = (v) => typeof v === "string" && v.length <= 20000;
  const cash = (v) => Number.isSafeInteger(v) && v >= 0 && v <= 100000000;
  const date = (v) =>
    str(v) &&
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    !Number.isNaN(Date.parse(v)) &&
    new Date(v).toISOString().slice(0, 10) === v;
  const list = (a, fn) => {
    if (!Array.isArray(a) || a.length > 10000) fail();
    const ids = new Set();
    for (const x of a) {
      if (
        !x ||
        !str(x.id) ||
        !/^[a-zA-Z0-9_-]{1,100}$/.test(x.id) ||
        ids.has(x.id) ||
        !fn(x)
      )
        fail();
      ids.add(x.id);
    }
  };
  const measurements = (m) =>
    m &&
    ["in", "cm"].includes(m.unit) &&
    m.values &&
    typeof m.values === "object" &&
    !Array.isArray(m.values) &&
    Object.keys(m.values).length <= 50 &&
    Object.entries(m.values).every(
      ([k, v]) =>
        str(k) &&
        str(v) &&
        (v === "" ||
          (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) > 0 && Number(v) <= 1000)),
    );
  if (!data || ![1, 2].includes(data.version)) fail();
  // Validate a copy so even a failed import never mutates the caller's records.
  data = JSON.parse(JSON.stringify(data));
  if (data.version === 1) {
    if (data.sales || data.products || data.movements) fail();
    data.version = 2;
    data.sales = []; data.products = []; data.movements = [];
  }
  list(
    data.services,
    (s) => str(s.name) && s.name.trim() && (s.cents === null || cash(s.cents)),
  );
  list(
    data.customers,
    (c) =>
      str(c.name) &&
      c.name.trim() &&
      str(c.phone) &&
      str(c.email) &&
      str(c.notes) &&
      measurements(c.measurements),
  );
  list(data.jobs, (j) => {
    if (!(
      str(j.reference) &&
      date(j.created) &&
      str(j.due) &&
      (!j.due || date(j.due)) &&
      str(j.customerId) &&
      str(j.customerName) &&
      str(j.notes) &&
      str(j.instructions) &&
      statuses.includes(j.status) &&
      ["Quote", "Job"].includes(j.kind) &&
      measurements(j.measurements)
    ))
      return false;
    list(
      j.lines,
      (l) =>
        str(l.serviceId) &&
        str(l.name) &&
        l.name.trim() &&
        cash(l.cents) &&
        Number.isInteger(l.quantity) &&
        l.quantity > 0 &&
        l.quantity <= 100000 &&
        cash(l.extraCents) &&
        str(l.extraNote) &&
        str(l.details),
    );
    list(
      j.payments,
      (p) => {
        if (p.date === undefined || p.date === null) p.date = "";
        return cash(p.cents) && p.cents > 0 && (p.date === "" || date(p.date)) && str(p.note);
      },
    );
    if (
      !Number.isSafeInteger(j.lines.reduce((n, l) => n + lineTotal(l), 0)) ||
      j.lines.reduce((n, l) => n + lineTotal(l), 0) > 1000000000000
    )
      return false;
    return true;
  });
  validateSales(data);
  return data;
}
