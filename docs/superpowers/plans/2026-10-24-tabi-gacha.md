# 旅ガチャ 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 人口10万人未満の実在の市町村だけが出るガチャを引き、その町の固有ミッションと行き方のコツを受け取り、達成してポイントと称号を積み、カードと写真をコレクションとして端末に残せるWebアプリを作る。

**Architecture:** サーバーを持たない完全なクライアントサイドSPA。町データは事前生成した静的JSON（`public/data/`）として同梱し、実行時に外部APIを呼ばない。抽選・ポイント・ランクなどの判断は副作用のない純関数として `src/domain/` に集め、ここだけをテストで固める。端末への保存は `src/storage/` の内側にのみ閉じ、画面側は `localStorage` / `indexedDB` を直接触らない（将来のDB移行時に差し替える箇所を1か所にするため）。

**Tech Stack:** Vite / React / TypeScript / Tailwind CSS / Vitest / Vercel

**Spec:** `docs/superpowers/specs/2026-10-24-machi-gacha-design.md`

## Global Constraints

仕様書由来のプロジェクト全体の制約。**各タスクの要件はこの節を暗黙に含む。**

- **出題プールは人口10万人未満の市町村のみ。** 10万人以上はデータ段階で除外する（仕様 4.1）
- **人口上限だけでは足りない。** 名称が「区」で終わる行（東京23区・政令市の行政区）と、人口100人未満の行（北方領土の村など）もデータ段階で除外する（仕様 4.1）
- **レア度の人口閾値**：`SSR` < 3,000 ／ `SR` 3,000〜9,999 ／ `R` 10,000〜29,999 ／ `N` 30,000〜99,999（仕様 4.2）
- **排出率**：`SSR` 8% ／ `SR` 22% ／ `R` 35% ／ `N` 35%（合計100）（仕様 4.2）
- **地方区分は8つ**：`北海道` `東北` `関東` `中部` `近畿` `中国` `四国` `九州沖縄`（仕様 4.4）
- **レア度ごとのポイント**：`SSR` 100 ／ `SR` 50 ／ `R` 25 ／ `N` 10。獲得ポイント＝レア度 × 達成ミッション数（仕様 7.1）
- **ランク閾値と称号**（累計ポイント）：`0 旅の見習い` ／ `100 寄り道の人` ／ `500 旅人` ／ `1500 辺境の開拓者` ／ `5000 日本を踏み尽くす者`（仕様 7.2）
- **ミッションは1回の抽選につき3枚**：固有1枚（固定枠）＋汎用2枚（抽選）。固有を抽選対象に混ぜてはならない（仕様 5.1）
- **ガチャは1日1回・引き直し不可。** ただしデモモードで解除できる（仕様 4.5 / 12）
- **`member_id`** を `profile` に持ち、`pulls` から参照する。`photos` には持たせない（仕様 10.1）
- **出典表記は義務。** オープンデータの利用規約の条件であり、省略できない。表記は `src/data/sources.ts` の1か所にまとめ、プロフィール画面がそれを読む（仕様 11.5）
- **AI生成部分が公的機関の見解でないことを明示する。** 政府の利用規約は「国が作成したかのように見せる」ことを禁じている。ミッションと行き方のコツはAI生成であると出典表記の中に書く（仕様 11.5）
- **Googleのロゴを使わない。** リンクテキスト内へのインライン使用は禁止。経路ボタンは文字のみにする（仕様 11.5.1）
- **実行時に外部APIを呼ばない。** Anthropic SDK を依存に追加しない。APIキーを扱うコードを書かない（仕様 11.2 / 15）
- **サーバーサイド処理を書かない。** 完全な静的サイトとしてVercelにデプロイする（仕様 3 / 15）
- **現在地の注釈に「端末の外に一切出ない」と書いてはならない。** 経路を開く際にGoogleマップのURLへ出発地として渡るため事実に反する（仕様 6.4）
- **レスポンシブ対応する**（仕様 3 / 9.1）。ナビゲーションは狭い画面では下部固定、中間以上では上部の横並び。コレクションの列数とカード詳細の段組みを幅で変える。**全幅で共通**：本文の行長を制限する／タップ対象は44px以上／横スクロールを発生させない。確認する幅は **375px / 768px / 1280px**
- **UIの自動テストは書かない。** テストは `src/domain/`・`src/storage/`・`src/maps/`・`scripts/` の純ロジックに限る。画面は手動確認（仕様 14）

## Review Focus

仕様が前提にしているが、仕様本文のどのタスクにも自然には現れない入力・状態。**利用者が踏む可能性が高い順**に並べ、それぞれを担当タスクのテストに入れた。

- **`localStorage` への書き込みが例外を投げる環境**（プライベートブラウズ等）。仕様13はIndexedDBの不可だけを扱っており `localStorage` に触れていない。保存できなくてもアプリが起動不能になってはならない → **Task 7**
- **同じ町を2回引いたとき。** 仕様はコレクションの重複について何も述べていない。`pulls` は引くたびの記録なので、同じ町が2枚並ぶのが正しい（別の旅として扱う）。これを明示的に固定する → **Task 7**
- **IndexedDBの容量超過（`QuotaExceededError`）。** 写真を大量・高解像度で追加すれば現実に起きる。落ちずに「保存できなかった」と伝える必要がある → **Task 16**
- **出発地の手入力に日本語・記号・空文字が入ったときのURL組み立て。** エンコード漏れはGoogleマップ側で黙って誤った地点になる → **Task 6**
- **ミッションが未生成の町が抽選に混ざること。** 仕様11.3の生成済みフラグが抽選側で効いていなければ、空のカードが出る → **Task 3**

---

## File Structure

### 作成するファイルと責務

**設定・土台**

| ファイル | 責務 |
|---|---|
| `package.json` / `tsconfig.json` / `vite.config.ts` | ビルドとテストの設定。Vitestの設定は `vite.config.ts` に同居させる |
| `postcss.config.js` / `src/index.css` | Tailwindの読み込み |
| `index.html` | タイトル `旅ガチャ`、`viewport` |
| `src/main.tsx` | Reactのマウントのみ |
| `src/App.tsx` | タブによる画面切り替えのみ。ロジックを持たない |
| `src/ui/TabBar.tsx` | 「ガチャ / コレクション / プロフィール」のタブ。狭い画面では下部固定、中間以上では上部横並び |
| `src/ui/Layout.tsx` | 外枠。広い画面では最大幅で中央に寄せる |

**ドメイン（純関数のみ。副作用・DOM・ストレージに触れない）**

| ファイル | 責務 |
|---|---|
| `src/domain/types.ts` | `Rarity` `Region` `Town` `GenericMission` `Pull` `PulledMission` `Photo` `Profile` の型と定数 |
| `src/domain/rarity.ts` | 人口 → レア度の判定、排出率テーブル |
| `src/domain/pool.ts` | 出題プールの絞り込み（生成済み・地方） |
| `src/domain/draw.ts` | 二段階抽選（レア度 → 町） |
| `src/domain/missions.ts` | 汎用ミッションの成立条件フィルタと2枚抽選 |
| `src/domain/points.ts` | 1回分のポイント、累計ポイント |
| `src/domain/rank.ts` | 累計ポイント → 称号 |
| `src/domain/drawLimit.ts` | 1日1回の判定 |
| `src/domain/sort.ts` | コレクションの並べ替え |

**外部との境界**

| ファイル | 責務 |
|---|---|
| `src/maps/routeUrl.ts` | GoogleマップのURL組み立て（純関数） |
| `src/storage/schema.ts` | スキーマバージョンと保存形の型、JSONの読み書きの共通処理 |
| `src/storage/profileStore.ts` | `profile` の読み書き、`member_id` の発行 |
| `src/storage/pullStore.ts` | `pulls` の読み書き |
| `src/storage/photoStore.ts` | `photos`（IndexedDB）の読み書きと利用可否判定 |
| `src/location/useOrigin.ts` | 現在地取得と手入力フォールバックの状態管理 |
| `src/location/LocationPrompt.tsx` | 位置情報を求める前の自前の説明 |

**画面**

| ファイル | 責務 |
|---|---|
| `src/features/gacha/HomeScreen.tsx` | モード選択・引くボタン・残り回数・ランク表示 |
| `src/features/gacha/PoolNotice.tsx` | 「有名な街は入っていません」の注釈と展開（仕様 4.6） |
| `src/features/gacha/DrawAnimation.tsx` | 引く演出 |
| `src/features/card/CardDetail.tsx` | カード詳細。ガチャ結果と共用 |
| `src/features/card/MissionList.tsx` | ミッション3枚と達成チェック |
| `src/features/card/AccessSection.tsx` | 行き方のコツと経路ボタン |
| `src/features/card/PhotoSection.tsx` | 写真の追加と一覧 |
| `src/features/collection/CollectionScreen.tsx` | カードのグリッドと並べ替え |
| `src/features/profile/ProfileScreen.tsx` | 称号・累計・各注釈 |
| `src/features/profile/DemoModePanel.tsx` | デモモードの設定 |

**データとスクリプト**

| ファイル | 責務 |
|---|---|
| `scripts/raw/` | 元のCSV（人口・座標）を置く。再現性のためコミットする |
| `scripts/raw/README.md` | 使用したデータセット名・年次・取得元URL・取得日の記録 |
| `src/data/sources.ts` | アプリ内に表示する出典表記（1か所にまとめる） |
| `scripts/buildSkeleton.ts` | CSV → 骨格JSON の変換（純関数部分を分離してテストする） |
| `scripts/skeleton.logic.ts` | 変換の純関数（都道府県→地方、人口パース、除外判定） |
| `scripts/validateTowns.ts` | 生成済み町データの検証ロジック |
| `scripts/prompts/town-enrichment.md` | Claude Code に渡す生成指示文 |
| `public/data/towns.json` | 町データ（生成物） |
| `public/data/generic-missions.json` | 汎用ミッションプール |

### 分割の方針

`src/domain/` を1ファイル1責務で細かく割るのは、**テストを書く単位をファイルと一致させる**ため。1ファイルに抽選とポイントが混ざると、テストが何を保証しているのか読めなくなる。

画面は `features/<画面>/` にまとめる。一緒に変わるものを一緒に置く方針で、技術レイヤー（components / hooks）では分けない。

---

### Task 1: プロジェクト初期化とアプリの骨格

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `postcss.config.js`, `index.html`, `.gitignore`
- Create: `src/main.tsx`, `src/index.css`, `src/App.tsx`, `src/ui/Layout.tsx`, `src/ui/TabBar.tsx`
- Test: なし（このタスクはビルドと手動確認で検証する）

**Interfaces:**
- Consumes: なし
- Produces: `Layout`（`{children}` を受け取り、広い画面では最大幅で中央に寄せる）、`TabBar`（`{active: TabId, onChange: (t: TabId) => void}`。狭い画面では下部固定、中間以上では上部横並び）、`type TabId = 'gacha' | 'collection' | 'profile'`（`src/ui/TabBar.tsx` が export する）

- [ ] **Step 1: Viteプロジェクトを作る**

リポジトリは既に存在し `docs/` がコミットされているため、空ディレクトリを要求する対話型の初期化は使わず、カレントディレクトリに生成する。

```bash
cd /home/dragonnn/develop/tabi-gacha
npm create vite@latest . -- --template react-ts
npm install
```

`npm create vite` が既存ファイルについて確認を求めた場合は、既存ファイルを残す選択（"Ignore files and continue"）を選ぶ。`docs/` を消してはならない。

- [ ] **Step 2: 依存を追加する**

```bash
npm install -D tailwindcss @tailwindcss/postcss postcss vitest jsdom fake-indexeddb
```

- [ ] **Step 3: Tailwindを設定する**

`postcss.config.js` を作る：

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

`src/index.css` の内容を次の1行だけにする：

```css
@import "tailwindcss";
```

> **インストールされたTailwindがv3系だった場合**（`npm ls tailwindcss` で確認）は、上の2ファイルを次に置き換える。`postcss.config.js` は `{ plugins: { tailwindcss: {}, autoprefixer: {} } }`、`src/index.css` は `@tailwind base; @tailwind components; @tailwind utilities;`、加えて `npx tailwindcss init` で `tailwind.config.js` を作り `content: ['./index.html', './src/**/*.{ts,tsx}']` を設定する。

- [ ] **Step 4: Vitestを設定する**

`vite.config.ts` を次の内容にする：

`vite` の `defineConfig` は `test` を受け付けないため、**`vitest/config` から import する**（ここを間違えると型エラーになる）。

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
})
```

`package.json` の `scripts` に次を追加する：

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: `index.html` のタイトルと viewport を設定する**

`<title>` を `旅ガチャ` にし、`<head>` の viewport を次にする（モバイル前提のため）：

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

- [ ] **Step 6: レイアウトとタブを実装する**

`src/ui/Layout.tsx`:

```tsx
import type { ReactNode } from 'react'

/** 狭い画面では画面幅いっぱい。広い画面では最大幅で中央に寄せる */
export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-stone-100">
      <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col bg-white shadow-sm">
        {children}
      </div>
    </div>
  )
}
```

`src/ui/TabBar.tsx`:

```tsx
export type TabId = 'gacha' | 'collection' | 'profile'

const TABS: { id: TabId; label: string }[] = [
  { id: 'gacha', label: 'ガチャ' },
  { id: 'collection', label: 'コレクション' },
  { id: 'profile', label: 'プロフィール' },
]

/**
 * 狭い画面では下部に固定（親指が届く位置）。
 * `md` 以上では静的な上部の横並びに切り替わる（仕様 9.1）。
 * App 側ではヘッダ領域に置く。固定時は流れから外れるため、そこにあっても下部に出る。
 */
export function TabBar({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 flex border-t border-stone-200 bg-white
                 pb-[env(safe-area-inset-bottom,0px)]
                 md:static md:mt-3 md:gap-2 md:border-b md:border-t-0 md:pb-0"
    >
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex-1 py-4 text-sm md:flex-none md:px-4 md:py-2 ${
            active === t.id
              ? 'font-bold text-stone-900 md:border-b-2 md:border-stone-900'
              : 'text-stone-400'
          }`}
        >
          {t.label}
        </button>
      ))}
    </nav>
  )
}
```

`py-4` はタップ対象を44px以上にするための高さ。`env(safe-area-inset-bottom)` は、ホームバーのある端末で下部タブが隠れないようにするため。

`src/App.tsx`:

```tsx
import { useState } from 'react'
import { Layout } from './ui/Layout'
import { TabBar, type TabId } from './ui/TabBar'

export default function App() {
  const [tab, setTab] = useState<TabId>('gacha')
  return (
    <Layout>
      <header className="px-4 pt-6 md:px-8">
        <h1 className="text-2xl font-bold tracking-tight">旅ガチャ</h1>
        <TabBar active={tab} onChange={setTab} />
      </header>
      <main className="flex flex-1 flex-col px-4 pb-24 md:px-8 md:pb-8">
        {tab === 'gacha' && <p className="text-stone-500">ガチャ</p>}
        {tab === 'collection' && <p className="text-stone-500">コレクション</p>}
        {tab === 'profile' && <p className="text-stone-500">プロフィール</p>}
      </main>
    </Layout>
  )
}
```

`src/main.tsx` が `./index.css` を import していることを確認する（Viteのテンプレートは `App.css` を使うので、不要なら削除して `index.css` に差し替える）。

`main` の `pb-24` は、狭い画面で下部固定のタブが本文の末尾を覆わないための逃げ。`md:pb-8` でタブが上部に移るため不要になる。

- [ ] **Step 7: ビルドとテストの起動を確認する**

```bash
npm run build
npm test
```

期待：`npm run build` が成功する。`npm test` は「テストファイルが無い」で終了する（この時点ではテストが0件で正常。終了コードが非0になる場合は `vitest run --passWithNoTests` で確認する）。

- [ ] **Step 8: 画面を手動確認する**

```bash
npm run dev
```

ブラウザで開き、**開発者ツールで幅を 375px / 768px / 1280px に切り替えて**次を確認する：

1. 上部に「旅ガチャ」が出ている
2. タブ3つを押すと本文が「ガチャ」「コレクション」「プロフィール」に切り替わる
3. **375px**：タブが画面下部に固定され、スクロールしても下に残る。本文の末尾がタブに隠れない
4. **768px / 1280px**：タブがタイトルの下（上部）に横並びで出て、下部には何もない
5. **1280px**：外枠が画面いっぱいに広がらず、最大幅で中央に寄っている
6. どの幅でも横スクロールが出ない

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: Vite + React + TS + Tailwind の土台とタブ骨格"
```

---

### Task 2: ドメイン型・定数・レア度判定

**Files:**
- Create: `src/domain/types.ts`, `src/domain/rarity.ts`
- Test: `src/domain/rarity.test.ts`

**Interfaces:**
- Consumes: なし
- Produces:
  - `type Rarity = 'SSR' | 'SR' | 'R' | 'N'`
  - `type Region = '北海道' | '東北' | '関東' | '中部' | '近畿' | '中国' | '四国' | '九州沖縄'`
  - `const REGIONS: readonly Region[]`（8件、仕様の順）
  - `interface Town { id: string; name: string; prefecture: string; region: Region; population: number; rarity: Rarity; tags: string[]; uniqueMission: string; accessTips: string; enriched: boolean }`
  - `interface GenericMission { id: string; text: string; requiredTags: string[] }`
  - `interface PulledMission { kind: 'unique' | 'generic'; genericMissionId: string | null; done: boolean }`
  - `interface Pull { id: string; memberId: string; townId: string; pulledAt: string; missions: PulledMission[]; }`
  - `interface Photo { id: string; pullId: string; blob: Blob; takenAt: string }`
  - `interface Profile { memberId: string; lastDrawnAt: string | null; schemaVersion: number }`
  - `const RARITY_WEIGHTS: Record<Rarity, number>`、`const RARITY_POINTS: Record<Rarity, number>`、`const MAX_POPULATION = 100000`
  - `rarityForPopulation(population: number): Rarity | null`

- [ ] **Step 1: 失敗するテストを書く**

`src/domain/rarity.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { RARITY_POINTS, RARITY_WEIGHTS, rarityForPopulation } from './rarity'
import { REGIONS } from './types'

describe('rarityForPopulation', () => {
  it.each([
    [0, 'SSR'],
    [2999, 'SSR'],
    [3000, 'SR'],
    [9999, 'SR'],
    [10000, 'R'],
    [29999, 'R'],
    [30000, 'N'],
    [99999, 'N'],
  ] as const)('人口 %i は %s', (population, expected) => {
    expect(rarityForPopulation(population)).toBe(expected)
  })

  it('10万人以上は出題対象外なので null', () => {
    expect(rarityForPopulation(100000)).toBeNull()
    expect(rarityForPopulation(3_000_000)).toBeNull()
  })
})

describe('定数', () => {
  it('排出率の合計は100', () => {
    const sum = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0)
    expect(sum).toBe(100)
  })

  it('排出率は仕様どおり', () => {
    expect(RARITY_WEIGHTS).toEqual({ SSR: 8, SR: 22, R: 35, N: 35 })
  })

  it('ポイントは仕様どおり', () => {
    expect(RARITY_POINTS).toEqual({ SSR: 100, SR: 50, R: 25, N: 10 })
  })

  it('地方は8つで仕様の順', () => {
    expect(REGIONS).toEqual([
      '北海道', '東北', '関東', '中部', '近畿', '中国', '四国', '九州沖縄',
    ])
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx vitest run src/domain/rarity.test.ts`
期待：FAIL（`./rarity` および `./types` が解決できない）

- [ ] **Step 3: 型と定数を実装する**

`src/domain/types.ts`:

```ts
export type Rarity = 'SSR' | 'SR' | 'R' | 'N'

export type Region =
  | '北海道' | '東北' | '関東' | '中部' | '近畿' | '中国' | '四国' | '九州沖縄'

export const REGIONS: readonly Region[] = [
  '北海道', '東北', '関東', '中部', '近畿', '中国', '四国', '九州沖縄',
] as const

export interface Town {
  id: string
  name: string
  prefecture: string
  region: Region
  population: number
  rarity: Rarity
  tags: string[]
  uniqueMission: string
  accessTips: string
  /** 固有ミッションと行き方のコツが生成済みか。false の町は抽選対象外（仕様 11.3） */
  enriched: boolean
}

export interface GenericMission {
  id: string
  text: string
  /** 空配列なら無条件に成立する（仕様 5.2） */
  requiredTags: string[]
}

export interface PulledMission {
  kind: 'unique' | 'generic'
  /** kind === 'unique' のときは null。固有ミッションは townId から引けるため文面を持たない */
  genericMissionId: string | null
  done: boolean
}

export interface Pull {
  id: string
  memberId: string
  townId: string
  pulledAt: string
  missions: PulledMission[]
}

export interface Photo {
  id: string
  pullId: string
  blob: Blob
  takenAt: string
}

export interface Profile {
  memberId: string
  lastDrawnAt: string | null
  schemaVersion: number
}
```

`src/domain/rarity.ts`:

```ts
import type { Rarity } from './types'

export const MAX_POPULATION = 100000

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  SSR: 8,
  SR: 22,
  R: 35,
  N: 35,
}

export const RARITY_POINTS: Record<Rarity, number> = {
  SSR: 100,
  SR: 50,
  R: 25,
  N: 10,
}

/** 人口からレア度を決める。出題対象外（10万人以上）は null */
export function rarityForPopulation(population: number): Rarity | null {
  if (population >= MAX_POPULATION) return null
  if (population >= 30000) return 'N'
  if (population >= 10000) return 'R'
  if (population >= 3000) return 'SR'
  return 'SSR'
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npx vitest run src/domain/rarity.test.ts`
期待：PASS（全件）

- [ ] **Step 5: Commit**

```bash
git add src/domain/types.ts src/domain/rarity.ts src/domain/rarity.test.ts
git commit -m "feat(domain): 型・定数・人口からのレア度判定"
```

---

### Task 3: 出題プールの絞り込み

**Files:**
- Create: `src/domain/pool.ts`
- Test: `src/domain/pool.test.ts`

**Interfaces:**
- Consumes: `Town`, `Region`（Task 2）
- Produces:
  - `type DrawMode = { kind: 'nationwide' } | { kind: 'region'; region: Region }`
  - `poolFor(towns: Town[], mode: DrawMode): Town[]`

**Review Focus（このタスクが担当）:** ミッションが未生成の町（`enriched: false`）が抽選に混ざらないこと。

- [ ] **Step 1: 失敗するテストを書く**

`src/domain/pool.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { poolFor } from './pool'
import type { Town } from './types'

function town(over: Partial<Town>): Town {
  return {
    id: 't', name: '某町', prefecture: '島根県', region: '中国',
    population: 5000, rarity: 'SR',
    tags: [], uniqueMission: 'm', accessTips: 'a', enriched: true,
    ...over,
  }
}

describe('poolFor', () => {
  it('全国モードは生成済みの町をすべて返す', () => {
    const towns = [town({ id: 'a' }), town({ id: 'b', region: '東北' })]
    expect(poolFor(towns, { kind: 'nationwide' }).map((t) => t.id)).toEqual(['a', 'b'])
  })

  it('地方モードは指定した地方の町だけを返す', () => {
    const towns = [
      town({ id: 'a', region: '中国' }),
      town({ id: 'b', region: '東北' }),
      town({ id: 'c', region: '中国' }),
    ]
    const got = poolFor(towns, { kind: 'region', region: '中国' })
    expect(got.map((t) => t.id)).toEqual(['a', 'c'])
  })

  it('未生成の町（enriched: false）は除外する', () => {
    const towns = [town({ id: 'a' }), town({ id: 'b', enriched: false })]
    expect(poolFor(towns, { kind: 'nationwide' }).map((t) => t.id)).toEqual(['a'])
  })

  it('未生成の町は地方モードでも除外する', () => {
    const towns = [
      town({ id: 'a', region: '四国', enriched: false }),
      town({ id: 'b', region: '四国' }),
    ]
    const got = poolFor(towns, { kind: 'region', region: '四国' })
    expect(got.map((t) => t.id)).toEqual(['b'])
  })

  it('該当が無ければ空配列', () => {
    expect(poolFor([town({ region: '中国' })], { kind: 'region', region: '北海道' })).toEqual([])
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx vitest run src/domain/pool.test.ts`
期待：FAIL（`poolFor` が存在しない）

- [ ] **Step 3: 実装する**

`src/domain/pool.ts`:

```ts
import type { Region, Town } from './types'

export type DrawMode = { kind: 'nationwide' } | { kind: 'region'; region: Region }

/**
 * 抽選対象の町を絞り込む。
 * 人口10万人以上はデータ生成の段階で除外済みのため、ここでは扱わない。
 */
export function poolFor(towns: Town[], mode: DrawMode): Town[] {
  const enriched = towns.filter((t) => t.enriched)
  if (mode.kind === 'nationwide') return enriched
  return enriched.filter((t) => t.region === mode.region)
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npx vitest run src/domain/pool.test.ts`
期待：PASS（全5件）

- [ ] **Step 5: Commit**

```bash
git add src/domain/pool.ts src/domain/pool.test.ts
git commit -m "feat(domain): 出題プールの絞り込み（地方・生成済み）"
```

---

### Task 4: 二段階抽選

**Files:**
- Create: `src/domain/draw.ts`
- Test: `src/domain/draw.test.ts`

**Interfaces:**
- Consumes: `Town`, `Rarity`（Task 2）, `RARITY_WEIGHTS`（Task 2）
- Produces:
  - `type Rng = () => number`（0以上1未満を返す）
  - `drawRarity(available: Rarity[], rng: Rng): Rarity | null`
  - `drawTown(pool: Town[], rng: Rng, forcedRarity?: Rarity): Town | null`

**設計上の注記:** 乱数は引数で受け取る（`Math.random` を内部で呼ばない）。これが抽選をテストできる唯一の形であり、デモモードの「レア度の指定」も `forcedRarity` で同じ関数に相乗りできる。

- [ ] **Step 1: 失敗するテストを書く**

`src/domain/draw.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { drawRarity, drawTown } from './draw'
import type { Rng } from './draw'
import type { Rarity, Town } from './types'

/** 渡した値を順番に返す乱数。尽きたら最後の値を返す */
function seq(values: number[]): Rng {
  let i = 0
  return () => values[Math.min(i++, values.length - 1)]
}

function town(id: string, rarity: Rarity): Town {
  return {
    id, name: `${id}町`, prefecture: '島根県', region: '中国',
    population: 5000, rarity,
    tags: [], uniqueMission: 'm', accessTips: 'a', enriched: true,
  }
}

describe('drawRarity', () => {
  const all: Rarity[] = ['SSR', 'SR', 'R', 'N']

  it('重みの境界で正しいレア度を返す（SSR=8, SR=22, R=35, N=35）', () => {
    expect(drawRarity(all, seq([0]))).toBe('SSR')
    expect(drawRarity(all, seq([0.0799]))).toBe('SSR')
    expect(drawRarity(all, seq([0.08]))).toBe('SR')
    expect(drawRarity(all, seq([0.2999]))).toBe('SR')
    expect(drawRarity(all, seq([0.3]))).toBe('R')
    expect(drawRarity(all, seq([0.6499]))).toBe('R')
    expect(drawRarity(all, seq([0.65]))).toBe('N')
    expect(drawRarity(all, seq([0.9999]))).toBe('N')
  })

  it('候補を絞ると、その中で重みが再配分される', () => {
    // SSR(8) と N(35) だけなら、境界は 8/43 ≒ 0.186
    expect(drawRarity(['SSR', 'N'], seq([0.18]))).toBe('SSR')
    expect(drawRarity(['SSR', 'N'], seq([0.19]))).toBe('N')
  })

  it('候補が空なら null', () => {
    expect(drawRarity([], seq([0.5]))).toBeNull()
  })
})

describe('drawTown', () => {
  it('引いたレア度の町から一様に選ぶ', () => {
    const pool = [town('a', 'N'), town('b', 'N'), town('c', 'N')]
    // レア度抽選で N を引き、続く乱数で3件目を選ぶ
    expect(drawTown(pool, seq([0.9, 0.9]))?.id).toBe('c')
    expect(drawTown(pool, seq([0.9, 0.0]))?.id).toBe('a')
  })

  it('プールに存在しないレア度は抽選候補に入らない（空レア度で再抽選しない）', () => {
    // プールは SSR のみ。乱数が N の帯を指しても SSR が返る
    const pool = [town('only', 'SSR')]
    expect(drawTown(pool, seq([0.99, 0]))?.id).toBe('only')
  })

  it('プールが空なら null', () => {
    expect(drawTown([], seq([0.5]))).toBeNull()
  })

  it('forcedRarity を渡すとレア度抽選を飛ばす', () => {
    const pool = [town('a', 'SSR'), town('b', 'N')]
    expect(drawTown(pool, seq([0]), 'N')?.id).toBe('b')
  })

  it('forcedRarity の町がプールに無ければ null', () => {
    expect(drawTown([town('a', 'N')], seq([0]), 'SSR')).toBeNull()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx vitest run src/domain/draw.test.ts`
期待：FAIL（`drawRarity` / `drawTown` が存在しない）

- [ ] **Step 3: 実装する**

`src/domain/draw.ts`:

```ts
import { RARITY_WEIGHTS } from './rarity'
import type { Rarity, Town } from './types'

export type Rng = () => number

/**
 * 候補のレア度から重み付きで1つ引く。
 * 候補を絞った場合は、その中で重みを再配分する（候補外の確率は捨てない）。
 */
export function drawRarity(available: Rarity[], rng: Rng): Rarity | null {
  if (available.length === 0) return null
  const total = available.reduce((sum, r) => sum + RARITY_WEIGHTS[r], 0)
  let threshold = rng() * total
  for (const rarity of available) {
    threshold -= RARITY_WEIGHTS[rarity]
    if (threshold < 0) return rarity
  }
  return available[available.length - 1]
}

/**
 * 二段階抽選：①プールに存在するレア度の中から重み付きで1つ引く
 *             ②そのレア度の町から一様に1つ選ぶ
 * プールに存在しないレア度は候補に入れないため、「空レア度を引いて再抽選」は起きない。
 */
export function drawTown(pool: Town[], rng: Rng, forcedRarity?: Rarity): Town | null {
  if (pool.length === 0) return null

  let rarity: Rarity | null
  if (forcedRarity) {
    rarity = forcedRarity
  } else {
    const available = (['SSR', 'SR', 'R', 'N'] as Rarity[]).filter((r) =>
      pool.some((t) => t.rarity === r),
    )
    rarity = drawRarity(available, rng)
  }
  if (!rarity) return null

  const candidates = pool.filter((t) => t.rarity === rarity)
  if (candidates.length === 0) return null
  const index = Math.min(Math.floor(rng() * candidates.length), candidates.length - 1)
  return candidates[index]
}
```

> **仕様4.4「候補が空のレア度が出た場合は別のレア度で再抽選する」の実装方針**：事後に再抽選するのではなく、**抽選前に候補から除く**ことで同じ結果を得ている。再抽選のループは理論上無限に回り得るが、この形なら1回で決まる。

- [ ] **Step 4: テストが通ることを確認する**

Run: `npx vitest run src/domain/draw.test.ts`
期待：PASS（全9件）

- [ ] **Step 5: Commit**

```bash
git add src/domain/draw.ts src/domain/draw.test.ts
git commit -m "feat(domain): レア度→町の二段階抽選"
```

---

### Task 5: 汎用ミッションの抽選

**Files:**
- Create: `src/domain/missions.ts`
- Test: `src/domain/missions.test.ts`

**Interfaces:**
- Consumes: `GenericMission`, `PulledMission`, `Town`（Task 2）, `Rng`（Task 4）
- Produces:
  - `eligibleMissions(pool: GenericMission[], townTags: string[]): GenericMission[]`
  - `drawGenericMissions(pool: GenericMission[], townTags: string[], rng: Rng, count?: number): GenericMission[]`
  - `buildPulledMissions(generics: GenericMission[]): PulledMission[]`

- [ ] **Step 1: 失敗するテストを書く**

`src/domain/missions.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildPulledMissions, drawGenericMissions, eligibleMissions } from './missions'
import type { Rng } from './draw'
import type { GenericMission } from './types'

function seq(values: number[]): Rng {
  let i = 0
  return () => values[Math.min(i++, values.length - 1)]
}

const POOL: GenericMission[] = [
  { id: 'g1', text: '地元の人に話しかける', requiredTags: [] },
  { id: 'g2', text: '名前を知らない店に入る', requiredTags: [] },
  { id: 'g3', text: '漁港で朝市をのぞく', requiredTags: ['海沿い'] },
  { id: 'g4', text: '温泉で一服する', requiredTags: ['温泉あり'] },
]

describe('eligibleMissions', () => {
  it('条件なしのミッションは常に成立する', () => {
    expect(eligibleMissions(POOL, []).map((m) => m.id)).toEqual(['g1', 'g2'])
  })

  it('タグを満たすミッションが候補に加わる', () => {
    expect(eligibleMissions(POOL, ['海沿い']).map((m) => m.id)).toEqual(['g1', 'g2', 'g3'])
  })

  it('必要タグをすべて持っていないと成立しない', () => {
    const pool: GenericMission[] = [
      { id: 'x', text: '海沿いの温泉', requiredTags: ['海沿い', '温泉あり'] },
    ]
    expect(eligibleMissions(pool, ['海沿い'])).toEqual([])
    expect(eligibleMissions(pool, ['海沿い', '温泉あり']).map((m) => m.id)).toEqual(['x'])
  })
})

describe('drawGenericMissions', () => {
  it('2枚を重複なく引く', () => {
    const got = drawGenericMissions(POOL, ['海沿い', '温泉あり'], seq([0, 0]))
    expect(got).toHaveLength(2)
    expect(new Set(got.map((m) => m.id)).size).toBe(2)
  })

  it('成立する候補が2つ未満なら、条件なしのミッションで補う', () => {
    const pool: GenericMission[] = [
      { id: 'sea', text: '漁港', requiredTags: ['海沿い'] },
      { id: 'any1', text: 'どこでも1', requiredTags: [] },
      { id: 'any2', text: 'どこでも2', requiredTags: [] },
    ]
    // タグなしの町：'sea' は成立しないので、条件なしから2枚
    const got = drawGenericMissions(pool, [], seq([0, 0]))
    expect(got.map((m) => m.id).sort()).toEqual(['any1', 'any2'])
  })

  it('候補が1件しかなければ1枚だけ返す（水増ししない）', () => {
    const pool: GenericMission[] = [{ id: 'only', text: 'ひとつ', requiredTags: [] }]
    expect(drawGenericMissions(pool, [], seq([0, 0])).map((m) => m.id)).toEqual(['only'])
  })

  it('候補が空なら空配列', () => {
    expect(drawGenericMissions([], [], seq([0]))).toEqual([])
  })
})

describe('buildPulledMissions', () => {
  it('固有1枚を先頭に置き、汎用を続ける。すべて未達成で始まる', () => {
    const got = buildPulledMissions([POOL[0], POOL[1]])
    expect(got).toEqual([
      { kind: 'unique', genericMissionId: null, done: false },
      { kind: 'generic', genericMissionId: 'g1', done: false },
      { kind: 'generic', genericMissionId: 'g2', done: false },
    ])
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx vitest run src/domain/missions.test.ts`
期待：FAIL（`eligibleMissions` 等が存在しない）

- [ ] **Step 3: 実装する**

`src/domain/missions.ts`:

```ts
import type { Rng } from './draw'
import type { GenericMission, PulledMission } from './types'

/** 町のタグで成立する汎用ミッションだけを残す（仕様 5.2） */
export function eligibleMissions(pool: GenericMission[], townTags: string[]): GenericMission[] {
  return pool.filter((m) => m.requiredTags.every((tag) => townTags.includes(tag)))
}

/**
 * 汎用ミッションを重複なく引く。
 * 成立する候補が足りない場合は、条件なしのミッション（requiredTags が空）で補う。
 * それでも足りなければ、あるだけ返す（同じミッションを2枚並べない）。
 */
export function drawGenericMissions(
  pool: GenericMission[],
  townTags: string[],
  rng: Rng,
  count = 2,
): GenericMission[] {
  const candidates = [...eligibleMissions(pool, townTags)]
  const unconditional = pool.filter((m) => m.requiredTags.length === 0)
  for (const m of unconditional) {
    if (!candidates.some((c) => c.id === m.id)) candidates.push(m)
  }

  const picked: GenericMission[] = []
  while (picked.length < count && candidates.length > 0) {
    const index = Math.min(Math.floor(rng() * candidates.length), candidates.length - 1)
    picked.push(candidates.splice(index, 1)[0])
  }
  return picked
}

/** 固有1枚を固定枠として先頭に置き、汎用を続ける（仕様 5.1） */
export function buildPulledMissions(generics: GenericMission[]): PulledMission[] {
  return [
    { kind: 'unique', genericMissionId: null, done: false },
    ...generics.map((m) => ({
      kind: 'generic' as const,
      genericMissionId: m.id,
      done: false,
    })),
  ]
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npx vitest run src/domain/missions.test.ts`
期待：PASS（全8件）

- [ ] **Step 5: Commit**

```bash
git add src/domain/missions.ts src/domain/missions.test.ts
git commit -m "feat(domain): 汎用ミッションの成立条件フィルタと抽選"
```

---

### Task 6: ポイント・ランク・1日1回・経路URL

**Files:**
- Create: `src/domain/points.ts`, `src/domain/rank.ts`, `src/domain/drawLimit.ts`, `src/maps/routeUrl.ts`
- Test: `src/domain/points.test.ts`, `src/domain/rank.test.ts`, `src/domain/drawLimit.test.ts`, `src/maps/routeUrl.test.ts`

**Interfaces:**
- Consumes: `Rarity`, `Pull`, `Town`（Task 2）, `RARITY_POINTS`（Task 2）
- Produces:
  - `pointsForPull(rarity: Rarity, missions: PulledMission[]): number`
  - `totalPoints(pulls: Pull[], townById: (id: string) => Town | undefined): number`
  - `type Rank = { threshold: number; title: string }`、`const RANKS: readonly Rank[]`、`rankFor(total: number): Rank`
  - `canDraw(lastDrawnAt: string | null, now: Date, unlimited: boolean): boolean`
  - `type Origin = { kind: 'coords'; lat: number; lng: number } | { kind: 'text'; value: string } | null`
  - `routeUrl(destination: string, origin: Origin): string`（`destination` は「都道府県名＋市区町村名」）

**設計上の注記（仕様からの意図的なずれ）:** 仕様10の `profile` は「累計ポイント」を持つが、実装では**保存せず `pulls` から導出する**。真実の源を `pulls` 1か所にすることで、達成チェックを外したときの整合ずれが構造的に起きなくなる。将来DBに移すとき、`members` 側にキャッシュ列を足すのは後からでも安全にできる。

**Review Focus（このタスクが担当）:** 出発地の手入力に日本語・記号・空文字が入ったときのURL組み立て。

- [ ] **Step 1: 失敗するテストを書く（ポイント）**

`src/domain/points.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { pointsForPull, totalPoints } from './points'
import type { Pull, PulledMission, Town } from './types'

function missions(doneFlags: boolean[]): PulledMission[] {
  return doneFlags.map((done, i) => ({
    kind: i === 0 ? 'unique' : 'generic',
    genericMissionId: i === 0 ? null : `g${i}`,
    done,
  }))
}

function town(id: string, rarity: Town['rarity']): Town {
  return {
    id, name: `${id}町`, prefecture: '島根県', region: '中国',
    population: 5000, rarity,
    tags: [], uniqueMission: 'm', accessTips: 'a', enriched: true,
  }
}

describe('pointsForPull', () => {
  it('レア度 × 達成数', () => {
    expect(pointsForPull('SSR', missions([true, true, true]))).toBe(300)
    expect(pointsForPull('SSR', missions([true, false, false]))).toBe(100)
    expect(pointsForPull('SR', missions([true, true, false]))).toBe(100)
    expect(pointsForPull('R', missions([true, true, true]))).toBe(75)
    expect(pointsForPull('N', missions([true, true, true]))).toBe(30)
  })

  it('未達成なら0', () => {
    expect(pointsForPull('SSR', missions([false, false, false]))).toBe(0)
  })
})

describe('totalPoints', () => {
  const towns = [town('a', 'SSR'), town('b', 'N')]
  const byId = (id: string) => towns.find((t) => t.id === id)

  it('全 pull の合計', () => {
    const pulls: Pull[] = [
      { id: 'p1', memberId: 'm', townId: 'a', pulledAt: '2026-10-24T00:00:00Z', missions: missions([true, true, false]) },
      { id: 'p2', memberId: 'm', townId: 'b', pulledAt: '2026-10-25T00:00:00Z', missions: missions([true, false, false]) },
    ]
    expect(totalPoints(pulls, byId)).toBe(200 + 10)
  })

  it('町が見つからない pull は0として無視する', () => {
    const pulls: Pull[] = [
      { id: 'p1', memberId: 'm', townId: 'missing', pulledAt: '2026-10-24T00:00:00Z', missions: missions([true, true, true]) },
    ]
    expect(totalPoints(pulls, byId)).toBe(0)
  })

  it('pull が無ければ0', () => {
    expect(totalPoints([], byId)).toBe(0)
  })
})
```

- [ ] **Step 2: 失敗するテストを書く（ランク）**

`src/domain/rank.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { RANKS, rankFor } from './rank'

describe('rankFor', () => {
  it.each([
    [0, '旅の見習い'],
    [99, '旅の見習い'],
    [100, '寄り道の人'],
    [499, '寄り道の人'],
    [500, '旅人'],
    [1499, '旅人'],
    [1500, '辺境の開拓者'],
    [4999, '辺境の開拓者'],
    [5000, '日本を踏み尽くす者'],
    [999999, '日本を踏み尽くす者'],
  ])('累計 %i は %s', (total, title) => {
    expect(rankFor(total).title).toBe(title)
  })

  it('ランクは5段階で、閾値は昇順', () => {
    expect(RANKS).toHaveLength(5)
    const thresholds = RANKS.map((r) => r.threshold)
    expect(thresholds).toEqual([0, 100, 500, 1500, 5000])
  })
})
```

- [ ] **Step 3: 失敗するテストを書く（1日1回）**

`src/domain/drawLimit.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { canDraw } from './drawLimit'

describe('canDraw', () => {
  const now = new Date('2026-10-24T15:00:00+09:00')

  it('一度も引いていなければ引ける', () => {
    expect(canDraw(null, now, false)).toBe(true)
  })

  it('同じ暦日に引いていれば引けない', () => {
    expect(canDraw('2026-10-24T01:00:00+09:00', now, false)).toBe(false)
  })

  it('前日に引いていれば引ける', () => {
    expect(canDraw('2026-10-23T23:59:00+09:00', now, false)).toBe(true)
  })

  it('デモモードなら同じ日でも引ける', () => {
    expect(canDraw('2026-10-24T01:00:00+09:00', now, true)).toBe(true)
  })

  it('保存値が壊れていれば引ける（引けなくなる方に倒さない）', () => {
    expect(canDraw('not-a-date', now, false)).toBe(true)
  })
})
```

- [ ] **Step 4: 失敗するテストを書く（経路URL）**

`src/maps/routeUrl.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { routeUrl } from './routeUrl'

const dest = '島根県奥出雲町'

describe('routeUrl', () => {
  it('目的地は「都道府県名＋市区町村名」で渡し、公共交通を指定する', () => {
    const url = new URL(routeUrl(dest, null))
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/')
    expect(url.searchParams.get('api')).toBe('1')
    expect(url.searchParams.get('destination')).toBe('島根県奥出雲町')
    expect(url.searchParams.get('travelmode')).toBe('transit')
  })

  it('目的地の日本語をエンコードする', () => {
    expect(routeUrl(dest, null)).toContain('destination=%E5%B3%B6%E6%A0%B9%E7%9C%8C')
  })

  it('都道府県名を前置するので同名の市町村が区別できる', () => {
    expect(new URL(routeUrl('東京都府中市', null)).searchParams.get('destination')).toBe('東京都府中市')
    expect(new URL(routeUrl('広島県府中市', null)).searchParams.get('destination')).toBe('広島県府中市')
  })

  it('出発地が無ければ origin を付けない', () => {
    const url = new URL(routeUrl(dest, null))
    expect(url.searchParams.has('origin')).toBe(false)
  })

  it('座標の出発地を付ける', () => {
    const url = new URL(routeUrl(dest, { kind: 'coords', lat: 34.5, lng: 135.5 }))
    expect(url.searchParams.get('origin')).toBe('34.5,135.5')
  })

  it('日本語の手入力をエンコードする', () => {
    const raw = routeUrl(dest, { kind: 'text', value: '東京駅' })
    expect(raw).toContain('origin=%E6%9D%B1%E4%BA%AC%E9%A7%85')
    expect(new URL(raw).searchParams.get('origin')).toBe('東京駅')
  })

  it('記号や空白を含む手入力も壊れない', () => {
    const raw = routeUrl(dest, { kind: 'text', value: 'JR 新宿駅 & バス停' })
    expect(new URL(raw).searchParams.get('origin')).toBe('JR 新宿駅 & バス停')
  })

  it('空文字や空白だけの手入力は出発地なしとして扱う', () => {
    expect(new URL(routeUrl(dest, { kind: 'text', value: '' })).searchParams.has('origin')).toBe(false)
    expect(new URL(routeUrl(dest, { kind: 'text', value: '   ' })).searchParams.has('origin')).toBe(false)
  })
})
```

- [ ] **Step 5: 4つのテストが失敗することを確認する**

Run: `npx vitest run src/domain/points.test.ts src/domain/rank.test.ts src/domain/drawLimit.test.ts src/maps/routeUrl.test.ts`
期待：4ファイルすべて FAIL（モジュールが存在しない）

- [ ] **Step 6: 実装する**

`src/domain/points.ts`:

```ts
import { RARITY_POINTS } from './rarity'
import type { Pull, PulledMission, Rarity, Town } from './types'

/** 1回分の獲得ポイント＝レア度 × 達成したミッション数（仕様 7.1） */
export function pointsForPull(rarity: Rarity, missions: PulledMission[]): number {
  const done = missions.filter((m) => m.done).length
  return RARITY_POINTS[rarity] * done
}

/**
 * 累計ポイント。pulls から毎回導出する（保存しない）。
 * 真実の源を1か所にすることで、達成チェックを外したときの整合ずれが起きない。
 */
export function totalPoints(pulls: Pull[], townById: (id: string) => Town | undefined): number {
  return pulls.reduce((sum, pull) => {
    const town = townById(pull.townId)
    if (!town) return sum
    return sum + pointsForPull(town.rarity, pull.missions)
  }, 0)
}
```

`src/domain/rank.ts`:

```ts
export type Rank = { threshold: number; title: string }

export const RANKS: readonly Rank[] = [
  { threshold: 0, title: '旅の見習い' },
  { threshold: 100, title: '寄り道の人' },
  { threshold: 500, title: '旅人' },
  { threshold: 1500, title: '辺境の開拓者' },
  { threshold: 5000, title: '日本を踏み尽くす者' },
] as const

/** 累計ポイントに対応する称号。閾値を下回らない最大のランクを返す */
export function rankFor(total: number): Rank {
  let current = RANKS[0]
  for (const rank of RANKS) {
    if (total >= rank.threshold) current = rank
  }
  return current
}
```

`src/domain/drawLimit.ts`:

```ts
/**
 * 1日1回・引き直し不可（仕様 4.5）。
 * 判定は端末のローカル暦日で行う。保存値が壊れている場合は「引ける」に倒す
 * （利用者を締め出す方向に倒さない）。
 */
export function canDraw(lastDrawnAt: string | null, now: Date, unlimited: boolean): boolean {
  if (unlimited) return true
  if (!lastDrawnAt) return true
  const last = new Date(lastDrawnAt)
  if (Number.isNaN(last.getTime())) return true
  return !isSameLocalDay(last, now)
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
```

`src/maps/routeUrl.ts`:

```ts
export type Origin =
  | { kind: 'coords'; lat: number; lng: number }
  | { kind: 'text'; value: string }
  | null

/**
 * Googleマップの経路URLを組み立てる（仕様 6.1）。
 * APIキーは不要。所要時間や経路の算出はGoogleマップ側に委譲する。
 *
 * 目的地は緯度経度ではなく「都道府県名＋市区町村名」のテキストで渡す。
 * Maps URLs は地名を受け付けるため座標が不要になり、測地系のズレや代表点の
 * 選び方の問題を抱えずに済む（仕様 6.1）。都道府県名を前置すれば同名の市町村も
 * 一意に定まる。
 */
export function routeUrl(destination: string, origin: Origin): string {
  const params = new URLSearchParams({
    api: '1',
    destination,
    travelmode: 'transit',
  })

  const originValue = formatOrigin(origin)
  if (originValue) params.set('origin', originValue)

  return `https://www.google.com/maps/dir/?${params.toString()}`
}

function formatOrigin(origin: Origin): string | null {
  if (!origin) return null
  if (origin.kind === 'coords') return `${origin.lat},${origin.lng}`
  const trimmed = origin.value.trim()
  return trimmed === '' ? null : trimmed
}
```

- [ ] **Step 7: テストが通ることを確認する**

Run: `npx vitest run src/domain src/maps`
期待：PASS（Task 2〜6 の全テスト）

- [ ] **Step 8: Commit**

```bash
git add src/domain/points.ts src/domain/points.test.ts src/domain/rank.ts src/domain/rank.test.ts src/domain/drawLimit.ts src/domain/drawLimit.test.ts src/maps/routeUrl.ts src/maps/routeUrl.test.ts
git commit -m "feat(domain): ポイント・ランク・1日1回判定・経路URL"
```

---

### Task 7: 永続化層（profile と pulls）

**Files:**
- Create: `src/storage/schema.ts`, `src/storage/profileStore.ts`, `src/storage/pullStore.ts`
- Test: `src/storage/profileStore.test.ts`, `src/storage/pullStore.test.ts`

**Interfaces:**
- Consumes: `Profile`, `Pull`, `PulledMission`（Task 2）
- Produces:
  - `const SCHEMA_VERSION = 1`、`const KEYS`
  - `isStorageAvailable(): boolean`、`readJson<T>(key: string, fallback: T): T`、`writeJson(key: string, value: unknown): boolean`
  - `resetIfSchemaChanged(): boolean`（初期化したら `true`）
  - `newId(): string`
  - `loadProfile(): Profile`、`saveProfile(profile: Profile): void`、`recordDraw(now: Date): Profile`
  - `loadPulls(): Pull[]`、`addPull(pull: Pull): Pull[]`、`setMissionDone(pullId: string, index: number, done: boolean): Pull[]`

**Review Focus（このタスクが担当）:**
- `localStorage` への書き込みが例外を投げる環境でも、アプリが起動不能にならないこと
- 同じ町を2回引いたら、カードは2枚になること（同じ町でも別の旅として扱う）

- [ ] **Step 1: 失敗するテストを書く（profile）**

`src/storage/profileStore.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { KEYS, SCHEMA_VERSION, resetIfSchemaChanged } from './schema'
import { loadProfile, recordDraw, saveProfile } from './profileStore'

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('loadProfile', () => {
  it('初回は member_id を発行して返す', () => {
    const profile = loadProfile()
    expect(profile.memberId).toMatch(/\S/)
    expect(profile.lastDrawnAt).toBeNull()
    expect(profile.schemaVersion).toBe(SCHEMA_VERSION)
  })

  it('2回目は同じ member_id を返す（発行し直さない）', () => {
    const first = loadProfile()
    const second = loadProfile()
    expect(second.memberId).toBe(first.memberId)
  })

  it('保存した内容を読み戻せる', () => {
    const profile = loadProfile()
    saveProfile({ ...profile, lastDrawnAt: '2026-10-24T00:00:00.000Z' })
    expect(loadProfile().lastDrawnAt).toBe('2026-10-24T00:00:00.000Z')
  })

  it('壊れたJSONが入っていても落ちず、新しい profile を返す', () => {
    localStorage.setItem(KEYS.profile, '{ broken')
    expect(loadProfile().memberId).toMatch(/\S/)
  })
})

describe('recordDraw', () => {
  it('引いた日時を記録する', () => {
    const now = new Date('2026-10-24T06:00:00.000Z')
    const profile = recordDraw(now)
    expect(profile.lastDrawnAt).toBe(now.toISOString())
    expect(loadProfile().lastDrawnAt).toBe(now.toISOString())
  })
})

describe('resetIfSchemaChanged', () => {
  it('バージョンが一致していれば初期化しない', () => {
    localStorage.setItem(KEYS.version, String(SCHEMA_VERSION))
    localStorage.setItem(KEYS.pulls, '[1]')
    expect(resetIfSchemaChanged()).toBe(false)
    expect(localStorage.getItem(KEYS.pulls)).toBe('[1]')
  })

  it('バージョンが違えばアプリのデータを消し、true を返す', () => {
    localStorage.setItem(KEYS.version, '0')
    localStorage.setItem(KEYS.pulls, '[1]')
    localStorage.setItem(KEYS.profile, '{}')
    expect(resetIfSchemaChanged()).toBe(true)
    expect(localStorage.getItem(KEYS.pulls)).toBeNull()
    expect(localStorage.getItem(KEYS.profile)).toBeNull()
    expect(localStorage.getItem(KEYS.version)).toBe(String(SCHEMA_VERSION))
  })

  it('初回（バージョン未記録）は初期化扱いにしない', () => {
    expect(resetIfSchemaChanged()).toBe(false)
    expect(localStorage.getItem(KEYS.version)).toBe(String(SCHEMA_VERSION))
  })
})

describe('localStorage が使えない環境', () => {
  it('書き込みが例外を投げても落ちず、同一セッション内では読み戻せる', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    const profile = loadProfile()
    saveProfile({ ...profile, lastDrawnAt: '2026-10-24T00:00:00.000Z' })
    expect(loadProfile().lastDrawnAt).toBe('2026-10-24T00:00:00.000Z')
  })
})
```

- [ ] **Step 2: 失敗するテストを書く（pulls）**

`src/storage/pullStore.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { addPull, loadPulls, setMissionDone } from './pullStore'
import type { Pull } from '../domain/types'

function pull(id: string, townId: string): Pull {
  return {
    id,
    memberId: 'member-1',
    townId,
    pulledAt: '2026-10-24T00:00:00.000Z',
    missions: [
      { kind: 'unique', genericMissionId: null, done: false },
      { kind: 'generic', genericMissionId: 'g1', done: false },
      { kind: 'generic', genericMissionId: 'g2', done: false },
    ],
  }
}

beforeEach(() => localStorage.clear())

describe('pullStore', () => {
  it('初回は空配列', () => {
    expect(loadPulls()).toEqual([])
  })

  it('追加した pull を読み戻せる', () => {
    addPull(pull('p1', 'town-a'))
    expect(loadPulls().map((p) => p.id)).toEqual(['p1'])
  })

  it('同じ町を2回引いたら pull は2件になる（別の旅として扱う）', () => {
    addPull(pull('p1', 'town-a'))
    addPull(pull('p2', 'town-a'))
    const pulls = loadPulls()
    expect(pulls).toHaveLength(2)
    expect(pulls.map((p) => p.townId)).toEqual(['town-a', 'town-a'])
  })

  it('新しい pull が先頭に来る（新しい順）', () => {
    addPull(pull('p1', 'town-a'))
    addPull(pull('p2', 'town-b'))
    expect(loadPulls().map((p) => p.id)).toEqual(['p2', 'p1'])
  })

  it('ミッションの達成状況を切り替えられる', () => {
    addPull(pull('p1', 'town-a'))
    setMissionDone('p1', 1, true)
    expect(loadPulls()[0].missions[1].done).toBe(true)
    setMissionDone('p1', 1, false)
    expect(loadPulls()[0].missions[1].done).toBe(false)
  })

  it('他のミッションには影響しない', () => {
    addPull(pull('p1', 'town-a'))
    setMissionDone('p1', 0, true)
    const missions = loadPulls()[0].missions
    expect(missions.map((m) => m.done)).toEqual([true, false, false])
  })

  it('存在しない pull や範囲外の index は無視する', () => {
    addPull(pull('p1', 'town-a'))
    expect(() => setMissionDone('missing', 0, true)).not.toThrow()
    expect(() => setMissionDone('p1', 99, true)).not.toThrow()
    expect(loadPulls()[0].missions.every((m) => !m.done)).toBe(true)
  })

  it('壊れたJSONが入っていても空配列を返す', () => {
    localStorage.setItem('tabi-gacha:pulls', 'not json')
    expect(loadPulls()).toEqual([])
  })
})
```

- [ ] **Step 3: テストが失敗することを確認する**

Run: `npx vitest run src/storage`
期待：両ファイル FAIL（モジュールが存在しない）

- [ ] **Step 4: 実装する**

`src/storage/schema.ts`:

```ts
export const SCHEMA_VERSION = 1

export const KEYS = {
  version: 'tabi-gacha:schemaVersion',
  profile: 'tabi-gacha:profile',
  pulls: 'tabi-gacha:pulls',
  demo: 'tabi-gacha:demo',
} as const

/**
 * localStorage が書けない環境（プライベートブラウズ等）のための退避先。
 * セッション内だけ生き残る。アプリを起動不能にしないことが目的。
 */
const memory = new Map<string, string>()

function getItem(key: string): string | null {
  try {
    const value = localStorage.getItem(key)
    if (value !== null) return value
  } catch {
    // localStorage に触れない環境
  }
  return memory.get(key) ?? null
}

function setItem(key: string, value: string): boolean {
  memory.set(key, value)
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

function removeItem(key: string): void {
  memory.delete(key)
  try {
    localStorage.removeItem(key)
  } catch {
    // 無視する
  }
}

export function isStorageAvailable(): boolean {
  try {
    const probe = 'tabi-gacha:probe'
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

export function readJson<T>(key: string, fallback: T): T {
  const raw = getItem(key)
  if (raw === null) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown): boolean {
  return setItem(key, JSON.stringify(value))
}

/**
 * スキーマが変わっていたらアプリのデータを消す（仕様 13）。
 * 初期化した場合は true を返し、画面側がその事実を利用者に伝える。
 * 初回起動（バージョン未記録）は初期化扱いにしない。
 */
export function resetIfSchemaChanged(): boolean {
  const stored = getItem(KEYS.version)
  if (stored === String(SCHEMA_VERSION)) return false

  const isFirstRun = stored === null
  if (!isFirstRun) {
    removeItem(KEYS.profile)
    removeItem(KEYS.pulls)
    removeItem(KEYS.demo)
  }
  setItem(KEYS.version, String(SCHEMA_VERSION))
  return !isFirstRun
}

export function newId(): string {
  const cryptoObj = globalThis.crypto
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID()
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
```

`src/storage/profileStore.ts`:

```ts
import type { Profile } from '../domain/types'
import { KEYS, SCHEMA_VERSION, newId, readJson, writeJson } from './schema'

function isProfile(value: unknown): value is Profile {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Profile).memberId === 'string' &&
    (value as Profile).memberId.length > 0
  )
}

/** profile を読む。無い・壊れている場合は member_id を発行して新規作成する */
export function loadProfile(): Profile {
  const stored = readJson<unknown>(KEYS.profile, null)
  if (isProfile(stored)) return stored

  const created: Profile = {
    memberId: newId(),
    lastDrawnAt: null,
    schemaVersion: SCHEMA_VERSION,
  }
  writeJson(KEYS.profile, created)
  return created
}

export function saveProfile(profile: Profile): void {
  writeJson(KEYS.profile, profile)
}

/** 引いた日時を記録する（1日1回の判定に使う） */
export function recordDraw(now: Date): Profile {
  const next: Profile = { ...loadProfile(), lastDrawnAt: now.toISOString() }
  saveProfile(next)
  return next
}
```

`src/storage/pullStore.ts`:

```ts
import type { Pull } from '../domain/types'
import { KEYS, readJson, writeJson } from './schema'

/** 新しい順に並んだ pulls を返す */
export function loadPulls(): Pull[] {
  const stored = readJson<unknown>(KEYS.pulls, [])
  return Array.isArray(stored) ? (stored as Pull[]) : []
}

function save(pulls: Pull[]): Pull[] {
  writeJson(KEYS.pulls, pulls)
  return pulls
}

/** 先頭に追加する（同じ町でも別レコードとして積む） */
export function addPull(pull: Pull): Pull[] {
  return save([pull, ...loadPulls()])
}

/** ミッションの達成状況を切り替える。存在しない指定は黙って無視する */
export function setMissionDone(pullId: string, index: number, done: boolean): Pull[] {
  const pulls = loadPulls().map((pull) => {
    if (pull.id !== pullId) return pull
    if (index < 0 || index >= pull.missions.length) return pull
    const missions = pull.missions.map((m, i) => (i === index ? { ...m, done } : m))
    return { ...pull, missions }
  })
  return save(pulls)
}
```

- [ ] **Step 5: テストが通ることを確認する**

Run: `npx vitest run src/storage`
期待：PASS（全16件）

- [ ] **Step 6: Commit**

```bash
git add src/storage
git commit -m "feat(storage): profile と pulls の永続化層（member_id・スキーマ版・書き込み不可時の退避）"
```

---

### Task 8: 町データ骨格の生成スクリプト

**Files:**
- Create: `scripts/skeleton.logic.ts`, `scripts/buildSkeleton.ts`
- Create: `scripts/raw/.gitkeep`
- Test: `scripts/skeleton.logic.test.ts`

**Interfaces:**
- Consumes: `Region`, `Town`, `Rarity`（Task 2）, `rarityForPopulation`（Task 2）
- Produces:
  - `regionForPrefecture(prefecture: string): Region | null`
  - `parsePopulation(raw: string): number | null`
  - `parseCsv(text: string): Record<string, string>[]`
  - `isExcludedName(name: string): boolean`
  - `const MIN_POPULATION = 100`
  - `buildSkeletonTown(row: { code: string; prefecture: string; name: string; population: string }): Town | null`
  - `curate(towns: Town[], perRegionPerRarity: number, rng: Rng): Town[]`

**入力データ:** `scripts/raw/towns.csv` に投入済み。確認した内容は次のとおり。

| 項目 | 実測 |
|---|---|
| 行数 | 2,226行（ヘッダを除く） |
| 列 | `code,prefecture,name,population` |
| 文字コード | UTF-8（BOMなし） |
| 改行 | CRLF（`parseCsv` が `/\r?\n/` で分割するので問題なし） |
| `code` | **6桁**（末尾が検査数字）。`normalizeRow` で5桁に落とす |
| 都道府県名 | 47件すべて地方に割り当て可能（表記ゆれなし） |
| 集計行 | 含まれない |
| 人口のパース失敗 | 0件 |

フィルタを通した結果の実測値：

- 除外：「区」で終わる **194件**（うち人口10万人未満が **33件** ―― 千代田区 69,139人を含む）／人口10万人以上 **261件**／人口100人未満 **6件**（北方領土の6村、すべて人口0）
- **出題候補：1,765件**（SSR 199 / SR 411 / R 575 / N 580）
- 最小人口は東京都青ヶ島村 155人、最大は大阪府泉佐野市 99,623人
- **8地方 × 4レア度の32セルすべてが10件以上**あるため、`curate(towns, 10, rng)` で **320件**がちょうど取れる

**座標の列はない。** 目的地はGoogleマップに地名で渡すため（仕様 6.1）、落とすデータセットは人口の1つだけで足りる。

- [ ] **Step 1: 失敗するテストを書く**

`scripts/skeleton.logic.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  buildSkeletonTown,
  curate,
  parseCsv,
  parsePopulation,
  regionForPrefecture,
} from './skeleton.logic'
import type { Rarity, Town } from '../src/domain/types'

describe('regionForPrefecture', () => {
  it.each([
    ['北海道', '北海道'],
    ['青森県', '東北'],
    ['福島県', '東北'],
    ['東京都', '関東'],
    ['神奈川県', '関東'],
    ['新潟県', '中部'],
    ['愛知県', '中部'],
    ['三重県', '近畿'],
    ['大阪府', '近畿'],
    ['島根県', '中国'],
    ['高知県', '四国'],
    ['沖縄県', '九州沖縄'],
  ])('%s は %s', (prefecture, region) => {
    expect(regionForPrefecture(prefecture)).toBe(region)
  })

  it('47都道府県すべてが地方に割り当てられる', () => {
    const prefectures = [
      '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
      '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
      '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県',
      '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
      '鳥取県', '島根県', '岡山県', '広島県', '山口県',
      '徳島県', '香川県', '愛媛県', '高知県',
      '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
    ]
    expect(prefectures).toHaveLength(47)
    for (const p of prefectures) {
      expect(regionForPrefecture(p), p).not.toBeNull()
    }
  })

  it('知らない表記は null', () => {
    expect(regionForPrefecture('架空県')).toBeNull()
  })
})

describe('parsePopulation', () => {
  it('桁区切りのカンマを除いて数値にする', () => {
    expect(parsePopulation('2,840')).toBe(2840)
    expect(parsePopulation('123456')).toBe(123456)
  })

  it('前後の空白を無視する', () => {
    expect(parsePopulation('  5000 ')).toBe(5000)
  })

  it('数値でなければ null', () => {
    expect(parsePopulation('')).toBeNull()
    expect(parsePopulation('-')).toBeNull()
    expect(parsePopulation('不明')).toBeNull()
  })
})

describe('parseCsv', () => {
  it('ヘッダを使ってレコードの配列にする', () => {
    const text = 'code,name\n01101,札幌市\n32386,奥出雲町\n'
    expect(parseCsv(text)).toEqual([
      { code: '01101', name: '札幌市' },
      { code: '32386', name: '奥出雲町' },
    ])
  })

  it('空行を飛ばす', () => {
    expect(parseCsv('a,b\n1,2\n\n3,4\n')).toHaveLength(2)
  })
})

describe('buildSkeletonTown', () => {
  const row = {
    code: '32386', prefecture: '島根県', name: '奥出雲町',
    population: '11,500',
  }

  it('骨格を組み立てる。未生成なので enriched は false', () => {
    const town = buildSkeletonTown(row)
    expect(town).toEqual({
      id: '32386',
      name: '奥出雲町',
      prefecture: '島根県',
      region: '中国',
      population: 11500,
      rarity: 'R',
      tags: [],
      uniqueMission: '',
      accessTips: '',
      enriched: false,
    })
  })

  it('人口10万人以上は対象外なので null', () => {
    expect(buildSkeletonTown({ ...row, population: '100000' })).toBeNull()
    expect(buildSkeletonTown({ ...row, population: '1,973,000' })).toBeNull()
  })

  it('特別区・行政区は人口が10万人未満でも除外する', () => {
    // 千代田区は人口10万人未満だが、都心の一区画なので出してはならない
    expect(buildSkeletonTown({
      ...row, prefecture: '東京都', name: '千代田区', population: '66,000',
    })).toBeNull()
    expect(buildSkeletonTown({
      ...row, prefecture: '大阪府', name: '浪速区', population: '74,000',
    })).toBeNull()
  })

  it('「区」で終わらない町村は除外しない', () => {
    expect(buildSkeletonTown({ ...row, name: '奥出雲町' })).not.toBeNull()
  })

  it('人口100人未満は除外する（人口0の村が一覧に含まれることがある）', () => {
    expect(buildSkeletonTown({ ...row, population: '0' })).toBeNull()
    expect(buildSkeletonTown({ ...row, population: '99' })).toBeNull()
    expect(buildSkeletonTown({ ...row, population: '100' })).not.toBeNull()
  })

  it('人口・都道府県が読めない行は null', () => {
    expect(buildSkeletonTown({ ...row, population: '不明' })).toBeNull()
    expect(buildSkeletonTown({ ...row, prefecture: '架空県' })).toBeNull()
  })
})

describe('curate', () => {
  function town(id: string, region: Town['region'], rarity: Rarity): Town {
    return {
      id, name: `${id}町`, prefecture: 'X県', region,
      population: 5000, rarity,
      tags: [], uniqueMission: '', accessTips: '', enriched: false,
    }
  }
  const rng = () => 0

  it('地方×レア度ごとに上限件数まで取る', () => {
    const towns = [
      town('a1', '中国', 'SSR'), town('a2', '中国', 'SSR'), town('a3', '中国', 'SSR'),
      town('b1', '東北', 'SSR'),
    ]
    const got = curate(towns, 2, rng)
    expect(got.filter((t) => t.region === '中国')).toHaveLength(2)
    expect(got.filter((t) => t.region === '東北')).toHaveLength(1)
  })

  it('候補が上限より少なければあるだけ取る', () => {
    expect(curate([town('x', '四国', 'N')], 5, rng)).toHaveLength(1)
  })

  it('全レア度・全地方から取る（偏らない）', () => {
    const towns = [
      town('s', '九州沖縄', 'SSR'), town('r', '九州沖縄', 'SR'),
      town('c', '九州沖縄', 'R'), town('n', '九州沖縄', 'N'),
    ]
    const got = curate(towns, 1, rng)
    expect(new Set(got.map((t) => t.rarity))).toEqual(new Set(['SSR', 'SR', 'R', 'N']))
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx vitest run scripts/skeleton.logic.test.ts`
期待：FAIL（`./skeleton.logic` が存在しない）

- [ ] **Step 3: 実装する**

`scripts/skeleton.logic.ts`:

```ts
import type { Rng } from '../src/domain/draw'
import { rarityForPopulation } from '../src/domain/rarity'
import { REGIONS, type Rarity, type Region, type Town } from '../src/domain/types'

const PREFECTURE_TO_REGION: Record<string, Region> = {
  北海道: '北海道',
  青森県: '東北', 岩手県: '東北', 宮城県: '東北', 秋田県: '東北', 山形県: '東北', 福島県: '東北',
  茨城県: '関東', 栃木県: '関東', 群馬県: '関東', 埼玉県: '関東', 千葉県: '関東',
  東京都: '関東', 神奈川県: '関東',
  新潟県: '中部', 富山県: '中部', 石川県: '中部', 福井県: '中部', 山梨県: '中部',
  長野県: '中部', 岐阜県: '中部', 静岡県: '中部', 愛知県: '中部',
  三重県: '近畿', 滋賀県: '近畿', 京都府: '近畿', 大阪府: '近畿', 兵庫県: '近畿',
  奈良県: '近畿', 和歌山県: '近畿',
  鳥取県: '中国', 島根県: '中国', 岡山県: '中国', 広島県: '中国', 山口県: '中国',
  徳島県: '四国', 香川県: '四国', 愛媛県: '四国', 高知県: '四国',
  福岡県: '九州沖縄', 佐賀県: '九州沖縄', 長崎県: '九州沖縄', 熊本県: '九州沖縄',
  大分県: '九州沖縄', 宮崎県: '九州沖縄', 鹿児島県: '九州沖縄', 沖縄県: '九州沖縄',
}

/** 三重県は近畿に入れる（仕様4.4の8区分に合わせた割り振り） */
export function regionForPrefecture(prefecture: string): Region | null {
  return PREFECTURE_TO_REGION[prefecture.trim()] ?? null
}

/** 人口0のまま一覧に残る自治体（北方領土の村など）を落とすための下限 */
export const MIN_POPULATION = 100

/**
 * 出題対象から外す名称か。
 * 市町村で「区」で終わるのは特別区（東京23区）と政令市の行政区だけなので、
 * この条件だけで両方を確実に落とせる（仕様 4.1）。
 */
export function isExcludedName(name: string): boolean {
  return name.trim().endsWith('区')
}

export function parsePopulation(raw: string): number | null {
  const normalized = raw.trim().replace(/,/g, '')
  if (!/^\d+$/.test(normalized)) return null
  return Number(normalized)
}

/** 引用符を含まない単純なCSVを前提にしたパーサ */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '')
  if (lines.length === 0) return []
  const headers = lines[0].split(',').map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const cells = line.split(',')
    const row: Record<string, string> = {}
    headers.forEach((header, i) => {
      row[header] = (cells[i] ?? '').trim()
    })
    return row
  })
}

export function buildSkeletonTown(row: {
  code: string
  prefecture: string
  name: string
  population: string
}): Town | null {
  const region = regionForPrefecture(row.prefecture)
  if (!region) return null

  if (isExcludedName(row.name)) return null // 特別区・行政区

  const population = parsePopulation(row.population)
  if (population === null) return null
  if (population < MIN_POPULATION) return null // 人口0のまま残る自治体

  const rarity = rarityForPopulation(population)
  if (!rarity) return null // 人口10万人以上は出題対象外

  return {
    id: row.code.trim(),
    name: row.name.trim(),
    prefecture: row.prefecture.trim(),
    region,
    population,
    rarity,
    tags: [],
    uniqueMission: '',
    accessTips: '',
    enriched: false,
  }
}

const ALL_RARITIES: Rarity[] = ['SSR', 'SR', 'R', 'N']

/**
 * 地方×レア度ごとに上限件数まで抽出する（仕様 11.3）。
 * 均等に取るのは、地方モードで候補が少なく同じ町ばかり出るのを防ぐため。
 */
export function curate(towns: Town[], perRegionPerRarity: number, rng: Rng): Town[] {
  const picked: Town[] = []
  for (const region of REGIONS) {
    for (const rarity of ALL_RARITIES) {
      const candidates = towns.filter((t) => t.region === region && t.rarity === rarity)
      const shuffled = shuffle(candidates, rng)
      picked.push(...shuffled.slice(0, perRegionPerRarity))
    }
  }
  return picked
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(Math.floor(rng() * (i + 1)), i)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
```

`scripts/buildSkeleton.ts`:

```ts
/**
 * scripts/raw/towns.csv から骨格の towns.json を作る。
 * 使い方: npx tsx scripts/buildSkeleton.ts [1地方1レア度あたりの件数]
 *
 * 投入済みの実データの形（確認済み）：
 * - 文字コード UTF-8（BOMなし）、改行 CRLF、2,226行
 * - 列名 code,prefecture,name,population
 * - code は6桁（末尾が検査数字）なので5桁に落とす
 * - 都道府県名は47件すべて「北海道」「青森県」…の表記で、地方への割り当てに漏れなし
 * - 集計行（全国計・都道府県計）は含まれない
 *
 * 別のデータに差し替えた場合は、下の normalizeRow を直す。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { buildSkeletonTown, curate, parseCsv } from './skeleton.logic'

const INPUT = 'scripts/raw/towns.csv'
const OUTPUT = 'public/data/towns.json'

function normalizeRow(row: Record<string, string>) {
  return {
    // 6桁コードの末尾は検査数字。5桁に落として自治体コードとして使う
    code: row.code.length === 6 ? row.code.slice(0, 5) : row.code,
    prefecture: row.prefecture,
    name: row.name,
    population: row.population,
  }
}

const perRegionPerRarity = Number(process.argv[2] ?? '10')

const rows = parseCsv(readFileSync(INPUT, 'utf8'))
const all = rows.map((row) => buildSkeletonTown(normalizeRow(row))).filter((t) => t !== null)
const selected = curate(all, perRegionPerRarity, Math.random)

writeFileSync(OUTPUT, JSON.stringify(selected, null, 2) + '\n', 'utf8')

console.log(`読み込み: ${rows.length} 行`)
console.log(`対象（10万人未満）: ${all.length} 件`)
console.log(`キュレート後: ${selected.length} 件 → ${OUTPUT}`)
```

`tsx` を開発依存に追加する：

```bash
npm install -D tsx
mkdir -p scripts/raw public/data
touch scripts/raw/.gitkeep
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npx vitest run scripts/skeleton.logic.test.ts`
期待：PASS（全13件）

- [ ] **Step 5: Commit**

```bash
git add scripts package.json package-lock.json
git commit -m "feat(scripts): 町データ骨格の生成（都道府県→地方・レア度付与・キュレート）"
```

---

### Task 9: 町データの検証スクリプト

**Files:**
- Modify: `src/domain/types.ts`（`TOWN_TAGS` を追加）
- Create: `scripts/validateTowns.ts`
- Test: `scripts/validateTowns.test.ts`

**Interfaces:**
- Consumes: `Town`, `GenericMission`（Task 2）
- Produces:
  - `const TOWN_TAGS: readonly string[]`（`src/domain/types.ts`）
  - `type ValidationError = { townId: string; field: string; message: string }`
  - `validateTowns(towns: unknown, genericMissions: GenericMission[]): ValidationError[]`

**このタスクの位置づけ:** APIの構造化出力を使わない選択の代償を埋める中核（仕様 11.2）。生成物が仕様から外れていたらテストが落ちる状態を作る。

- [ ] **Step 1: `TOWN_TAGS` を `src/domain/types.ts` に追加する**

既存の `REGIONS` の下に追記する：

```ts
/**
 * 汎用ミッションの成立条件に使える語彙。これ以外のタグは検証で弾く（仕様 5.2）。
 * タグは「その町に固定の性質」に限る。季節で変わるもの（積雪など）は入れない
 * ―― 夏に引いた人に冬のミッションが出てしまうため。季節の事情は accessTips 側に書く。
 */
export const TOWN_TAGS = [
  '海沿い',
  '山間',
  '温泉あり',
  '鉄道駅なし',
  '離島',
  '城下町',
  '湖畔',
] as const
```

- [ ] **Step 2: 失敗するテストを書く**

`scripts/validateTowns.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { validateTowns } from './validateTowns'
import type { GenericMission, Town } from '../src/domain/types'

const GENERICS: GenericMission[] = [
  { id: 'g1', text: '地元の人に話しかけて、おすすめを一つ聞く', requiredTags: [] },
]

function town(over: Partial<Town> = {}): Town {
  return {
    id: '32386',
    name: '奥出雲町',
    prefecture: '島根県',
    region: '中国',
    population: 11500,
    rarity: 'R',
    tags: ['山間'],
    uniqueMission: 'たたら製鉄の跡をひとつ訪ねて、鉄と水の関係を確かめる',
    accessTips: '最寄りは木次駅だが町域は広く、駅から先はバスの本数が少ない。車での移動が無難で、冬は積雪に備えたい。',
    enriched: true,
    ...over,
  }
}

function fieldsOf(errors: { field: string }[]) {
  return errors.map((e) => e.field)
}

describe('validateTowns', () => {
  it('正しいデータならエラーなし', () => {
    expect(validateTowns([town()], GENERICS)).toEqual([])
  })

  it('配列でなければエラー', () => {
    expect(validateTowns({}, GENERICS)).toHaveLength(1)
  })

  it('必須フィールドの欠落を検出する', () => {
    const broken = { ...town(), name: '' }
    expect(fieldsOf(validateTowns([broken], GENERICS))).toContain('name')
  })

  it('idの重複を検出する', () => {
    expect(fieldsOf(validateTowns([town(), town()], GENERICS))).toContain('id')
  })

  it('語彙にないタグを検出する', () => {
    expect(fieldsOf(validateTowns([town({ tags: ['絶景'] })], GENERICS))).toContain('tags')
  })

  it('タグの重複を検出する', () => {
    expect(fieldsOf(validateTowns([town({ tags: ['山間', '山間'] })], GENERICS))).toContain('tags')
  })

  it('人口10万人以上を検出する', () => {
    expect(fieldsOf(validateTowns([town({ population: 100000 })], GENERICS))).toContain('population')
  })

  it('特別区・行政区を検出する', () => {
    expect(fieldsOf(validateTowns([town({ name: '千代田区' })], GENERICS))).toContain('name')
  })

  it('人口が小さすぎる行を検出する', () => {
    expect(fieldsOf(validateTowns([town({ population: 0, rarity: 'SSR' })], GENERICS))).toContain('population')
  })

  it('人口とレア度の不整合を検出する', () => {
    expect(fieldsOf(validateTowns([town({ population: 2000 })], GENERICS))).toContain('rarity')
  })

  it('固有ミッションが短すぎる／長すぎる場合を検出する', () => {
    expect(fieldsOf(validateTowns([town({ uniqueMission: '歩く' })], GENERICS))).toContain('uniqueMission')
    expect(fieldsOf(validateTowns([town({ uniqueMission: 'あ'.repeat(81) })], GENERICS))).toContain('uniqueMission')
  })

  it('固有ミッションが汎用プールと同じ文面なら検出する', () => {
    const same = town({ uniqueMission: GENERICS[0].text })
    expect(fieldsOf(validateTowns([same], GENERICS))).toContain('uniqueMission')
  })

  it('固有ミッションが汎用的な言い回しなら検出する', () => {
    const generic = town({ uniqueMission: '地元の人に話しかけて、何かおすすめを聞いてみる' })
    expect(fieldsOf(validateTowns([generic], GENERICS))).toContain('uniqueMission')
  })

  it('行き方のコツが出発地に依存していたら検出する（仕様 6.2）', () => {
    const cases = [
      '東京から約3時間。最寄りは木次駅で、駅から先はバスが少ない。車が無難である。',
      '都心からは半日みておきたい。最寄りは木次駅で、駅から先はバスが少ない。',
      '大阪から高速バスで向かうのが早い。最寄りは木次駅で、バスの本数は少ない。',
    ]
    for (const accessTips of cases) {
      expect(fieldsOf(validateTowns([town({ accessTips })], GENERICS)), accessTips).toContain('accessTips')
    }
  })

  it('行き方のコツが短すぎる場合を検出する', () => {
    expect(fieldsOf(validateTowns([town({ accessTips: '駅から遠い' })], GENERICS))).toContain('accessTips')
  })

  it('enriched: false の町は文面が空でも許す（未生成なので）', () => {
    const skeleton = town({ enriched: false, uniqueMission: '', accessTips: '', tags: [] })
    expect(validateTowns([skeleton], GENERICS)).toEqual([])
  })

  it('enriched: true なのに文面が空なら検出する', () => {
    const half = town({ uniqueMission: '', accessTips: '' })
    const fields = fieldsOf(validateTowns([half], GENERICS))
    expect(fields).toContain('uniqueMission')
    expect(fields).toContain('accessTips')
  })
})
```

- [ ] **Step 3: テストが失敗することを確認する**

Run: `npx vitest run scripts/validateTowns.test.ts`
期待：FAIL（`./validateTowns` が存在しない）

- [ ] **Step 4: 実装する**

`scripts/validateTowns.ts`:

```ts
import { MAX_POPULATION, rarityForPopulation } from '../src/domain/rarity'
import { REGIONS, TOWN_TAGS, type GenericMission, type Region, type Town } from '../src/domain/types'

export type ValidationError = { townId: string; field: string; message: string }

/** 出発地に依存する表現。事前生成の文面に混ざってはならない（仕様 6.2） */
const ORIGIN_DEPENDENT = [
  '東京から', '東京より', '都心から', '大阪から', '名古屋から', '新宿から',
  '羽田から', '首都圏から', '関西から',
]

/** 固有ミッションに現れてはならない汎用的な言い回し */
const TOO_GENERIC = [
  '地元の人に話しかけ',
  '名前を知らない店',
  '商店街を歩く',
  'おすすめを聞く',
]

export function validateTowns(towns: unknown, genericMissions: GenericMission[]): ValidationError[] {
  if (!Array.isArray(towns)) {
    return [{ townId: '-', field: 'root', message: 'towns.json の中身が配列ではない' }]
  }

  const errors: ValidationError[] = []
  const seenIds = new Set<string>()

  for (const raw of towns) {
    const town = raw as Town
    const id = typeof town?.id === 'string' && town.id !== '' ? town.id : '(id不明)'
    const push = (field: string, message: string) => errors.push({ townId: id, field, message })

    if (typeof town?.id !== 'string' || town.id === '') push('id', 'id が空')
    else if (seenIds.has(town.id)) push('id', `id が重複している: ${town.id}`)
    else seenIds.add(town.id)

    if (typeof town?.name !== 'string' || town.name === '') push('name', '町名が空')
    else if (town.name.endsWith('区')) push('name', `特別区・行政区は出題対象外: ${town.name}`)
    if (typeof town?.prefecture !== 'string' || town.prefecture === '') push('prefecture', '都道府県が空')
    if (!REGIONS.includes(town?.region as Region)) push('region', `地方が不正: ${String(town?.region)}`)

    if (typeof town?.population !== 'number' || !Number.isFinite(town.population)) {
      push('population', '人口が数値でない')
    } else if (town.population >= MAX_POPULATION) {
      push('population', `人口10万人以上は出題対象外: ${town.population}`)
    } else if (town.population < 100) {
      push('population', `人口が小さすぎる（実在しない自治体の可能性）: ${town.population}`)
    } else if (rarityForPopulation(town.population) !== town.rarity) {
      push('rarity', `人口 ${town.population} に対してレア度 ${town.rarity} が不整合`)
    }

    if (!Array.isArray(town?.tags)) {
      push('tags', 'tags が配列でない')
    } else {
      for (const tag of town.tags) {
        if (!TOWN_TAGS.includes(tag as never)) push('tags', `語彙にないタグ: ${tag}`)
      }
      if (new Set(town.tags).size !== town.tags.length) push('tags', 'tags が重複している')
    }

    if (town?.enriched !== true) {
      // 未生成の町は文面が空で構わない
      continue
    }

    const mission = typeof town.uniqueMission === 'string' ? town.uniqueMission.trim() : ''
    if (mission.length < 12 || mission.length > 80) {
      push('uniqueMission', `固有ミッションの長さが範囲外(12〜80): ${mission.length}文字`)
    }
    if (genericMissions.some((g) => g.text.trim() === mission)) {
      push('uniqueMission', '固有ミッションが汎用プールと同一の文面')
    }
    for (const phrase of TOO_GENERIC) {
      if (mission.includes(phrase)) {
        push('uniqueMission', `固有ミッションが汎用的すぎる表現を含む: ${phrase}`)
      }
    }

    const tips = typeof town.accessTips === 'string' ? town.accessTips.trim() : ''
    if (tips.length < 20 || tips.length > 200) {
      push('accessTips', `行き方のコツの長さが範囲外(20〜200): ${tips.length}文字`)
    }
    for (const phrase of ORIGIN_DEPENDENT) {
      if (tips.includes(phrase)) {
        push('accessTips', `出発地に依存する表現を含む（仕様6.2違反）: ${phrase}`)
      }
    }
  }

  return errors
}
```

- [ ] **Step 5: テストが通ることを確認する**

Run: `npx vitest run scripts/validateTowns.test.ts`
期待：PASS（全17件）

- [ ] **Step 6: 実データを検証するテストを追加する**

`scripts/data.test.ts` を作る。生成物が無い段階ではスキップし、投入後は自動で効くようにする：

```ts
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { validateTowns } from './validateTowns'
import type { GenericMission } from '../src/domain/types'

const TOWNS = 'public/data/towns.json'
const GENERICS = 'public/data/generic-missions.json'

describe('public/data の実データ', () => {
  it.runIf(existsSync(TOWNS) && existsSync(GENERICS))('検証を通る', () => {
    const towns = JSON.parse(readFileSync(TOWNS, 'utf8'))
    const generics = JSON.parse(readFileSync(GENERICS, 'utf8')) as GenericMission[]
    const errors = validateTowns(towns, generics)
    expect(errors, JSON.stringify(errors.slice(0, 20), null, 2)).toEqual([])
  })

  it.runIf(existsSync(GENERICS))('汎用プールに条件なしのミッションが3つ以上ある', () => {
    const generics = JSON.parse(readFileSync(GENERICS, 'utf8')) as GenericMission[]
    const unconditional = generics.filter((m) => m.requiredTags.length === 0)
    expect(unconditional.length).toBeGreaterThanOrEqual(3)
  })
})
```

Run: `npx vitest run scripts/data.test.ts`
期待：PASS（データ未投入ならスキップ表示）

- [ ] **Step 7: Commit**

```bash
git add src/domain/types.ts scripts/validateTowns.ts scripts/validateTowns.test.ts scripts/data.test.ts
git commit -m "feat(scripts): 町データの検証（タグ語彙・レア度整合・出発地依存表現の禁止）"
```

---

### Task 10: 実データの投入とミッション生成

**Files:**
- Create: `scripts/raw/towns.csv`（ダウンロードしたデータ）
- Create: `scripts/prompts/town-enrichment.md`
- Create: `public/data/towns.json`, `public/data/generic-missions.json`

**Interfaces:**
- Consumes: `buildSkeleton.ts`（Task 8）, `validateTowns`（Task 9）
- Produces: 検証を通る `public/data/towns.json`（約300件、`enriched: true`）と `public/data/generic-missions.json`（30〜50件）

**このタスクは手作業が主体で、自動テストは Task 9 の `scripts/data.test.ts` が担う。**

> **Step 1〜3 は必ずひと続きで行う。** いずれもe-Statを開いている間の作業であり、ライセンス表示と出典表記の形式はダウンロードボタンと同じページに書かれている。**ブラウザのタブを閉じる前に Step 3 まで終わらせる。** 閉じてしまうと、該当ページを探し直すことになる。
>
> また、ライセンス次第で**落とすデータセット自体を変える**必要が出るため（非商用表示、申請が必要、など）、Step 2 はダウンロードより先か同時に行う。後から確認すると作業が巻き戻る。

- [ ] **Step 1: 市区町村別人口のデータを用意する**

**落とすファイルは1つだけ。** 座標は不要（目的地はGoogleマップに地名で渡すため。仕様 6.1）。

e-Stat の「住民基本台帳に基づく人口、人口動態及び世帯数調査」から、**市区町村別**の最新年のファイルを落とす。

- 一覧ページ：<https://www.e-stat.go.jp/stat-search/files?toukei=00200241&tstat=000001039591>
- 最新年を選び、地域区分が「市区町村」のファイルを選ぶ
- **提供形式はExcelのみ**（CSVは用意されていない）。落としたExcelを開き、「CSV UTF-8」で保存し直す

保存し直したCSVを、次の4列に整えて `scripts/raw/towns.csv` とする。列名はこの通りにする。

```
code,prefecture,name,population
32386,島根県,奥出雲町,11500
```

手で整えて構わない（この工程の再現性より、正しいデータが入っていることを優先する）。整えるときの注意：

- **`code` は文字列として扱う。** Excelで開くと `01101` が `1101` になる。先頭のゼロを保つこと
- **`code` は5桁に揃える。** 6桁（末尾が検査数字）で提供されている場合は末尾を落とす
- **人口は1つの区分に統一する。** 「日本人住民」と「総数」を混在させない

- [ ] **Step 2: ダウンロードするデータセットのライセンスを個別に確認する**

**ライセンスの書かれている場所は配布元によって違う。** ここを間違えると見つからない。

- **e-Stat**：データセットごとの表示は**ない**。サイト全体で1つの利用規約が適用される（フッターの「利用規約」リンク、<https://www.e-stat.go.jp/terms-of-use>）。**今回使うのはこちら。`scripts/raw/README.md` にライセンス部分を記入済みなので、確認作業は不要**
- **国土数値情報など**：データセットごとに表示が異なる。「オープンデータ（CC BY 4.0）」「商用可／非商用」の個別表示があり、測量法に基づく承認が必要なものもある（実例：市区町村役場データは `P05` が CC BY 4.0 だが、`P34` は非商用のみ）。**別のデータセットを足す場合は、そのページで確認する**

e-Stat 以外のデータを追加する場合に限り、そのページで次を確認し、`scripts/raw/README.md` に書き写す：

1. ライセンスの表示（PDL1.0 / CC BY 4.0 / 商用可 / 非商用 のいずれか）
2. 求められている**出典表記の形式**（そのまま転記する）
3. **改変した旨の明記**が必要か
4. 申請・承認が必要と書かれていないか

求められている形式が計画の文面と違っていた場合は、**規約側の形式に合わせる**（`src/data/sources.ts` を直す）。

> **今回のデータは厳密には著作権の対象外。** e-Statの規約には「数値データ、簡単な表・グラフ等は著作権の対象ではありませんので、これらについては本利用ルールの適用はなく、自由に利用できます」とある。本アプリが使うのは市区町村名と人口の数値なのでこの例外に当たり、**出典表記は法的な義務ではない**。それでも表記するのは、実データを使っている裏付けになること、AI生成文と統計データを同じ画面に並べるためどこまでが公的な数字かを示す必要があることの2点による（仕様 11.5）。

**迷ったら CC BY 4.0 か政府標準利用規約のデータセットを選ぶ。** 「非商用」表示のものや申請が必要なものは、公開URLで配るこのアプリでは判断が面倒になるため、最初から避けるのが早い。同種のデータが複数提供されていることが多く、乗り換えのコストは低い。

- [ ] **Step 3: 出典を記録する**

`scripts/raw/README.md` は**ライセンス部分を記入済み**。埋めるのは次の4つだけ（いずれも検証スクリプトでは検出できない情報なので、ここが唯一の記録になる）：

- 落としたファイル名
- **年次**
- **人口の区分**（日本人住民のみ／外国人を含む総数）
- 取得日

> 以下は記入済みの `scripts/raw/README.md` の構成。新規に書く場合の参考：

```markdown
# 元データ

## 人口・市区町村一覧
- データセット名：（例）住民基本台帳に基づく人口、人口動態及び世帯数
- 公表元：総務省
- 年次：（例）2026年1月1日現在
- 人口の区分：（例）日本人住民＋外国人住民の総数
- 取得元URL：
- 取得日：2026-10-24

## ライセンス
- （例）政府標準利用規約（第2.0版）／CC BY 4.0 互換
- 求められている出典表記の形式：（規約ページから転記）
- 申請・承認の要否：（例）不要

## 加工した内容
- ExcelをCSV UTF-8 に変換し、code/prefecture/name/population の4列に整形
- 人口10万人以上、名称が「区」で終わる行、人口100人未満の行を除外
- 人口からレア度を機械的に付与

## 座標を取得していない理由
Googleマップの目的地は「都道府県名＋市区町村名」のテキストで指定しているため、
緯度経度を持つ必要がない（仕様 6.1）。
```

続けて `src/data/sources.ts` を作る。**アプリに表示する文面はここだけに持つ**：

```ts
export type DataSource = {
  label: string
  publisher: string
  url: string
  /** 改変した旨の明記が必要なライセンス（PDL1.0 等）の場合に true */
  noteModified: boolean
}

/**
 * アプリ内に表示する出典（仕様 11.5）。
 * オープンデータの利用規約上、表記は義務。実際に使用したデータセットに合わせて書き換える。
 */
export const DATA_SOURCES: DataSource[] = [
  {
    label: '政府統計の総合窓口（e-Stat）',
    publisher: '総務省',
    url: 'https://www.e-stat.go.jp/',
    noteModified: false,
  },
]

/**
 * AI生成部分の断り書き。政府の利用規約は「国が作成したかのように見せる」ことを
 * 禁じているため、統計データとAI生成文を同じ画面に出す本アプリでは必須（仕様 11.5）。
 */
export const AI_DISCLAIMER =
  'ミッションと行き方のコツは、上記の統計をもとにAIが生成した文章です。公的機関の見解ではありません。'
```

> `url` は取得元のページURLを入れる。空のままにしない。`noteModified` が `true` の出典は「〜をもとに作成」の形で表示する（PDL1.0 が改変の明記を求めているため）。

- [ ] **Step 4: 骨格を生成する**

```bash
npx tsx scripts/buildSkeleton.ts 10
```

期待：`public/data/towns.json` が作られ、コンソールに次が出る（実データで確認済みの数値）。

```
読み込み: 2226 行
対象（10万人未満）: 1765 件
キュレート後: 320 件 → public/data/towns.json
```

**この3つの数字が合わなければ、変換のどこかで取りこぼしている。** 特に「対象」が 1,765 より大幅に少ない場合は、`code` の桁数処理か都道府県名の読み替えを疑う。

- [ ] **Step 5: 汎用ミッションプールを作る**

`public/data/generic-missions.json` を作る。**条件なしを必ず3つ以上含める**（Task 5 の補完が成立しなくなるため）。タグは `TOWN_TAGS` の語彙だけを使う。

```json
[
  { "id": "g-talk", "text": "地元の人に話しかけて、おすすめを一つ聞く", "requiredTags": [] },
  { "id": "g-shop", "text": "名前を知らない店に入って、何か一つ買う", "requiredTags": [] },
  { "id": "g-walk", "text": "地図を見ずに15分歩いて、気になったものを写真に撮る", "requiredTags": [] },
  { "id": "g-eat", "text": "その土地のもので昼食をとる", "requiredTags": [] },
  { "id": "g-sea", "text": "海が見える場所まで行って、黄昏る", "requiredTags": ["海沿い"] },
  { "id": "g-onsen", "text": "温泉に入って、疲れを取る", "requiredTags": ["温泉あり"] },
  { "id": "g-mountain", "text": "いちばん高く見える場所まで登ってみる", "requiredTags": ["山間"] },
  { "id": "g-nostation", "text": "路線バスに乗って、ひとつ先の集落まで行く", "requiredTags": ["鉄道駅なし"] }
]
```

残りはClaude Codeに案を出させ、**人が選別して**30〜50件にする。選別の基準は「その場で実行できるか」「お金がかかりすぎないか」「失礼にならないか」。

- [ ] **Step 6: 生成の指示文を書く**

`scripts/prompts/town-enrichment.md` を作る。この文面が再現性の担保（仕様 11.2 代償2）なので、内容を省略せずに書く：

```markdown
# 町データの補完（固有ミッション・行き方のコツ・タグ）

渡されたJSON配列の各町について、`uniqueMission` `accessTips` `tags` を埋めて、
同じ構造のJSON配列として返してください。他のフィールドは変更しないこと。

## uniqueMission（固有ミッション）

- その町でしか成立しないミッションを1つ。12〜80文字
- その町の産業・地形・歴史・特産品に根ざした具体的なものにする
- 「地元の人に話しかける」「商店街を歩く」のような、どこでも成立する内容は不可
- 存在が確かでない施設名・店名を書かない。断定を避け、確かめに行く形にする
- 入場料や予約が必要なものは避ける

## accessTips（行き方のコツ）

- 20〜200文字
- **出発地に依存する表現を書かない。** 「東京から3時間」「都心から」「大阪から」は禁止。
  利用者がどこから来るかは不明である
- 書くのは、その町に固定の事情だけ：最寄り駅、駅から先の交通手段、
  バスの本数の傾向、レンタカーの要否、季節の注意（積雪・航路の欠航など）
- 本数や時刻の具体的な数字は書かない（誤りやすい）。「少ない」「限られる」と書く

## tags

次の語彙からのみ、当てはまるものを選ぶ（0個でもよい）。重複させない。

`海沿い` `山間` `温泉あり` `鉄道駅なし` `離島` `城下町` `湖畔`

## 出力

入力と同じ順序・同じ件数のJSON配列のみ。説明文を付けない。
`enriched` は `true` に変更すること。
```

- [ ] **Step 7: 30〜50件ずつに分けて生成する**

`public/data/towns.json` から未生成（`enriched: false`）の町を30〜50件取り出し、`scripts/prompts/town-enrichment.md` の指示とともにClaude Codeに渡して埋めてもらう。返ってきた内容を `towns.json` の該当要素に反映する。これを全件分繰り返す。

**1回ごとに検証を回す**（まとめて最後にやらない）：

```bash
npx vitest run scripts/data.test.ts
```

- [ ] **Step 8: 検証を通すまで直す**

検証エラーが出たら、該当する町の文面を直す。特に次が出やすい：
- `accessTips` に「東京から」等が混ざる → その一文を削る
- `uniqueMission` が汎用的すぎる → その町の固有名詞や産業に寄せて書き直す
- `tags` に語彙外の語が入る → `TOWN_TAGS` に寄せる

- [ ] **Step 9: 目視で通し読みする**

全件を流し読みし、明らかに誤っている記述（存在しない施設、他の町の話）を直す。これが事前生成を選んだ理由（仕様 11.4）なので省略しない。

- [ ] **Step 10: 全テストが通ることを確認する**

Run: `npm test`
期待：PASS（`scripts/data.test.ts` がスキップではなく実行され、通る）

- [ ] **Step 11: Commit**

```bash
git add scripts/raw scripts/prompts public/data
git commit -m "data: 約300件の町データと汎用ミッションプールを投入"
```

---

### Task 11: ガチャを引いてカードが出るまで

**Files:**
- Create: `src/domain/createPull.ts`, `src/storage/demoStore.ts`, `src/data/loadGameData.ts`, `src/state/useGame.ts`
- Create: `src/features/gacha/HomeScreen.tsx`, `src/features/gacha/PoolNotice.tsx`
- Modify: `src/App.tsx`
- Test: `src/domain/createPull.test.ts`

**Interfaces:**
- Consumes: `poolFor`/`DrawMode`（Task 3）, `drawTown`/`Rng`（Task 4）, `drawGenericMissions`/`buildPulledMissions`（Task 5）, `canDraw`（Task 6）, `totalPoints`（Task 6）, `rankFor`（Task 6）, ストア一式（Task 7）
- Produces:
  - `createPull(args: { pool: Town[]; generics: GenericMission[]; rng: Rng; memberId: string; now: Date; newId: () => string; forcedRarity?: Rarity }): Pull | null`
  - `type DemoSettings = { unlimited: boolean; forcedRarity: Rarity | null; fakeOrigin: { lat: number; lng: number } | null }`
  - `loadDemo(): DemoSettings`、`saveDemo(settings: DemoSettings): void`
  - `loadGameData(): Promise<{ towns: Town[]; genericMissions: GenericMission[] }>`
  - `useGame()`（下の実装で返す値がそのままインターフェース）

**このタスクが「1日目の終わりに町が出る」状態をつくる。計画上もっとも重要なタスク。**

- [ ] **Step 1: 失敗するテストを書く**

`src/domain/createPull.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createPull } from './createPull'
import type { GenericMission, Town } from './types'

function town(id: string, rarity: Town['rarity'], tags: string[] = []): Town {
  return {
    id, name: `${id}町`, prefecture: '島根県', region: '中国',
    population: 5000, rarity,
    tags, uniqueMission: '固有ミッション', accessTips: 'コツ', enriched: true,
  }
}

const GENERICS: GenericMission[] = [
  { id: 'g1', text: 'どこでも1', requiredTags: [] },
  { id: 'g2', text: 'どこでも2', requiredTags: [] },
  { id: 'g3', text: '海の町だけ', requiredTags: ['海沿い'] },
]

const base = {
  generics: GENERICS,
  rng: () => 0,
  memberId: 'member-1',
  now: new Date('2026-10-24T06:00:00.000Z'),
  newId: () => 'pull-1',
}

describe('createPull', () => {
  it('ミッション3枚（固有1＋汎用2）の pull を作る', () => {
    const pull = createPull({ ...base, pool: [town('a', 'N')] })
    expect(pull).not.toBeNull()
    expect(pull!.id).toBe('pull-1')
    expect(pull!.memberId).toBe('member-1')
    expect(pull!.townId).toBe('a')
    expect(pull!.pulledAt).toBe('2026-10-24T06:00:00.000Z')
    expect(pull!.missions).toHaveLength(3)
    expect(pull!.missions[0].kind).toBe('unique')
    expect(pull!.missions.slice(1).every((m) => m.kind === 'generic')).toBe(true)
    expect(pull!.missions.every((m) => !m.done)).toBe(true)
  })

  it('町のタグで成立しない汎用ミッションは入らない', () => {
    const pull = createPull({ ...base, pool: [town('a', 'N', [])] })
    const ids = pull!.missions.map((m) => m.genericMissionId)
    expect(ids).not.toContain('g3')
  })

  it('タグを満たせば条件付きの汎用ミッションも候補に入る', () => {
    const pull = createPull({ ...base, pool: [town('a', 'N', ['海沿い'])], rng: () => 0.99 })
    const ids = pull!.missions.map((m) => m.genericMissionId).filter(Boolean)
    expect(ids).toHaveLength(2)
  })

  it('forcedRarity を渡すとそのレア度の町が出る', () => {
    const pool = [town('n', 'N'), town('ssr', 'SSR')]
    expect(createPull({ ...base, pool, forcedRarity: 'SSR' })!.townId).toBe('ssr')
  })

  it('プールが空なら null', () => {
    expect(createPull({ ...base, pool: [] })).toBeNull()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx vitest run src/domain/createPull.test.ts`
期待：FAIL（`createPull` が存在しない）

- [ ] **Step 3: `createPull` を実装する**

`src/domain/createPull.ts`:

```ts
import { drawTown, type Rng } from './draw'
import { buildPulledMissions, drawGenericMissions } from './missions'
import type { GenericMission, Pull, Rarity, Town } from './types'

/** 町を1つ引き、ミッション3枚（固有1＋汎用2）を組み立てて pull にする */
export function createPull(args: {
  pool: Town[]
  generics: GenericMission[]
  rng: Rng
  memberId: string
  now: Date
  newId: () => string
  forcedRarity?: Rarity
}): Pull | null {
  const town = drawTown(args.pool, args.rng, args.forcedRarity)
  if (!town) return null

  const generics = drawGenericMissions(args.generics, town.tags, args.rng)

  return {
    id: args.newId(),
    memberId: args.memberId,
    townId: town.id,
    pulledAt: args.now.toISOString(),
    missions: buildPulledMissions(generics),
  }
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npx vitest run src/domain/createPull.test.ts`
期待：PASS（全5件）

- [ ] **Step 5: デモ設定のストアとデータ読み込みを作る**

`src/storage/demoStore.ts`:

```ts
import type { Rarity } from '../domain/types'
import { KEYS, readJson, writeJson } from './schema'

export type DemoSettings = {
  unlimited: boolean
  forcedRarity: Rarity | null
  fakeOrigin: { lat: number; lng: number } | null
}

export const DEMO_DEFAULTS: DemoSettings = {
  unlimited: false,
  forcedRarity: null,
  fakeOrigin: null,
}

export function loadDemo(): DemoSettings {
  const stored = readJson<Partial<DemoSettings>>(KEYS.demo, {})
  return { ...DEMO_DEFAULTS, ...stored }
}

export function saveDemo(settings: DemoSettings): void {
  writeJson(KEYS.demo, settings)
}
```

`src/data/loadGameData.ts`:

```ts
import type { GenericMission, Town } from '../domain/types'

export async function loadGameData(): Promise<{ towns: Town[]; genericMissions: GenericMission[] }> {
  const [townsRes, missionsRes] = await Promise.all([
    fetch(`${import.meta.env.BASE_URL}data/towns.json`),
    fetch(`${import.meta.env.BASE_URL}data/generic-missions.json`),
  ])
  if (!townsRes.ok || !missionsRes.ok) throw new Error('町データの読み込みに失敗しました')
  return {
    towns: (await townsRes.json()) as Town[],
    genericMissions: (await missionsRes.json()) as GenericMission[],
  }
}
```

- [ ] **Step 6: アプリ状態をまとめる**

`src/state/useGame.ts`:

```ts
import { useCallback, useEffect, useMemo, useState } from 'react'
import { canDraw } from '../domain/drawLimit'
import { createPull } from '../domain/createPull'
import { poolFor, type DrawMode } from '../domain/pool'
import { rankFor } from '../domain/rank'
import { totalPoints } from '../domain/points'
import type { GenericMission, Pull, Town } from '../domain/types'
import { loadGameData } from '../data/loadGameData'
import { loadDemo, saveDemo, type DemoSettings } from '../storage/demoStore'
import { loadProfile, recordDraw } from '../storage/profileStore'
import { addPull, loadPulls, setMissionDone } from '../storage/pullStore'
import { newId, resetIfSchemaChanged } from '../storage/schema'

export function useGame() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [towns, setTowns] = useState<Town[]>([])
  const [generics, setGenerics] = useState<GenericMission[]>([])
  const [pulls, setPulls] = useState<Pull[]>([])
  // 初期化の判定を最初に走らせる。profile より後に置くと、読み込んだ直後の
  // profile を消してしまい、画面と保存内容がずれる
  const [wasReset] = useState(() => resetIfSchemaChanged())
  const [profile, setProfile] = useState(() => loadProfile())
  const [demo, setDemo] = useState<DemoSettings>(() => loadDemo())

  useEffect(() => {
    setPulls(loadPulls())
    loadGameData()
      .then(({ towns, genericMissions }) => {
        setTowns(towns)
        setGenerics(genericMissions)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  const townById = useCallback(
    (id: string) => towns.find((t) => t.id === id),
    [towns],
  )

  const total = useMemo(() => totalPoints(pulls, townById), [pulls, townById])
  const rank = useMemo(() => rankFor(total), [total])
  const canDrawNow = canDraw(profile.lastDrawnAt, new Date(), demo.unlimited)

  const draw = useCallback(
    (mode: DrawMode): Pull | null => {
      if (!canDrawNow) return null
      const pool = poolFor(towns, mode)
      const pull = createPull({
        pool,
        generics,
        rng: Math.random,
        memberId: profile.memberId,
        now: new Date(),
        newId,
        forcedRarity: demo.forcedRarity ?? undefined,
      })
      if (!pull) return null
      setPulls(addPull(pull))
      setProfile(recordDraw(new Date()))
      return pull
    },
    [canDrawNow, towns, generics, profile.memberId, demo.forcedRarity],
  )

  const toggleMission = useCallback((pullId: string, index: number, done: boolean) => {
    setPulls(setMissionDone(pullId, index, done))
  }, [])

  const updateDemo = useCallback((next: DemoSettings) => {
    saveDemo(next)
    setDemo(next)
  }, [])

  return {
    status, towns, generics, pulls, profile, demo, wasReset,
    total, rank, canDrawNow, townById,
    draw, toggleMission, updateDemo,
  }
}
```

- [ ] **Step 7: 注釈コンポーネントを作る（仕様 4.6）**

`src/features/gacha/PoolNotice.tsx`。**文面は仕様4.6のとおりに書く**（言い換えない）：

```tsx
import { useState } from 'react'
import { RARITY_WEIGHTS } from '../../domain/rarity'
import type { Rarity } from '../../domain/types'

const POPULATION_LABEL: Record<Rarity, string> = {
  SSR: '3,000人未満',
  SR: '3,000〜1万人',
  R: '1万〜3万人',
  N: '3万〜10万人',
}

export function PoolNotice() {
  const [open, setOpen] = useState(false)
  return (
    <section className="mt-6 border-t border-stone-200 pt-4 text-xs text-stone-500">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-start justify-between gap-2 text-left"
      >
        <span>有名な街は入っていません ― 出るのは人口10万人未満の市町村だけ</span>
        <span className="shrink-0">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3 leading-relaxed">
          <p>
            旅ガチャには、人口10万人未満の市町村だけが入っています。知名度の高い街をあらかじめ外すことで、何を引いても「行ったことのない町」になるようにしました。
          </p>
          <p>
            そして、人口が少ない町ほどレアに出ます。このガチャでは<strong className="text-stone-700">無名であることが価値</strong>です。
          </p>
          <table className="w-full text-left">
            <thead className="text-stone-400">
              <tr><th className="py-1">レア度</th><th className="py-1">人口</th><th className="py-1">排出率</th></tr>
            </thead>
            <tbody>
              {(['SSR', 'SR', 'R', 'N'] as Rarity[]).map((r) => (
                <tr key={r} className="border-t border-stone-100">
                  <td className="py-1 font-bold text-stone-700">{r}</td>
                  <td className="py-1">{POPULATION_LABEL[r]}</td>
                  <td className="py-1">{RARITY_WEIGHTS[r]}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 8: ホーム画面を作る**

`src/features/gacha/HomeScreen.tsx`:

```tsx
import { useState } from 'react'
import type { DrawMode } from '../../domain/pool'
import { REGIONS, type Region } from '../../domain/types'
import { PoolNotice } from './PoolNotice'

export function HomeScreen({
  canDraw,
  rankTitle,
  total,
  onDraw,
}: {
  canDraw: boolean
  rankTitle: string
  total: number
  onDraw: (mode: DrawMode) => void
}) {
  const [region, setRegion] = useState<Region | 'all'>('all')
  const mode: DrawMode = region === 'all' ? { kind: 'nationwide' } : { kind: 'region', region }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <label className="mb-6 block">
        <span className="mb-1 block text-xs text-stone-500">どこから引く</span>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value as Region | 'all')}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
        >
          <option value="all">全国</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </label>

      <button
        onClick={() => onDraw(mode)}
        disabled={!canDraw}
        className="mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-stone-900 text-xl font-bold text-white disabled:bg-stone-300"
      >
        引く
      </button>

      <p className="mt-6 text-center text-sm text-stone-500">
        {canDraw ? '今日はまだ引けます' : '今日はもう引きました'}
        <span className="mx-2">·</span>
        {rankTitle}（{total}pt）
      </p>

      <PoolNotice />
    </div>
  )
}
```

- [ ] **Step 9: `App.tsx` を差し替えて配線する**

```tsx
import { useState } from 'react'
import type { DrawMode } from './domain/pool'
import type { Pull } from './domain/types'
import { useGame } from './state/useGame'
import { HomeScreen } from './features/gacha/HomeScreen'
import { Layout } from './ui/Layout'
import { TabBar, type TabId } from './ui/TabBar'

export default function App() {
  const game = useGame()
  const [tab, setTab] = useState<TabId>('gacha')
  const [lastPull, setLastPull] = useState<Pull | null>(null)

  function handleDraw(mode: DrawMode) {
    const pull = game.draw(mode)
    if (pull) setLastPull(pull)
  }

  return (
    <Layout>
      <header className="px-4 pt-6 md:px-8">
        <h1 className="text-2xl font-bold tracking-tight">旅ガチャ</h1>
        <TabBar active={tab} onChange={setTab} />
      </header>

      <main className="flex flex-1 flex-col px-4 pb-24 md:px-8 md:pb-8">
        {game.wasReset && (
          <p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            保存形式が変わったため、これまでのデータを初期化しました。
          </p>
        )}

        {game.status === 'loading' && <p className="text-stone-400">読み込み中…</p>}
        {game.status === 'error' && (
          <p className="text-red-600">町データの読み込みに失敗しました。再読み込みしてください。</p>
        )}

        {game.status === 'ready' && tab === 'gacha' && (
          <>
            <HomeScreen
              canDraw={game.canDrawNow}
              rankTitle={game.rank.title}
              total={game.total}
              onDraw={handleDraw}
            />
            {lastPull && (
              <pre className="mt-4 overflow-x-auto rounded bg-stone-100 p-2 text-xs">
                {JSON.stringify(
                  { town: game.townById(lastPull.townId)?.name, missions: lastPull.missions.length },
                  null,
                  2,
                )}
              </pre>
            )}
          </>
        )}

        {game.status === 'ready' && tab === 'collection' && (
          <p className="text-stone-400">コレクション（Task 14）</p>
        )}
        {game.status === 'ready' && tab === 'profile' && (
          <p className="text-stone-400">プロフィール（Task 15）</p>
        )}
      </main>
    </Layout>
  )
}
```

> 引いた結果の `pre` 表示は Task 12 でカード詳細に置き換える足場。Task 12 の冒頭で削除する。

`HomeScreen` を `mx-auto max-w-md` で包んでいるのは、広い画面でガチャボタンと注釈が横に伸び切らないようにするため（仕様 9.1「本文の行長を制限する」）。

- [ ] **Step 10: 手動確認する**

```bash
npm run dev
```

1. 「引く」を押すと、町名が `pre` に表示される
2. もう一度押しても引けない（ボタンが無効）
3. ブラウザのリロード後も引けないまま（`localStorage` に残っている）
4. 地方を選んで引くと、その地方の町が出る（開発中は `localStorage` を消して繰り返す）
5. 注釈の1行が常時見えており、押すとレア度表まで開く
6. 幅 1280px でガチャボタンと注釈が横に伸び切らず、中央に収まっている

- [ ] **Step 11: Commit**

```bash
git add src/domain/createPull.ts src/domain/createPull.test.ts src/storage/demoStore.ts src/data src/state src/features/gacha src/App.tsx
git commit -m "feat(gacha): 引くと町が出る（抽選・1日1回・注釈）"
```

---

### Task 12: カード詳細とミッション達成

**Files:**
- Create: `src/domain/missionText.ts`, `src/features/card/CardDetail.tsx`, `src/features/card/MissionList.tsx`, `src/ui/RarityBadge.tsx`
- Modify: `src/App.tsx`
- Test: `src/domain/missionText.test.ts`

**Interfaces:**
- Consumes: `Pull`, `PulledMission`, `Town`, `GenericMission`（Task 2）, `pointsForPull`（Task 6）, `toggleMission`（Task 11）
- Produces:
  - `resolveMissionText(mission: PulledMission, town: Town, generics: GenericMission[]): string`
  - `CardDetail`（props: `{ pull, town, generics, onToggle, onBack }`）

- [ ] **Step 1: 失敗するテストを書く**

`src/domain/missionText.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { resolveMissionText } from './missionText'
import type { GenericMission, PulledMission, Town } from './types'

const town: Town = {
  id: 'a', name: '奥出雲町', prefecture: '島根県', region: '中国',
  population: 11500, rarity: 'R',
  tags: [], uniqueMission: 'たたら製鉄の跡をひとつ訪ねる', accessTips: 'コツ', enriched: true,
}

const generics: GenericMission[] = [{ id: 'g1', text: '地元の人に話しかける', requiredTags: [] }]

describe('resolveMissionText', () => {
  it('固有ミッションは町の文面を返す', () => {
    const m: PulledMission = { kind: 'unique', genericMissionId: null, done: false }
    expect(resolveMissionText(m, town, generics)).toBe('たたら製鉄の跡をひとつ訪ねる')
  })

  it('汎用ミッションはプールから文面を引く', () => {
    const m: PulledMission = { kind: 'generic', genericMissionId: 'g1', done: false }
    expect(resolveMissionText(m, town, generics)).toBe('地元の人に話しかける')
  })

  it('プールに無いIDでも落ちず、代わりの文面を返す', () => {
    const m: PulledMission = { kind: 'generic', genericMissionId: 'gone', done: false }
    expect(resolveMissionText(m, town, generics)).toBe('（このミッションは読み込めませんでした）')
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx vitest run src/domain/missionText.test.ts`
期待：FAIL（`resolveMissionText` が存在しない）

- [ ] **Step 3: 実装する**

`src/domain/missionText.ts`:

```ts
import type { GenericMission, PulledMission, Town } from './types'

/** ミッションの表示文面を解決する。固有は町から、汎用はプールから引く */
export function resolveMissionText(
  mission: PulledMission,
  town: Town,
  generics: GenericMission[],
): string {
  if (mission.kind === 'unique') return town.uniqueMission
  const found = generics.find((g) => g.id === mission.genericMissionId)
  return found?.text ?? '（このミッションは読み込めませんでした）'
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npx vitest run src/domain/missionText.test.ts`
期待：PASS（全3件）

- [ ] **Step 5: レア度バッジとミッション一覧を作る**

`src/ui/RarityBadge.tsx`:

```tsx
import type { Rarity } from '../domain/types'

const STYLE: Record<Rarity, string> = {
  SSR: 'bg-amber-400 text-amber-950',
  SR: 'bg-violet-400 text-violet-950',
  R: 'bg-sky-400 text-sky-950',
  N: 'bg-stone-300 text-stone-700',
}

export function RarityBadge({ rarity }: { rarity: Rarity }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-bold ${STYLE[rarity]}`}>{rarity}</span>
  )
}
```

`src/features/card/MissionList.tsx`:

```tsx
import { resolveMissionText } from '../../domain/missionText'
import type { GenericMission, Pull, Town } from '../../domain/types'

export function MissionList({
  pull,
  town,
  generics,
  onToggle,
}: {
  pull: Pull
  town: Town
  generics: GenericMission[]
  onToggle: (index: number, done: boolean) => void
}) {
  return (
    <ul className="space-y-2">
      {pull.missions.map((mission, index) => (
        <li key={index}>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={mission.done}
              onChange={(e) => onToggle(index, e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0"
            />
            <span className={mission.done ? 'text-stone-400 line-through' : ''}>
              {mission.kind === 'unique' && (
                <span className="mr-1 rounded bg-stone-900 px-1 text-[10px] text-white">固有</span>
              )}
              {resolveMissionText(mission, town, generics)}
            </span>
          </label>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 6: カード詳細を作る**

`src/features/card/CardDetail.tsx`。**ガチャ結果とコレクションから開いた場合で同じものを使う**（仕様 9）：

```tsx
import { pointsForPull } from '../../domain/points'
import type { GenericMission, Pull, Town } from '../../domain/types'
import { RarityBadge } from '../../ui/RarityBadge'
import { MissionList } from './MissionList'

export function CardDetail({
  pull,
  town,
  generics,
  onToggle,
  onBack,
}: {
  pull: Pull
  town: Town
  generics: GenericMission[]
  onToggle: (index: number, done: boolean) => void
  onBack: () => void
}) {
  const earned = pointsForPull(town.rarity, pull.missions)

  return (
    <article className="flex flex-1 flex-col">
      <button onClick={onBack} className="mb-4 self-start text-sm text-stone-500">
        ← 戻る
      </button>

      <div className="flex items-center gap-2">
        <RarityBadge rarity={town.rarity} />
        <h2 className="text-xl font-bold">{town.name}</h2>
        <span className="text-sm text-stone-500">{town.prefecture}</span>
      </div>

      <p className="mt-1 text-xs text-stone-500">
        人口 {town.population.toLocaleString()}人
        {town.tags.map((tag) => (
          <span key={tag} className="ml-1 rounded bg-stone-100 px-1">{tag}</span>
        ))}
      </p>

      {/* 広い画面では「ミッション」と「行き方＋写真」を左右に並べる（仕様 9.1）。
          Task 13 の AccessSection と Task 16 の PhotoSection をこの中に足す */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:gap-8">
        <section>
          <h3 className="mb-2 text-sm font-bold">ミッション</h3>
          <MissionList pull={pull} town={town} generics={generics} onToggle={onToggle} />
          <p className="mt-2 text-xs text-stone-500">獲得 {earned}pt</p>
        </section>
      </div>
    </article>
  )
}
```

- [ ] **Step 7: `App.tsx` に組み込む**

Task 11 で置いた `pre` のデバッグ表示を削除し、`lastPull` があればカード詳細を出す。`tab === 'gacha'` の分岐を次に置き換える：

```tsx
{game.status === 'ready' && tab === 'gacha' && (
  lastPull && game.townById(lastPull.townId) ? (
    <CardDetail
      pull={game.pulls.find((p) => p.id === lastPull.id) ?? lastPull}
      town={game.townById(lastPull.townId)!}
      generics={game.generics}
      onToggle={(index, done) => game.toggleMission(lastPull.id, index, done)}
      onBack={() => setLastPull(null)}
    />
  ) : (
    <HomeScreen
      canDraw={game.canDrawNow}
      rankTitle={game.rank.title}
      total={game.total}
      onDraw={handleDraw}
    />
  )
)}
```

`import { CardDetail } from './features/card/CardDetail'` を追加する。

> `game.pulls.find(...)` で取り直しているのは、チェックの変更を反映した最新の `pull` を表示するため。`lastPull` は古いスナップショットなので、表示には使わない。

- [ ] **Step 8: 手動確認する**

1. 引くとカード詳細が出る。レア度・町名・都道府県・人口・タグが表示される
2. ミッションが3枚あり、1枚目に「固有」バッジが付いている
3. チェックを入れると取り消し線が付き、「獲得 Npt」が増える
4. チェックを外すとポイントが戻る
5. 「戻る」でホームに帰り、ホームの累計ポイントとランクが更新されている
6. リロードしてもチェック状態が残っている
7. 幅 1280px でミッションが左の列に収まり、右の列が空いている（Task 13・16 でここが埋まる）

- [ ] **Step 9: Commit**

```bash
git add src/domain/missionText.ts src/domain/missionText.test.ts src/features/card src/ui/RarityBadge.tsx src/App.tsx
git commit -m "feat(card): カード詳細とミッション達成（ポイント反映）"
```

---

### Task 13: 行き方（現在地・説明・手入力・経路ボタン）

**Files:**
- Create: `src/location/useOrigin.ts`, `src/location/LocationPrompt.tsx`, `src/features/card/AccessSection.tsx`
- Modify: `src/features/card/CardDetail.tsx`
- Test: なし（`routeUrl` は Task 6 でテスト済み。ここはブラウザAPIの配線なので手動確認）

**Interfaces:**
- Consumes: `routeUrl`/`Origin`（Task 6）, `DemoSettings.fakeOrigin`（Task 11）
- Produces:
  - `useOrigin(fakeOrigin: { lat: number; lng: number } | null)` → `{ origin: Origin, state: 'idle'|'asking'|'granted'|'denied'|'manual', request(): void, setManual(value: string): void, manualValue: string }`
  - `LocationPrompt`（props: `{ onAllow, onSkip }`）
  - `AccessSection`（props: `{ town, fakeOrigin }`）

- [ ] **Step 1: 現在地の取得を実装する**

`src/location/useOrigin.ts`:

```ts
import { useCallback, useState } from 'react'
import type { Origin } from '../maps/routeUrl'

type State = 'idle' | 'asking' | 'granted' | 'denied' | 'manual'

/**
 * 出発地を決める。デモモードの擬装座標が渡されていればそれを優先する。
 * 現在地は経路の出発地にしか使わない（仕様 6.3）。
 */
export function useOrigin(fakeOrigin: { lat: number; lng: number } | null) {
  const [state, setState] = useState<State>('idle')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [manualValue, setManualValue] = useState('')

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState('manual')
      return
    }
    setState('asking')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude })
        setState('granted')
      },
      () => setState('denied'),
      { timeout: 10000 },
    )
  }, [])

  const setManual = useCallback((value: string) => {
    setManualValue(value)
    setState('manual')
  }, [])

  const origin: Origin = fakeOrigin
    ? { kind: 'coords', ...fakeOrigin }
    : coords
      ? { kind: 'coords', ...coords }
      : manualValue.trim() !== ''
        ? { kind: 'text', value: manualValue }
        : null

  return { origin, state, request, setManual, manualValue }
}
```

- [ ] **Step 2: 位置情報の説明を実装する（仕様 6.4）**

`src/location/LocationPrompt.tsx`。**文面は仕様6.4のとおりに書く。「端末の外に一切出ない」と書いてはならない**：

```tsx
export function LocationPrompt({ onAllow, onSkip }: { onAllow: () => void; onSkip: () => void }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm">
      <h4 className="font-bold">現在地を使わせてもらえますか</h4>
      <p className="mt-2 leading-relaxed text-stone-600">
        行き方を調べるときの「出発地」として使います。このアプリにサーバーはないので、現在地がどこかに保存されることはありません。経路を開く操作をしたときだけ、出発地としてGoogleマップに渡されます。
      </p>
      <p className="mt-2 text-stone-600">許可しなくてもガチャは引けます（出発地を手で入力できます）。</p>
      <div className="mt-3 flex gap-2">
        <button onClick={onAllow} className="rounded-lg bg-stone-900 px-4 py-2 text-white">
          現在地を使う
        </button>
        <button onClick={onSkip} className="rounded-lg border border-stone-300 px-4 py-2">
          手で入力する
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 行き方のセクションを実装する**

`src/features/card/AccessSection.tsx`:

```tsx
import { useState } from 'react'
import { routeUrl } from '../../maps/routeUrl'
import type { Town } from '../../domain/types'
import { LocationPrompt } from '../../location/LocationPrompt'
import { useOrigin } from '../../location/useOrigin'

export function AccessSection({
  town,
  fakeOrigin,
}: {
  town: Town
  fakeOrigin: { lat: number; lng: number } | null
}) {
  const { origin, state, request, setManual, manualValue } = useOrigin(fakeOrigin)
  const [promptShown, setPromptShown] = useState(false)

  const needsPrompt = !fakeOrigin && state === 'idle'

  return (
    <section className="border-t border-stone-200 pt-4 lg:border-t-0 lg:pt-0">
      <h3 className="mb-2 text-sm font-bold">行き方のコツ</h3>
      <p className="text-sm leading-relaxed text-stone-700">{town.accessTips}</p>

      <div className="mt-4 space-y-3">
        {needsPrompt && !promptShown && (
          <button
            onClick={() => setPromptShown(true)}
            className="text-sm text-stone-500 underline"
          >
            出発地を設定する
          </button>
        )}

        {needsPrompt && promptShown && (
          <LocationPrompt onAllow={request} onSkip={() => setManual('')} />
        )}

        {state === 'asking' && <p className="text-sm text-stone-400">現在地を取得しています…</p>}

        {(state === 'denied' || state === 'manual') && (
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-stone-500">
              出発地（駅名や市区町村）
              {state === 'denied' && ' ― 現在地が取得できませんでした'}
            </span>
            <input
              value={manualValue}
              onChange={(e) => setManual(e.target.value)}
              placeholder="例：東京駅"
              className="w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
        )}

        {state === 'granted' && <p className="text-sm text-stone-500">現在地を出発地にしています</p>}
        {fakeOrigin && <p className="text-sm text-amber-700">デモモードの擬装座標を出発地にしています</p>}

        <a
          href={routeUrl(`${town.prefecture}${town.name}`, origin)}
          target="_blank"
          rel="noreferrer"
          className="block rounded-lg bg-stone-900 px-4 py-3 text-center text-white"
        >
          Googleマップで経路を開く
        </a>
        {!origin && (
          <p className="text-xs text-stone-400">
            出発地を設定していない場合は、Googleマップ側で出発地を選ぶことになります。
          </p>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: カード詳細に差し込む**

`src/features/card/CardDetail.tsx` の props に `fakeOrigin: { lat: number; lng: number } | null` を追加し、Task 12 で用意した `grid` の中、ミッションのセクションの**次の要素**として `<AccessSection town={town} fakeOrigin={fakeOrigin} />` を置く（`<section>` を並べると `lg` で右の列に入る）。`App.tsx` の `CardDetail` 呼び出しに `fakeOrigin={game.demo.fakeOrigin}` を渡す。

`AccessSection` の `border-t` を `lg:border-t-0` で消しているのは、縦に積むときは区切り線が要るが、左右に並ぶと不要になるため。

- [ ] **Step 5: 手動確認する**

`npm run dev` では `localhost` 扱いで Geolocation が使えるため、ここで確認できる。

1. カード詳細に「行き方のコツ」の文章が出ている
2. 「出発地を設定する」を押すと、仕様6.4の説明文が出る
3. 「現在地を使う」でブラウザの許可ダイアログが出て、許可すると「現在地を出発地にしています」になる
4. 「Googleマップで経路を開く」を押すと、新しいタブでGoogleマップが開き、目的地がその町になっている
5. 許可を拒否すると手入力欄が出る。`東京駅` と入れて経路を開くと、出発地が東京駅になっている
6. 出発地を空のまま経路を開いても、目的地だけのGoogleマップが開く（エラーにならない）
7. 幅 1280px でミッションが左、行き方が右に並ぶ。375px では縦に積まれ、区切り線が出る

- [ ] **Step 6: Commit**

```bash
git add src/location src/features/card
git commit -m "feat(access): 行き方のコツと経路ボタン（現在地の説明・手入力フォールバック）"
```

---

### Task 14: コレクション画面

**Files:**
- Create: `src/domain/sort.ts`, `src/features/collection/CollectionScreen.tsx`, `src/features/collection/CardTile.tsx`
- Modify: `src/App.tsx`
- Test: `src/domain/sort.test.ts`

**Interfaces:**
- Consumes: `Pull`, `Town`（Task 2）, `REGIONS`（Task 2）
- Produces:
  - `type SortKey = 'date' | 'rarity' | 'region'`
  - `sortPulls(pulls: Pull[], key: SortKey, townById: (id: string) => Town | undefined): Pull[]`
  - `CollectionScreen`（props: `{ pulls, townById, onSelect }`）

- [ ] **Step 1: 失敗するテストを書く**

`src/domain/sort.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { sortPulls } from './sort'
import type { Pull, Rarity, Region, Town } from './types'

function town(id: string, rarity: Rarity, region: Region): Town {
  return {
    id, name: `${id}町`, prefecture: 'X県', region,
    population: 5000, rarity,
    tags: [], uniqueMission: 'm', accessTips: 'a', enriched: true,
  }
}

function pull(id: string, townId: string, pulledAt: string): Pull {
  return { id, memberId: 'm', townId, pulledAt, missions: [] }
}

const towns = [
  town('n', 'N', '九州沖縄'),
  town('ssr', 'SSR', '東北'),
  town('r', 'R', '北海道'),
]
const byId = (id: string) => towns.find((t) => t.id === id)

describe('sortPulls', () => {
  const pulls = [
    pull('p1', 'n', '2026-10-20T00:00:00.000Z'),
    pull('p2', 'ssr', '2026-10-22T00:00:00.000Z'),
    pull('p3', 'r', '2026-10-21T00:00:00.000Z'),
  ]

  it('日付は新しい順', () => {
    expect(sortPulls(pulls, 'date', byId).map((p) => p.id)).toEqual(['p2', 'p3', 'p1'])
  })

  it('レア度は SSR → SR → R → N の順', () => {
    expect(sortPulls(pulls, 'rarity', byId).map((p) => p.id)).toEqual(['p2', 'p3', 'p1'])
  })

  it('地方は仕様の並び順（北海道が先、九州沖縄が後）', () => {
    expect(sortPulls(pulls, 'region', byId).map((p) => p.id)).toEqual(['p3', 'p2', 'p1'])
  })

  it('元の配列を書き換えない', () => {
    const original = [...pulls]
    sortPulls(pulls, 'rarity', byId)
    expect(pulls).toEqual(original)
  })

  it('町が見つからない pull は最後に置く', () => {
    const withOrphan = [pull('orphan', 'missing', '2026-10-23T00:00:00.000Z'), ...pulls]
    expect(sortPulls(withOrphan, 'rarity', byId).at(-1)!.id).toBe('orphan')
    expect(sortPulls(withOrphan, 'region', byId).at(-1)!.id).toBe('orphan')
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx vitest run src/domain/sort.test.ts`
期待：FAIL（`sortPulls` が存在しない）

- [ ] **Step 3: 実装する**

`src/domain/sort.ts`:

```ts
import { REGIONS, type Pull, type Rarity, type Town } from './types'

export type SortKey = 'date' | 'rarity' | 'region'

const RARITY_ORDER: Record<Rarity, number> = { SSR: 0, SR: 1, R: 2, N: 3 }

/** 町が見つからない pull を最後に送るための大きな値 */
const LAST = Number.MAX_SAFE_INTEGER

export function sortPulls(
  pulls: Pull[],
  key: SortKey,
  townById: (id: string) => Town | undefined,
): Pull[] {
  const sorted = [...pulls]

  if (key === 'date') {
    return sorted.sort((a, b) => b.pulledAt.localeCompare(a.pulledAt))
  }

  return sorted.sort((a, b) => rankOf(a) - rankOf(b))

  function rankOf(pull: Pull): number {
    const town = townById(pull.townId)
    if (!town) return LAST
    return key === 'rarity' ? RARITY_ORDER[town.rarity] : REGIONS.indexOf(town.region)
  }
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npx vitest run src/domain/sort.test.ts`
期待：PASS（全5件）

- [ ] **Step 5: タイルとコレクション画面を作る**

`src/features/collection/CardTile.tsx`:

```tsx
import type { Pull, Town } from '../../domain/types'
import { RarityBadge } from '../../ui/RarityBadge'

export function CardTile({
  pull,
  town,
  onSelect,
}: {
  pull: Pull
  town: Town
  onSelect: () => void
}) {
  const done = pull.missions.filter((m) => m.done).length
  return (
    <button
      onClick={onSelect}
      className="flex flex-col items-start gap-1 rounded-lg border border-stone-200 p-3 text-left"
    >
      <RarityBadge rarity={town.rarity} />
      <span className="font-bold">{town.name}</span>
      <span className="text-xs text-stone-500">{town.prefecture}</span>
      <span className="text-xs text-stone-400">
        ミッション {done}/{pull.missions.length}
      </span>
    </button>
  )
}
```

`src/features/collection/CollectionScreen.tsx`:

```tsx
import { useState } from 'react'
import { sortPulls, type SortKey } from '../../domain/sort'
import type { Pull, Town } from '../../domain/types'
import { CardTile } from './CardTile'

const LABELS: Record<SortKey, string> = {
  date: '引いた順',
  rarity: 'レア度',
  region: '地方',
}

export function CollectionScreen({
  pulls,
  townById,
  onSelect,
}: {
  pulls: Pull[]
  townById: (id: string) => Town | undefined
  onSelect: (pull: Pull) => void
}) {
  const [key, setKey] = useState<SortKey>('date')

  if (pulls.length === 0) {
    return (
      <p className="mt-10 text-center text-sm text-stone-400">
        まだカードがありません。ガチャを引いてみてください。
      </p>
    )
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(Object.keys(LABELS) as SortKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setKey(k)}
            className={`rounded-full px-3 py-1 text-xs ${
              key === k ? 'bg-stone-900 text-white' : 'border border-stone-300 text-stone-500'
            }`}
          >
            {LABELS[k]}
          </button>
        ))}
      </div>

      {/* 幅に応じて列数を増やす（仕様 9.1） */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {sortPulls(pulls, key, townById).map((pull) => {
          const town = townById(pull.townId)
          if (!town) return null
          return (
            <CardTile key={pull.id} pull={pull} town={town} onSelect={() => onSelect(pull)} />
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: `App.tsx` に組み込む**

`selectedPull` の状態を1つ持ち、ガチャ結果とコレクションの両方から同じ `CardDetail` を開く。`lastPull` を `selectedPull` に統合する：

```tsx
const [selectedPull, setSelectedPull] = useState<Pull | null>(null)

function handleDraw(mode: DrawMode) {
  const pull = game.draw(mode)
  if (pull) setSelectedPull(pull)
}

// 表示部分
const current = selectedPull ? game.pulls.find((p) => p.id === selectedPull.id) ?? selectedPull : null
const currentTown = current ? game.townById(current.townId) : undefined

{game.status === 'ready' && current && currentTown ? (
  <CardDetail
    pull={current}
    town={currentTown}
    generics={game.generics}
    fakeOrigin={game.demo.fakeOrigin}
    onToggle={(index, done) => game.toggleMission(current.id, index, done)}
    onBack={() => setSelectedPull(null)}
  />
) : (
  <>
    {game.status === 'ready' && tab === 'gacha' && (
      <HomeScreen
        canDraw={game.canDrawNow}
        rankTitle={game.rank.title}
        total={game.total}
        onDraw={handleDraw}
      />
    )}
    {game.status === 'ready' && tab === 'collection' && (
      <CollectionScreen pulls={game.pulls} townById={game.townById} onSelect={setSelectedPull} />
    )}
    {game.status === 'ready' && tab === 'profile' && (
      <p className="text-stone-400">プロフィール（Task 15）</p>
    )}
  </>
)}
```

タブを切り替えたらカードを閉じるため、`TabBar` の `onChange` を `(t) => { setSelectedPull(null); setTab(t) }` にする。

- [ ] **Step 7: 手動確認する**

1. コレクションタブに、引いたカードがグリッドで並ぶ
2. 「引いた順 / レア度 / 地方」を押すと並び順が変わる
3. カードを押すとカード詳細が開き、ガチャ直後と同じ見た目になっている
4. そこでチェックを変えて戻ると、タイルの「ミッション n/3」が更新されている
5. カードが0枚のときは空の案内が出る
6. 幅を変えると列数が変わる（375px は2列、768px は3列、1280px は4〜5列）。どの幅でもタイルが潰れない

- [ ] **Step 8: Commit**

```bash
git add src/domain/sort.ts src/domain/sort.test.ts src/features/collection src/App.tsx
git commit -m "feat(collection): カード一覧と並べ替え（カード詳細を共用）"
```

---

### Task 15: プロフィール画面

**Files:**
- Create: `src/features/profile/ProfileScreen.tsx`
- Modify: `src/App.tsx`
- Test: なし（表示のみ。ランクとポイントのロジックは Task 6 でテスト済み）

**Interfaces:**
- Consumes: `rankFor`/`RANKS`（Task 6）, `isStorageAvailable`（Task 7）
- Produces: `ProfileScreen`（props: `{ total, rankTitle, pullCount, demoPanel }`）

**仕様 8.1 と 6.4 の常設注釈をここに置く。文面は仕様のとおりに書く。**

- [ ] **Step 1: 実装する**

`src/features/profile/ProfileScreen.tsx`:

```tsx
import type { ReactNode } from 'react'
import { RANKS, rankFor } from '../../domain/rank'
import { AI_DISCLAIMER, DATA_SOURCES } from '../../data/sources'
import { isStorageAvailable } from '../../storage/schema'

export function ProfileScreen({
  total,
  pullCount,
  demoPanel,
}: {
  total: number
  pullCount: number
  demoPanel: ReactNode
}) {
  const rank = rankFor(total)
  const next = RANKS.find((r) => r.threshold > total)

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs text-stone-500">称号</p>
        <p className="text-2xl font-bold">{rank.title}</p>
        <p className="mt-1 text-sm text-stone-500">
          累計 {total}pt ／ カード {pullCount}枚
        </p>
        {next && (
          <p className="mt-1 text-xs text-stone-400">
            次の称号「{next.title}」まであと {next.threshold - total}pt
          </p>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-bold">称号の一覧</h3>
        <ul className="space-y-1 text-sm">
          {RANKS.map((r) => (
            <li
              key={r.threshold}
              className={r.title === rank.title ? 'font-bold' : 'text-stone-400'}
            >
              {r.threshold}pt — {r.title}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-lg bg-stone-50 p-4 text-xs leading-relaxed text-stone-600">
        <p>
          カードと写真は、この端末の中にだけ保存されます。ブラウザのデータを消すとすべて失われ、別の端末に引き継ぐこともできません。
        </p>
        <p>
          現在地は、行き方を調べるときの「出発地」として使います。このアプリにサーバーはないので、現在地がどこかに保存されることはありません。経路を開く操作をしたときだけ、出発地としてGoogleマップに渡されます。
        </p>
        {!isStorageAvailable() && (
          <p className="font-bold text-amber-700">
            このブラウザでは保存ができません。閉じると引いたカードは失われます。
          </p>
        )}
      </section>

      {/* 出典表記。オープンデータの利用規約上の義務なので省略しない（仕様 11.5） */}
      <section className="text-xs leading-relaxed text-stone-500">
        <h3 className="mb-1 font-bold text-stone-600">データの出典</h3>
        <p>町名・人口のデータは、次の統計を加工して作成しています。</p>
        <ul className="mt-1 space-y-0.5">
          {DATA_SOURCES.map((source) => (
            <li key={source.label}>
              {source.url ? (
                <a href={source.url} target="_blank" rel="noreferrer" className="underline">
                  {source.label}
                </a>
              ) : (
                source.label
              )}
              （{source.publisher}）
              {source.noteModified && 'をもとに作成'}
            </li>
          ))}
        </ul>
        <p className="mt-2">{AI_DISCLAIMER}</p>
      </section>

      {demoPanel}
    </div>
  )
}
```

- [ ] **Step 2: `App.tsx` に組み込む**

`tab === 'profile'` の分岐を次に置き換える（`demoPanel` は Task 17 まで `null`）：

```tsx
{game.status === 'ready' && tab === 'profile' && (
  <ProfileScreen total={game.total} pullCount={game.pulls.length} demoPanel={null} />
)}
```

- [ ] **Step 3: 手動確認する**

1. プロフィールタブに称号・累計ポイント・カード枚数が出る
2. 次の称号までの残りポイントが出る
3. 称号の一覧で現在の称号が太字になっている
4. データ保存と現在地の注釈が両方出ている
5. 注釈に「端末の外に一切出ない」という表現が**無い**ことを目で確認する（仕様 6.4）
6. 「データの出典」が出ており、**各データセットのURLがリンクになっている**（`url` が空だとリンクにならないので、空のまま残っていないかの確認も兼ねる）
7. 出典の下に「ミッションと行き方のコツは…AIが生成した文章です。公的機関の見解ではありません。」が出ている（仕様 11.5）
8. 経路ボタンに**Googleのロゴを使っていない**（文字だけであること。仕様 11.5.1）

- [ ] **Step 4: Commit**

```bash
git add src/features/profile src/App.tsx
git commit -m "feat(profile): 称号・累計ポイントと保存・現在地の常設注釈"
```

---

### Task 16: 写真（IndexedDB）

**Files:**
- Modify: `src/storage/schema.ts`（`KEYS.photoNotice` を追加し、初期化対象に含める）
- Create: `src/storage/photoStore.ts`, `src/features/card/PhotoSection.tsx`
- Modify: `src/features/card/CardDetail.tsx`
- Test: `src/storage/photoStore.test.ts`

**Interfaces:**
- Consumes: `Photo`（Task 2）, `newId`（Task 7）
- Produces:
  - `type PhotoErrorReason = 'unavailable' | 'quota' | 'unknown'`
  - `classifyPhotoError(error: unknown): PhotoErrorReason`
  - `openPhotoDb(): Promise<IDBDatabase | null>`
  - `addPhoto(pullId: string, blob: Blob, now: Date): Promise<{ ok: true; photo: Photo } | { ok: false; reason: PhotoErrorReason }>`
  - `listPhotos(pullId: string): Promise<Photo[]>`
  - `deletePhoto(id: string): Promise<void>`

**このタスクは計画上「切り落とせる」唯一のタスク**（仕様 17）。Task 15 までが終わっていればアプリは完結しているので、時間が足りない場合はここを飛ばして Task 17 に進む。

**Review Focus（このタスクが担当）:** IndexedDBの容量超過（`QuotaExceededError`）で落ちず、「保存できなかった」と伝えること。

- [ ] **Step 1: 失敗するテストを書く**

`src/storage/photoStore.test.ts`:

```ts
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { addPhoto, classifyPhotoError, deletePhoto, listPhotos } from './photoStore'

function blob(text: string): Blob {
  return new Blob([text], { type: 'image/png' })
}

beforeEach(async () => {
  for (const photo of await listPhotos('p1')) await deletePhoto(photo.id)
  for (const photo of await listPhotos('p2')) await deletePhoto(photo.id)
})

describe('classifyPhotoError', () => {
  it('容量超過を quota に分類する', () => {
    expect(classifyPhotoError(new DOMException('full', 'QuotaExceededError'))).toBe('quota')
  })

  it('IndexedDBが開けない場合を unavailable に分類する', () => {
    expect(classifyPhotoError(new DOMException('no', 'InvalidStateError'))).toBe('unavailable')
    expect(classifyPhotoError(new DOMException('no', 'SecurityError'))).toBe('unavailable')
  })

  it('それ以外は unknown', () => {
    expect(classifyPhotoError(new Error('何か'))).toBe('unknown')
    expect(classifyPhotoError(null)).toBe('unknown')
  })
})

describe('photoStore', () => {
  it('写真が無ければ空配列', async () => {
    expect(await listPhotos('p1')).toEqual([])
  })

  it('追加した写真を pull ごとに読み戻せる', async () => {
    const now = new Date('2026-10-24T06:00:00.000Z')
    const result = await addPhoto('p1', blob('a'), now)
    expect(result.ok).toBe(true)

    const photos = await listPhotos('p1')
    expect(photos).toHaveLength(1)
    expect(photos[0].pullId).toBe('p1')
    expect(photos[0].takenAt).toBe('2026-10-24T06:00:00.000Z')
    expect(photos[0].blob.size).toBeGreaterThan(0)
  })

  it('別の pull の写真は混ざらない', async () => {
    await addPhoto('p1', blob('a'), new Date())
    await addPhoto('p2', blob('b'), new Date())
    expect(await listPhotos('p1')).toHaveLength(1)
    expect(await listPhotos('p2')).toHaveLength(1)
  })

  it('1つの pull に複数枚ぶら下げられる', async () => {
    await addPhoto('p1', blob('a'), new Date())
    await addPhoto('p1', blob('b'), new Date())
    expect(await listPhotos('p1')).toHaveLength(2)
  })

  it('削除できる', async () => {
    const result = await addPhoto('p1', blob('a'), new Date())
    if (!result.ok) throw new Error('追加に失敗した')
    await deletePhoto(result.photo.id)
    expect(await listPhotos('p1')).toEqual([])
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx vitest run src/storage/photoStore.test.ts`
期待：FAIL（`./photoStore` が存在しない）

- [ ] **Step 3: `KEYS` に写真の注釈フラグを追加する**

`src/storage/schema.ts` の `KEYS` に1行足し、`resetIfSchemaChanged` の削除対象にも加える：

```ts
export const KEYS = {
  version: 'tabi-gacha:schemaVersion',
  profile: 'tabi-gacha:profile',
  pulls: 'tabi-gacha:pulls',
  demo: 'tabi-gacha:demo',
  photoNotice: 'tabi-gacha:photoNoticeSeen',
} as const
```

`resetIfSchemaChanged` の中の削除処理に `removeItem(KEYS.photoNotice)` を追加する。

- [ ] **Step 4: 実装する**

`src/storage/photoStore.ts`:

```ts
import type { Photo } from '../domain/types'
import { newId } from './schema'

const DB_NAME = 'tabi-gacha'
const DB_VERSION = 1
const STORE = 'photos'

export type PhotoErrorReason = 'unavailable' | 'quota' | 'unknown'

export function classifyPhotoError(error: unknown): PhotoErrorReason {
  if (error instanceof DOMException) {
    if (error.name === 'QuotaExceededError') return 'quota'
    if (error.name === 'InvalidStateError' || error.name === 'SecurityError') return 'unavailable'
  }
  return 'unknown'
}

/** IndexedDBが使えない環境では null を返す（写真機能だけを無効化するため。仕様 13） */
export function openPhotoDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null)
      return
    }
    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION)
    } catch {
      resolve(null)
      return
    }
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('pullId', 'pullId', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  })
}

export async function addPhoto(
  pullId: string,
  blob: Blob,
  now: Date,
): Promise<{ ok: true; photo: Photo } | { ok: false; reason: PhotoErrorReason }> {
  const db = await openPhotoDb()
  if (!db) return { ok: false, reason: 'unavailable' }

  const photo: Photo = { id: newId(), pullId, blob, takenAt: now.toISOString() }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(photo)
      tx.oncomplete = () => resolve({ ok: true, photo })
      tx.onerror = () => resolve({ ok: false, reason: classifyPhotoError(tx.error) })
      tx.onabort = () => resolve({ ok: false, reason: classifyPhotoError(tx.error) })
    } catch (error) {
      resolve({ ok: false, reason: classifyPhotoError(error) })
    }
  })
}

export async function listPhotos(pullId: string): Promise<Photo[]> {
  const db = await openPhotoDb()
  if (!db) return []

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly')
      const request = tx.objectStore(STORE).index('pullId').getAll(pullId)
      request.onsuccess = () => {
        const photos = (request.result as Photo[]) ?? []
        resolve([...photos].sort((a, b) => a.takenAt.localeCompare(b.takenAt)))
      }
      request.onerror = () => resolve([])
    } catch {
      resolve([])
    }
  })
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await openPhotoDb()
  if (!db) return

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    } catch {
      resolve()
    }
  })
}
```

- [ ] **Step 5: テストが通ることを確認する**

Run: `npx vitest run src/storage/photoStore.test.ts`
期待：PASS（全8件）

- [ ] **Step 6: 写真セクションを作る**

`src/features/card/PhotoSection.tsx`。初回だけ警告を出す（仕様 8.1）。`objectURL` は破棄する：

```tsx
import { useEffect, useRef, useState } from 'react'
import type { Photo } from '../../domain/types'
import { addPhoto, deletePhoto, listPhotos, type PhotoErrorReason } from '../../storage/photoStore'
import { KEYS, readJson, writeJson } from '../../storage/schema'

const MESSAGES: Record<PhotoErrorReason, string> = {
  unavailable: 'このブラウザでは写真を保存できません。',
  quota: '端末の空き容量が足りず、写真を保存できませんでした。',
  unknown: '写真を保存できませんでした。',
}

export function PhotoSection({ pullId }: { pullId: string }) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [urls, setUrls] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showNotice, setShowNotice] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    listPhotos(pullId).then(setPhotos)
  }, [pullId])

  useEffect(() => {
    const next = photos.map((p) => URL.createObjectURL(p.blob))
    setUrls(next)
    return () => next.forEach((url) => URL.revokeObjectURL(url))
  }, [photos])

  function handleAddClick() {
    const seen = readJson<boolean>(KEYS.photoNotice, false)
    if (!seen) {
      setShowNotice(true)
      return
    }
    inputRef.current?.click()
  }

  function acceptNotice() {
    writeJson(KEYS.photoNotice, true)
    setShowNotice(false)
    inputRef.current?.click()
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    const result = await addPhoto(pullId, file, new Date())
    if (result.ok) {
      setError(null)
      setPhotos(await listPhotos(pullId))
    } else {
      setError(MESSAGES[result.reason])
    }
  }

  async function handleDelete(id: string) {
    await deletePhoto(id)
    setPhotos(await listPhotos(pullId))
  }

  return (
    <section className="border-t border-stone-200 pt-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold">写真</h3>
        <button onClick={handleAddClick} className="text-sm text-stone-500 underline">
          ＋追加
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          void handleFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      {showNotice && (
        <div className="mb-3 rounded-lg bg-stone-50 p-3 text-xs leading-relaxed text-stone-600">
          <p>写真はこの端末の中にだけ保存されます。大切な写真は端末のカメラロールにも残しておいてください。</p>
          <button onClick={acceptNotice} className="mt-2 rounded bg-stone-900 px-3 py-1 text-white">
            わかった
          </button>
        </div>
      )}

      {error && <p className="mb-2 text-xs text-amber-700">{error}</p>}

      {photos.length === 0 ? (
        <p className="text-xs text-stone-400">まだ写真がありません。</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <div key={photo.id} className="relative">
              <img
                src={urls[index]}
                alt=""
                className="aspect-square w-full rounded object-cover"
              />
              <button
                onClick={() => void handleDelete(photo.id)}
                className="absolute right-1 top-1 rounded bg-black/60 px-1 text-xs text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 7: カード詳細の末尾に差し込む**

`CardDetail.tsx` の `grid` の中、`AccessSection` の後に `<PhotoSection pullId={pull.id} />` を置く。`lg` では右の列に「行き方」と「写真」が縦に並ぶ形になる。

- [ ] **Step 8: 手動確認する**

1. カード詳細に「写真」セクションがある
2. 初回の「＋追加」で、仕様8.1の警告が出る。「わかった」でファイル選択が開く
3. 画像を選ぶとサムネイルが並ぶ
4. 2回目の「＋追加」では警告が出ず、すぐファイル選択が開く
5. リロードしても写真が残っている
6. 「×」で削除できる
7. 別のカードを開くと、そのカードの写真だけが出る（混ざらない）
8. プライベートブラウズで開き、写真以外（ガチャ・コレクション・プロフィール）が動くことを確認する
9. 幅 1280px で右の列に「行き方」と「写真」が縦に並ぶ。写真のサムネイルが正方形を保っている

- [ ] **Step 9: Commit**

```bash
git add src/storage/schema.ts src/storage/photoStore.ts src/storage/photoStore.test.ts src/features/card
git commit -m "feat(photo): カードに紐づく写真をIndexedDBに保存（初回警告・容量超過の扱い）"
```

---

### Task 17: デモモード

**Files:**
- Create: `src/features/profile/DemoModePanel.tsx`
- Modify: `src/App.tsx`
- Test: なし（`canDraw` の `unlimited` と `drawTown` の `forcedRarity` は Task 4・6 でテスト済み）

**Interfaces:**
- Consumes: `DemoSettings`/`updateDemo`（Task 11）
- Produces: `DemoModePanel`（props: `{ demo, onChange }`）

**発表に実質必須のタスク（仕様 12）。Task 16 を切り落とす場合でも、これは切らない。**

- [ ] **Step 1: 実装する**

`src/features/profile/DemoModePanel.tsx`:

```tsx
import type { Rarity } from '../../domain/types'
import type { DemoSettings } from '../../storage/demoStore'

const ORIGIN_PRESETS: { label: string; lat: number; lng: number }[] = [
  { label: '東京駅', lat: 35.6812, lng: 139.7671 },
  { label: '大阪駅', lat: 34.7025, lng: 135.4959 },
  { label: '博多駅', lat: 33.5897, lng: 130.4207 },
]

export function DemoModePanel({
  demo,
  onChange,
}: {
  demo: DemoSettings
  onChange: (next: DemoSettings) => void
}) {
  return (
    <section className="rounded-lg border border-amber-300 bg-amber-50 p-4">
      <h3 className="text-sm font-bold text-amber-900">デモモード</h3>
      <p className="mt-1 text-xs text-amber-800">
        発表用の設定です。有効にすると本来の遊び方とは違う動きになります。
      </p>

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={demo.unlimited}
          onChange={(e) => onChange({ ...demo, unlimited: e.target.checked })}
          className="h-5 w-5"
        />
        1日1回の制限を外す
      </label>

      <label className="mt-4 block text-sm">
        <span className="mb-1 block text-xs text-amber-800">次に引くレア度を固定する</span>
        <select
          value={demo.forcedRarity ?? ''}
          onChange={(e) =>
            onChange({ ...demo, forcedRarity: (e.target.value || null) as Rarity | null })
          }
          className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2"
        >
          <option value="">固定しない</option>
          {(['SSR', 'SR', 'R', 'N'] as Rarity[]).map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </label>

      <div className="mt-4 text-sm">
        <span className="mb-1 block text-xs text-amber-800">出発地を擬装する</span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onChange({ ...demo, fakeOrigin: null })}
            className={`rounded-full px-3 py-1 text-xs ${
              demo.fakeOrigin === null ? 'bg-amber-900 text-white' : 'border border-amber-300'
            }`}
          >
            擬装しない
          </button>
          {ORIGIN_PRESETS.map((preset) => {
            const active =
              demo.fakeOrigin?.lat === preset.lat && demo.fakeOrigin?.lng === preset.lng
            return (
              <button
                key={preset.label}
                onClick={() => onChange({ ...demo, fakeOrigin: { lat: preset.lat, lng: preset.lng } })}
                className={`rounded-full px-3 py-1 text-xs ${
                  active ? 'bg-amber-900 text-white' : 'border border-amber-300'
                }`}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: `App.tsx` に組み込む**

プロフィールの `demoPanel` に渡す：

```tsx
<ProfileScreen
  total={game.total}
  pullCount={game.pulls.length}
  demoPanel={<DemoModePanel demo={game.demo} onChange={game.updateDemo} />}
/>
```

- [ ] **Step 3: ホーム画面にデモモードの表示を出す**

デモモードが有効なまま発表して「本当は1日1回です」と言えるようにするため、ホームに小さく出す。`HomeScreen` の props に `demoActive: boolean` を足し、残り回数の行の下に置く：

```tsx
{demoActive && (
  <p className="mt-2 text-center text-xs text-amber-700">デモモードが有効です</p>
)}
```

`App.tsx` から `demoActive={game.demo.unlimited || game.demo.forcedRarity !== null || game.demo.fakeOrigin !== null}` を渡す。

- [ ] **Step 4: 手動確認する**

1. プロフィールにデモモードのパネルが出る
2. 「1日1回の制限を外す」を入れると、ホームの「引く」が押せるようになり、連続で引ける
3. レア度を `SSR` に固定して引くと、SSRの町が出る（何度か引いて確認する）
4. 出発地を「東京駅」にすると、カード詳細に「デモモードの擬装座標を出発地にしています」が出て、経路ボタンの出発地が東京駅の座標になる
5. デモモードが有効な間、ホームに「デモモードが有効です」が出る
6. リロードしても設定が残っている

- [ ] **Step 5: Commit**

```bash
git add src/features/profile src/features/gacha/HomeScreen.tsx src/App.tsx
git commit -m "feat(demo): 回数制限の解除・レア度固定・出発地の擬装"
```

---

### Task 18: ガチャ演出と仕上げ

**Files:**
- Create: `src/features/gacha/DrawAnimation.tsx`
- Modify: `src/App.tsx`, `src/index.css`
- Test: なし（演出なので手動確認）

**Interfaces:**
- Consumes: `Rarity`（Task 2）
- Produces: `DrawAnimation`（props: `{ rarity, onDone }`）

**ここが発表の見せ場。** ただし演出でアプリの動作を止めないこと（押したら飛ばせるようにする）。

- [ ] **Step 1: 演出を実装する**

`src/features/gacha/DrawAnimation.tsx`:

```tsx
import { useEffect, useState } from 'react'
import type { Rarity } from '../../domain/types'
import { RarityBadge } from '../../ui/RarityBadge'

const GLOW: Record<Rarity, string> = {
  SSR: 'shadow-[0_0_60px_rgba(251,191,36,0.9)]',
  SR: 'shadow-[0_0_48px_rgba(167,139,250,0.8)]',
  R: 'shadow-[0_0_36px_rgba(56,189,248,0.7)]',
  N: 'shadow-[0_0_24px_rgba(168,162,158,0.6)]',
}

/** 1.4秒で開封。画面を押せば即座に飛ばせる */
export function DrawAnimation({ rarity, onDone }: { rarity: Rarity; onDone: () => void }) {
  const [phase, setPhase] = useState<'spin' | 'reveal'>('spin')

  useEffect(() => {
    const toReveal = setTimeout(() => setPhase('reveal'), 900)
    const toDone = setTimeout(onDone, 1400)
    return () => {
      clearTimeout(toReveal)
      clearTimeout(toDone)
    }
  }, [onDone])

  return (
    <button
      onClick={onDone}
      className="flex flex-1 flex-col items-center justify-center gap-6"
      aria-label="演出を飛ばす"
    >
      <div
        className={`flex h-40 w-40 items-center justify-center rounded-full bg-stone-900 transition-all duration-500 ${
          phase === 'spin' ? 'animate-spin-slow' : `scale-110 ${GLOW[rarity]}`
        }`}
      >
        {phase === 'reveal' && <RarityBadge rarity={rarity} />}
      </div>
      <p className="text-sm text-stone-400">
        {phase === 'spin' ? '行き先を選んでいます…' : '決まりました'}
      </p>
    </button>
  )
}
```

- [ ] **Step 2: アニメーションを定義する**

`src/index.css` に追記する。**動きを減らす設定の人には回さない**：

```css
@keyframes spin-slow {
  to { transform: rotate(360deg); }
}

.animate-spin-slow {
  animation: spin-slow 0.9s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .animate-spin-slow {
    animation: none;
  }
}
```

- [ ] **Step 3: `App.tsx` に組み込む**

引いた直後は演出を見せ、終わったらカード詳細に切り替える。`pendingPull` を1つ足す：

```tsx
const [pendingPull, setPendingPull] = useState<Pull | null>(null)

function handleDraw(mode: DrawMode) {
  const pull = game.draw(mode)
  if (pull) setPendingPull(pull)
}

// 表示の最上位に置く
{game.status === 'ready' && pendingPull && game.townById(pendingPull.townId) && (
  <DrawAnimation
    rarity={game.townById(pendingPull.townId)!.rarity}
    onDone={() => {
      setSelectedPull(pendingPull)
      setPendingPull(null)
    }}
  />
)}
```

演出中は `HomeScreen` と `CardDetail` を描かない（条件に `!pendingPull` を足す）。

- [ ] **Step 4: 見た目を仕上げる**

次を通しで直す。凝らず、揃えることを優先する：

1. 余白を揃える（画面の左右は `px-4 md:px-8`、セクション間は `mt-6`）
2. 文字サイズを3段階に絞る（見出し `text-xl`、本文 `text-sm`、補足 `text-xs`）
3. レア度の色がバッジ・演出・タイルで一致していることを確認する
4. タップ対象の高さを44px以上にする（`py-3` 以上）。**これはどの幅でも守る**
5. 長い町名でレイアウトが崩れないか、最も長い町名のカードで**3つの幅すべてで**確認する
6. 本文の行長を確認する。広い画面で文章が端から端まで伸びている箇所があれば `max-w-prose` などで制限する（仕様 9.1）
7. `375px / 768px / 1280px` の3点で全画面を一巡し、**横スクロールが出ないこと**を確認する

- [ ] **Step 5: 手動確認する**

1. 引くと演出が出て、レア度に応じた色で光り、カード詳細に進む
2. 演出中に画面を押すと、すぐカード詳細に進む
3. OSの「視差効果を減らす」を有効にすると、回転が止まる（文字は進む）
4. `375px / 768px / 1280px` の3点で全画面を一巡し、横スクロールが出ない
5. 幅を連続的に変えても、タブの下部固定と上部横並びの切り替わりで本文が隠れたり重なったりしない

- [ ] **Step 6: Commit**

```bash
git add src/features/gacha src/index.css src/App.tsx
git commit -m "feat(gacha): 開封演出と全体の見た目の仕上げ"
```

---

### Task 19: Vercelへのデプロイ

**Files:**
- Create: `.gitignore`（`node_modules`, `dist` が入っていることを確認）
- Test: なし（デプロイ後の手動確認）

**Interfaces:**
- Consumes: ここまでの全タスク
- Produces: HTTPSで公開されたURL

**Geolocation はHTTPSでしか動かない**ため、このタスクを終えるまで実機での現在地確認はできない（仕様 6.3）。

- [ ] **Step 1: 本番ビルドが通ることを確認する**

```bash
npm run build
npm run preview
```

`preview` で開いたURLで、ガチャ・コレクション・プロフィールが動くことを確認する。`public/data/*.json` が読めていることが要点（パスの誤りはここで出る）。

- [ ] **Step 2: 全テストが通ることを確認する**

```bash
npm test
```

期待：PASS。`scripts/data.test.ts` がスキップされていないこと（実データが入っている証拠）。

- [ ] **Step 3: Vercelにデプロイする**

```bash
npx vercel
```

初回は対話で質問される。回答は次のとおり：
- Set up and deploy → `yes`
- Which scope → 自分のアカウント
- Link to existing project → `no`
- Project name → `tabi-gacha`
- In which directory is your code located → `./`
- Build settings → Viteとして自動検出されるので変更しない（Build Command `npm run build`、Output Directory `dist`）

本番に出す：

```bash
npx vercel --prod
```

> ログインが必要な場合は、対話型のログインになるため、ユーザー自身にターミナルで `npx vercel login` を実行してもらう。

- [ ] **Step 4: 公開URLをスマホで手動確認する**

**ここが実機での最終確認。** 発表前に必ず通す：

1. スマホのブラウザで公開URLを開く
2. ガチャを引ける。演出が動く
3. カード詳細で「出発地を設定する」→「現在地を使う」で、**実際に位置情報の許可ダイアログが出る**（HTTPSなので動く）
4. 許可して「Googleマップで経路を開く」を押すと、Googleマップのアプリが開き、現在地からその町への経路が出る
5. 写真の「＋追加」でカメラが起動し、撮った写真がカードに残る
6. リロードしてもカードと写真が残っている
7. 横スクロールが出ない。タップ対象が押しやすい
8. 同じURLをPCのブラウザでも開き、タブが上部に出て、コレクションが4〜5列で並ぶことを確認する（仕様 9.1）

- [ ] **Step 5: デモモードで発表の流れを通す**

1. プロフィールでデモモードを有効にし、レア度を `SSR` に固定する
2. ホームに戻って引く → SSRの町が出る
3. カード詳細で注釈・ミッション・行き方・写真をひと通り見せられる
4. コレクションに複数枚たまった状態を作る（制限解除のまま数回引く）
5. プロフィールで称号が上がっているところを見せられる

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: Vercelへデプロイ"
```

---

## Self-Review の結果

計画を書き終えたあと、仕様書と突き合わせて確認した。

**1. 仕様のカバー状況**

| 仕様の節 | 担当タスク |
|---|---|
| 4.1 出題プールの限定 | Task 2（`rarityForPopulation` が null を返す）、Task 8（骨格生成で除外）、Task 9（検証で弾く） |
| 4.2 レア度と排出率 | Task 2 |
| 4.3 抽選アルゴリズム | Task 4 |
| 4.4 モード | Task 3、Task 11 |
| 4.5 回数制限 | Task 6（`canDraw`）、Task 11 |
| 4.6 アプリ内の注釈 | Task 11（`PoolNotice`） |
| 5.1 ミッション3枚 | Task 5、Task 11 |
| 5.2 成立条件と補完 | Task 5、Task 9（タグ語彙の検証） |
| 5.3 自己申告・期限なし | Task 12 |
| 6.1 行き方の役割分担 | Task 6（`routeUrl`）、Task 13 |
| 6.2 出発地に依存しない文面 | Task 9（検証で機械的に弾く）、Task 10（指示文） |
| 6.3 出発地の取得 | Task 13 |
| 6.4 現在地の注釈 | Task 13、Task 15 |
| 7.1 ポイント | Task 6 |
| 7.2 ランク | Task 6、Task 15 |
| 8 コレクションと写真 | Task 14、Task 16 |
| 8.1 保存の注釈 | Task 15（常設）、Task 16（初回） |
| 9 画面構成 | Task 1、11、12、14、15 |
| 9.1 レスポンシブ対応 | Task 1（外枠・タブの切り替え）、Task 12（カード詳細の段組み）、Task 14（列数）、Task 18（通しの確認）、Task 19（実機とPC） |
| 10 データモデル | Task 2、Task 7 |
| 10.1 `member_id` | Task 7、Task 11 |
| 11.1〜11.3 データ源と生成 | Task 8、9、10 |
| 11.5 出典の表記 | Task 10 Step 2〜3（ライセンス確認・記録・定数）、Task 15（プロフィール画面に表示） |
| 12 デモモード | Task 17 |
| 13 壊れ方の設計 | Task 7（localStorage・スキーマ版）、Task 13（現在地）、Task 16（IndexedDB） |
| 14 テスト方針 | 全タスク（UIは手動確認に限定） |
| 15 技術構成 | Task 1、Task 19 |
| 17 進め方 | Task 1〜11 が1日目、12〜15 が2日目、16 が3日目午前、17〜19 が3日目午後 |

**仕様11.5（写真素材を使わない）** は「作らないもの」なので対応タスクなし。**仕様16（スコープ外）** も同様。

**2. 仕様から意図的にずれた点**（実装時に迷わないよう明記する）

- **累計ポイントを `profile` に保存しない**（Task 6）。`pulls` から毎回導出する。真実の源を1か所にして、達成チェックを外したときの整合ずれを構造的に防ぐため
- **「候補が空のレア度で再抽選」を事前フィルタで実現**（Task 4）。事後の再抽選ループを避け、1回で決まる形にした
- **町データに緯度経度を持たない**（Task 2・8・9）。目的地はGoogleマップに「都道府県名＋市区町村名」のテキストで渡す。座標の用途が目的地の指定だけだったため、座標データの取得・測地系の変換・代表点の選定がまとめて不要になった（仕様 6.1）

**3. 型と名前の一貫性**

`Town` `GenericMission` `Pull` `PulledMission` `Photo` `Profile` `Rarity` `Region` `DrawMode` `Rng` `Origin` `SortKey` `DemoSettings` `PhotoErrorReason` は Task 2・3・4・6・11・16 で定義し、以降のタスクでは同じ名前で参照している。`enriched`（生成済みフラグ）は Task 2 で型に入れ、Task 3 でフィルタし、Task 8 で `false` を書き、Task 9 で検証し、Task 10 で `true` に変える。`KEYS` は Task 7 で定義し、Task 16 で1つ追加する。

**4. Review Focus の各項目とテストの所在**

- `localStorage` が例外を投げる → Task 7 Step 1 の「localStorage が使えない環境」
- 同じ町を2回引く → Task 7 Step 2 の「同じ町を2回引いたら pull は2件になる」
- `QuotaExceededError` → Task 16 Step 1 の `classifyPhotoError` のテスト（UI側の表示は Step 8 の手動確認）
- 手入力のエンコード → Task 6 Step 4 の `routeUrl` のテスト（日本語・記号・空文字）
- 未生成の町の混入 → Task 3 Step 1 の「未生成の町（enriched: false）は除外する」
