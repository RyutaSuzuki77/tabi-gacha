import { useEffect, useRef, useState } from 'react'
import type { Photo } from '../../domain/types'
import { addPhoto, deletePhoto, listPhotos, type PhotoErrorReason } from '../../storage/photoStore'
import { KEYS, readJson, writeJson } from '../../storage/schema'

const MESSAGES: Record<PhotoErrorReason, string> = {
  unavailable: 'このブラウザでは写真を保存できません。',
  quota: '端末の空き容量が足りず、写真を保存できませんでした。',
  unknown: '写真を保存できませんでした。',
}

export function PhotoSection({ pullId }: { pullId: string }) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [urls, setUrls] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showNotice, setShowNotice] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    listPhotos(pullId).then(setPhotos)
  }, [pullId])

  useEffect(() => {
    const next = photos.map((p) => URL.createObjectURL(p.blob))
    setUrls(next)
    return () => next.forEach((url) => URL.revokeObjectURL(url))
  }, [photos])

  function handleAddClick() {
    const seen = readJson<boolean>(KEYS.photoNotice, false)
    if (!seen) {
      setShowNotice(true)
      return
    }
    inputRef.current?.click()
  }

  function acceptNotice() {
    writeJson(KEYS.photoNotice, true)
    setShowNotice(false)
    inputRef.current?.click()
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    const result = await addPhoto(pullId, file, new Date())
    if (result.ok) {
      setError(null)
      setPhotos(await listPhotos(pullId))
    } else {
      setError(MESSAGES[result.reason])
    }
  }

  async function handleDelete(id: string) {
    await deletePhoto(id)
    setPhotos(await listPhotos(pullId))
  }

  return (
    <section className="border-t border-stone-200 pt-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold">写真</h3>
        <button onClick={handleAddClick} className="py-2 text-sm text-stone-500 underline">
          ＋追加
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          void handleFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      {showNotice && (
        <div className="mb-3 rounded-lg bg-stone-50 p-3 text-xs leading-relaxed text-stone-600">
          <p>写真はこの端末の中にだけ保存されます。大切な写真は端末のカメラロールにも残しておいてください。</p>
          <button onClick={acceptNotice} className="mt-2 rounded bg-stone-900 px-3 py-2 text-white">
            わかった
          </button>
        </div>
      )}

      {error && <p className="mb-2 text-xs text-amber-700">{error}</p>}

      {photos.length === 0 ? (
        <p className="text-xs text-stone-400">まだ写真がありません。</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <div key={photo.id} className="relative">
              <img
                src={urls[index]}
                alt=""
                className="aspect-square w-full rounded object-cover"
              />
              <button
                onClick={() => void handleDelete(photo.id)}
                className="absolute right-1 top-1 rounded bg-black/60 px-2 py-1 text-xs text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
