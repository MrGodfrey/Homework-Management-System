import { defineConfig } from "@playwright/test";

const backendPort = Number(process.env.PLAYWRIGHT_BACKEND_PORT || 18000);
const frontendPort = Number(process.env.PLAYWRIGHT_FRONTEND_PORT || 4173);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: "./scripts/start_e2e_backend.sh",
      port: backendPort,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${frontendPort} --strictPort`,
      cwd: "./frontend",
      env: {
        ...process.env,
        VITE_API_URL: `http://127.0.0.1:${backendPort}`,
      },
      port: frontendPort,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
