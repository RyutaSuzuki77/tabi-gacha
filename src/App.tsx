import { useState } from 'react'
import type { DrawMode } from './domain/pool'
import type { Pull } from './domain/types'
import { useGame } from './state/useGame'
import { CardDetail } from './features/card/CardDetail'
import { CollectionScreen } from './features/collection/CollectionScreen'
import { DrawAnimation } from './features/gacha/DrawAnimation'
import { HomeScreen } from './features/gacha/HomeScreen'
import { DemoModePanel } from './features/profile/DemoModePanel'
import { ProfileScreen } from './features/profile/ProfileScreen'
import { Layout } from './ui/Layout'
import { TabBar, type TabId } from './ui/TabBar'

export default function App() {
  const game = useGame()
  const [tab, setTab] = useState<TabId>('gacha')
  const [selectedPull, setSelectedPull] = useState<Pull | null>(null)
  const [pendingPull, setPendingPull] = useState<Pull | null>(null)

  function handleDraw(mode: DrawMode) {
    const pull = game.draw(mode)
    if (pull) setPendingPull(pull)
  }

  function changeTab(next: TabId) {
    setSelectedPull(null)
    setPendingPull(null)
    setTab(next)
  }

  const demoActive =
    game.demo.unlimited || game.demo.forcedRarity !== null || game.demo.fakeOrigin !== null

  // チェックの変更を反映した最新の pull を表示する（selectedPull は古いスナップショット）
  const current = selectedPull
    ? game.pulls.find((p) => p.id === selectedPull.id) ?? selectedPull
    : null
  const currentTown = current ? game.townById(current.townId) : undefined

  return (
    <Layout>
      <header className="px-4 pt-6 md:px-8">
        <h1 className="text-2xl font-bold tracking-tight">旅ガチャ</h1>
        <TabBar active={tab} onChange={changeTab} />
      </header>

      <main className="flex flex-1 flex-col px-4 pb-24 md:px-8 md:pb-8">
        {!game.storageWritable && (
          <p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            この画面では引いたカードを保存できません（プライベートブラウズか、端末の空き容量が
            足りない可能性があります）。タブを閉じると、引いたカードと写真は失われます。
          </p>
        )}

        {game.wasReset && (
          <p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            保存形式が変わったため、これまでのデータを初期化しました。
          </p>
        )}

        {game.status === 'loading' && <p className="text-stone-400">読み込み中…</p>}
        {game.status === 'error' && (
          <p className="text-red-600">町データの読み込みに失敗しました。再読み込みしてください。</p>
        )}

        {game.status === 'ready' && pendingPull && game.townById(pendingPull.townId) && (
          <DrawAnimation
            rarity={game.townById(pendingPull.townId)!.rarity}
            onDone={() => {
              setSelectedPull(pendingPull)
              setPendingPull(null)
            }}
          />
        )}

        {game.status === 'ready' && !pendingPull && (
          current && currentTown ? (
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
              {tab === 'gacha' && (
                <HomeScreen
                  canDraw={game.canDrawNow}
                  rankTitle={game.rank.title}
                  total={game.total}
                  demoActive={demoActive}
                  onDraw={handleDraw}
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
