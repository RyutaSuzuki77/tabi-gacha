import { useState } from 'react'
import type { Pull } from './domain/types'
import { useGame } from './state/useGame'
import { CardDetail } from './features/card/CardDetail'
import { CollectionScreen } from './features/collection/CollectionScreen'
import { HomeScreen } from './features/gacha/HomeScreen'
import { DemoModePanel } from './features/profile/DemoModePanel'
import { ProfileScreen } from './features/profile/ProfileScreen'
import { Layout } from './ui/Layout'
import { TabBar, type TabId } from './ui/TabBar'

export default function App() {
  const game = useGame()
  const [tab, setTab] = useState<TabId>('gacha')
  const [selectedPull, setSelectedPull] = useState<Pull | null>(null)

  function changeTab(next: TabId) {
    setSelectedPull(null)
    setTab(next)
  }

  const demoActive = game.demo.unlimited || game.demo.forcedRarity !== null

  // チェックの変更を反映した最新の pull を表示する（selectedPull は古いスナップショット）
  const current = selectedPull
    ? game.pulls.find((p) => p.id === selectedPull.id) ?? selectedPull
    : null
  const currentTown = current ? game.townById(current.townId) : undefined

  return (
    <Layout>
      <header className="px-4 pt-7 md:px-8">
        <h1 className="font-display text-3xl leading-none my-5">
          旅<span className="text-beni">ガチャ</span>
        </h1>
        <TabBar active={tab} onChange={changeTab} />
      </header>

      <main className="flex flex-1 flex-col px-4 pb-24 md:px-8 md:pb-8 my-5">
        {!game.storageWritable && (
          <p className="mb-4 rounded-xl bg-ssr/15 px-4 py-3 text-xs leading-relaxed text-ssr">
            この画面では引いたカードを保存できません（プライベートブラウズか、端末の空き容量が
            足りない可能性があります）。タブを閉じると、引いたカードと写真は失われます。
          </p>
        )}

        {game.wasReset && (
          <p className="mb-4 rounded-xl bg-ssr/15 px-4 py-3 text-xs text-ssr">
            保存形式が変わったため、これまでのデータを初期化しました。
          </p>
        )}

        {game.status === 'loading' && (
          <p className="mt-16 text-center font-display text-lg text-kinari/50">よみこみ中…</p>
        )}
        {game.status === 'error' && (
          <p className="mt-16 rounded-xl bg-beni/20 px-4 py-4 text-center text-sm text-kinari">
            町データを読み込めませんでした。ページを再読み込みしてください。
          </p>
        )}

        {game.status === 'ready' && (
          current && currentTown ? (
            <CardDetail
              pull={current}
              town={currentTown}
              generics={game.generics}
              onToggle={(index, done) => game.toggleMission(current.id, index, done)}
              onBack={() => setSelectedPull(null)}
            />
          ) : (
            <>
              {tab === 'gacha' && (
                <HomeScreen
                  canDraw={game.canDrawNow}
                  rankTitle={game.rank.title}
                  total={game.total}
                  demoActive={demoActive}
                  onDraw={game.draw}
                  rarityOf={(p) => game.townById(p.townId)?.rarity}
                  onRevealed={setSelectedPull}
                />
              )}
              {tab === 'collection' && (
                <CollectionScreen
                  pulls={game.pulls}
                  townById={game.townById}
                  onSelect={setSelectedPull}
                />
              )}
              {tab === 'profile' && (
                <ProfileScreen
                  total={game.total}
                  pullCount={game.pulls.length}
                  storageWritable={game.storageWritable}
                  demoPanel={<DemoModePanel demo={game.demo} onChange={game.updateDemo} />}
                />
              )}
            </>
          )
        )}
      </main>
    </Layout>
  )
}
