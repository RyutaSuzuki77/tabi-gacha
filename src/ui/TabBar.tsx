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
