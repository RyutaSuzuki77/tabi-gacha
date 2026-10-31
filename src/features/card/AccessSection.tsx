import { routeUrl } from '../../maps/routeUrl'
import type { Town } from '../../domain/types'

export function AccessSection({ town }: { town: Town }) {
  return (
    <section>
      <h3 className="mb-3 font-display text-lg">どうやって行くか</h3>
      <p className="rounded-xl bg-ai-mid/40 p-4 text-sm leading-relaxed">{town.accessTips}</p>

      <div className="mt-4 space-y-3">
        <a
          href={routeUrl(`${town.prefecture}${town.name}`)}
          rel="noreferrer"
          className="block rounded-full bg-beni px-4 py-4 text-center font-display text-base
                     text-white shadow-[0_5px_0_0_var(--color-beni-dark)] active:translate-y-[2px]
                     active:shadow-[0_3px_0_0_var(--color-beni-dark)]"
        >
          Googleマップで経路をひらく
        </a>
        {/* 仕様6.3：出発地はGoogleマップ側に任せる */}
        <p className="text-xs text-kinari/50">
          出発地は現在地になります。変えたいときはGoogleマップ側で設定してください。
        </p>
      </div>
    </section>
  )
}
