import { defineConfig, devices } from '@playwright/test'

/**
 * 目視確認の機械化（docs/manual-check.md の A・D・E・F・G）。
 * 仕様14「UIの自動テストは書かない」の明示的な例外として、利用者の判断で置いている。
 * vitest（src/**, scripts/**）とは混ぜず、`npm run e2e` だけで動く。
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  workers: 4,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    // 幅はテスト側で setViewportSize して 375 / 768 / 1280 を回す
    viewport: { width: 1280, height: 900 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
