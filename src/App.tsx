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
