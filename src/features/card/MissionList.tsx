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
          <label className="flex items-start gap-3 py-1">
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
