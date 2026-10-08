> Sales and Stock is approved for publication on both existing links. The release retains `rokawright.v1` for the modern app and `rokawright.compat.v1` for the tablet app, so existing browser records are read and migrated in place. No automatic synchronization is added.

> Earlier review notes below describe the isolated previews. Current production builds are `dist/` (modern) and `dist-compat/` (tablet).

# RokaWright

A private, device-local workroom for a home sewing business: quotes, customers, measurements, job tracking, prices, and payments. Cream, charcoal, olive, and brass styling adapts to phones and computers.

## Open without installing anything

Download `RokaWright.html`, then open it in a regular browser such as Chrome or Edge. Keep the file in the same location: file-based browser storage varies by browser and file location. Back up before moving it. This self-contained copy needs no server or internet access. Rebuild it after source changes with `npm run build:standalone`.

The cloud server’s localhost address is not accessible from your own device without platform port forwarding. Opening the downloaded file avoids that limitation. The standalone contents were tested through HTTP; this cloud browser blocks file URLs, so direct file opening could not be tested here.

## Run the app

Install Node.js 20 or newer. Open a terminal in this project folder and run:

```sh
npm start
```

Open **http://localhost:3000** in your browser. Keep the terminal open while using the app. Stop it with Ctrl+C. No dependency installation is needed to run the app. Use `PORT=3001 npm start` if port 3000 is busy.

This project is separate from BakePrice and RebuildReady. Publishing instructions are in `DEPLOYMENT.md`; the local preview and public website use separate browser storage.

## Use your workroom

- **New Job:** Choose services, enter quantities and job-specific prices, and save a quote or job. A quick quote does not require a customer profile. Changing the record type from Quote to Job keeps its reference and details.
- Pants alterations start at **$5 per pair** and shirt alterations at **$4 per shirt**, regardless of the number of adjustments. List adjustments in the service details; don't add a second alteration line for the same garment. Pockets are separate at **$5 for both pockets**. Two pairs altered ($10), pockets on one pair ($5), and $3 extra work total **$18**.
- Extra work is a **total charge for the line**, added once, independent of quantity. Customers supply materials; there are no automatic material charges.
- Zippers, tears, sleeves, and custom services require you to enter a price. A price of $0 is allowed for complimentary work. Quantities must be positive whole numbers. Amounts allow up to two decimal places.
- **Customers:** Save and find names, contact details, private notes, and measurements. Choose inches or centimeters; changing units converts existing measurements. A job gets its own measurement copy. Later profile changes do not rewrite that copy. Selecting a customer again loads their current measurements.
- **Saved Jobs:** Search and filter records. Reopen to edit, choose Waiting, In progress, Ready, or Collected, and set an optional due date. Past-due records are highlighted until collected. Delete buttons always ask for confirmation.
- **Payments:** Record a deposit or additional payment, date, and note. Save the job to keep these changes. Payments reduce the balance; overpayments are clearly identified. A removed payment is removed when you save the job.
- **Prices:** Edit standard prices or add/remove services. Leave a standard price blank for custom pricing. Saved jobs keep their original descriptions and prices, including removed services. Overrides on a job don't change the menu.
- **Print / Save as PDF:** Shows a preview of the current quote, including unsaved edits. Click Save PDF in that preview to download a PDF directly; open it in a PDF viewer for paper printing. If the chat file preview blocks printing, choose Download printable quote, open that downloaded HTML file in Chrome or Edge, and click its print button. The quote includes itemized pricing, extra work, total, payments, balance, dates, customer, reference, and the materials note. Customer instructions, workroom notes, customer notes, and measurements stay private. Service details and extra-work explanations appear on the quote, so use those fields for customer-facing text. Save the job separately if you want it stored in the app.

## Your data and backups

Records are saved in **localStorage in the current browser on the current device**. Save buttons store records; drafts and unsaved edits don't survive a reload. Sharing the app address does not share your records. There is no login, cloud account, or synchronization.

1. Open **Backup & restore**.
2. Select **Download JSON backup**. Keep the file in a private, safe place; it includes customer information.
3. To restore, choose a RokaWright JSON file. The app validates it and shows record counts.
4. Download your current backup before choosing **Replace saved data**. Confirm replacement when prompted.

Back up regularly and before clearing browser data, changing devices, or changing the app's address/port. Storage is specific to the browser and address. Private browsing may delete records when it closes. Restoring replaces all saved records rather than merging them. Startup never replaces saved records with defaults. If saved data is unreadable, the app blocks saves and lets you download the original data for recovery.

## Test the project

```sh
npm ci
npm test
npm run test:browser
```

The browser tests use Chromium at `/usr/bin/chromium` in this environment. On another machine, install Chromium and set `CHROMIUM_PATH` to its executable path (for example `CHROMIUM_PATH=/path/to/chrome npm run test:browser`). The tests launch a local server automatically if one isn't already running.

Tests cover integer-cent arithmetic, invalid amounts and quantities, backup validation, the $18 bundled example, persistence across reload, historical quote prices, deposits/additional payments/overpayment, backup download and restore, measurement snapshots, phone layout, and print content/privacy. Browser tests produce a sample PDF and a mobile screenshot in ignored `test-results/`.

## Limits

Use one browser tab for editing at a time; simultaneous tabs don't merge changes. Browser storage is not encrypted and has a limited capacity. Avoid shared devices, and keep backups secure. There are no automated backups, payment processing, tax calculations, business-cost/profit tracking, accounts, or cloud synchronization. Quotes generate PDFs directly on supported browsers; report printing uses the browser print dialog. Older devices have readable and copyable alternatives. The server is a local development preview, not a hosted deployment.

### Chat file preview buttons

Save Job uses a direct click action so previews that block form submissions can still save when browser storage is available. Starting a new job and deleting records use in-app confirmation dialogs. If saving fails, the quote panel shows a message. Printing may be blocked by a chat preview; download the printable quote and open it in a regular browser. Close an older preview and reopen the updated HTML file after an app update. Back up your records before moving between the preview and a downloaded app; they may use different browser storage.

## Home and direct PDF download

Click the RokaWright name in the upper left to return to New Job. This keeps your current draft. Click Print / Save as PDF to preview the quote, then Save PDF to download a real PDF without using a browser print dialog. Open that PDF in Firefox or another PDF viewer to print it. The app includes its PDF library locally; internet access is not required. If an embedded preview blocks all downloads, it cannot be overridden by the app; use its printable-quote fallback outside the preview.

After changing PDF code, run `npm run build:standalone` to rebuild the local PDF library and the single-file app. Test the delivered single file with `ROKA_SINGLE_FILE=1 npm run test:browser`.

## Website deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for GitHub Pages activation and release checks. `npm run build` creates `dist/` for the modern release and `dist-compat/` for the tablet release, plus the two isolated preview builds. Publish only their allowlisted assets to the matching paths.

## Sales and stock previews — review history, October 2026

This feature lives on `feature/sales-stock`, based on the shared compatible app engine. Neither `main` nor `compatibility/android-4` is replaced. The modern appearance remains on capable browsers; the tablet retains its stacked layout, dialog, date-entry, quote and download fallbacks. Both previews include the same sales, stock and reporting engine.

- Modern preview: https://blameitonchris.github.io/RokaWright/sales-preview/
- Tablet preview: https://blameitonchris.github.io/RokaWright/compatibility-sales-preview/
- Original modern release: https://blameitonchris.github.io/RokaWright/
- Original compatibility release: https://blameitonchris.github.io/RokaWright/compatibility/

The previews use `rokawright.salespreview.v2` and `rokawright.compat.salespreview.v2` respectively. The original storage keys (`rokawright.v1`, `rokawright.compat.v1`) remain untouched. Records are browser-local, device-specific and **never automatically synchronized**, even on the same origin. Copy a private backup from the original app, then validate/import it into a preview if needed. Prefer disposable test records. Keep the original backup privately. New version-2 backups contain all old sections plus sales, standalone payments, products, production/opening counts, adjustments and returns. They cannot be imported into the old version-1 app; keep your original backup for that app.

Older version-1 backups are validated and migrated in memory without changing their customer, measurement, job, price or payment values. Missing payment dates remain blank; supply the true date in **Sales → Payments need dates**. Unknown or malformed backups, impossible returns, duplicate job links, and negative stock are rejected before saved data changes. Saving also checks for changes from another tab; reload rather than overwriting newer records. A blocked or unreadable storage area never silently replaces the original data.

### Using sales and stock

1. **Stock**: add a product (optional variant and suggested price), then record production or opening stock. Adjustments are signed changes with a required reason, not replacement counts. Mistaken entries can be corrected or removed if resulting stock stays non-negative.
2. **Sales → Record a sale**: confirm the local sale date, optionally choose a customer, add price-list services, custom lines, or ready-made products. Classify each line as a made item or alteration/other service. Price-list names beginning with “Make” default to made items; change the category when needed. Extra-work charges apply once per line. Stock selection is optional: made-to-order and services use none.
3. **Saved Jobs → Record sale**: copies actual job lines and asks you to confirm the date in the sale form. Old jobs are never converted automatically. Repeat use opens the linked sale rather than duplicating it. Payments belong to the original job and are read once. Future job/price-list changes leave saved sale prices intact. “Update lines explicitly from original job” replaces lines only after confirmation; save to apply.
4. Save a standalone sale before entering payments. Every new payment needs its actual receipt date. The editor shows received money, refunds and remaining balance (or overpayment/refund due). Immediate payment/return actions warn before discarding unsaved line edits.
5. For a return, choose the line, returned quantity (0 for a price refund), date, reason, refund/credit value and money actually paid back (0 for credit against an unpaid balance). Mark usable ready-made goods for restocking. Cash refunds cannot exceed recorded receipts. Partial extra-work refunds are explicit. Returned quantities and credits cannot exceed the sale line. Reversing a mistaken return is confirmed and validated.
6. Editing or deleting an unpaid unlinked sale changes the derived stock once. Cancelled sales release stock and disappear from sales reports while preserving actual receipts. Reactivation validates available stock. Returned sales retain return history: use returns/credits to reverse their value, or explicitly reverse mistaken returns before cancellation. Sales with payments, returns or job links cannot be permanently deleted; keep the audit history. Jobs with linked sales cannot be deleted.

### Reports

Today, Monday–Sunday week, month, year and inclusive custom dates use **local calendar dates**. Gross sales use sale dates; refunds/credits and actual cash refunds use return/refund dates; money received uses payment dates. Cancelled sales are excluded from sales figures; their receipts remain real money received. Jobs with deposits but no recorded sale contribute receipts without inventing a sale. Undated payments are excluded with a correction list. Date filters select reporting activity, not the sale-history list.

Reports show sales/refunds/net sales, sale count, separate made-item and service units sold, returned units in the breakdown, best sellers by net quantity and net value, gross receipts, cash paid back and net receipts. A refund from a previous-period sale may produce negative net sales in the current period. Mixed-line payments are proportionally allocated by line value for category filters, with integer-cent rounding that conserves the total. Unvalued job payments default to service receipts when filtered. The chart shows dates with activity (omitted dates mean zero); an accessible scrollable table provides exact amounts. CSV and printable summaries use the same selected range and category. No costs or profit are calculated.

CSV downloads become copyable text on unsupported browsers. “Printable summary” offers a full-page readable summary and copyable text; on modern browsers it also offers browser printing/Save as PDF. On tablets without printing, use screenshots or privately transfer a backup to a newer device. No offline or service-worker support is added.

### Preview test on the actual tablet

Use Chrome **71.0.3578.99** or Opera **50.5.2426.149814** on the Android **4.2.2** tablet:

1. Open the tablet preview above; the originals stay available.
2. Add a do-rag product at $10 and record five made units in Stock.
3. Record a sale of two stocked do-rags and one $12 made-to-order hoodie. Total should be $32 and stock should show three available.
4. Save an alteration job with a deposit; choose Record sale and confirm the date. Repeat the action: one sale and one deposit should remain.
5. Try a return, a sale edit, and cancellation on a separate unreturned sale. Confirm stock, amounts, filters, and balances.
6. Rotate the tablet. Scroll through all sections, menus, forms and tables. Try CSV text, full report, quote text and backup/paste restore. Report any missing content or inactive buttons and which browser was used.

Desktop tests use modern Chromium, mobile viewport checks, forced legacy layout and removed-API simulations. Firefox could not be installed because the environment blocked its browser-download domains; Firefox is not claimed as tested. These checks **they do not prove actual Android compatibility**. The original compatibility version was tested successfully by the friend; these new feature screens still need tablet review before publication.

### Build and verification

`npm run build` builds allowlisted public files into `dist-sales/` and `dist-compat-sales/`. Both use an ES5-parsed classic-script bundle with API polyfills and CSS color fallbacks. `npm run build:standalone` updates the optional single HTML preview. `npm test` checks stock, historical prices, linked payments, refunds, imports and calendar boundaries. `npm run test:browser` checks existing workflows plus the new workflows in modern and simulated tablet configurations. Synthetic automated-test fixtures live only in tests and are excluded from release assets. No real customer or private test records belong in GitHub.

Checkpoints: `checkpoint-before-sales-modern-20261008`, `checkpoint-before-sales-compat-20261008`, `checkpoint-before-sales-pages-20261008`. Review approval is required before replacing either original release. Publish previews only under `sales-preview/` and `compatibility-sales-preview/`; preserve root and `compatibility/` bytes.

Verification completed for this review: 9 unit tests, all 12 local browser workflows, and all 7 standalone regression workflows passed. The same 12 workflows also passed against each deployed preview’s actual assets, fetched with certificate-verified HTTPS for this environment’s browser proxy. All 17 served assets (both originals plus both previews) matched the committed Pages files byte-for-byte. Existing modern and tablet Pages files and their source branches remain unchanged. Real-tablet review is still pending.


## Approved publication — 8 October 2026

The user approved both versions after reviewing the previews. Publish the modern production build at https://blameitonchris.github.io/RokaWright/ and the tablet build at https://blameitonchris.github.io/RokaWright/compatibility/. Each keeps its original browser-storage key. Existing version-1 data is validated and migrated in memory; the first successful save writes version 2 without deleting customers, jobs, measurements, prices or payments. Back up regularly, particularly before clearing browser data. Preview-only records do not automatically move to production; export/import a private backup if you want to transfer them, knowing restore replaces the destination records.

Publication checkpoints are `checkpoint-before-sales-publication-modern-20261008`, `checkpoint-before-sales-publication-tablet-20261008`, and `checkpoint-before-sales-publication-pages-20261008`. The public deployment contains application assets only. Preview directories remain available and unchanged. Automated checks include startup migration under the original storage key and protection of the other version's key; real-device limitations in the compatibility notes still apply.

## Android offline test — separate preview

[Offline setup and tablet checklist](OFFLINE.md) describes the new, isolated test at https://blameitonchris.github.io/RokaWright/compatibility-offline-preview/. It does not replace either published app. The friend confirmed Chrome 71.0.3578.99 and Opera 50.5.2426.149814 on Android 4.2.2. The preview feature-checks browser support, verifies bundled asset hashes and writable storage, and exposes guarded updates. Ready means the current check passed, not that Android can never evict storage. Records remain on the device; there is no cloud synchronization. `npm run build:offline` creates the allowlisted `dist-offline/` build. Actual airplane-mode/browser-reopen/tablet-reboot checks and Android printing/download behavior require the friend's device before any promotion.
