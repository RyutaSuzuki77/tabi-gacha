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
