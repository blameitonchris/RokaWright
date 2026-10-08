import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
http
  .createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      const offlinePath = pathname.startsWith('/compatibility-offline-preview/') ? pathname.slice('/compatibility-offline-preview/'.length) : null;
      const offlineFile = offlinePath === '' ? 'index.html' : offlinePath;
      const offlineAllowed = offlineFile !== null && /^(index\.html|offline-worker\.js|workroom\.[a-f0-9]{16}\.html|(app|style|pdf|offline-client)\.[a-f0-9]{16}\.(js|css))$/.test(offlineFile);
      if (
        !offlineAllowed && !["/", "/index.html", "/style.css", "/app.js", "/core.js", "/sales-core.js", "/sales-ui.js", "/pdf-library.js", "/app-compat.js", "/style-compat.css"].includes(
          pathname,
        )
      )
        throw Error();
      const file = path.resolve(
        root,
        offlineAllowed ? "dist-offline/" + offlineFile : "." + (pathname === "/" ? "/index.html" : pathname),
      );
      if (!file.startsWith(root + path.sep)) throw Error();
      const data = await readFile(file);
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader(
        "Content-Type",
        { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" }[
          path.extname(file)
        ] || "application/octet-stream",
      );
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(Number(process.env.PORT) || 3000, "0.0.0.0", () =>
    console.log("RokaWright listening on port " + (process.env.PORT || 3000)),
  );
