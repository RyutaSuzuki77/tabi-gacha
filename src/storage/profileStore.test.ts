import { beforeEach, describe, expect, it, vi } from 'vitest'
import { KEYS, SCHEMA_VERSION, resetIfSchemaChanged } from './schema'
import { loadProfile, recordDraw, saveProfile } from './profileStore'

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('loadProfile', () => {
  it('初回は member_id を発行して返す', () => {
    const profile = loadProfile()
    expect(profile.memberId).toMatch(/\S/)
    expect(profile.lastDrawnAt).toBeNull()
    expect(profile.schemaVersion).toBe(SCHEMA_VERSION)
  })

  it('2回目は同じ member_id を返す（発行し直さない）', () => {
    const first = loadProfile()
    const second = loadProfile()
    expect(second.memberId).toBe(first.memberId)
  })

  it('保存した内容を読み戻せる', () => {
    const profile = loadProfile()
    saveProfile({ ...profile, lastDrawnAt: '2026-10-24T00:00:00.000Z' })
    expect(loadProfile().lastDrawnAt).toBe('2026-10-24T00:00:00.000Z')
  })

  it('壊れたJSONが入っていても落ちず、新しい profile を返す', () => {
    localStorage.setItem(KEYS.profile, '{ broken')
    expect(loadProfile().memberId).toMatch(/\S/)
  })
})

describe('recordDraw', () => {
  it('引いた日時を記録する', () => {
    const now = new Date('2026-10-24T06:00:00.000Z')
    const profile = recordDraw(now)
    expect(profile.lastDrawnAt).toBe(now.toISOString())
    expect(loadProfile().lastDrawnAt).toBe(now.toISOString())
  })
})

describe('resetIfSchemaChanged', () => {
  it('バージョンが一致していれば初期化しない', () => {
    localStorage.setItem(KEYS.version, String(SCHEMA_VERSION))
    localStorage.setItem(KEYS.pulls, '[1]')
    expect(resetIfSchemaChanged()).toBe(false)
    expect(localStorage.getItem(KEYS.pulls)).toBe('[1]')
  })

  it('バージョンが違えばアプリのデータを消し、true を返す', () => {
    localStorage.setItem(KEYS.version, '0')
    localStorage.setItem(KEYS.pulls, '[1]')
    localStorage.setItem(KEYS.profile, '{}')
    expect(resetIfSchemaChanged()).toBe(true)
    expect(localStorage.getItem(KEYS.pulls)).toBeNull()
    expect(localStorage.getItem(KEYS.profile)).toBeNull()
    expect(localStorage.getItem(KEYS.version)).toBe(String(SCHEMA_VERSION))
  })

  it('初回（バージョン未記録）は初期化扱いにしない', () => {
    expect(resetIfSchemaChanged()).toBe(false)
    expect(localStorage.getItem(KEYS.version)).toBe(String(SCHEMA_VERSION))
  })
})

describe('localStorage が使えない環境', () => {
  it('書き込みが失敗したあと、古い localStorage の値ではなく新しい値を返す', () => {
    // 容量が尽きた環境：書き込みは失敗するが、localStorage には古い値が残っている。
    // 退避先を先に見ないと、引いた直後のカードが古い内容に巻き戻る
    const first = loadProfile()
    saveProfile({ ...first, lastDrawnAt: '2026-10-20T00:00:00.000Z' })
    expect(loadProfile().lastDrawnAt).toBe('2026-10-20T00:00:00.000Z')

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    saveProfile({ ...first, lastDrawnAt: '2026-10-24T00:00:00.000Z' })
    expect(loadProfile().lastDrawnAt).toBe('2026-10-24T00:00:00.000Z')
  })

  it('書き込みが例外を投げても落ちず、同一セッション内では読み戻せる', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    const profile = loadProfile()
    saveProfile({ ...profile, lastDrawnAt: '2026-10-24T00:00:00.000Z' })
    expect(loadProfile().lastDrawnAt).toBe('2026-10-24T00:00:00.000Z')
  })
})
