import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  use: {
    baseURL: process.env.ROKA_BASE_URL || "http://127.0.0.1:3100/",
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
  },
  webServer: {
    command: "node server.js",
    env: { PORT: "3100" },
    url: "http://127.0.0.1:3100",
    reuseExistingServer: true,
  },
  workers: 1,
});
