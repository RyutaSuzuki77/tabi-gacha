import { describe, expect, it } from 'vitest'
import { routeUrl } from './routeUrl'

const dest = '島根県奥出雲町'

describe('routeUrl', () => {
  it('目的地は「都道府県名＋市区町村名」で渡し、公共交通を指定する', () => {
    const url = new URL(routeUrl(dest, null))
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/')
    expect(url.searchParams.get('api')).toBe('1')
    expect(url.searchParams.get('destination')).toBe('島根県奥出雲町')
    expect(url.searchParams.get('travelmode')).toBe('transit')
  })

  it('目的地の日本語をエンコードする', () => {
    expect(routeUrl(dest, null)).toContain('destination=%E5%B3%B6%E6%A0%B9%E7%9C%8C')
  })

  it('都道府県名を前置するので同名の市町村が区別できる', () => {
    expect(new URL(routeUrl('東京都府中市', null)).searchParams.get('destination')).toBe('東京都府中市')
    expect(new URL(routeUrl('広島県府中市', null)).searchParams.get('destination')).toBe('広島県府中市')
  })

  it('出発地が無ければ origin を付けない', () => {
    const url = new URL(routeUrl(dest, null))
    expect(url.searchParams.has('origin')).toBe(false)
  })

  it('座標の出発地を付ける', () => {
    const url = new URL(routeUrl(dest, { kind: 'coords', lat: 34.5, lng: 135.5 }))
    expect(url.searchParams.get('origin')).toBe('34.5,135.5')
  })

  it('日本語の手入力をエンコードする', () => {
    const raw = routeUrl(dest, { kind: 'text', value: '東京駅' })
    expect(raw).toContain('origin=%E6%9D%B1%E4%BA%AC%E9%A7%85')
    expect(new URL(raw).searchParams.get('origin')).toBe('東京駅')
  })

  it('記号や空白を含む手入力も壊れない', () => {
    const raw = routeUrl(dest, { kind: 'text', value: 'JR 新宿駅 & バス停' })
    expect(new URL(raw).searchParams.get('origin')).toBe('JR 新宿駅 & バス停')
  })

  it('空文字や空白だけの手入力は出発地なしとして扱う', () => {
    expect(new URL(routeUrl(dest, { kind: 'text', value: '' })).searchParams.has('origin')).toBe(false)
    expect(new URL(routeUrl(dest, { kind: 'text', value: '   ' })).searchParams.has('origin')).toBe(false)
  })
})
