# Android tablet offline review

This is a **separate test version**, not an update to either published app.

Test URL: https://blameitonchris.github.io/RokaWright/compatibility-offline-preview/

Work branch: `feature/tablet-offline-preview`. Original source checkpoints: `checkpoint-before-offline-modern-20261008` (`76b5882`), `checkpoint-before-offline-tablet-20261008` (`1bd56b7`), and `checkpoint-before-offline-pages-20261008` (`3158b08`). The main URL, `compatibility/`, and existing sales previews remain unchanged.

## Browser investigation

The friend confirmed Chrome **71.0.3578.99** and Opera **50.5.2426.149814**, on Android **4.2.2**. Chrome for Android supports service workers and Cache Storage from Chrome 40; Chrome 71 is a suitable candidate even though the operating system is old. Opera's installed browser/mode must be verified on the device: full Opera can expose these features, while proxy/data-saving modes may prevent reliable local execution or caching. A version number alone does not prove successful preparation, downloads, persistent storage, or restart behavior.

The preview feature-checks service-worker registration, Cache Storage, fetch, message channels and SHA-256 support in a secure context. It then verifies every essential cached response and tests writable browser-local storage before reporting ready. Unsupported browsers keep the online workroom but explicitly disable preparation. No modern PWA installation, web-app manifest, Android print framework or service-worker support is assumed merely from Android's version. The HTTPS site must load normally; certificate checks must not be disabled.

Application Cache was considered but is deprecated/removed in newer browsers, has incompatible lifecycle behavior across these versions, and would introduce a second update mechanism. A cached tab or downloaded HTML file does not establish reliable reopening or stable local-storage behavior on Android. Neither is presented as a reliable fallback.

## Prepare while connected

1. Open the **test URL above** in full Chrome. Use ordinary browsing, not private/incognito mode. The offline panel should appear above the usual workroom. There is no Play Store installation.
2. Choose **Prepare for offline use**. Leave the page open and connected until it says **Ready for offline use**. If preparation fails, do not depend on it offline. Reconnect, check free space and try again; use **Check offline readiness** to recheck.
3. Bookmark that exact URL, including its ending slash. If Chrome offers **Add to Home screen**, a shortcut is convenient, but creating it is not proof of offline readiness. Use the same browser and profile each time.
4. Back up records from both published apps privately before testing. Use disposable test records first. This preview has its own key, `rokawright.compat.offlinepreview.v2`. Original modern and tablet records retain `rokawright.v1` and `rokawright.compat.v1` and are never overwritten by preview preparation.
5. Save every job/sale before leaving or closing. Unsaved drafts do not survive browser closure, forced stops or tablet shutdown; Android may not display a closing warning.

The ready label means the assets were verified and storage worked **at that moment**. Browsers/Android can evict cached files or remove records, especially after clearing data, using private mode, storage pressure or cleanup apps. Keep sufficient free space, recheck readiness before travel, and keep independent backups. This is not a promise that the browser can never lose data.

## Actual-tablet test — Chrome, then separately Opera

Each browser has separate records and must be prepared separately.

1. **Online:** open the test URL, prepare it, wait for Ready, bookmark it. Create a small test record and make a private backup.
2. **Airplane mode:** enable airplane mode and turn Wi-Fi off too. Check that no network connection remains. Choose Check offline readiness.
3. **Close and reopen:** save any work, close all test tabs/browser windows, remove the browser from recent apps if appropriate, then reopen the bookmarked test URL without internet. Do not rely on a tab that stayed in memory.
4. **Create and save:** add a test customer with measurements. Create a quote/job (two pants alterations plus pockets and $3 extra work should total $18), record a deposit and save it. In Stock, add a $10 do-rag and record five made units. In Sales, sell two stocked do-rags plus one $12 made-to-order hoodie; expect $32 and three do-rags available. Save, reload and reopen each record.
5. **Restart the tablet:** save everything, leave airplane mode enabled and restart Android. Reopen the bookmarked URL in the same browser. Confirm the customer/measurements, job, payments, sale and stock are still present and usable. Try a change, save it, close and reopen again.
6. **Reconnect:** disable airplane mode, reconnect, reopen/check readiness, and confirm the same records remain intact. Reconnecting never uploads or synchronizes them. Test backup/copy and restore with disposable data, plus quote/report reading, portrait/landscape scrolling and keyboard interaction.

Report the browser, the failing step and its exact status message. If full Opera fails, try Chrome rather than assuming identical engines/modes. If layout needs the existing tablet fallback, bookmark the test URL with `?legacy=1`; this uses the same preview records and cache, but intentionally replaces PDFs/downloads with readable/copyable alternatives.

## Backups and existing records

Use the existing footer **Backup & restore**. Download JSON if the browser supports it; otherwise **Copy backup text**, select all, and save the complete JSON privately in a text file or transfer it to your own newer device. File export and text copying need no internet, but Android's browser/file manager permissions and download handling still require device testing.

Backups contain customers, measurements, jobs, prices, payments, sales, products, production/adjustments and returns. The same validated import/paste restore accepts old backups and rejects malformed or impossible records before replacement. Restore **replaces** this test version's records; it does not merge. Back up the destination first. Copying a backup from the published tablet app into the offline preview does not move or synchronize the original records. Never send customer backups to GitHub, the public site, or this repository.

No account, cloud database, automatic backup or synchronization is added. Offline changes remain in this browser/profile on this tablet. Browser cache holds executable app assets only; record JSON never enters the service-worker cache.

## Safe updates

- Reconnect, save all jobs/sales, finish or close customer/stock forms, and export a private backup.
- Choose **Prepare / check for updates**. A newer complete release can wait while the current release keeps working, including offline. Partial/corrupted downloads fail SHA-256 verification and cannot activate.
- When **Apply prepared update** appears, close all other offline-test tabs, then use it. The app checks unfinished edits, asks for confirmation and reloads only after the verified waiting release activates. Multiple test tabs cause refusal. Storage keys and records are unchanged.
- No forced reload is performed while working. Like the standard service-worker lifecycle, a waiting release may activate after *all* test tabs close; save work before closing. On the next opening its bundled page and assets are served together. Old immutable assets/caches are retained so lazy PDF loads from an older open page remain available. Repeated releases consume cache space; preparation can fail if space is exhausted, without deliberately deleting the working release or records.
- If the ready check detects a missing cached file, reconnect and Prepare again to repair verified assets. Do not clear browser data as a troubleshooting step unless you have a checked independent backup. Clearing it can delete both caches and records for all apps on this origin.

## Local assets and limitations

The compiled ES5 app, CSS with older color/layout fallbacks, PDF library, offline controls and immutable HTML shell are precached as one verified release. Logos are inline SVG. The existing design uses system-font fallbacks (Arial/Georgia and available local fonts), not remote font downloads. PDF font metrics/tools are bundled; no CDN, external script, font request or image request is required for the requested workflows. All readiness controls and worker code are parsed as ES5.

The cache is scoped only to `compatibility-offline-preview/`; it cannot control the main or published compatibility paths. Cache-first shell navigation preserves the prepared release offline. Only this preview's named immutable assets are matched; unrelated requests and other paths are not cached. The worker never receives or writes customer data.

On supported modern browser capabilities, a quote PDF can be generated offline even if never opened online: its library is prepared in advance. Android 4.2.2's printing framework and exact browser/download/PDF-viewer behavior are not guaranteed. The existing older layout provides **View full quote / Copy quote text**, and reports offer a full readable summary/table, copyable text and CSV text fallback. Use screenshots or privately transfer a backup to a newer device for printing. Downloads, file picking, clipboard long-press and external PDF viewers require actual-tablet tests. Printing to a network printer needs that printer connection; this cache does not provide printer support.

## If browser offline use is unreliable

An installable application is a concrete fallback, but is **not implemented or claimed compatible by this preview**. It would need:

- An APK with **minimum SDK 17 (Android 4.2)**, the complete ES5 application and all assets bundled, and a stable package ID/signing key for data-preserving upgrades.
- Compatibility testing against Android 4.2's *system WebView*, which can be much older than Chrome 71. Keep the CSS/DOM/API fallbacks, audit unsupported DOM APIs and benchmark memory/performance on this tablet; merely wrapping the website is insufficient.
- Reliable native SQLite/app-private record storage, plus a narrowly scoped, validated bridge exposed only to trusted bundled pages. No remote pages or arbitrary JavaScript should be allowed to access that bridge. App-private saved data must survive process death/reboots and signed upgrades; uninstall/clear-data still deletes it.
- Native backup export/import usable on SDK 17 (rather than assuming newer Storage Access Framework or print APIs), validation before replacement, storage-error handling and private transfer of the existing browser's JSON backup. Browser storage cannot be silently imported into an APK.
- Actual-device tests for the same six steps, measurements/payments/stock/returns, update interruptions, low storage, file permissions and PDF/text alternatives. Native printing cannot assume Android 4.4's print framework exists.

If the browser trial fails after investigating its status messages, this is the next implementation path; a stable, signed APK and device testing would be separate work.

## Build and verification

`npm run build:offline` builds the compatible app/PDF and creates public allowlisted files in ignored `dist-offline/`. `node scripts/build-offline.js` packages already-built assets. Immutable files are retained for updates; publish from a freshly built directory for an initial release, then preserve prior deployed immutable assets on later releases. Never copy browser profiles, JSON backups, tests, environment files or arbitrary project files.

The local Node server exposes only the named offline public assets at `/compatibility-offline-preview/`. Development loopback is treated as a secure context by Chromium; the public preview requires HTTPS. Tests use modern desktop Chromium with the network disabled before navigation, persistent browser profiles closed/reopened twice, all core record workflows, unopened-online PDF tools, backups, reconnection, forced legacy layout, unsupported APIs, missing-asset repair, failed/corrupt installation and guarded updates. Desktop browser restarts are **not an Android restart**. Exact Chrome 71/Opera 50 engines, actual airplane mode, Android reboot/cache eviction, browser storage durability, touch/keyboard and Android file/print integration remain real-tablet checks. No such hardware/emulator is available here.

Verification result for this build: **9 unit tests and 21 browser workflows passed**, including eight dedicated offline/update/storage-failure cases and thirteen existing regressions. The tablet fallback screenshot was reviewed with no horizontal document overflow. The persistent-profile test disables networking before reopening the browser, saves records offline, closes/reopens again, and reconnects without changing their values. Android hardware and the exact two installed browser engines remain untested here.

The separate public preview was deployed and all **26 served files** (existing apps/previews plus this release) matched committed bytes over certificate-verified HTTPS. All previously published files and both original source branches remain unchanged. The exact downloaded offline assets were also replayed unchanged from a loopback server for six additional offline checks; the two mutable update fixtures were deliberately skipped in that read-only replay and already passed locally. This verifies the release contents, not the actual tablet's HTTPS stack, browser engines or Android reboot behavior.
