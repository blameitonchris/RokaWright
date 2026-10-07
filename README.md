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
- **Print / Save as PDF:** Shows a preview of the current quote, including unsaved edits. Click Print / Save as PDF in that preview, then choose “Save as PDF” in the browser's destination selector. If the chat file preview blocks printing, choose Download printable quote, open that downloaded HTML file in Chrome or Edge, and click its print button. The quote includes itemized pricing, extra work, total, payments, balance, dates, customer, reference, and the materials note. Customer instructions, workroom notes, customer notes, and measurements stay private. Service details and extra-work explanations appear on the quote, so use those fields for customer-facing text. Save the job separately if you want it stored in the app.

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

## First-version limitations

Use one browser tab for editing at a time; simultaneous tabs don't merge changes. Browser storage is not encrypted and has a limited capacity. Avoid shared devices, and keep backups secure. There are no automated backups, payment processing, tax calculations, inventory, accounts, or cloud synchronization. Browser printing handles PDF generation, so page layout and dialog options can vary between browsers. The server is a local development preview, not a hosted deployment.

### Chat file preview buttons

Save Job uses a direct click action so previews that block form submissions can still save when browser storage is available. Starting a new job and deleting records use in-app confirmation dialogs. If saving fails, the quote panel shows a message. Printing may be blocked by a chat preview; download the printable quote and open it in a regular browser. Close an older preview and reopen the updated HTML file after an app update. Back up your records before moving between the preview and a downloaded app; they may use different browser storage.

## Home and direct PDF download

Click the RokaWright name in the upper left to return to New Job. This keeps your current draft. Click Print / Save as PDF to preview the quote, then Save PDF to download a real PDF without using a browser print dialog. Open that PDF in Firefox or another PDF viewer to print it. The app includes its PDF library locally; internet access is not required. If an embedded preview blocks all downloads, it cannot be overridden by the app; use its printable-quote fallback outside the preview.

After changing PDF code, run `npm run build:standalone` to rebuild the local PDF library and the single-file app. Test the delivered single file with `ROKA_SINGLE_FILE=1 npm run test:browser`.

## Website deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for GitHub Pages activation and release checks. Run `npm run build` to create the public-only `dist/` folder.
