import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addPhoto, classifyPhotoError, deleteAllPhotos, deletePhoto, listPhotos } from './photoStore'

function blob(text: string): Blob {
  return new Blob([text], { type: 'image/png' })
}

beforeEach(async () => {
  for (const photo of await listPhotos('p1')) await deletePhoto(photo.id)
  for (const photo of await listPhotos('p2')) await deletePhoto(photo.id)
})

describe('classifyPhotoError', () => {
  it('容量超過を quota に分類する', () => {
    expect(classifyPhotoError(new DOMException('full', 'QuotaExceededError'))).toBe('quota')
  })

  it('IndexedDBが開けない場合を unavailable に分類する', () => {
    expect(classifyPhotoError(new DOMException('no', 'InvalidStateError'))).toBe('unavailable')
    expect(classifyPhotoError(new DOMException('no', 'SecurityError'))).toBe('unavailable')
  })

  it('それ以外は unknown', () => {
    expect(classifyPhotoError(new Error('何か'))).toBe('unknown')
    expect(classifyPhotoError(null)).toBe('unknown')
  })
})

describe('photoStore', () => {
  it('写真が無ければ空配列', async () => {
    expect(await listPhotos('p1')).toEqual([])
  })

  it('追加した写真を pull ごとに読み戻せる', async () => {
    const now = new Date('2026-10-24T06:00:00.000Z')
    const result = await addPhoto('p1', blob('a'), now)
    expect(result.ok).toBe(true)

    const photos = await listPhotos('p1')
    expect(photos).toHaveLength(1)
    expect(photos[0].pullId).toBe('p1')
    expect(photos[0].takenAt).toBe('2026-10-24T06:00:00.000Z')
    expect(photos[0].blob.size).toBeGreaterThan(0)
  })

  it('別の pull の写真は混ざらない', async () => {
    await addPhoto('p1', blob('a'), new Date())
    await addPhoto('p2', blob('b'), new Date())
    expect(await listPhotos('p1')).toHaveLength(1)
    expect(await listPhotos('p2')).toHaveLength(1)
  })

  it('1つの pull に複数枚ぶら下げられる', async () => {
    await addPhoto('p1', blob('a'), new Date())
    await addPhoto('p1', blob('b'), new Date())
    expect(await listPhotos('p1')).toHaveLength(2)
  })

  it('削除できる', async () => {
    const result = await addPhoto('p1', blob('a'), new Date())
    if (!result.ok) throw new Error('追加に失敗した')
    await deletePhoto(result.photo.id)
    expect(await listPhotos('p1')).toEqual([])
  })
})

describe('deleteAllPhotos', () => {
  it('すべての写真を消す（スキーマ初期化時に孤児を残さない）', async () => {
    await addPhoto('p1', blob('a'), new Date())
    await addPhoto('p2', blob('b'), new Date())
    await deleteAllPhotos()
    expect(await listPhotos('p1')).toEqual([])
    expect(await listPhotos('p2')).toEqual([])
  })
})

describe('保存に失敗したとき', () => {
  it('容量超過なら quota を返して落ちない', async () => {
    const original = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function () {
      throw new DOMException('full', 'QuotaExceededError')
    } as typeof original
    try {
      const result = await addPhoto('p1', blob('a'), new Date())
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.reason).toBe('quota')
    } finally {
      IDBObjectStore.prototype.put = original
    }
  })
}) 

describe('接続の後始末', () => {
  it('連続して2回保存しても2件読み戻せる', async () => {
    await addPhoto('p1', blob('a'), new Date('2026-10-24T06:00:00.000Z'))
    await addPhoto('p1', blob('b'), new Date('2026-10-24T06:00:01.000Z'))
    expect(await listPhotos('p1')).toHaveLength(2)
  })

  it('各操作は成功・失敗のどちらでも接続を閉じる', async () => {
    const close = vi.spyOn(IDBDatabase.prototype, 'close')
    try {
      const added = await addPhoto('p1', blob('a'), new Date())
      await listPhotos('p1')
      if (added.ok) await deletePhoto(added.photo.id)
      await deleteAllPhotos()
      expect(close).toHaveBeenCalledTimes(4)

      const original = IDBObjectStore.prototype.put
      IDBObjectStore.prototype.put = function () {
        throw new DOMException('full', 'QuotaExceededError')
      } as typeof original
      try {
        await addPhoto('p1', blob('a'), new Date())
      } finally {
        IDBObjectStore.prototype.put = original
      }
      expect(close).toHaveBeenCalledTimes(5)
    } finally {
      close.mockRestore()
    }
  })
})
