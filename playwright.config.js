import { defineConfig, devices } from '@playwright/test';

const gl = ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'];

export default defineConfig({
  testDir: 'e2e',
  timeout: 420000,
  expect: { timeout: 8000 },
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'off',
    video: 'off',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/la-bottega/',
    reuseExistingServer: false,
    timeout: 120000,
  },
  projects: [
    {
      name: 'telefono',
      use: {
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 1,
        userAgent: devices['Pixel 7'].userAgent,
        serviceWorkers: 'block',
        launchOptions: { args: gl },
      },
    },
    {
      name: 'webkit-telefono',
      use: {
        browserName: 'webkit',
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 1,
        userAgent: devices['iPhone 13'].userAgent,
        serviceWorkers: 'block',
      },
    },
    {
      name: 'desktop',
      use: {
        viewport: { width: 1280, height: 800 },
        hasTouch: false,
        isMobile: false,
        launchOptions: { args: gl },
      },
    },
  ],
});
