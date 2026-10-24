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
  // 退避先を先に見る。退避先にキーがあるということは、そのキーの最後の書き込みが
  // 失敗した＝localStorage 側が古いということなので、localStorage を信じてはならない。
  // 容量が尽きた環境では localStorage が「古い値」を返すため、後に見ると引いた直後の
  // カードが巻き戻る。書き込みに成功した時点で退避先から消すので、正常な環境では
  // 退避先は常に空であり、消されたデータが生き返ることもない。
  const fallback = memory.get(key)
  if (fallback !== undefined) return fallback

  try {
    return localStorage.getItem(key)
  } catch {
    // localStorage に触れない環境
    return null
  }
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
