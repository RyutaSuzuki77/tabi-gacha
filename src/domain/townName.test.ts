import { describe, expect, it } from 'vitest'
import { splitTownName } from './townName'

describe('splitTownName', () => {
  it('郡を含む名前を郡と町村に分ける', () => {
    expect(splitTownName('紋別郡西興部村')).toEqual({ county: '紋別郡', town: '西興部村' })
    expect(splitTownName('南会津郡檜枝岐村')).toEqual({ county: '南会津郡', town: '檜枝岐村' })
  })

  it('郡を含まない市はそのまま町村側に入る', () => {
    expect(splitTownName('千歳市')).toEqual({ county: '', town: '千歳市' })
  })

  it('郡が末尾にある場合（集計行）は分けない', () => {
    // 検証で弾かれるはずの形だが、表示側で崩れないようにしておく
    expect(splitTownName('鹿角郡')).toEqual({ county: '', town: '鹿角郡' })
  })

  it('空文字でも落ちない', () => {
    expect(splitTownName('')).toEqual({ county: '', town: '' })
  })
})
