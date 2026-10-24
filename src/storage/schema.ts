export const SCHEMA_VERSION = 1

export const KEYS = {
  version: 'tabi-gacha:schemaVersion',
  profile: 'tabi-gacha:profile',
  pulls: 'tabi-gacha:pulls',
  demo: 'tabi-gacha:demo',
  photoNotice: 'tabi-gacha:photoNoticeSeen',
} as const

/**
 * localStorage が書けない環境（プライベートブラウズ等）のための退避先。
 *
 * ここに入るのは **localStorage への書き込みが失敗した値だけ**。書き込みに
 * 成功した時点で該当キーを削除する。常に退避させてしまうと、消された
 * localStorage をこのメモリが上書きして、削除済みのデータが生き返る
 * （利用者が別タブでサイトデータを消した場合に実際に起きる）。
 */
const memory = new Map<string, string>()

function getItem(key: string): string | null {
  try {
    const value = localStorage.getItem(key)
    if (value !== null) return value
  } catch {
    // localStorage に触れない環境
  }
  // 書き込みに失敗したキーだけが退避先にある。
  // 「書き込みは失敗するが読み取りは成功して空を返す」環境（Safari の
  // プライベートモード等）では、ここを見ないと同一セッション内で読み戻せない。
  return memory.get(key) ?? null
}

function setItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    memory.delete(key)
    return true
  } catch {
    memory.set(key, value)
    return false
  }
}

function removeItem(key: string): void {
  memory.delete(key)
  try {
    localStorage.removeItem(key)
  } catch {
    // 無視する
  }
}

export function isStorageAvailable(): boolean {
  try {
    const probe = 'tabi-gacha:probe'
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

export function readJson<T>(key: string, fallback: T): T {
  const raw = getItem(key)
  if (raw === null) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown): boolean {
  return setItem(key, JSON.stringify(value))
}

export function resetIfSchemaChanged(): boolean {
  const stored = getItem(KEYS.version)
  if (stored === String(SCHEMA_VERSION)) return false

  const isFirstRun = stored === null
  if (!isFirstRun) {
    removeItem(KEYS.profile)
    removeItem(KEYS.pulls)
    removeItem(KEYS.demo)
    removeItem(KEYS.photoNotice)
  }
  setItem(KEYS.version, String(SCHEMA_VERSION))
  return !isFirstRun
}

export function newId(): string {
  const cryptoObj = globalThis.crypto
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID()
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
