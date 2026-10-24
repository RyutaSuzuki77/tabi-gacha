import { describe, expect, it } from 'vitest'
import { resolveOrigin } from './resolveOrigin'

describe('resolveOrigin', () => {
  it('何もなければ null', () => {
    expect(resolveOrigin(null, null, '')).toBeNull()
  })

  it('現在地の座標を使う', () => {
    expect(resolveOrigin(null, { lat: 35, lng: 135 }, '')).toEqual({ kind: 'coords', lat: 35, lng: 135 })
  })

  it('手入力があれば現在地より優先する（仕様 6.3：手入力は常に用意する）', () => {
    // PCの現在地はIP推定で県が違うことがある。利用者が手で直したものを無視してはならない
    expect(resolveOrigin(null, { lat: 35, lng: 135 }, '東京駅')).toEqual({ kind: 'text', value: '東京駅' })
  })

  it('手入力が空白だけなら現在地に戻る', () => {
    expect(resolveOrigin(null, { lat: 35, lng: 135 }, '   ')).toEqual({ kind: 'coords', lat: 35, lng: 135 })
  })

  it('デモモードの擬装座標は何より優先する', () => {
    expect(resolveOrigin({ lat: 1, lng: 2 }, { lat: 35, lng: 135 }, '東京駅')).toEqual({ kind: 'coords', lat: 1, lng: 2 })
  })
})
