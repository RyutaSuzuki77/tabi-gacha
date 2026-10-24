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
  // 写真はこの端末にしかない。誤タップで消えないよう、削除は2段にする
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
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
    setConfirmingId(null)
    await deletePhoto(id)
    setPhotos(await listPhotos(pullId))
  }

  return (
    <section className="">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-display text-lg">写真</h3>
        <button onClick={handleAddClick} className="px-2 py-3 text-sm text-kinari/70 underline">
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
        <div className="mb-3 rounded-xl border-2 border-ai-mid bg-ai-mid/40 p-3 text-xs leading-relaxed">
          <p>写真はこの端末の中にだけ保存されます。大切な写真は端末のカメラロールにも残しておいてください。</p>
          <button onClick={acceptNotice} className="mt-2 rounded-full bg-kinari px-5 py-3 font-bold text-sumi">
            わかった
          </button>
        </div>
      )}

      {error && <p className="mb-2 rounded-lg bg-ssr/20 px-3 py-2 text-xs text-ssr">{error}</p>}

      {photos.length === 0 ? (
        <p className="text-xs text-kinari/50">まだ写真がありません。</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <div key={photo.id} className="relative">
              <img
                src={urls[index]}
                alt=""
                className={`aspect-square w-full rounded-xl object-cover ${
                  confirmingId === photo.id ? 'ring-4 ring-beni' : ''
                }`}
              />
              <button
                onClick={() => setConfirmingId(photo.id)}
                aria-label="この写真を削除する"
                className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-bl-xl bg-black/50 text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {confirmingId && (
        <div className="mt-3 rounded-xl border-2 border-beni/60 bg-beni/15 p-3">
          <p className="text-xs leading-relaxed">
            この写真を消します。この端末にしか残っていないので、消すと戻せません。
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => void handleDelete(confirmingId)}
              className="flex-1 rounded-full bg-beni px-4 py-3 text-sm font-bold text-white"
            >
              消す
            </button>
            <button
              onClick={() => setConfirmingId(null)}
              className="flex-1 rounded-full border-2 border-kinari/30 px-4 py-3 text-sm font-bold"
            >
              やめる
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
