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
      if (
        !["/", "/index.html", "/style.css", "/app.js", "/core.js", "/sales-core.js", "/sales-ui.js", "/pdf-library.js", "/app-compat.js", "/style-compat.css"].includes(
          pathname,
        )
      )
        throw Error();
      const file = path.resolve(
        root,
        "." + (pathname === "/" ? "/index.html" : pathname),
      );
      if (!file.startsWith(root + path.sep)) throw Error();
      const data = await readFile(file);
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
