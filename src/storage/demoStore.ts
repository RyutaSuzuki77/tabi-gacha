import type { Rarity } from '../domain/types'
import { KEYS, readJson, writeJson } from './schema'

export type DemoSettings = {
  unlimited: boolean
  forcedRarity: Rarity | null
  fakeOrigin: { lat: number; lng: number } | null
}

export const DEMO_DEFAULTS: DemoSettings = {
  unlimited: false,
  forcedRarity: null,
  fakeOrigin: null,
}

export function loadDemo(): DemoSettings {
  const stored = readJson<Partial<DemoSettings>>(KEYS.demo, {})
  return { ...DEMO_DEFAULTS, ...stored }
}

export function saveDemo(settings: DemoSettings): void {
  writeJson(KEYS.demo, settings)
}
