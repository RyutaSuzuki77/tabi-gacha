import { expect, test, type Page } from '@playwright/test'
import { pngFile } from './png'
import { drawOne, gotoHome, openTab, seedDemo, seedPhotoNoticeSeen } from './seed'

test.beforeEach(async ({ page }) => {
  await seedDemo(page, { unlimited: true, forcedRarity: null })
})

/** コレクションから、先頭のカードの詳細を開く */
async function openFirstCard(page: Page) {
  await openTab(page, 'collection')
  await page.locator('main div.grid button').first().click()
  await page.getByRole('button', { name: '← もどる' }).waitFor()
}

test('引いたカードがリロード後も残る', async ({ page }) => {
  await gotoHome(page)
  const town = await drawOne(page)
  await page.getByRole('button', { name: '← もどる' }).click()

  await page.reload()
  await page.getByRole('button', { name: 'ガチャを引く' }).waitFor()
  await openTab(page, 'collection')
  const tiles = page.locator('main div.grid button')
  await expect(tiles).toHaveCount(1)
  await expect(tiles.first()).toContainText(town)
})

test('写真の初回警告が出る（チェックリストG）', async ({ page }) => {
  await gotoHome(page)
  await drawOne(page)
  await page.getByRole('button', { name: '＋追加' }).click()
  await expect(page.getByText('写真はこの端末の中にだけ保存されます', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'わかった' })).toBeVisible()
})

test.describe('写真', () => {
  test.beforeEach(async ({ page }) => {
    await seedPhotoNoticeSeen(page)
    await gotoHome(page)
    await drawOne(page)
  })

  test('追加した写真がリロード後も残る（IndexedDB）', async ({ page }) => {
    await page.locator('input[type=file]').setInputFiles(pngFile('a.png', 16, [200, 30, 30]))
    const imgs = page.locator('section img')
    await expect(imgs).toHaveCount(1)

    await page.reload()
    await page.getByRole('button', { name: 'ガチャを引く' }).waitFor()
    await openFirstCard(page)
    await expect(imgs).toHaveCount(1)
    await expect
      .poll(() => imgs.first().evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBe(16)
  })

  test('削除は2段（1回目では消えず、確認で消える）', async ({ page }) => {
    await page.locator('input[type=file]').setInputFiles(pngFile('a.png', 16, [200, 30, 30]))
    const imgs = page.locator('section img')
    await expect(imgs).toHaveCount(1)

    await page.getByRole('button', { name: 'この写真を削除する' }).click()
    await expect(page.getByRole('button', { name: '消す' })).toBeVisible()
    await expect(imgs, '1回のタップでは消えない').toHaveCount(1)

    // やめる -> まだある
    await page.getByRole('button', { name: 'やめる' }).click()
    await expect(imgs).toHaveCount(1)

    await page.getByRole('button', { name: 'この写真を削除する' }).click()
    await page.getByRole('button', { name: '消す' }).click()
    await expect(imgs).toHaveCount(0)
    await expect(page.getByText('まだ写真がありません。')).toBeVisible()
  })

  test('2枚追加して1枚消しても、残った画像が壊れない（回帰）', async ({ page }) => {
    const input = page.locator('input[type=file]')
    await input.setInputFiles(pngFile('a.png', 16, [200, 30, 30]))
    await expect(page.locator('section img')).toHaveCount(1)
    await input.setInputFiles(pngFile('b.png', 24, [30, 30, 200]))
    const imgs = page.locator('section img')
    await expect(imgs).toHaveCount(2)

    const widthsOf = () =>
      imgs.evaluateAll((els) => els.map((el) => (el as HTMLImageElement).naturalWidth))
    await expect.poll(widthsOf).not.toContain(0)
    const before = await widthsOf()
    expect([...before].sort((a, b) => a - b)).toEqual([16, 24])

    // 先頭の写真を消す
    await page.getByRole('button', { name: 'この写真を削除する' }).first().click()
    await page.getByRole('button', { name: '消す' }).click()
    await expect(imgs).toHaveCount(1)

    // 残るのは消さなかった方で、objectURL が生きている（naturalWidth > 0）
    await expect.poll(widthsOf).toEqual([before[1]])
    const after = await widthsOf()
    expect(after[0]).toBeGreaterThan(0)
  })
})
