import { expect, test, type Page } from '@playwright/test'
import { AI_DISCLAIMER, DATA_SOURCES } from '../src/data/sources'
import { drawOne, gotoHome, openTab, seedDemo, seedPhotoNoticeSeen } from './seed'

test.beforeEach(async ({ page }) => {
  await seedDemo(page, { unlimited: true, forcedRarity: null })
  await seedPhotoNoticeSeen(page)
})

/** 仕様6.4: 位置情報の説明で「端末の外に一切出ない」と言ってはならない（経路を開くとGoogleに渡る） */
const FORBIDDEN = /端末の外に\s*一切\s*出ない/

async function expectNoForbidden(page: Page) {
  const text = await page.locator('body').innerText()
  expect(text).not.toMatch(FORBIDDEN)
}

async function openDetailWithOriginPrompt(page: Page) {
  await gotoHome(page)
  await drawOne(page)
  await page.getByRole('button', { name: '出発地を設定する' }).click()
  await expect(page.getByText('現在地を使わせてもらえますか')).toBeVisible()
}

test.describe('禁止表現（仕様6.4）', () => {
  test('ホーム', async ({ page }) => {
    await gotoHome(page)
    await page.getByRole('button', { name: /有名な街は入っていません/ }).click()
    await expectNoForbidden(page)
  })

  test('カード詳細（出発地の設定を開いた状態）', async ({ page }) => {
    await openDetailWithOriginPrompt(page)
    // 説明文が実際に描画されていること（空の画面を見て素通りしないため）
    await expect(page.getByText('現在地がどこかに保存されることはありません', { exact: false })).toBeVisible()
    await expectNoForbidden(page)
  })

  test('プロフィール', async ({ page }) => {
    await gotoHome(page)
    await openTab(page, 'じぶん')
    await expect(page.getByText('現在地がどこかに保存されることはありません', { exact: false })).toBeVisible()
    await expectNoForbidden(page)
  })
})

test.describe('出典（仕様11.5）', () => {
  test('プロフィールに e-Stat の出典とAI生成の明示がある', async ({ page }) => {
    await gotoHome(page)
    await openTab(page, 'じぶん')

    for (const source of DATA_SOURCES) {
      await expect(page.getByRole('link', { name: source.label })).toBeVisible()
      await expect(page.getByRole('link', { name: source.label })).toHaveAttribute('href', source.url)
      await expect(page.getByText(`（${source.publisher}）`, { exact: false })).toBeVisible()
    }
    expect(DATA_SOURCES.map((s) => s.label).join()).toContain('e-Stat')
    await expect(page.getByText(AI_DISCLAIMER, { exact: true })).toBeVisible()
    expect(AI_DISCLAIMER).toContain('AIが生成')
  })
})

test.describe('PoolNotice の人口帯（仕様4.2）', () => {
  test('SSR/SR/R/N の4行が仕様どおり', async ({ page }) => {
    await gotoHome(page)
    await page.getByRole('button', { name: /有名な街は入っていません/ }).click()

    const rows = page.locator('section ul li')
    await expect(rows).toHaveCount(4)
    const expected: [string, string][] = [
      ['SSR', '3,000人未満'],
      ['SR', '3,000〜10,000人未満'],
      ['R', '10,000〜30,000人未満'],
      ['N', '30,000〜100,000人未満'],
    ]
    for (let i = 0; i < expected.length; i++) {
      const [rarity, band] = expected[i]
      const text = (await rows.nth(i).innerText()).replace(/\s+/g, ' ').trim()
      expect(text.startsWith(`${rarity} ${band}`), `行${i + 1}: 「${text}」`).toBe(true)
    }
  })
})

test.describe('経路ボタン', () => {
  test('画像（Googleのロゴ等）が入っていない（仕様11.5.1）', async ({ page }) => {
    await gotoHome(page)
    await drawOne(page)
    const button = page.getByRole('link', { name: 'Googleマップで経路をひらく' })
    await expect(button).toBeVisible()
    await expect(button.locator('img, svg, picture, canvas, video')).toHaveCount(0)
    // CSS の背景画像でロゴを出していないことも見る
    const bg = await button.evaluate((el) => getComputedStyle(el).backgroundImage)
    expect(bg).toBe('none')
  })

  test('手入力した出発地と目的地が、エンコードされて href に入る', async ({ page }) => {
    await gotoHome(page)
    const townName = await drawOne(page)
    await page.getByRole('button', { name: '出発地を設定する' }).click()
    await page.getByRole('button', { name: '手で入力する' }).click()
    await page.getByPlaceholder('例：東京駅').fill('札幌駅')

    const href = await page.getByRole('link', { name: 'Googleマップで経路をひらく' }).getAttribute('href')
    expect(href).not.toBeNull()
    // 日本語がそのまま入っていない（パーセントエンコードされている）
    expect(href!).not.toMatch(/[^\x00-\x7F]/)
    const url = new URL(href!)
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/')
    expect(url.searchParams.get('origin')).toBe('札幌駅')
    expect(url.searchParams.get('origin') && href!.includes(`origin=${encodeURIComponent('札幌駅')}`)).toBe(true)
    const destination = url.searchParams.get('destination')
    expect(destination, 'destination').toBeTruthy()
    expect(destination!.endsWith(townName), `destination「${destination}」が町名「${townName}」で終わる`).toBe(true)
    expect(href!).toContain(`destination=${encodeURIComponent(destination!)}`)
  })
})
