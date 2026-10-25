import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Photo } from '../../domain/types'

/** 横スワイプで送るとみなす X 方向の移動量（px） */
const SWIPE_PX = 50

type Props = {
  /** PhotoSection が持っている配列をそのまま受け取る。URL は作らず、revoke もしない */
  items: { photo: Photo; url: string }[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
}

const NAV_BUTTON =
  'flex h-11 min-w-11 items-center justify-center rounded-full border-2 border-kinari/40 bg-ai-deep/80 px-4 text-lg font-bold text-kinari disabled:cursor-not-allowed disabled:opacity-25'

/** 写真の拡大表示。見るだけで、削除はできない */
export function PhotoViewer({ items, index, onIndexChange, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const total = items.length
  const atFirst = index <= 0
  const atLast = index >= total - 1

  // キーとモーダルの最新値を、リスナを張り直さずに参照する
  const latest = useRef({ index, total, onIndexChange, onClose })
  latest.current = { index, total, onIndexChange, onClose }

  function go(delta: -1 | 1) {
    const { index: i, total: n, onIndexChange: change } = latest.current
    const next = i + delta
    if (next < 0 || next >= n) return // 端では止まる（ループしない）
    change(next)
  }

  // 開いている間だけ: 背面のスクロールを止め、キーを受け、フォーカスを預かる
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') latest.current.onClose()
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      if (opener?.isConnected) opener.focus()
    }
  }, [])

  const current = items[index]
  if (!current) return null

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="写真の拡大表示"
      tabIndex={-1}
      onClick={(e) => {
        // 写真やボタンの外（背景）をタップしたときだけ閉じる
        if (e.target === e.currentTarget) onClose()
      }}
      onTouchStart={(e) => {
        const t = e.touches[0]
        touchStart.current = t ? { x: t.clientX, y: t.clientY } : null
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current
        const t = e.changedTouches[0]
        touchStart.current = null
        if (!start || !t) return
        const dx = t.clientX - start.x
        const dy = t.clientY - start.y
        // 縦に動いたときは送らない
        if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy)) return
        go(dx < 0 ? 1 : -1)
      }}
      className="fixed inset-0 z-50 flex flex-col items-center gap-3 overscroll-contain bg-ai-deep/95 p-4 outline-none"
    >
      <div className="flex w-full justify-end">
        <button onClick={onClose} aria-label="閉じる" className={NAV_BUTTON}>
          ×
        </button>
      </div>

      <div
        className="flex min-h-0 w-full flex-1 items-center justify-center"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <img
          src={current.url}
          alt=""
          className="max-h-full max-w-full rounded-xl object-contain"
        />
      </div>

      <div className="flex items-center gap-4">
        <button onClick={() => go(-1)} disabled={atFirst} aria-label="前の写真" className={NAV_BUTTON}>
          ←
        </button>
        <p className="min-w-16 text-center font-display text-lg text-kinari" aria-live="polite">
          {index + 1} / {total}
        </p>
        <button onClick={() => go(1)} disabled={atLast} aria-label="次の写真" className={NAV_BUTTON}>
          →
        </button>
      </div>
    </div>,
    document.body,
  )
}
