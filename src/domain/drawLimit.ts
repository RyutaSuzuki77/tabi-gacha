/**
 * 1日1回・引き直し不可（仕様 4.5）。
 * 判定は端末のローカル暦日で行う。保存値が壊れている場合は「引ける」に倒す
 * （利用者を締め出す方向に倒さない）。
 */
export function canDraw(lastDrawnAt: string | null, now: Date, unlimited: boolean): boolean {
  if (unlimited) return true
  if (!lastDrawnAt) return true
  const last = new Date(lastDrawnAt)
  if (Number.isNaN(last.getTime())) return true
  return !isSameLocalDay(last, now)
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
