import { expect, test, type Page } from '@playwright/test'
import { pngFile } from './png'
import { drawMany, drawOne, gotoHome, openTab, seedDemo, seedPhotoNoticeSeen } from './seed'

/** 仕様9.1 の確認幅 */
const WIDTHS = [375, 768, 1280] as const
const MIN_TAP = 44

type Violation = { what: string; width: number; height: number }

/** 画面内の操作要素を測り、44px 未満のものを返す */
async function tapTargetViolations(page: Page): Promise<Violation[]> {
  // 仕様9.1のタップ対象は操作のための要素（ボタン・タブ・チェックのラベル等）を指す。
  // 本文の段落（p / li）の中に埋まった行内リンクは行の高さで決まるため対象外。
  // 除外するのは「p か li の中の a」だけで、button やタブは除外しない。
  const handles = await page
    .locator('button, a[href]:not(p a, li a), input, select, textarea, [role="button"]')
    .elementHandles()
  const found: Violation[] = []

  for (const handle of handles) {
    const info = await handle.evaluate((own: Element) => {
      // チェックボックスが視覚的に隠されている場合は、押される側のラベルを測る
      const el: Element =
        own instanceof HTMLInputElement && (own.type === 'checkbox' || own.type === 'radio')
          ? (own.closest('label') ?? own)
          : own
      const style = getComputedStyle(el)
      const rect = el.getBoundingClientRect()
      const hiddenType = el instanceof HTMLInputElement && el.type === 'hidden'
      const invisible =
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        hiddenType ||
        el.closest('[hidden]') !== null ||
        rect.width === 0 ||
        rect.height === 0
      const label =
        el.getAttribute('aria-label') ||
        (el.textContent ?? '').replace(/\s+/g, ' ').trim() ||
        el.getAttribute('placeholder') ||
        el.tagName.toLowerCase()
      return { invisible, label: label.slice(0, 40), tag: el.tagName.toLowerCase(), w: rect.width, h: rect.height }
    })
    if (info.invisible) continue

    if (info.w < MIN_TAP || info.h < MIN_TAP) {
      found.push({
        what: `<${info.tag}> 「${info.label}」`,
        width: Math.round(info.w * 10) / 10,
        height: Math.round(info.h * 10) / 10,
      })
    }
  }
  return found
}

function describeViolations(vs: Violation[]): string {
  return vs.map((v) => `${v.what} = ${v.width}x${v.height}px`).join('\n')
}

async function expectNoHorizontalScroll(page: Page) {
  const m = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(
    m.scrollWidth,
    `横スクロールが出ている: scrollWidth=${m.scrollWidth} clientWidth=${m.clientWidth}`,
  ).toBeLessThanOrEqual(m.clientWidth + 1)
}

async function expectTapTargets(page: Page) {
  const violations = await tapTargetViolations(page)
  expect(violations, `44px 未満のタップ対象:\n${describeViolations(violations)}\n`).toEqual([])
}

type Screen = {
  name: string
  /** 画面を作る。viewport は設定済み */
  setup: (page: Page) => Promise<void>
}

const SCREENS: Screen[] = [
  {
    name: 'ホーム',
    setup: async (page) => {
      await gotoHome(page)
      // 注釈を開いた状態（レア度表まで含めて測る）
      await page.getByRole('button', { name: /有名な街は入っていません/ }).click()
      await expect(page.getByText('3,000人未満', { exact: true })).toBeVisible()
    },
  },
  {
    name: 'コレクション',
    setup: async (page) => {
      await gotoHome(page)
      await drawMany(page, 3)
      await openTab(page, 'collection')
      await expect(page.locator('main div.grid button')).toHaveCount(3)
    },
  },
  {
    name: 'プロフィール',
    setup: async (page) => {
      await gotoHome(page)
      await openTab(page, 'profile')
      await expect(page.getByText('デモモード', { exact: true })).toBeVisible()
    },
  },
  {
    name: 'カード詳細',
    setup: async (page) => {
      await gotoHome(page)
      await drawOne(page)
      // 出発地の入力欄・写真の削除確認まで出した状態で測る
      await page.getByRole('button', { name: '出発地を設定する' }).click()
      await page.getByRole('button', { name: '手で入力する' }).click()
      await page.locator('input[type=file]').setInputFiles(pngFile('a.png', 16, [200, 30, 30]))
      await expect(page.locator('section img')).toHaveCount(1)
      await page.getByRole('button', { name: 'この写真を削除する' }).click()
      await expect(page.getByRole('button', { name: '消す' })).toBeVisible()
    },
  },
]

for (const width of WIDTHS) {
  for (const screen of SCREENS) {
    test.describe(`${width}px / ${screen.name}`, () => {
      test.beforeEach(async ({ page }) => {
        await seedDemo(page, { unlimited: true, forcedRarity: 'SSR' })
        await seedPhotoNoticeSeen(page)
        await page.setViewportSize({ width, height: 800 })
        await screen.setup(page)
      })

      test('横スクロールが出ない', async ({ page }) => {
        await expectNoHorizontalScroll(page)
      })

      test('タップ対象が44px以上', async ({ page }) => {
        await expectTapTargets(page)
      })
    })
  }
}

// ---- ナビの位置 ---------------------------------------------------------

test.describe('ナビゲーションの位置', () => {
  /**
   * 根拠: TabBar.tsx は `fixed inset-x-0 bottom-0`（md 未満）→ `md:static`（768px 以上）。
   * なので computed の position と、ビューポート内の y 座標の両方で見る。
   * 下部固定なら nav の下端がビューポート下端に付く。上部横並びなら static で、
   * 3つのボタンが同じ y に並び、nav はページ上部（本文より上）にある。
   */
  for (const width of WIDTHS) {
    test(`${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await gotoHome(page)
      const nav = page.locator('nav')
      const position = await nav.evaluate((el) => getComputedStyle(el).position)
      const box = (await nav.boundingBox())!
      const tabs = await page.locator('nav button').evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect()
          return { x: r.x, y: r.y }
        }),
      )
      const mainTop = (await page.locator('main').boundingBox())!.y

      if (width < 768) {
        expect(position).toBe('fixed')
        expect(Math.round(box.y + box.height), 'nav の下端がビューポート下端').toBe(800)
      } else {
        expect(position).not.toBe('fixed')
        expect(box.y, 'nav は上部にある').toBeLessThan(200)
        expect(box.y, 'nav は本文より上').toBeLessThan(mainTop)
        expect(new Set(tabs.map((t) => Math.round(t.y))).size, '横並び（同じ y）').toBe(1)
        expect(tabs[1].x).toBeGreaterThan(tabs[0].x)
      }
    })
  }
})

// ---- コレクションの列数 ---------------------------------------------------

test.describe('コレクションの列数', () => {
  /**
   * 期待値の根拠は実装ではなく仕様9.1の表（狭い2列 / 中間3列 / 広い4〜5列）。
   *   375px -> 2列 / 768px -> 3列 / 1280px -> 4〜5列（範囲で判定）
   */
  const EXPECTED: Record<number, [number, number]> = { 375: [2, 2], 768: [3, 3], 1280: [4, 5] }

  test('幅ごとの1行の枚数', async ({ page }) => {
    test.setTimeout(120_000)
    await seedDemo(page, { unlimited: true, forcedRarity: null })
    await seedPhotoNoticeSeen(page)
    await gotoHome(page)
    await drawMany(page, 9) // 5列を数えるには5枚以上要る
    await openTab(page, 'collection')
    const tiles = page.locator('main div.grid button')
    await expect(tiles).toHaveCount(9)

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 800 })
      const ys = await tiles.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().y)))
      const perRow = ys.filter((y) => Math.abs(y - ys[0]) <= 2).length
      const [min, max] = EXPECTED[width]
      const msg = `${width}px の1行の枚数（y座標: ${ys.join(',')}）`
      expect(perRow, msg).toBeGreaterThanOrEqual(min)
      expect(perRow, msg).toBeLessThanOrEqual(max)
    }
  })
})
