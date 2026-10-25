import { expect, type Page } from '@playwright/test'
import { KEYS, SCHEMA_VERSION } from '../src/storage/schema'
import type { DemoSettings } from '../src/storage/demoStore'

/**
 * localStorage を仕込む。addInitScript は **リロードのたびに** 走るので、
 * 既にキーがあれば上書きしない（アプリが書いた引いたカードなどを消さないため）。
 * schemaVersion を現在の版で入れておかないと resetIfSchemaChanged が全部消す。
 */
async function seedKeys(page: Page, entries: Record<string, unknown>) {
  await page.addInitScript(
    ({ entries, versionKey, version }) => {
      try {
        if (localStorage.getItem(versionKey) === null) {
          localStorage.setItem(versionKey, String(version))
        }
        for (const [key, value] of Object.entries(entries)) {
          if (localStorage.getItem(key) === null) {
            localStorage.setItem(key, JSON.stringify(value))
          }
        }
      } catch {
        // localStorage に触れない環境では何もしない
      }
    },
    { entries, versionKey: KEYS.version, version: SCHEMA_VERSION },
  )
}

/** 何度でも引ける状態にする（デモモード） */
export async function seedDemo(page: Page, demo: Partial<DemoSettings> = {}) {
  const settings: DemoSettings = {
    unlimited: true,
    forcedRarity: null,
    fakeOrigin: null,
    ...demo,
  }
  await seedKeys(page, { [KEYS.demo]: settings })
}

/** 写真の初回警告を既読にする */
export async function seedPhotoNoticeSeen(page: Page) {
  await seedKeys(page, { [KEYS.photoNotice]: true })
}

/** 何も仕込まないが schemaVersion だけは現在の版にする */
export async function seedSchemaOnly(page: Page) {
  await seedKeys(page, {})
}

export type Tab = 'gacha' | 'collection' | 'profile'

/** タブの表示名。ラベルが変わったらここだけ直す（src/ui/TabBar.tsx と対応） */
export const TAB_LABELS: Record<Tab, string> = {
  gacha: 'ガチャ',
  collection: 'コレクション',
  profile: 'プロフィール',
}

export async function openTab(page: Page, tab: Tab) {
  await page.getByRole('button', { name: TAB_LABELS[tab], exact: true }).click()
}

/**
 * 実際の演出を通して1枚引く。引き終わるとカード詳細が開いている。
 * 呼ぶ前にホーム（タブ「ガチャ」）が見えていること。
 * 返り値は引いた町の名前（カード詳細の見出し。郡は含まない）。
 */
export async function drawOne(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'ガチャを引く' }).click()
  // カプセルが取出口に落ちて「あける」が押せるようになるまで待つ（約1.5秒）
  // 待機中のカプセルは呼吸するアニメーション（無限）で「安定」にならないため、
  // 有効になるのを待ってから force で押す
  const capsule = page.getByRole('button', { name: 'カプセルをあける' })
  await expect(capsule).toBeEnabled()
  await capsule.click({ force: true })
  await page.getByRole('button', { name: '← もどる' }).waitFor()
  const name = (await page.locator('article h2').innerText()).trim()
  return name
}

/** n枚引いてホームに戻る。引いた町の名前を返す */
export async function drawMany(page: Page, n: number): Promise<string[]> {
  const names: string[] = []
  for (let i = 0; i < n; i++) {
    names.push(await drawOne(page))
    await page.getByRole('button', { name: '← もどる' }).click()
    await page.getByRole('button', { name: 'ガチャを引く' }).waitFor()
  }
  return names
}

/** 最初のページ表示。町データの読み込み完了（ガチャのボタンが出る）まで待つ */
export async function gotoHome(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'ガチャを引く' }).waitFor()
}
