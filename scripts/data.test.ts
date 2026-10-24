import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { validateGenericMissions, validateTowns } from './validateTowns'
import { createPull } from '../src/domain/createPull'
import { poolFor, type DrawMode } from '../src/domain/pool'
import { REGIONS, type GenericMission, type Town } from '../src/domain/types'

const TOWNS = 'public/data/towns.json'
const GENERICS = 'public/data/generic-missions.json'

describe('public/data の実データ', () => {
  it.runIf(existsSync(TOWNS) && existsSync(GENERICS))('検証を通る', () => {
    const towns = JSON.parse(readFileSync(TOWNS, 'utf8'))
    const generics = JSON.parse(readFileSync(GENERICS, 'utf8')) as GenericMission[]
    const errors = validateTowns(towns, generics)
    expect(errors, JSON.stringify(errors.slice(0, 20), null, 2)).toEqual([])
  })

  it.runIf(existsSync(GENERICS))('汎用プールの検証を通る', () => {
    const generics = JSON.parse(readFileSync(GENERICS, 'utf8'))
    const errors = validateGenericMissions(generics)
    expect(errors, JSON.stringify(errors.slice(0, 20), null, 2)).toEqual([])
  })
})

describe('実データでガチャが成立する', () => {
  const towns: Town[] = existsSync(TOWNS) ? JSON.parse(readFileSync(TOWNS, 'utf8')) : []
  const generics: GenericMission[] = existsSync(GENERICS)
    ? JSON.parse(readFileSync(GENERICS, 'utf8'))
    : []
  const ready = towns.length > 0 && generics.length > 0

  function pullOnce(mode: DrawMode, forcedRarity?: Town['rarity']) {
    return createPull({
      pool: poolFor(towns, mode),
      generics,
      rng: Math.random,
      memberId: 'test',
      now: new Date(),
      newId: () => 'id',
      forcedRarity,
    })
  }

  it.runIf(ready)('全国モードで100回引いて、毎回ミッション3枚の pull ができる', () => {
    for (let i = 0; i < 100; i++) {
      const pull = pullOnce({ kind: 'nationwide' })
      expect(pull, `${i}回目`).not.toBeNull()
      expect(pull!.missions, `${i}回目`).toHaveLength(3)
      expect(pull!.missions[0].kind).toBe('unique')
      // 汎用2枚はプールに実在するIDを指していること
      for (const m of pull!.missions.slice(1)) {
        expect(generics.some((g) => g.id === m.genericMissionId), String(m.genericMissionId)).toBe(true)
      }
      // 引いた町は生成済みであること
      expect(towns.find((t) => t.id === pull!.townId)!.enriched).toBe(true)
    }
  })

  it.runIf(ready)('8地方すべてで引ける', () => {
    for (const region of REGIONS) {
      const pull = pullOnce({ kind: 'region', region })
      expect(pull, region).not.toBeNull()
      expect(towns.find((t) => t.id === pull!.townId)!.region).toBe(region)
    }
  })

  it.runIf(ready)('4レア度すべてを指定して引ける（デモモードのレア度固定）', () => {
    for (const rarity of ['SSR', 'SR', 'R', 'N'] as const) {
      const pull = pullOnce({ kind: 'nationwide' }, rarity)
      expect(pull, rarity).not.toBeNull()
      expect(towns.find((t) => t.id === pull!.townId)!.rarity).toBe(rarity)
    }
  })

  it.runIf(ready)('どの地方でも全レア度を指定して引ける', () => {
    for (const region of REGIONS) {
      for (const rarity of ['SSR', 'SR', 'R', 'N'] as const) {
        const pull = pullOnce({ kind: 'region', region }, rarity)
        expect(pull, `${region}/${rarity}`).not.toBeNull()
      }
    }
  })
})
