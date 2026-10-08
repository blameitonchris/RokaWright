import { salesScreens } from "./sales-ui.js";
import {
  fresh,
  validate,
  amount,
  quantity,
  total,
  paid,
  lineTotal,
  money,
  statuses,
} from "./core.js";
const KEY = window.ROKA_STORAGE_KEY || "rokawright.v1",
  $ = (s) => document.querySelector(s),
  id = () =>
    window.crypto && typeof window.crypto.randomUUID === "function"
      ? window.crypto.randomUUID()
      : RokaCompat.uniqueId(),
  today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  },
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
let data,
  blocked = false,
  storageRaw = null;
try {
  const raw = localStorage.getItem(KEY);
  storageRaw = raw;
  data = raw ? validate(JSON.parse(raw)) : fresh();
} catch {
  data = fresh();
  blocked = true;
}
let view = "new",
  draft = newJob(),
  dirty = false,
  customerEdit = null,
  pending = null;
function measurements() {
  return {
    unit: "in",
    values: {
      Chest: "",
      Waist: "",
      Hips: "",
      Inseam: "",
      Sleeve: "",
      Neck: "",
    },
  };
}
function newJob() {
  return {
    id: id(),
    reference:
      "RW-" +
      today().replaceAll("-", "") +
      "-" +
      id().slice(0, 6).toUpperCase(),
    created: today(),
    due: "",
    customerId: "",
    customerName: "",
    kind: "Quote",
    status: "Waiting",
    notes: "",
    instructions: "",
    measurements: measurements(),
    lines: [],
    payments: [],
  };
}
function jobMessage(message, error = false) {
  let target = document.querySelector("#job-message");
  if (!target) {
    target = document.createElement("p");
    target.id = "job-message";
    target.setAttribute("role", "status");
    document.querySelector(".summary")?.appendChild(target);
  }
  target.textContent = message;
  target.className = error ? "job-feedback error" : "job-feedback";
  toast(message);
}
function askConfirm(message) {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "confirmation";
    dialog.innerHTML =
      '<h2>Please confirm</h2><p></p><div class="actions"><button type="button" data-yes>Confirm</button><button type="button" class="quiet" data-no>Cancel</button></div>';
    dialog.querySelector("p").textContent = message;
    document.body.appendChild(dialog);
    const finish = (answer) => {
      RokaCompat.closeDialog(dialog);
      dialog.remove();
      resolve(answer);
    };
    dialog.querySelector("[data-yes]").onclick = () => finish(true);
    dialog.querySelector("[data-no]").onclick = () => finish(false);
    dialog.oncancel = (e) => {
      e.preventDefault();
      finish(false);
    };
    RokaCompat.showDialog(dialog);
    dialog.querySelector("[data-no]").focus();
  });
}
function toast(message) {
  $("#notice").textContent = message;
  setTimeout(() => ($("#notice").textContent = ""), 6000);
}
function persist(next) {
  if (blocked)
    throw Error(
      "Saved data could not be read. Download the original data before restoring a valid backup.",
    );
  if (localStorage.getItem(KEY) !== storageRaw)
    throw Error("Records changed in another tab. Reload before saving to avoid replacing newer records. Copy your unsaved changes first.");
  next = validate(next);
  const raw = JSON.stringify(next);
  localStorage.setItem(KEY, raw);
  storageRaw = raw;
  if (dirty && draft) {
    const updated = next.jobs.find(j => j.id === draft.id);
    if (updated) draft.payments.forEach(p => {
      const newPayment = updated.payments.find(x => x.id === p.id);
      if (!p.date && newPayment && newPayment.date) p.date = newPayment.date;
    });
  }
  data = next;
  if (!dirty && draft) {
    const current = next.jobs.find(j => j.id === draft.id);
    if (current) draft = structuredClone(current);
  }
}
let saveError = "";
function commit(fn) {
  saveError = "";
  try {
    const next = structuredClone(data);
    fn(next);
    persist(next);
    return true;
  } catch (e) {
    saveError = e.message;
    toast("Could not save: " + e.message);
    return false;
  }
}
function intro(title, sub) {
  return `<div class="intro"><div><div class="eyebrow">THE ROKAWRIGHT WORKROOM</div><h1>${title}</h1><p>${sub}</p></div><span class="badge">CUT WITH PURPOSE. SEWN WITH CARE.</span></div>`;
}
function input(label, name, value, type = "text", extra = "") {
  return `<label>${label}<input name="${esc(name)}" type="${type}" value="${esc(value)}" ${type === "date" ? 'placeholder="YYYY-MM-DD"' : ""} ${extra}></label>`;
}
function area(label, name, value) {
  return `<label>${label}<textarea name="${esc(name)}">${esc(value)}</textarea></label>`;
}
function select(label, name, value, opts) {
  return `<label>${label}<select name="${esc(name)}">${opts.map(([v, t]) => `<option value="${esc(v)}" ${v === value ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`;
}
function measurementFields(m, prefix) {
  return `${select("Measurement unit", prefix + "unit", m.unit, [
    ["in", "Inches (in)"],
    ["cm", "Centimeters (cm)"],
  ])}<div class="measure-grid">${Object.entries(m.values)
    .map(([k, v]) =>
      input(
        `${esc(k)} (${m.unit})`,
        prefix + k,
        v,
        "number",
        'min="0.01" max="1000" step="0.01"',
      ),
    )
    .join("")}</div>`;
}
const sales = salesScreens({ $, esc, input, area, select, intro, id, today, commit, toast, askConfirm,
  data: () => data, error: () => saveError, show: (nextView) => { view = nextView; render(); } });
function render() {
  document.querySelector("#storage-warning")?.remove();
  if (blocked) {
    const warning = document.createElement("div");
    warning.id = "storage-warning";
    warning.className = "storage-warning";
    warning.setAttribute("role", "alert");
    warning.textContent =
      "Saved data could not be read. Saving is blocked to protect it. Use Backup & restore to download the original data and restore a valid backup.";
    document.querySelector("header").after(warning);
  }
  document
    .querySelectorAll("nav button")
    .forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  if (view === "new") renderJob();
  if (view === "customers") renderCustomers();
  if (view === "jobs") renderJobs();
  if (view === "prices") renderPrices();
  if (view === "sales") sales.renderSales();
  if (view === "stock") sales.renderStock();
}
function renderJob() {
  const exists = data.jobs.some((j) => j.id === draft.id);
  $("#app").innerHTML =
    intro(
      exists ? "Back at the workbench." : "Every stitch starts here.",
      "Build a quote, capture the details, and keep the work moving.",
    ) +
    `<form id="job-form" novalidate><div class="layout"><div><section class="panel"><div class="panel-title"><h2>The job details</h2><span class="number">01 / THE BRIEF</span></div><div class="fields">${select("Customer (optional)", "customerId", draft.customerId, [["", "Quick quote / no profile"], ...data.customers.map((c) => [c.id, c.name]), ...(draft.customerId && !data.customers.some((c) => c.id === draft.customerId) ? [[draft.customerId, draft.customerName + " (removed profile)"]] : [])])}${input("Name on this quote", "customerName", draft.customerName)}${select(
      "Record type",
      "kind",
      draft.kind,
      [
        ["Quote", "Quote"],
        ["Job", "Job"],
      ],
    )}${select(
      "Work status",
      "status",
      draft.status,
      statuses.map((s) => [s, s]),
    )}${input("Due date (optional)", "due", draft.due, "date")}${input("Job reference", "reference", draft.reference, "text", 'required maxlength="100"')}</div><p class="hint">Created ${esc(draft.created)} · Customers supply materials. No material charge is added.</p>${area("Customer instructions (internal)", "instructions", draft.instructions)}${area("Workroom notes (internal)", "notes", draft.notes)}<details><summary>Job measurements · saved copy, for internal use</summary><p class="hint">This copy stays with the job when the customer’s measurements change. Switching units converts existing measurements.</p>${measurementFields(draft.measurements, "m:")}</details></section><section class="panel"><div class="panel-title"><h2>Choose your services</h2><span class="number">02 / THE WORK</span></div><div class="cards">${data.services.map((s, i) => `<button type="button" class="service" data-add="${s.id}"><i>${["⌁", "+", "◇"][i % 3]}</i><b>${esc(s.name)}</b><span>${s.cents === null ? "Enter a custom price" : money(s.cents) + (s.id === "service-0" ? " per pair" : s.id === "service-1" ? " / both pockets" : s.id === "service-2" ? " per shirt" : " each")}</span></button>`).join("")}</div><button type="button" class="quiet" id="custom">+ Add a custom service</button><p class="hint">Pants and shirt alterations are priced per garment, with all adjustments bundled. Pockets are a separate service. Extra-work charges are added once per line.</p><div id="lines">${draft.lines.length ? draft.lines.map((l) => `<div class="line" data-line="${l.id}"><div class="line-head"><label style="flex:1;margin:0">Service description<input name="l:${l.id}:name" value="${esc(l.name)}" required></label><button type="button" class="quiet small" data-remove="${l.id}" aria-label="Remove service">✕</button></div><div class="line-grid">${input("Unit price ($)", "l:" + l.id + ":cents", l.cents === null ? "" : (l.cents / 100).toFixed(2), "number", 'min="0" step="0.01" required')}${input("Quantity", "l:" + l.id + ":quantity", l.quantity, "number", 'min="1" max="100000" step="1" required')}${input("Extra work ($, total for this line)", "l:" + l.id + ":extraCents", (l.extraCents / 100).toFixed(2), "number", 'min="0" step="0.01" required')}</div>${input("Extra-work explanation", "l:" + l.id + ":extraNote", l.extraNote)}${input("Adjustments / service details (bundled, no automatic charge)", "l:" + l.id + ":details", l.details)}<div class="sum-row"><span>Line total</span><strong data-line-total="${l.id}">${l.cents === null ? "Price required" : money(lineTotal(l))}</strong></div></div>`).join("") : '<div class="empty">Your work starts with a service.<br>Choose a card above to add it to the job.</div>'}</div></section><section class="panel"><div class="panel-title"><h2>Payments</h2><span class="number">03 / THE LEDGER</span></div>${draft.payments.map((p) => `<div class="payment"><span>${esc(p.date || "Undated — excluded from dated sales reports; add its actual date in Sales") } · ${esc(p.note || "Payment")} <b>${money(p.cents)}</b></span><button type="button" class="quiet small" data-payment-remove="${p.id}">Remove</button></div>`).join("") || '<p class="muted">No payments recorded yet.</p>'}<div class="fields">${input("Deposit / additional payment ($)", "paymentAmount", "", "number", 'min="0.01" step="0.01"')}${input("Payment date", "paymentDate", today(), "date")}${input("Payment note", "paymentNote", "")}</div><button type="button" id="add-payment">Record payment</button><p class="hint">Save the job to keep payment changes.</p></section></div><aside class="summary"><div class="eyebrow">A JOB WELL MADE</div><h2>Your quote</h2><div id="summary"></div><button type="button" id="save-job">${exists ? "Save changes" : "Save quote / job"}</button><button type="button" class="quiet" id="print">Print / Save as PDF</button><button type="button" class="quiet" id="clear-job">Start a new job</button><p class="hint">Preview your quote, then choose Save PDF to download it directly. Open the PDF in your browser to print. Internal notes and measurements are never included.</p><p class="hint">${exists ? "Editing a saved record." : "This quote is not saved yet."}</p></aside></div></form>`;
  updateSummary();
  const form = $("#job-form");
  form.addEventListener("input", () => {
    dirty = true;
    try {
      syncJob();
      updateSummary();
    } catch {
      $("#summary").innerHTML =
        "<p>Please enter valid prices and whole-number quantities.</p>";
    }
  });
  form.addEventListener("change", (e) => {
    if (e.target.name === "customerId") {
      const c = data.customers.find((c) => c.id === e.target.value);
      draft.customerId = e.target.value;
      draft.customerName = c?.name || "";
      draft.measurements = structuredClone(c?.measurements || measurements());
      renderJob();
    }
    if (e.target.name === "m:unit") {
      convertMeasurements(draft.measurements, e.target.value);
      renderJob();
    }
  });
  const saveJob = () => {
    try {
      syncJob();
      if (!draft.lines.length) throw Error("Add at least one service.");
      if (
        commit((d) => {
          const i = d.jobs.findIndex((j) => j.id === draft.id);
          if (i < 0) d.jobs.push(structuredClone(draft));
          else d.jobs[i] = structuredClone(draft);
        })
      ) {
        dirty = false;
        renderJob();
        jobMessage("Job saved on this device.");
      } else {
        jobMessage(
          "The job could not be saved. " +
            (blocked
              ? "Browser storage is blocked or unreadable here. Open the downloaded app in Chrome or Edge and use Backup & restore to recover saved data."
              : "Check the error message and try again."),
          true,
        );
      }
    } catch (e) {
      jobMessage(e.message, true);
    }
  };
  form.onsubmit = (e) => {
    e.preventDefault();
    saveJob();
  };
  $("#save-job").onclick = saveJob;
  $('[id="custom"]').onclick = () =>
    addLine({ id: "", name: "Custom service", cents: null });
  document
    .querySelectorAll("[data-add]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          addLine(data.services.find((s) => s.id === b.dataset.add))),
    );
  document.querySelectorAll("[data-remove]").forEach(
    (b) =>
      (b.onclick = async () => {
        if (capture()) {
          draft.lines = draft.lines.filter((l) => l.id !== b.dataset.remove);
          dirty = true;
          renderJob();
        }
      }),
  );
  document.querySelectorAll("[data-payment-remove]").forEach(
    (b) =>
      (b.onclick = async () => {
        if ((await askConfirm("Remove this payment?")) && capture()) {
          draft.payments = draft.payments.filter(
            (p) => p.id !== b.dataset.paymentRemove,
          );
          dirty = true;
          renderJob();
        }
      }),
  );
  $("#add-payment").onclick = () => {
    try {
      syncJob();
      const cents = amount(form.elements.paymentAmount.value);
      if (!cents) throw Error("Payment must be greater than zero.");
      const date = form.elements.paymentDate.value;
      if (!date) throw Error("Choose a payment date.");
      draft.payments.push({
        id: id(),
        cents,
        date,
        note: form.elements.paymentNote.value,
      });
      dirty = true;
      renderJob();
    } catch (e) {
      toast(e.message);
    }
  };
  $("#clear-job").onclick = async () => {
    if (
      !dirty ||
      (await askConfirm("Discard unsaved changes and start a new job?"))
    ) {
      draft = newJob();
      dirty = false;
      renderJob();
      jobMessage("New job started. Your saved jobs are unchanged.");
    }
  };
  $("#print").onclick = () => {
    try {
      syncJob();
      if (!draft.lines.length) throw Error("Add a service before printing.");
      printQuote();
    } catch (e) {
      jobMessage(e.message, true);
    }
  };
}
function convertMeasurements(m, unit) {
  if (m.unit === unit) return;
  const factor = unit === "cm" ? 2.54 : 1 / 2.54;
  for (const k in m.values)
    if (m.values[k]) m.values[k] = (Number(m.values[k]) * factor).toFixed(2);
  m.unit = unit;
}
function syncJob() {
  const f = $("#job-form");
  for (const key of [
    "reference",
    "customerId",
    "customerName",
    "kind",
    "status",
    "due",
    "notes",
    "instructions",
  ])
    draft[key] = f.elements[key].value;
  if (!draft.reference.trim()) throw Error("Enter a job reference.");
  for (const l of draft.lines) {
    for (const k of ["name", "extraNote", "details"])
      l[k] = f.elements["l:" + l.id + ":" + k].value;
    if (!l.name.trim()) throw Error("Enter a service description.");
    l.cents = amount(f.elements["l:" + l.id + ":cents"].value);
    l.extraCents = amount(f.elements["l:" + l.id + ":extraCents"].value);
    l.quantity = quantity(f.elements["l:" + l.id + ":quantity"].value);
  }
  for (const k in draft.measurements.values) {
    const v = f.elements["m:" + k].value;
    if (
      v !== "" &&
      (!Number.isFinite(Number(v)) || Number(v) <= 0 || Number(v) > 1000)
    )
      throw Error("Measurements must be positive, up to 1,000.");
    draft.measurements.values[k] = v;
  }
}
function capture() {
  try {
    syncJob();
    return true;
  } catch (e) {
    toast(e.message);
    return false;
  }
}
function addLine(s) {
  if (draft.lines.length && !capture()) return;
  else if (!draft.lines.length) capture();
  draft.lines.push({
    id: id(),
    serviceId: s.id,
    name: s.name,
    cents: s.cents,
    quantity: 1,
    extraCents: 0,
    extraNote: "",
    details: "",
  });
  dirty = true;
  renderJob();
}
function updateSummary() {
  for (const l of draft.lines) {
    const el = document.querySelector('[data-line-total="' + l.id + '"]');
    if (el)
      el.textContent =
        l.cents === null ? "Price required" : money(lineTotal(l));
  }
  const t = total(draft),
    p = paid(draft);
  $("#summary").innerHTML =
    draft.lines
      .map(
        (l) =>
          `<div class="sum-row"><span>${esc(l.name)} × ${l.quantity}</span><b>${l.cents === null ? "—" : money(lineTotal(l))}</b></div>`,
      )
      .join("") +
    `<div class="big-total">${draft.lines.some((l) => l.cents === null) ? "—" : money(t)}</div><div class="sum-row"><span>Amount paid</span><b>${money(p)}</b></div><div class="sum-row"><span>${p > t ? "Overpayment" : "Balance remaining"}</span><b>${money(Math.abs(t - p))}</b></div>`;
}
function renderCustomers() {
  const c = customerEdit
    ? structuredClone(data.customers.find((c) => c.id === customerEdit))
    : {
        id: id(),
        name: "",
        phone: "",
        email: "",
        notes: "",
        measurements: measurements(),
      };
  $("#app").innerHTML =
    intro(
      "Know the person.",
      "Customer details and measurements, ready for the next fitting.",
    ) +
    `<div class="layout"><section class="panel"><h2>${customerEdit ? "Edit customer" : "New customer"}</h2><form id="customer-form"><div class="fields">${input("Name", "name", c.name, "text", "required")}${input("Phone (optional)", "phone", c.phone, "tel")}${input("Email (optional)", "email", c.email, "email")}</div>${area("Internal customer notes", "notes", c.notes)}<h3>Measurements</h3>${measurementFields(c.measurements, "c:")}<button>Save customer</button><button type="button" class="quiet" id="cancel-customer">Clear form</button></form></section><section><input id="customer-search" aria-label="Find customers" placeholder="Find a customer…"><div id="customer-list"></div></section></div>`;
  const list = () => {
    const q = $("#customer-search").value.toLowerCase();
    $("#customer-list").innerHTML =
      data.customers
        .filter((c) =>
          (c.name + " " + c.phone + " " + c.email).toLowerCase().includes(q),
        )
        .map(
          (c) =>
            `<div class="record" style="margin-top:14px"><h3>${esc(c.name)}</h3><p class="muted">${esc(c.phone)} ${esc(c.email)}</p><div class="actions"><button data-edit="${c.id}" class="small">Edit profile</button><button data-quote="${c.id}" class="quiet small">New quote</button><button data-delete="${c.id}" class="danger small">Delete</button></div></div>`,
        )
        .join("") || '<p class="empty">No customers found.</p>';
    document.querySelectorAll("[data-edit]").forEach(
      (b) =>
        (b.onclick = async () => {
          customerEdit = b.dataset.edit;
          renderCustomers();
        }),
    );
    document.querySelectorAll("[data-quote]").forEach(
      (b) =>
        (b.onclick = async () => {
          if (dirty && !(await askConfirm("Discard unsaved job changes?")))
            return;
          const c = data.customers.find((c) => c.id === b.dataset.quote);
          draft = newJob();
          draft.customerId = c.id;
          draft.customerName = c.name;
          draft.measurements = structuredClone(c.measurements);
          dirty = true;
          view = "new";
          render();
        }),
    );
    document.querySelectorAll("[data-delete]").forEach(
      (b) =>
        (b.onclick = async () => {
          if (
            (await askConfirm(
              "Delete this customer? Saved jobs keep their customer name and measurement copy.",
            )) &&
            commit(
              (d) =>
                (d.customers = d.customers.filter(
                  (c) => c.id !== b.dataset.delete,
                )),
            )
          ) {
            if (customerEdit === b.dataset.delete) customerEdit = null;
            renderCustomers();
          }
        }),
    );
  };
  list();
  $("#customer-search").oninput = list;
  $("#cancel-customer").onclick = () => {
    customerEdit = null;
    renderCustomers();
  };
  $("#customer-form").onchange = (e) => {
    if (e.target.name === "c:unit") {
      const f = $("#customer-form");
      for (const k in c.measurements.values)
        c.measurements.values[k] = f.elements["c:" + k].value;
      convertMeasurements(c.measurements, e.target.value);
      for (const k in c.measurements.values) {
        f.elements["c:" + k].value = c.measurements.values[k];
        f.elements["c:" + k].parentElement.firstChild.textContent =
          k + " (" + c.measurements.unit + ")";
      }
    }
  };
  $("#customer-form").onsubmit = (e) => {
    e.preventDefault();
    const f = e.target;
    for (const k of ["name", "phone", "email", "notes"])
      c[k] = f.elements[k].value.trim();
    c.measurements.unit = f.elements["c:unit"].value;
    for (const k in c.measurements.values)
      c.measurements.values[k] = f.elements["c:" + k].value;
    if (
      commit((d) => {
        const i = d.customers.findIndex((x) => x.id === c.id);
        if (i < 0) d.customers.push(c);
        else d.customers[i] = c;
      })
    ) {
      customerEdit = null;
      toast("Customer saved.");
      renderCustomers();
    }
  };
}
function renderJobs() {
  $("#app").innerHTML =
    intro(
      "Work in good order.",
      "Every quote, every fitting, every finished piece.",
    ) +
    `<div class="toolbar"><input id="job-search" aria-label="Search jobs" placeholder="Search reference, customer, or service…"><select id="status-filter" aria-label="Filter by status"><option value="">All statuses</option>${statuses.map((s) => `<option>${s}</option>`).join("")}</select></div><div class="records" id="job-list"></div>`;
  const list = () => {
    const q = $("#job-search").value.toLowerCase(),
      s = $("#status-filter").value;
    $("#job-list").innerHTML =
      [...data.jobs]
        .reverse()
        .filter(
          (j) =>
            (!s || s === j.status) &&
            (
              j.reference +
              " " +
              j.customerName +
              " " +
              j.lines.map((l) => l.name).join(" ")
            )
              .toLowerCase()
              .includes(q),
        )
        .map(
          (j) =>
            `<article class="record"><div class="sum-row"><span class="eyebrow">${esc(j.reference)} · ${j.kind}</span><span class="status">${j.status}</span></div><h3>${esc(j.customerName || "Quick quote")}</h3><p class="muted">Created ${j.created}${j.due ? " · Due " + j.due : ""}</p>${j.due && j.due < today() && j.status !== "Collected" ? '<p class="overdue">Overdue · not collected</p>' : ""}<div class="sum-row"><b>${money(total(j))}</b><span>${paid(j) > total(j) ? "Overpaid " + money(paid(j) - total(j)) : "Balance " + money(total(j) - paid(j))}</span></div><div class="actions"><button data-open="${j.id}" class="small">Open / edit</button><button type="button" data-record-sale="${j.id}" class="small quiet">${data.sales.some(s => s.jobId === j.id) ? "View linked sale" : "Record sale"}</button><button data-job-delete="${j.id}" class="danger small">Delete</button></div></article>`,
        )
        .join("") ||
      '<p class="empty">No saved jobs match. Start with a new quote.</p>';
    document.querySelectorAll("[data-open]").forEach(
      (b) =>
        (b.onclick = async () => {
          if (dirty && !(await askConfirm("Discard unsaved job changes?")))
            return;
          draft = structuredClone(
            data.jobs.find((j) => j.id === b.dataset.open),
          );
          dirty = false;
          view = "new";
          render();
        }),
    );
    document.querySelectorAll("[data-record-sale]").forEach(b => b.onclick = () => sales.recordJob(b.dataset.recordSale));
    document.querySelectorAll("[data-job-delete]").forEach(
      (b) =>
        (b.onclick = async () => {
          if (data.sales.some(s => s.jobId === b.dataset.jobDelete)) { toast("This job has a linked sale. Keep the original job to preserve its payment history."); return; }
          if (
            (await askConfirm(
              "Permanently delete this saved job and its payments?",
            )) &&
            commit(
              (d) =>
                (d.jobs = d.jobs.filter((j) => j.id !== b.dataset.jobDelete)),
            )
          ) {
            if (draft.id === b.dataset.jobDelete) {
              draft = newJob();
              dirty = false;
            }
            list();
          }
        }),
    );
  };
  list();
  $("#job-search").oninput = list;
  $("#status-filter").onchange = list;
}
function renderPrices() {
  $("#app").innerHTML =
    intro(
      "The price of good work.",
      "Your standard rates. Saved jobs always keep their own prices.",
    ) +
    `<section class="panel"><h2>Service menu <span class="muted">· US dollars</span></h2><p class="hint">Blank price means “enter a custom price” when adding this service to a job. Removing a service leaves historical jobs intact.</p>${data.services.map((s) => `<form class="price-row" data-price="${s.id}"><input name="name" aria-label="Service name" value="${esc(s.name)}" required><input name="price" aria-label="Price for ${esc(s.name)}" type="number" min="0" step="0.01" placeholder="Custom" value="${s.cents === null ? "" : (s.cents / 100).toFixed(2)}"><div><button class="small">Save</button><button type="button" class="quiet small" data-service-delete="${s.id}" aria-label="Remove ${esc(s.name)}">✕</button></div></form>`).join("")}<h3 style="margin-top:25px">Add a service</h3><form id="new-service" class="price-row"><input name="name" aria-label="New service name" placeholder="Service description" required><input name="price" aria-label="New service price" type="number" min="0" step="0.01" placeholder="Custom"><button>Add service</button></form></section>`;
  document.querySelectorAll("[data-price],#new-service").forEach(
    (f) =>
      (f.onsubmit = (e) => {
        e.preventDefault();
        try {
          const name = f.elements.name.value.trim();
          if (!name) throw Error("Enter a service name.");
          const cents =
            f.elements.price.value === ""
              ? null
              : amount(f.elements.price.value);
          if (
            commit((d) => {
              if (f.dataset.price)
                Object.assign(
                  d.services.find((s) => s.id === f.dataset.price),
                  { name, cents },
                );
              else d.services.push({ id: id(), name, cents });
            })
          ) {
            toast("Price list saved. Existing quotes are unchanged.");
            renderPrices();
          }
        } catch (e) {
          toast(e.message);
        }
      }),
  );
  document.querySelectorAll("[data-service-delete]").forEach(
    (b) =>
      (b.onclick = async () => {
        if (
          (await askConfirm(
            "Remove this service from the active menu? Saved jobs will keep it.",
          )) &&
          commit(
            (d) =>
              (d.services = d.services.filter(
                (s) => s.id !== b.dataset.serviceDelete,
              )),
          )
        )
          renderPrices();
      }),
  );
}
function printQuote() {
  document.querySelector(".print-only")?.remove();
  const q = document.createElement("section");
  q.className = "print-only";
  q.innerHTML = `<div class="eyebrow">ALTERATIONS / MADE WITH CARE</div><div class="quote-brand" style="display:flex;align-items:center;justify-content:space-between"><h1>RokaWright</h1>${document.querySelector(".header-logo").innerHTML.replace('class="rw-monogram"', 'class="rw-monogram" style="width:65px;height:65px"')}</div><h2>${draft.kind} · ${esc(draft.reference)}</h2><p>Customer: ${esc(draft.customerName || "Quick quote")}<br>Created: ${draft.created}${draft.due ? "<br>Due: " + draft.due : ""}</p><table><thead><tr><th>Service</th><th>Qty</th><th>Unit price</th><th>Extra work (once)</th><th>Line total</th></tr></thead><tbody>${draft.lines.map((l) => `<tr><td>${esc(l.name)}${l.details ? "<br><small>" + esc(l.details) + "</small>" : ""}${l.extraNote ? "<br><small>Extra work: " + esc(l.extraNote) + "</small>" : ""}</td><td>${l.quantity}</td><td>${money(l.cents)}</td><td>${money(l.extraCents)}</td><td>${money(lineTotal(l))}</td></tr>`).join("")}</tbody></table><div class="quote-total"><p>Total: <b>${money(total(draft))}</b></p><p>Amount paid: ${money(paid(draft))}</p><p>${paid(draft) > total(draft) ? "Overpayment" : "Balance remaining"}: <b>${money(Math.abs(total(draft) - paid(draft)))}</b></p></div><p class="quote-note">Customers supply materials. Thank you for trusting RokaWright with your next piece.</p>`;
  document.body.appendChild(q);
  document.querySelector("#quote-preview")?.remove();
  const preview = document.createElement("dialog");
  preview.id = "quote-preview";
  preview.innerHTML = `<h2>Your printable quote</h2><p>Save PDF downloads a real PDF directly, without a print dialog. For paper printing, open the downloaded PDF in your browser and print it.</p><div class="actions"><button type="button" id="quote-print">Print / Save as PDF</button><button type="button" class="quiet" id="quote-download">Download printable quote</button><button type="button" class="quiet" id="quote-full">View full quote</button><button type="button" class="quiet" id="quote-copy">Copy quote text</button><button type="button" class="quiet" id="quote-close">Close</button></div><p id="pdf-status" role="status"></p><div class="quote-sheet">${q.innerHTML}</div>`;
  const quoteText =
    `${draft.kind} · ${draft.reference}\nRokaWright\nCustomer: ${draft.customerName || "Quick quote"}\nCreated: ${draft.created}${draft.due ? "\nDue: " + draft.due : ""}\n\n` +
    draft.lines
      .map(
        (l) =>
          `${l.name}: ${l.quantity} × ${money(l.cents)}; extra work once ${money(l.extraCents)}; line total ${money(lineTotal(l))}${l.details ? "\n" + l.details : ""}${l.extraNote ? "\nExtra work: " + l.extraNote : ""}`,
      )
      .join("\n\n") +
    `\n\nTotal: ${money(total(draft))}\nAmount paid: ${money(paid(draft))}\n${paid(draft) > total(draft) ? "Overpayment" : "Balance remaining"}: ${money(Math.abs(total(draft) - paid(draft)))}\nCustomers supply materials.`;
  const readable = document.createElement("div");
  readable.className = "quote-readable";
  readable.innerHTML = draft.lines
    .map(
      (l) =>
        `<div class="quote-item"><b>${esc(l.name)}</b><br>Quantity: ${l.quantity} · Unit: ${money(l.cents)}<br>Extra work (once): ${money(l.extraCents)}<br>Line total: ${money(lineTotal(l))}${l.details ? "<br>" + esc(l.details) : ""}${l.extraNote ? "<br>Extra work: " + esc(l.extraNote) : ""}</div>`,
    )
    .join("");
  q.insertBefore(readable, q.querySelector(".quote-total"));
  preview.querySelector(".quote-sheet").innerHTML = q.innerHTML;
  document.body.appendChild(preview);
  RokaCompat.showDialog(preview);
  preview.querySelector("#quote-copy").onclick = () =>
    RokaCompat.textAlternative(
      quoteText,
      "Copy your quote",
      "Long-press and copy this customer-facing quote text, or take screenshots of View full quote. Internal notes and measurements are excluded. Print or create a PDF on a newer device.",
    );
  preview.querySelector("#quote-full").onclick = () => {
    RokaCompat.closeDialog(preview);
    document.body.className += " quote-view";
    const controls = document.createElement("div");
    controls.className = "quote-controls";
    controls.innerHTML =
      '<button type="button">Back to workroom</button><p>On browsers without printing: take screenshots or use Copy quote text. Open the app on a newer device to print.</p>';
    controls.querySelector("button").onclick = () => {
      document.body.className = document.body.className.replace(
        /\s*quote-view\b/g,
        "",
      );
      controls.remove();
      window.scrollTo(0, 0);
    };
    q.insertBefore(controls, q.firstChild);
    window.scrollTo(0, 0);
  };
  if (RokaCompat.legacy) {
    preview.querySelector("#quote-print").hidden = true;
    preview.querySelector("#quote-download").hidden = true;
    preview.querySelector("p").textContent =
      "This older-browser layout provides a full readable quote and copyable quote text. For a PDF or paper print, use a newer device. Backups can transfer your saved records privately.";
  }
  preview.querySelector("#quote-close").onclick = () => {
    RokaCompat.closeDialog(preview);
    preview.remove();
  };
  preview.querySelector("#quote-print").textContent = "Save PDF";
  preview.querySelector("#quote-print").onclick = async () => {
    const button = preview.querySelector("#quote-print");
    button.disabled = true;
    button.textContent = "Creating PDF…";
    try {
      await (
        await RokaCompat.ensurePDF()
      ).downloadPDF(
        structuredClone(draft),
        document.querySelector(".header-logo").innerHTML,
      );
      preview.querySelector("#pdf-status").textContent =
        "PDF download requested. Check your browser’s Downloads. If this preview blocks downloads, use the printable quote option below.";
    } catch (e) {
      preview.querySelector("#pdf-status").textContent =
        "Could not create the PDF: " + e.message;
    } finally {
      button.disabled = false;
      button.textContent = "Save PDF";
    }
  };
  preview.querySelector("#quote-download").onclick = () => {
    const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>RokaWright quote</title><style>body{font:14px Arial;color:#272923;max-width:900px;margin:40px auto;padding:25px}h1{font:40px Georgia}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:12px 6px;border-bottom:1px solid #ccc}.quote-total{text-align:right}.quote-note{margin-top:30px}button{padding:12px;background:#414b36;color:white;border:0}@media print{button,.instructions{display:none}@page{margin:18mm}}</style><button onclick="window.print()">Print / Save as PDF</button><p class="instructions">Choose “Save as PDF” in the print dialog.</p>${q.innerHTML}</html>`;
    if (
      typeof Blob === "undefined" ||
      !RokaCompat.saveBlob(
        new Blob([html], { type: "text/html" }),
        "RokaWright-quote-" +
          draft.reference.replace(/[^a-zA-Z0-9_-]/g, "") +
          ".html",
      )
    ) {
      RokaCompat.textAlternative(
        quoteText,
        "Copy your quote",
        "File downloads are unavailable. Copy this quote text or take screenshots of View full quote.",
      );
    }
  };
}
document.querySelectorAll("nav button").forEach(
  (b) =>
    (b.onclick = async () => {
      if (b.dataset.view === "sales" && !(await sales.dashboard())) return;
      view = b.dataset.view;
      render();
    }),
);
$("#backup-open").onclick = () => RokaCompat.showDialog($("#backup"));
$("#backup-close").onclick = () => RokaCompat.closeDialog($("#backup"));
$("#export").onclick = () => {
  try {
    const raw = blocked
      ? localStorage.getItem(KEY)
      : JSON.stringify(data, null, 2);
    RokaCompat.saveText(
      raw || "",
      "RokaWright-backup-" + today() + ".json",
      "application/json",
    );
  } catch (e) {
    $("#backup-message").textContent =
      "Could not access saved data: " + e.message;
  }
};
$("#export-copy").onclick = () => {
  try {
    const raw = blocked
      ? localStorage.getItem(KEY)
      : JSON.stringify(data, null, 2);
    RokaCompat.textAlternative(
      raw || "",
      "Copy your backup",
      "Select all, then long-press and copy. Save the complete text privately on your device or transfer it to your own newer device. Restore with Paste backup text.",
    );
  } catch (e) {
    $("#backup-message").textContent =
      "Could not access saved data: " + e.message;
  }
};
$("#import").onchange = async (e) => {
  pending = null;
  $("#restore").hidden = true;
  try {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10000000)
      throw Error("Backup is too large (maximum 10 MB).");
    pending = validate(JSON.parse(await RokaCompat.readFile(file)));
    $("#backup-message").textContent =
      `Validated: ${pending.customers.length} customers, ${pending.jobs.length} jobs, ${pending.services.length} services, ${pending.sales.length} sales, ${pending.products.length} products, ${pending.movements.length} stock entries. Restoring replaces all saved data on this device. Download a backup first.`;
    $("#restore").hidden = false;
  } catch (e) {
    $("#backup-message").textContent = "Cannot restore: " + e.message;
  }
};
$("#validate-pasted-backup").onclick = () => {
  pending = null;
  $("#restore").hidden = true;
  try {
    const text = $("#pasted-backup").value;
    if (text.length > 10000000) throw Error("Backup is too large.");
    pending = validate(JSON.parse(text));
    $("#backup-message").textContent =
      `Validated: ${pending.customers.length} customers, ${pending.jobs.length} jobs, ${pending.services.length} services, ${pending.sales.length} sales, ${pending.products.length} products, ${pending.movements.length} stock entries. Restoring replaces only this preview’s data. Download or copy a backup first.`;
    $("#restore").hidden = false;
  } catch (e) {
    $("#backup-message").textContent = "Cannot restore: " + e.message;
  }
};
$("#restore").onclick = async () => {
  if (
    !pending ||
    !(await askConfirm(
      "Replace ALL saved customers, jobs, prices, sales, payments and stock with this backup? This cannot be undone without your current backup.",
    ))
  )
    return;
  try {
    const restoredRaw = JSON.stringify(pending);
    localStorage.setItem(KEY, restoredRaw);
    storageRaw = restoredRaw;
    data = pending;
    blocked = false;
    pending = null;
    draft = newJob();
    dirty = false;
    customerEdit = null;
    $("#restore").hidden = true;
    RokaCompat.closeDialog($("#backup"));
    render();
    toast("Backup restored successfully.");
  } catch (e) {
    $("#backup-message").textContent = "Restore failed: " + e.message;
  }
};
render();
if (blocked)
  toast(
    "Existing saved data could not be read. It has NOT been overwritten. Use Backup & restore to recover it.",
  );

document.querySelector(".brand").onclick = (e) => {
  e.preventDefault();
  document
    .querySelectorAll("dialog[open]")
    .forEach((d) => RokaCompat.closeDialog(d));
  view = "new";
  render();
  window.scrollTo(0, 0);
  document.body.className = document.body.className.replace(
    /\s*quote-view\b/g,
    "",
  );
};
