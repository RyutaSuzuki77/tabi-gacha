import { expect, test, type Page } from '@playwright/test'
import { pngFile } from './png'
import { drawOne, gotoHome, seedDemo, seedPhotoNoticeSeen } from './seed'

const MIN_TAP = 44

test.beforeEach(async ({ page }) => {
  await seedDemo(page, { unlimited: true, forcedRarity: null })
  await seedPhotoNoticeSeen(page)
  await gotoHome(page)
  await drawOne(page)
})

/** 色違いの写真を n 枚追加する（見分けるため大きさも変える） */
async function addPhotos(page: Page, n: number) {
  const input = page.locator('input[type=file]')
  for (let i = 0; i < n; i++) {
    await input.setInputFiles(pngFile(`p${i}.png`, 400 + i * 40, [200 - i * 40, 60, 60 + i * 40]))
    await expect(page.getByRole('button', { name: '写真を拡大する' })).toHaveCount(i + 1)
  }
}

const dialog = (page: Page) => page.getByRole('dialog', { name: '写真の拡大表示' })
const counter = (page: Page) => dialog(page).getByText(/^\d+ \/ \d+$/)

test('サムネイルをタップするとモーダルが開き、写真が大きく出る', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await addPhotos(page, 1)
  const thumb = page.locator('section img').first()
  const thumbBox = (await thumb.boundingBox())!

  await expect(dialog(page)).toHaveCount(0)
  await page.getByRole('button', { name: '写真を拡大する' }).click()
  await expect(dialog(page)).toBeVisible()
  await expect(dialog(page)).toHaveAttribute('aria-modal', 'true')
  await expect(counter(page)).toHaveText('1 / 1')

  const big = dialog(page).locator('img')
  await expect.poll(() => big.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(400)
  const box = (await big.boundingBox())!
  expect(box.width, 'サムネイルより大きい').toBeGreaterThan(thumbBox.width * 2)
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(375)
  expect(box.y + box.height).toBeLessThanOrEqual(800)
  expect(await page.evaluate(() => document.body.style.overflow), '背面はスクロールしない').toBe('hidden')
})

test('次へで2枚目になり、最後では次へが押せない。最初では前へが押せない', async ({ page }) => {
  await addPhotos(page, 2)
  await page.getByRole('button', { name: '写真を拡大する' }).first().click()

  const prev = dialog(page).getByRole('button', { name: '前の写真' })
  const next = dialog(page).getByRole('button', { name: '次の写真' })
  await expect(counter(page)).toHaveText('1 / 2')
  await expect(prev, '最初では前へが押せない').toBeDisabled()
  await expect(next).toBeEnabled()

  const first = await dialog(page).locator('img').evaluate((el: HTMLImageElement) => el.src)
  await next.click()
  await expect(counter(page)).toHaveText('2 / 2')
  await expect(next, '最後では次へが押せない（ループしない）').toBeDisabled()
  await expect(prev).toBeEnabled()
  const second = await dialog(page).locator('img').evaluate((el: HTMLImageElement) => el.src)
  expect(second).not.toBe(first)
  // 無効のボタンは見た目でも分かる
  const opacity = await next.evaluate((el) => Number(getComputedStyle(el).opacity))
  expect(opacity).toBeLessThan(0.5)

  await prev.click()
  await expect(counter(page)).toHaveText('1 / 2')
})

test('←／→キーで送れ、端で止まる', async ({ page }) => {
  await addPhotos(page, 2)
  await page.getByRole('button', { name: '写真を拡大する' }).first().click()
  await page.keyboard.press('ArrowRight')
  await expect(counter(page)).toHaveText('2 / 2')
  await page.keyboard.press('ArrowRight')
  await expect(counter(page), '最後で止まる').toHaveText('2 / 2')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await expect(counter(page), '最初で止まる').toHaveText('1 / 2')
})

test('横スワイプで送れ、縦の動きや短い動きでは送らない', async ({ page }) => {
  await addPhotos(page, 2)
  await page.getByRole('button', { name: '写真を拡大する' }).first().click()

  const swipe = (from: [number, number], to: [number, number]) =>
    dialog(page).evaluate(
      (el, [a, b]) => {
        const touch = (x: number, y: number) =>
          new Touch({ identifier: 1, target: el, clientX: x, clientY: y })
        const fire = (type: string, x: number, y: number) =>
          el.dispatchEvent(
            new TouchEvent(type, {
              bubbles: true,
              cancelable: true,
              touches: type === 'touchend' ? [] : [touch(x, y)],
              changedTouches: [touch(x, y)],
            }),
          )
        fire('touchstart', a[0], a[1])
        fire('touchend', b[0], b[1])
      },
      [from, to] as const,
    )

  await swipe([200, 300], [180, 300]) // 20px: 短い
  await swipe([200, 300], [190, 450]) // 縦
  await expect(counter(page)).toHaveText('1 / 2')
  await swipe([250, 300], [100, 310]) // 左へ -> 次
  await expect(counter(page)).toHaveText('2 / 2')
  await swipe([100, 300], [250, 310]) // 右へ -> 前
  await expect(counter(page)).toHaveText('1 / 2')
})

test('Esc で閉じ、背景のタップでも閉じる。閉じたらスクロールとフォーカスが戻る', async ({ page }) => {
  await addPhotos(page, 2)
  const thumb = page.getByRole('button', { name: '写真を拡大する' }).nth(1)

  await thumb.click()
  await expect(dialog(page)).toBeVisible()
  await expect(dialog(page), 'フォーカスがモーダルへ移る').toBeFocused()
  await expect(counter(page), '押したサムネイルの写真で開く').toHaveText('2 / 2')
  await page.keyboard.press('Escape')
  await expect(dialog(page)).toHaveCount(0)
  await expect(thumb, '元のサムネイルへフォーカスが戻る').toBeFocused()
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('')

  await thumb.click()
  await expect(dialog(page)).toBeVisible()
  // 写真の外（左上すみ）をタップ
  await dialog(page).click({ position: { x: 5, y: 5 } })
  await expect(dialog(page)).toHaveCount(0)

  // 写真そのもののタップでは閉じない
  await thumb.click()
  await dialog(page).locator('img').click()
  await expect(dialog(page)).toBeVisible()
})

for (const width of [375, 768, 1280]) {
  test(`モーダル内の操作ボタンが44px以上（${width}px）`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await addPhotos(page, 2)
    await page.getByRole('button', { name: '写真を拡大する' }).first().click()
    for (const name of ['前の写真', '次の写真', '閉じる']) {
      const box = (await dialog(page).getByRole('button', { name }).boundingBox())!
      expect(box.width, `${name} の幅`).toBeGreaterThanOrEqual(MIN_TAP)
      expect(box.height, `${name} の高さ`).toBeGreaterThanOrEqual(MIN_TAP)
    }
    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollW, '横スクロールなし').toBeLessThanOrEqual(width)
    await dialog(page).getByRole('button', { name: '閉じる' }).click()
    await expect(dialog(page)).toHaveCount(0)
  })
}

test('削除ボタンを押してもモーダルは開かない（確認が出るだけ）', async ({ page }) => {
  await addPhotos(page, 1)
  await page.getByRole('button', { name: 'この写真を削除する' }).click()
  await expect(page.getByRole('button', { name: '消す' })).toBeVisible()
  await expect(dialog(page)).toHaveCount(0)
})
