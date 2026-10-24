export type TabId = 'gacha' | 'collection' | 'profile'

const TABS: { id: TabId; label: string }[] = [
  { id: 'gacha', label: 'ひく' },
  { id: 'collection', label: 'あつめた' },
  { id: 'profile', label: 'じぶん' },
]

/**
 * 狭い画面では下部に固定（親指が届く位置）。
 * `md` 以上では静的な上部の横並びに切り替わる（仕様 9.1）。
 */
export function TabBar({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 flex gap-1 border-t-2 border-ai-mid bg-ai-deep px-2
                 pb-[env(safe-area-inset-bottom,0px)]
                 md:static md:mt-4 md:border-0 md:bg-transparent md:px-0 md:pb-0"
    >
      {TABS.map((t) => {
        const on = active === t.id
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex-1 py-4 text-sm font-bold transition-colors md:flex-none md:rounded-full md:px-6 md:py-2.5 ${
              on
                ? 'text-kinari md:bg-beni md:text-white'
                : 'text-kinari/40 md:bg-ai-mid md:text-kinari/60'
            }`}
          >
            <span className="relative">
              {t.label}
              {on && (
                <span className="absolute -bottom-1.5 left-0 h-[3px] w-full rounded-full bg-beni md:hidden" />
              )}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
