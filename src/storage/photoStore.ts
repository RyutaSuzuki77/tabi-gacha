import type { Photo } from '../domain/types'
import { newId } from './schema'

const DB_NAME = 'tabi-gacha'
const DB_VERSION = 1
const STORE = 'photos'

export type PhotoErrorReason = 'unavailable' | 'quota' | 'unknown'

/**
 * IndexedDB に実際に入れる形。
 *
 * `Blob` を直接入れると構造化複製の対応が環境依存で、画像の中身が落ちることがある
 * （テスト環境では size が失われた）。ArrayBuffer と MIME タイプに分けて持てば
 * どの環境でも確実に複製でき、読み出し時に Blob を組み直せる。
 */
type StoredPhoto = {
  id: string
  pullId: string
  bytes: ArrayBuffer
  type: string
  takenAt: string
}

function toPhoto(stored: StoredPhoto): Photo {
  return {
    id: stored.id,
    pullId: stored.pullId,
    blob: new Blob([stored.bytes], { type: stored.type }),
    takenAt: stored.takenAt,
  }
}

export function classifyPhotoError(error: unknown): PhotoErrorReason {
  if (error instanceof DOMException) {
    if (error.name === 'QuotaExceededError') return 'quota'
    if (error.name === 'InvalidStateError' || error.name === 'SecurityError') return 'unavailable'
  }
  return 'unknown'
}

/** IndexedDBが使えない環境では null を返す（写真機能だけを無効化するため。仕様 13） */
export function openPhotoDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null)
      return
    }
    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION)
    } catch {
      resolve(null)
      return
    }
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('pullId', 'pullId', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  })
}

export async function addPhoto(
  pullId: string,
  blob: Blob,
  now: Date,
): Promise<{ ok: true; photo: Photo } | { ok: false; reason: PhotoErrorReason }> {
  const db = await openPhotoDb()
  if (!db) return { ok: false, reason: 'unavailable' }

  const stored: StoredPhoto = {
    id: newId(),
    pullId,
    bytes: await blob.arrayBuffer(),
    type: blob.type,
    takenAt: now.toISOString(),
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(stored)
      tx.oncomplete = () => resolve({ ok: true, photo: toPhoto(stored) })
      tx.onerror = () => resolve({ ok: false, reason: classifyPhotoError(tx.error) })
      tx.onabort = () => resolve({ ok: false, reason: classifyPhotoError(tx.error) })
    } catch (error) {
      resolve({ ok: false, reason: classifyPhotoError(error) })
    }
  })
}

export async function listPhotos(pullId: string): Promise<Photo[]> {
  const db = await openPhotoDb()
  if (!db) return []

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly')
      const request = tx.objectStore(STORE).index('pullId').getAll(pullId)
      request.onsuccess = () => {
        const stored = (request.result as StoredPhoto[]) ?? []
        resolve(
          [...stored]
            .sort((a, b) => a.takenAt.localeCompare(b.takenAt))
            .map(toPhoto),
        )
      }
      request.onerror = () => resolve([])
    } catch {
      resolve([])
    }
  })
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await openPhotoDb()
  if (!db) return

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    } catch {
      resolve()
    }
  })
}
