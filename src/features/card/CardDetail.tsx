import { pointsForPull } from '../../domain/points'
import type { GenericMission, Pull, Town } from '../../domain/types'
import { RarityBadge } from '../../ui/RarityBadge'
import { AccessSection } from './AccessSection'
import { MissionList } from './MissionList'
import { PhotoSection } from './PhotoSection'

export function CardDetail({
  pull,
  town,
  generics,
  fakeOrigin,
  onToggle,
  onBack,
}: {
  pull: Pull
  town: Town
  generics: GenericMission[]
  fakeOrigin: { lat: number; lng: number } | null
  onToggle: (index: number, done: boolean) => void
  onBack: () => void
}) {
  const earned = pointsForPull(town.rarity, pull.missions)

  return (
    <article className="flex flex-1 flex-col">
      <button onClick={onBack} className="mb-2 -ml-2 self-start px-2 py-3 text-sm text-stone-500">
        ← 戻る
      </button>

      <div className="flex flex-wrap items-center gap-2">
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

        <AccessSection town={town} fakeOrigin={fakeOrigin} />

        <PhotoSection pullId={pull.id} />
      </div>
    </article>
  )
}
