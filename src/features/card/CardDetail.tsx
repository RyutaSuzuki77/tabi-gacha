import { pointsForPull } from '../../domain/points'
import { splitTownName } from '../../domain/townName'
import type { GenericMission, Pull, Town } from '../../domain/types'
import { RARITY_COLOR, RarityBadge } from '../../ui/RarityBadge'
import { AccessSection } from './AccessSection'
import { MissionList } from './MissionList'
import { PhotoSection } from './PhotoSection'

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
  const { county, town: name } = splitTownName(town.name)

  return (
    <article className="flex flex-1 flex-col">
      <button onClick={onBack} className="-ml-2 mb-3 self-start px-2 py-3 text-sm text-kinari/70">
        ← もどる
      </button>

      {/* 町の境界標識。町名をいちばん大きく置く */}
      <div className="sign-plate anim-sign rounded-2xl bg-kinari px-5 py-7 text-sumi">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-wide text-sumi/55">
              {town.prefecture}
              {county && ` ${county}`}
            </p>
            <h2 className="mt-1 break-words font-display text-4xl leading-tight sm:text-5xl">
              {name}
            </h2>
          </div>
          <RarityBadge rarity={town.rarity} />
        </div>

        <div className="mt-5 flex items-end justify-between gap-3 border-t-2 border-dashed border-sumi/20 pt-4">
          <p>
            <span className="font-display text-2xl">{town.population.toLocaleString()}</span>
            <span className="ml-1 text-xs text-sumi/60">人</span>
          </p>
          <div className="flex flex-wrap justify-end gap-1">
            {town.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border-2 border-sumi/15 px-2 py-0.5 text-xs font-bold"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:gap-8">
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="font-display text-lg">ミッション</h3>
            <p className="text-sm">
              <span
                className="font-display text-xl"
                style={{ color: earned > 0 ? RARITY_COLOR[town.rarity] : undefined }}
              >
                {earned}
              </span>
              <span className="ml-0.5 text-xs text-kinari/60">pt</span>
            </p>
          </div>
          <MissionList pull={pull} town={town} generics={generics} onToggle={onToggle} />
        </section>

        <AccessSection town={town} />

        <PhotoSection pullId={pull.id} />
      </div>
    </article>
  )
}
