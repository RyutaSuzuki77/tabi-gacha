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

  const canAskLocation = !fakeOrigin && state === 'idle'

  return (
    <section>
      <h3 className="mb-3 font-display text-lg">どうやって行くか</h3>
      <p className="rounded-xl bg-ai-mid/40 p-4 text-sm leading-relaxed">{town.accessTips}</p>

      <div className="mt-4 space-y-3">
        {canAskLocation && !promptShown && (
          <button
            onClick={() => setPromptShown(true)}
            className="px-2 py-3 text-sm text-kinari/70 underline"
          >
            出発地を設定する
          </button>
        )}

        {canAskLocation && promptShown && (
          <LocationPrompt onAllow={request} onSkip={() => setManual('')} />
        )}

        {state === 'asking' && <p className="text-sm text-kinari/60">現在地を取得しています…</p>}
        {state === 'granted' && <p className="text-sm text-kinari/60">現在地を出発地にしています</p>}
        {fakeOrigin && (
          <p className="rounded-lg bg-ssr/20 px-3 py-2 text-sm text-ssr">
            デモモードの擬装座標を出発地にしています
          </p>
        )}

        {/* 仕様6.3：手入力の経路は常に用意しておく */}
        {!fakeOrigin && (
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-kinari/60">
              出発地（駅名や市区町村）
              {state === 'denied' && ' ― 現在地が取得できませんでした'}
              {state === 'granted' && ' ― 入力すると現在地より優先します'}
            </span>
            <input
              value={manualValue}
              onChange={(e) => setManual(e.target.value)}
              placeholder="例：東京駅"
              className="w-full rounded-full border-2 border-ai-mid bg-ai-deep px-4 py-3
                         text-kinari placeholder:text-kinari/35"
            />
          </label>
        )}

        <a
          href={routeUrl(`${town.prefecture}${town.name}`, origin)}
          target="_blank"
          rel="noreferrer"
          className="block rounded-full bg-beni px-4 py-4 text-center font-display text-base
                     text-white shadow-[0_5px_0_0_var(--color-beni-dark)] active:translate-y-[2px]
                     active:shadow-[0_3px_0_0_var(--color-beni-dark)]"
        >
          Googleマップで経路をひらく
        </a>
        {!origin && (
          <p className="text-xs text-kinari/50">
            出発地を設定していない場合は、Googleマップ側で出発地を選ぶことになります。
          </p>
        )}
      </div>
    </section>
  )
}
