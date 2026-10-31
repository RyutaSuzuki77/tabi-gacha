import { describe, expect, it } from 'vitest'
import { routeUrl } from './routeUrl'

const dest = '島根県奥出雲町'

describe('routeUrl', () => {
  it('目的地は「都道府県名＋市区町村名」で渡し、公共交通を指定する', () => {
    const url = new URL(routeUrl(dest))
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/')
    expect(url.searchParams.get('api')).toBe('1')
    expect(url.searchParams.get('destination')).toBe('島根県奥出雲町')
    expect(url.searchParams.get('travelmode')).toBe('transit')
  })

  it('目的地の日本語をエンコードする', () => {
    expect(routeUrl(dest)).toContain('destination=%E5%B3%B6%E6%A0%B9%E7%9C%8C')
  })

  it('都道府県名を前置するので同名の市町村が区別できる', () => {
    expect(new URL(routeUrl('東京都府中市')).searchParams.get('destination')).toBe('東京都府中市')
    expect(new URL(routeUrl('広島県府中市')).searchParams.get('destination')).toBe('広島県府中市')
  })

  /**
   * 仕様6.3：出発地は指定しない。origin を付けないとGoogleマップが端末の位置を
   * 出発地に使う。こちらが渡すとスマホではGPSより劣る座標で上書きしてしまう。
   */
  it('origin は常に付けない（Googleマップ側の現在地に任せる）', () => {
    expect(new URL(routeUrl(dest)).searchParams.has('origin')).toBe(false)
  })

  it('URLのパラメータは api / destination / travelmode の3つだけ', () => {
    const keys = [...new URL(routeUrl(dest)).searchParams.keys()].sort()
    expect(keys).toEqual(['api', 'destination', 'travelmode'])
  })
})
