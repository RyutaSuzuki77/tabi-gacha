import type { Rarity } from '../../domain/types'
import type { DemoSettings } from '../../storage/demoStore'

const ORIGIN_PRESETS: { label: string; lat: number; lng: number }[] = [
  { label: '東京駅', lat: 35.6812, lng: 139.7671 },
  { label: '大阪駅', lat: 34.7025, lng: 135.4959 },
  { label: '博多駅', lat: 33.5897, lng: 130.4207 },
]

export function DemoModePanel({
  demo,
  onChange,
}: {
  demo: DemoSettings
  onChange: (next: DemoSettings) => void
}) {
  return (
    <section className="rounded-2xl border-2 border-ssr/50 bg-ssr/10 p-4">
      <h3 className="font-display text-base text-ssr">デモモード</h3>
      <p className="mt-1 text-xs text-kinari/65">
        発表用の設定です。有効にすると本来の遊び方とは違う動きになります。
      </p>

      <label className="mt-4 flex items-center gap-2 py-2 text-sm">
        <input
          type="checkbox"
          checked={demo.unlimited}
          onChange={(e) => onChange({ ...demo, unlimited: e.target.checked })}
          className="h-5 w-5"
        />
        1日1回の制限を外す
      </label>

      <label className="mt-4 block text-sm">
        <span className="mb-1 block text-xs text-kinari/65">次に引くレア度を固定する</span>
        <select
          value={demo.forcedRarity ?? ''}
          onChange={(e) =>
            onChange({ ...demo, forcedRarity: (e.target.value || null) as Rarity | null })
          }
          className="w-full rounded-full border-2 border-ssr/40 bg-ai-deep px-4 py-3 text-kinari"
        >
          <option value="">固定しない</option>
          {(['SSR', 'SR', 'R', 'N'] as Rarity[]).map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </label>

      <div className="mt-4 text-sm">
        <span className="mb-1 block text-xs text-kinari/65">出発地を擬装する</span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onChange({ ...demo, fakeOrigin: null })}
            className={`rounded-full px-4 py-3 text-xs ${
              demo.fakeOrigin === null ? 'bg-ssr text-sumi' : 'border-2 border-ssr/40 text-kinari/80'
            }`}
          >
            擬装しない
          </button>
          {ORIGIN_PRESETS.map((preset) => {
            const active =
              demo.fakeOrigin?.lat === preset.lat && demo.fakeOrigin?.lng === preset.lng
            return (
              <button
                key={preset.label}
                onClick={() => onChange({ ...demo, fakeOrigin: { lat: preset.lat, lng: preset.lng } })}
                className={`rounded-full px-4 py-3 text-xs ${
                  active ? 'bg-ssr text-sumi' : 'border-2 border-ssr/40 text-kinari/80'
                }`}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
