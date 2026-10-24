export function LocationPrompt({ onAllow, onSkip }: { onAllow: () => void; onSkip: () => void }) {
  return (
    <div className="rounded-xl border-2 border-ai-mid bg-ai-mid/40 p-4 text-sm">
      <h4 className="font-display text-base">現在地を使わせてもらえますか</h4>
      <p className="mt-2 leading-relaxed text-kinari/80">
        行き方を調べるときの「出発地」として使います。このアプリにサーバーはないので、現在地がどこかに保存されることはありません。経路を開く操作をしたときだけ、出発地としてGoogleマップに渡されます。
      </p>
      <p className="mt-2 text-kinari/80">許可しなくてもガチャは引けます（出発地を手で入力できます）。</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={onAllow} className="rounded-full bg-kinari px-5 py-3 font-bold text-sumi">
          現在地を使う
        </button>
        <button
          onClick={onSkip}
          className="rounded-full border-2 border-kinari/30 px-5 py-3 font-bold"
        >
          手で入力する
        </button>
      </div>
    </div>
  )
}
