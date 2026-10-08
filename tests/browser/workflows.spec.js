import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test.beforeEach(async ({ page }) => {
  if (process.env.ROKA_SINGLE_FILE === "1") {
    const html = await readFile("RokaWright.html", "utf8");
    await page.route("http://127.0.0.1:3100/", (route) =>
      route.fulfill({ contentType: "text/html", body: html }),
    );
  }
});
const nav = (p, name) =>
  p.getByRole("navigation").getByRole("button", { name, exact: true }).click();
async function sample(p) {
  await p.getByRole("button", { name: /Alter pants/ }).click();
  await p.getByLabel("Quantity", { exact: true }).fill("2");
  await p
    .getByLabel("Extra work ($, total for this line)", { exact: true })
    .fill("3");
  await p
    .getByLabel("Adjustments / service details")
    .fill("Shorten legs and adjust waist");
  await p.getByRole("button", { name: /Add both pockets/ }).click();
  await expect(p.locator(".big-total")).toHaveText("$18.00");
}
test("jobs, payments, historical prices, backup and print", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await sample(page);
  await page.getByLabel("Name on this quote").fill("Chris");
  await page.getByLabel("Workroom notes").fill("PRIVATE WORKROOM");
  await page.getByLabel("Deposit / additional payment").fill("5");
  await page.getByRole("button", { name: "Record payment" }).click();
  await page.getByRole("button", { name: "Save quote / job" }).click();
  await page.reload();
  await nav(page, "Saved Jobs");
  await page.getByRole("button", { name: "Open / edit" }).click();
  await expect(page.locator(".big-total")).toHaveText("$18.00");
  await expect(page.locator("#summary")).toContainText("$13.00");
  await page.getByLabel("Deposit / additional payment").fill("4");
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.locator("#summary")).toContainText("$9.00");
  await page.getByRole("button", { name: "Save changes" }).click();
  await nav(page, "Prices");
  const pants = page.locator('[data-price="service-0"]');
  await pants.locator("[name=price]").fill("8");
  await pants.getByRole("button", { name: "Save", exact: true }).click();
  await nav(page, "Saved Jobs");
  await page.getByRole("button", { name: "Open / edit" }).click();
  await expect(page.locator(".big-total")).toHaveText("$18.00");
  await page.evaluate(() => (window.print = () => (window.printCalled = true)));
  await page
    .getByRole("button", { name: "Print / Save as PDF", exact: true })
    .click();
  await expect(page.locator(".print-only")).toContainText("$18.00");
  await expect(page.locator(".print-only")).not.toContainText(
    "PRIVATE WORKROOM",
  );
  const pdfDownload = page.waitForEvent("download");
  await page.locator("#quote-print").click();
  const pdfFile = await pdfDownload;
  expect(pdfFile.suggestedFilename()).toMatch(/\.pdf$/);
  await pdfFile.saveAs("test-results/downloaded-quote.pdf");
  expect(
    (await readFile("test-results/downloaded-quote.pdf"))
      .subarray(0, 5)
      .toString(),
  ).toBe("%PDF-");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("header")).toBeHidden();
  await expect(page.locator(".print-only")).toBeVisible();
  await page.pdf({ path: "test-results/quote.pdf", format: "A4" });
  await page.emulateMedia({ media: "screen" });
  await page.locator("#quote-close").click();
  await page.getByRole("button", { name: "Backup & restore" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download JSON backup" }).click();
  const file = await (await download).path();
  await page.locator("#import").setInputFiles(file);
  await expect(page.locator("#backup-message")).toContainText("1 jobs");

  await page
    .getByRole("button", { name: "Replace saved data with this backup" })
    .click();
  await page
    .locator(".confirmation")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await nav(page, "Saved Jobs");
  await expect(page.locator(".record")).toHaveCount(1);
  await page.getByRole("button", { name: "Open / edit" }).click();
  await expect(page.locator("#summary")).toContainText("$9.00");
  await page.getByLabel("Deposit / additional payment").fill("20");
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.locator("#summary")).toContainText("Overpayment");
  await expect(page.locator("#summary")).toContainText("$11.00");
  expect(errors).toEqual([]);
});
test("customer measurement snapshots and mobile layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await nav(page, "Customers");
  await page.getByLabel("Name", { exact: true }).fill("Sam");
  await page.getByLabel("Waist (in)", { exact: true }).fill("32");
  await page.getByRole("button", { name: "Save customer" }).click();
  await page.getByRole("button", { name: "New quote", exact: true }).click();
  await page.getByRole("button", { name: /Alter a shirt/ }).click();
  await page.getByRole("button", { name: "Save quote / job" }).click();
  await nav(page, "Customers");
  await page.getByRole("button", { name: "Edit profile" }).click();
  await page.getByLabel("Waist (in)", { exact: true }).fill("34");
  await page.getByRole("button", { name: "Save customer" }).click();
  await nav(page, "Saved Jobs");
  await page.getByRole("button", { name: "Open / edit" }).click();
  await page.locator("#job-form summary").click();
  await expect(page.getByLabel("Waist (in)", { exact: true })).toHaveValue(
    "32",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
});
test("invalid input and backup do not overwrite saved records", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: /Alter pants/ }).click();
  await page.getByLabel("Quantity", { exact: true }).fill("1.5");
  await page.getByRole("button", { name: "Save quote / job" }).click();
  expect(
    await page.evaluate(() =>
      localStorage.getItem(window.ROKA_STORAGE_KEY || "rokawright.v1"),
    ),
  ).toBeNull();
  await page.getByLabel("Quantity", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Save quote / job" }).click();
  const before = await page.evaluate(() =>
    localStorage.getItem(window.ROKA_STORAGE_KEY || "rokawright.v1"),
  );
  await page.getByRole("button", { name: "Backup & restore" }).click();
  await page.locator("#import").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":1}'),
  });
  await expect(page.locator("#backup-message")).toContainText("Cannot restore");
  expect(
    await page.evaluate(() =>
      localStorage.getItem(window.ROKA_STORAGE_KEY || "rokawright.v1"),
    ),
  ).toBe(before);
});

test("removed services remain readable; overdue status and corrupt storage protection", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: /Alter pants/ }).click();
  await page.getByLabel("Due date (optional)").fill("2020-01-01");
  await page.getByRole("button", { name: "Save quote / job" }).click();
  await nav(page, "Prices");

  await page
    .getByRole("button", { name: "Remove Alter pants", exact: true })
    .click();
  await page
    .locator(".confirmation")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await nav(page, "Saved Jobs");
  await expect(page.locator(".overdue")).toHaveText("Overdue · not collected");
  await page.getByRole("button", { name: "Open / edit" }).click();
  await expect(page.locator(".big-total")).toHaveText("$5.00");
  await expect(page.getByLabel("Service description")).toHaveValue(
    "Alter pants",
  );
  await page.getByLabel("Work status").selectOption("Collected");
  await page.getByRole("button", { name: "Save changes" }).click();
  await nav(page, "Saved Jobs");
  await expect(page.locator(".overdue")).toHaveCount(0);
  await page.evaluate(() =>
    localStorage.setItem(window.ROKA_STORAGE_KEY || "rokawright.v1", "{broken"),
  );
  await page.reload();
  await expect(page.locator("#storage-warning")).toBeVisible();
  expect(
    await page.evaluate(() =>
      localStorage.getItem(window.ROKA_STORAGE_KEY || "rokawright.v1"),
    ),
  ).toBe("{broken");
});

test("all quote actions work in a preview that blocks native forms and dialogs", async ({
  page,
}) => {
  const { readFile } = await import("node:fs/promises");
  const html = await readFile("RokaWright.html", "utf8");
  await page.route("**/standalone-preview", (route) =>
    route.fulfill({ contentType: "text/html", body: html }),
  );
  await page.goto("./");
  await page.evaluate(() => {
    document.body.innerHTML =
      '<iframe title="App preview" src="/standalone-preview" sandbox="allow-scripts allow-same-origin allow-downloads" style="width:100%;height:1000px"></iframe>';
  });
  const app = page.frameLocator("iframe");
  await app.getByRole("button", { name: /Alter pants/ }).click();
  await app
    .getByRole("button", { name: "Save quote / job", exact: true })
    .click();
  await expect(app.locator("#job-message")).toHaveText(
    "Job saved on this device.",
  );
  await app
    .getByRole("button", { name: "Print / Save as PDF", exact: true })
    .click();
  await expect(app.locator("#quote-preview")).toBeVisible();
  const pdfDownload = page.waitForEvent("download");
  await app.locator("#quote-print").click();
  const pdf = await pdfDownload;
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
  expect((await readFile(await pdf.path())).subarray(0, 5).toString()).toBe(
    "%PDF-",
  );
  const download = page.waitForEvent("download");
  await app.getByRole("button", { name: "Download printable quote" }).click();
  expect((await download).suggestedFilename()).toMatch(
    /^RokaWright-quote-.*\.html$/,
  );
  await app.locator("#quote-close").click();
  await app.getByLabel("Name on this quote").fill("Unsaved edit");
  await app.getByRole("button", { name: "Start a new job" }).click();
  await expect(app.locator(".confirmation")).toBeVisible();
  await app
    .locator(".confirmation")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(app.getByLabel("Name on this quote")).toHaveValue(
    "Unsaved edit",
  );
  await app.getByRole("button", { name: "Start a new job" }).click();
  await app
    .locator(".confirmation")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await expect(app.getByLabel("Name on this quote")).toHaveValue("");
  await expect(app.locator("#job-message")).toContainText("New job started");
  await app
    .getByRole("navigation")
    .getByRole("button", { name: "Saved Jobs" })
    .click();
  await expect(app.locator(".record")).toHaveCount(1);
});

test("RokaWright wordmark returns home from every page without discarding the draft", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: /Alter pants/ }).click();
  await page.getByLabel("Name on this quote").fill("Home link test");
  for (const screen of ["Customers", "Saved Jobs", "Prices"]) {
    await nav(page, screen);
    await page.getByRole("link", { name: "RokaWright — New Job" }).click();
    await expect(
      page
        .getByRole("navigation")
        .getByRole("button", { name: "New Job", exact: true }),
    ).toHaveClass(/active/);
    await expect(page.getByLabel("Name on this quote")).toHaveValue(
      "Home link test",
    );
    await expect(page.locator(".big-total")).toHaveText("$5.00");
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  }
});

test("legacy fallback workflow and production storage isolation (simulated capabilities)", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.structuredClone = undefined;
    window.Intl = undefined;
    delete Object.entries;
    delete Array.prototype.find;
    delete Array.prototype.findIndex;
    delete Array.prototype.includes;
    delete String.prototype.padStart;
    delete String.prototype.replaceAll;
    window.Promise = undefined;
    try {
      crypto.randomUUID = undefined;
    } catch {}
    try {
      delete Element.prototype.remove;
    } catch {}
    try {
      delete NodeList.prototype.forEach;
    } catch {}
    try {
      delete Blob.prototype.text;
    } catch {}
    if (!localStorage.getItem("rokawright.unused-isolation-test"))
      localStorage.setItem("rokawright.unused-isolation-test", "production-records-untouched");
  });
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto("./?legacy=1");
  await expect(page.locator("html")).toHaveClass(/legacy-layout/);
  await page.getByRole("button", { name: /Alter pants/ }).click();
  await page.getByLabel("Quantity", { exact: true }).fill("2");
  await page
    .getByLabel("Extra work ($, total for this line)", { exact: true })
    .fill("3");
  await page.getByRole("button", { name: /Add both pockets/ }).click();
  await page.getByLabel("Workroom notes").fill("PRIVATE NOTES DO NOT PRINT");
  await expect(page.locator(".big-total")).toHaveText("$18.00");
  await page.getByRole("button", { name: "Save quote / job" }).click();
  await page.reload();
  await nav(page, "Saved Jobs");
  await page.getByRole("button", { name: "Open / edit" }).click();
  await expect(page.locator(".big-total")).toHaveText("$18.00");
  await page.getByLabel("Deposit / additional payment").fill("5");
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.locator("#summary")).toContainText("$13.00");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page
    .getByRole("button", { name: "Print / Save as PDF", exact: true })
    .click();
  await expect(page.locator("#quote-preview.compat-dialog")).toBeVisible();
  await expect(page.locator("#quote-print")).toBeHidden();
  await page
    .getByRole("button", { name: "Copy quote text", exact: true })
    .click();
  const quote = page.locator(".text-alternative textarea");
  await expect(quote).toHaveValue(/\$18.00/);
  await expect(quote).not.toHaveValue(/PRIVATE NOTES/);
  await page
    .locator(".text-alternative")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await page.getByRole("button", { name: "View full quote" }).click();
  await expect(page.locator(".print-only")).toBeVisible();
  await page.getByRole("button", { name: "Back to workroom" }).click();
  await page.getByRole("button", { name: "Backup & restore" }).click();
  await page.getByRole("button", { name: "Download JSON backup" }).click();
  const backup = await page.locator(".text-alternative textarea").inputValue();
  expect(JSON.parse(backup).jobs).toHaveLength(1);
  await page
    .locator(".text-alternative")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await page
    .getByText("Paste backup text (alternative to a file)", { exact: true })
    .click();
  await page.locator("#pasted-backup").fill(backup);
  await page.getByRole("button", { name: "Validate pasted backup" }).click();
  await page
    .getByRole("button", { name: "Replace saved data with this backup" })
    .click();
  await page
    .locator(".confirmation")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  expect(await page.evaluate(() => localStorage.getItem("rokawright.unused-isolation-test"))).toBe(
    "production-records-untouched",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await nav(page, "Customers");
  await page.getByLabel("Name", { exact: true }).fill("Legacy test");
  await page.getByLabel("Waist (in)", { exact: true }).fill("32");
  await page.getByRole("button", { name: "Save customer" }).click();
  await page.getByRole("button", { name: "Edit profile" }).click();
  await expect(page.getByLabel("Waist (in)", { exact: true })).toHaveValue(
    "32",
  );
  await page.setViewportSize({ width: 600, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/legacy-tablet.png",
    fullPage: true,
  });
});
