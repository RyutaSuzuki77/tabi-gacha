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
          <label
            className={`flex items-start gap-3 rounded-xl border-2 px-3 py-3 transition-colors ${
              mission.done ? 'border-beni/50 bg-beni/15' : 'border-ai-mid bg-ai-mid/40'
            }`}
          >
            <input
              type="checkbox"
              checked={mission.done}
              onChange={(e) => onToggle(index, e.target.checked)}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-xs font-bold ${
                mission.done
                  ? 'border-beni bg-beni text-white'
                  : 'border-kinari/40 text-transparent'
              }`}
            >
              ✓
            </span>
            <span className={`text-sm leading-relaxed ${mission.done ? 'text-kinari/50' : ''}`}>
              {mission.kind === 'unique' && (
                <span className="mr-1.5 rounded bg-ssr px-1.5 py-0.5 font-display text-[10px] text-sumi">
                  この町だけ
                </span>
              )}
              {resolveMissionText(mission, town, generics)}
            </span>
          </label>
        </li>
      ))}
    </ul>
  )
}
