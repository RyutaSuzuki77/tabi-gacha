import { describe, expect, it } from 'vitest'
import { canDraw } from './drawLimit'

describe('canDraw', () => {
  const now = new Date('2026-10-24T15:00:00+09:00')

  it('一度も引いていなければ引ける', () => {
    expect(canDraw(null, now, false)).toBe(true)
  })

  it('同じ暦日に引いていれば引けない', () => {
    expect(canDraw('2026-10-24T01:00:00+09:00', now, false)).toBe(false)
  })

  it('前日に引いていれば引ける', () => {
    expect(canDraw('2026-10-23T23:59:00+09:00', now, false)).toBe(true)
  })

  it('デモモードなら同じ日でも引ける', () => {
    expect(canDraw('2026-10-24T01:00:00+09:00', now, true)).toBe(true)
  })

  it('保存値が壊れていれば引ける（引けなくなる方に倒さない）', () => {
    expect(canDraw('not-a-date', now, false)).toBe(true)
  })
})
