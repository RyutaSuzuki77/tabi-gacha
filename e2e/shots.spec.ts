import { test, type Page } from '@playwright/test'
import { drawMany, drawOne, gotoHome, openTab, seedDemo, seedPhotoNoticeSeen } from './seed'

/**
 * 判定を入れない。人の目で見るためのスクショを e2e/shots/<幅>-<画面>.png に撮るだけ。
 * 演出の途中は撮らない（不安定）。アニメーションは止めて撮る。
 */
const WIDTHS = [375, 768, 1280] as const

async function shot(page: Page, width: number, name: string) {
  await page.screenshot({
    path: `e2e/shots/${width}-${name}.png`,
    fullPage: true,
    animations: 'disabled',
  })
}

for (const width of WIDTHS) {
  test.describe(`${width}px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
    })

    test('ホーム（引く前）', async ({ page }) => {
      await seedDemo(page, { unlimited: false })
      await gotoHome(page)
      await shot(page, width, 'home-before')
    })

    test('ホーム（引いたあと）と カード詳細', async ({ page }) => {
      // 制限ありのまま1回引く。引いたあとのホームは「きょうのぶんは ひいた」
      await seedDemo(page, { unlimited: false, forcedRarity: 'SSR' })
      await seedPhotoNoticeSeen(page)
      await gotoHome(page)
      await drawOne(page)
      await shot(page, width, 'card-detail')
      await page.getByRole('button', { name: '← もどる' }).click()
      await page.getByText('きょうのぶんは ひいた').waitFor()
      await shot(page, width, 'home-after')
    })

    test('コレクション（複数枚）', async ({ page }) => {
      test.setTimeout(120_000)
      await seedDemo(page, { unlimited: true })
      await gotoHome(page)
      await drawMany(page, 9)
      await openTab(page, 'collection')
      await shot(page, width, 'collection')
    })

    test('プロフィール', async ({ page }) => {
      await seedDemo(page, { unlimited: true })
      await gotoHome(page)
      await drawMany(page, 1)
      await openTab(page, 'profile')
      await shot(page, width, 'profile')
    })
  })
}
