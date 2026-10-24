import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { validateTowns } from './validateTowns'
import type { GenericMission } from '../src/domain/types'

const TOWNS = 'public/data/towns.json'
const GENERICS = 'public/data/generic-missions.json'

describe('public/data の実データ', () => {
  it.runIf(existsSync(TOWNS) && existsSync(GENERICS))('検証を通る', () => {
    const towns = JSON.parse(readFileSync(TOWNS, 'utf8'))
    const generics = JSON.parse(readFileSync(GENERICS, 'utf8')) as GenericMission[]
    const errors = validateTowns(towns, generics)
    expect(errors, JSON.stringify(errors.slice(0, 20), null, 2)).toEqual([])
  })

  it.runIf(existsSync(GENERICS))('汎用プールに条件なしのミッションが3つ以上ある', () => {
    const generics = JSON.parse(readFileSync(GENERICS, 'utf8')) as GenericMission[]
    const unconditional = generics.filter((m) => m.requiredTags.length === 0)
    expect(unconditional.length).toBeGreaterThanOrEqual(3)
  })
})
