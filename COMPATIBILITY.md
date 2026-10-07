# Android tablet compatibility preview

## Protected release

- Main source checkpoint: `checkpoint-modern-20261008` (`cb3e4bd`).
- Original Pages release: `c6c706d`.
- Work branch: `compatibility/android-4`.
- Preview URL: https://blameitonchris.github.io/RokaWright/compatibility/
- Main site remains https://blameitonchris.github.io/RokaWright/ . Its root assets must not be replaced until the owner approves after testing.

The preview uses `rokawright.compat.v1`; the main app uses `rokawright.v1`. Preview saves and restores never write the production key. Preview data persists only in this browser. Do not put important customer records in the preview. A backup imported into it is a copy, not a migration of the live records. No storage-schema change is required.

## Reported tablet

Android 4.2.2; Chrome 71.0.3578.99; Opera 50.5.2426.149814. Symptom: only the header appears, no buttons respond. Chrome 71 cannot parse optional chaining/nullish coalescing in the original source, so the module can fail before rendering the workroom. Other unsupported APIs include `structuredClone` and `crypto.randomUUID`. The exact Opera engine and its download behavior still require device testing.

## Changes

- Load a classic ES5 bundle, not a module. Babel and Terser compile newer syntax; Acorn rejects anything outside ES5. Include local core-js polyfills for promises, collections, strings, and object APIs. Core-js's license is retained.
- Preserve modern styling; emit static color declarations before CSS variable declarations. Detect missing grid/variables and use a stacked layout with wrapping service cards and forms. Detect missing flex gap and supply margins. Preserve normal document scrolling.
- Use a plain-data JSON cloning fallback and unique record IDs when native APIs are missing. Money remains integer cents and has a two-decimal US-dollar formatting fallback.
- Provide scrollable in-app dialogs when native dialogs are missing, including confirmation, focus management, keyboard dismissal, and close buttons.
- Read backups with FileReader instead of Blob.text. Offer explicit copyable JSON and a validated paste restore alternative. Validate and confirm before replacing only preview records.
- Build the PDF library as ES5 and load it only on demand. Provide a full readable quote and copyable customer-facing text when PDF/download support is missing. Internal instructions, notes, and measurements are excluded. Old-layout mode intentionally avoids loading the PDF library.
- No service worker, offline cache, installed app, or offline support has been added. HTTPS, internet access, and usable browser storage remain required.

## Tests and limits

Modern Chromium regression checks cover bundled pricing, overrides and historical prices, job persistence, payments/overpayment, customer measurement snapshots, backups and invalid imports, quote privacy/PDF content, removed-service history, overdue records, home navigation, and phone layout. A simulated capability-removal test additionally removes newer APIs and forces legacy dialogs/layout, checking all core workflows and production-storage isolation.

ES5 parsing and feature simulation are evidence of targeted fixes, not proof of Android 4.2.2 compatibility. There is no actual Android 4.2.2 device/emulator or those exact Chrome/Opera builds in this environment. Old tablet memory, Opera's data-saving/proxy mode, file pickers/download managers, virtual keyboard, touch scrolling, and system TLS trust must be checked on the tablet. Some older layouts are stacked instead of side-by-side; native date fields may become YYYY-MM-DD text inputs. If browser-local storage is unavailable, saves are blocked with a warning, not silently discarded. If HTTPS cannot connect, this app cannot fix the tablet's trust store; do not disable certificate checks.

## Simple tablet test

1. Open the preview URL in Chrome, then separately in Opera. Wait for the New Job form, not just the header. Check all four navigation buttons and the RokaWright home link.
2. Rotate the tablet both ways. Scroll to services, payments, totals, and footer, and back to the top. Open measurements, confirmations, and backup dialogs; verify their bottoms and Close buttons are reachable with the keyboard open.
3. Make a test quote: two pants alterations, pockets on one pair, and $3 extra work once. Expect $18. Enter multiple adjustments in the details without adding an alteration twice.
4. Save, reload, and reopen it. Add $5 and $4 payments; expect $9 remaining. Change a standard price; the saved quote must still be $18.
5. Add a test customer and measurements. Make a quote, update the customer's measurements, and check that the quote's snapshot is unchanged.
6. Try Save PDF. If it cannot download/open, try View full quote and Copy quote text. Check that private notes/measurements are absent.
7. Export a test backup. If download fails, use Copy backup text. Paste it into the restore field, validate, and confirm. An invalid backup must leave records intact. Keep copied backups private.
8. Report the browser, the failing step, and what appears. Use only test records for now.

If layout or dialog scrolling is still broken, try https://blameitonchris.github.io/RokaWright/compatibility/?legacy=1 . This forces the stacked layout and disables PDFs in favor of readable/copyable quotes. Both URLs use the same preview-only data.

Build with `npm run build`; output is the allowlisted `dist-compat/`. Refresh the downloadable preview with `npm run build:standalone`. Do not run the old full-root Pages publish procedure for this branch. Deploy only into `compatibility/`, verify every original root asset is unchanged, and keep `main` at its checkpoint until approved.
