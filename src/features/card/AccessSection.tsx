import { useState } from 'react'
import { routeUrl } from '../../maps/routeUrl'
import type { Town } from '../../domain/types'
import { LocationPrompt } from '../../location/LocationPrompt'
import { useOrigin } from '../../location/useOrigin'

export function AccessSection({
  town,
  fakeOrigin,
}: {
  town: Town
  fakeOrigin: { lat: number; lng: number } | null
}) {
  const { origin, state, request, setManual, manualValue } = useOrigin(fakeOrigin)
  const [promptShown, setPromptShown] = useState(false)

  const needsPrompt = !fakeOrigin && state === 'idle'

  return (
    <section className="border-t border-stone-200 pt-4 lg:border-t-0 lg:pt-0">
      <h3 className="mb-2 text-sm font-bold">行き方のコツ</h3>
      <p className="text-sm leading-relaxed text-stone-700">{town.accessTips}</p>

      <div className="mt-4 space-y-3">
        {needsPrompt && !promptShown && (
          <button
            onClick={() => setPromptShown(true)}
            className="py-2 text-sm text-stone-500 underline"
          >
            出発地を設定する
          </button>
        )}

        {needsPrompt && promptShown && (
          <LocationPrompt onAllow={request} onSkip={() => setManual('')} />
        )}

        {state === 'asking' && <p className="text-sm text-stone-400">現在地を取得しています…</p>}

        {(state === 'denied' || state === 'manual') && (
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-stone-500">
              出発地（駅名や市区町村）
              {state === 'denied' && ' ― 現在地が取得できませんでした'}
            </span>
            <input
              value={manualValue}
              onChange={(e) => setManual(e.target.value)}
              placeholder="例：東京駅"
              className="w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
        )}

        {state === 'granted' && <p className="text-sm text-stone-500">現在地を出発地にしています</p>}
        {fakeOrigin && <p className="text-sm text-amber-700">デモモードの擬装座標を出発地にしています</p>}

        <a
          href={routeUrl(`${town.prefecture}${town.name}`, origin)}
          target="_blank"
          rel="noreferrer"
          className="block rounded-lg bg-stone-900 px-4 py-3 text-center text-white"
        >
          Googleマップで経路を開く
        </a>
        {!origin && (
          <p className="text-xs text-stone-400">
            出発地を設定していない場合は、Googleマップ側で出発地を選ぶことになります。
          </p>
        )}
      </div>
    </section>
  )
}
