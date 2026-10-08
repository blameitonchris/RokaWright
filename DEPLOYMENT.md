> This branch is a sales/stock review. Publish only into `sales-preview/` and `compatibility-sales-preview/`. Do not replace root or `compatibility/` files, or merge to either original source branch.

# Publish RokaWright with GitHub Pages

This app is a static website. GitHub Pages should publish the `gh-pages` branch, root folder. That branch contains only the public files built by `npm run build`, never customers, backups, tests, or server files.

## First-time activation

1. Open https://github.com/blameitonchris/RokaWright/settings/pages while signed into GitHub.
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Under **Branch**, select **gh-pages**, then **/ (root)**.
4. Click **Save**.
5. Wait for the Pages deployment to finish (usually a few minutes). The **Actions** tab shows progress, and the Pages settings show the final website address.

Expected address: https://blameitonchris.github.io/RokaWright/

If Pages requires a plan upgrade for a private repository, do not make the repository public without reviewing that choice. A hosting provider that can publish from a private repository is another option.

## Release checks

Run `npm ci`, `npm run build`, `npm test`, and `npm run test:browser`. The build uses an explicit asset allowlist and refuses unexpected files in `dist-sales/` and `dist-compat-sales/`. Copy their contents only into the matching review subdirectories on the Pages branch. Do not upload the entire project folder, browser profile, or test output.

No customer data is embedded in the app. Records remain in each visitor's browser storage. Visiting the public site uses a different storage location from local previews; export and restore a backup to move your own records. Sharing the website address does not share those records.

A deployment is complete only after the live page and important workflows have been checked. Pushing code or preparing the Pages branch alone does not prove the website is live.

## Sales review releases

Build with `npm run build` on `feature/sales-stock`. Publish `dist-sales/` only to `gh-pages:sales-preview/` and `dist-compat-sales/` only to `gh-pages:compatibility-sales-preview/`. Verify every existing root and `compatibility/` file is byte-for-byte unchanged before pushing. The build permits only HTML, compiled CSS, compiled JS, PDF library and `.nojekyll`; do not copy backups, fixtures, attachments, browser storage, logs or environment files. Do not merge to `main` or `compatibility/android-4`, or replace either existing Pages path, until the user approves the reviewed previews.
