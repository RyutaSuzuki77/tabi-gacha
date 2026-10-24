import type { Profile } from '../domain/types'
import { KEYS, SCHEMA_VERSION, newId, readJson, writeJson } from './schema'

function isProfile(value: unknown): value is Profile {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Profile).memberId === 'string' &&
    (value as Profile).memberId.length > 0
  )
}

/** profile を読む。無い・壊れている場合は member_id を発行して新規作成する */
export function loadProfile(): Profile {
  const stored = readJson<unknown>(KEYS.profile, null)
  if (isProfile(stored)) return stored

  const created: Profile = {
    memberId: newId(),
    lastDrawnAt: null,
    schemaVersion: SCHEMA_VERSION,
  }
  writeJson(KEYS.profile, created)
  return created
}

export function saveProfile(profile: Profile): void {
  writeJson(KEYS.profile, profile)
}

/** 引いた日時を記録する（1日1回の判定に使う） */
export function recordDraw(now: Date): Profile {
  const next: Profile = { ...loadProfile(), lastDrawnAt: now.toISOString() }
  saveProfile(next)
  return next
}
