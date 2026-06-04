import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 300_000,       // 5 min — model discovery + LLM response can be slow
  expect: { timeout: 60_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:4000',
    headless: false,
    viewport: { width: 1637, height: 1024 },
    video: {
      mode: 'on',
      size: { width: 1637, height: 1024 },
    },
    screenshot: 'only-on-failure',
    actionTimeout:     45_000,
    navigationTimeout: 45_000,
  },

  outputDir: './e2e/results',

  // Start dev server automatically if it isn't running
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4000',
    reuseExistingServer: true,
    timeout: 120_000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1637, height: 1024 },
        launchOptions: { slowMo: 400 },
      },
    },
  ],
});
