export function LocationPrompt({ onAllow, onSkip }: { onAllow: () => void; onSkip: () => void }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm">
      <h4 className="font-bold">現在地を使わせてもらえますか</h4>
      <p className="mt-2 leading-relaxed text-stone-600">
        行き方を調べるときの「出発地」として使います。このアプリにサーバーはないので、現在地がどこかに保存されることはありません。経路を開く操作をしたときだけ、出発地としてGoogleマップに渡されます。
      </p>
      <p className="mt-2 text-stone-600">許可しなくてもガチャは引けます（出発地を手で入力できます）。</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={onAllow} className="rounded-lg bg-stone-900 px-4 py-3 text-white">
          現在地を使う
        </button>
        <button onClick={onSkip} className="rounded-lg border border-stone-300 px-4 py-3">
          手で入力する
        </button>
      </div>
    </div>
  )
}
