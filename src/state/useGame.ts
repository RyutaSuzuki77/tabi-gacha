import { useCallback, useEffect, useMemo, useState } from 'react'
import { canDraw } from '../domain/drawLimit'
import { createPull } from '../domain/createPull'
import { poolFor, type DrawMode } from '../domain/pool'
import { rankFor } from '../domain/rank'
import { totalPoints } from '../domain/points'
import type { GenericMission, Pull, Town } from '../domain/types'
import { loadGameData } from '../data/loadGameData'
import { loadDemo, saveDemo, type DemoSettings } from '../storage/demoStore'
import { loadProfile, recordDraw } from '../storage/profileStore'
import { addPull, loadPulls, setMissionDone } from '../storage/pullStore'
import { deleteAllPhotos } from '../storage/photoStore'
import { isStorageAvailable, newId, resetIfSchemaChanged } from '../storage/schema'

export function useGame() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [towns, setTowns] = useState<Town[]>([])
  const [generics, setGenerics] = useState<GenericMission[]>([])
  const [pulls, setPulls] = useState<Pull[]>([])
  // 初期化の判定を最初に走らせる。profile より後に置くと、読み込んだ直後の
  // profile を消してしまい、画面と保存内容がずれる
  const [wasReset] = useState(() => resetIfSchemaChanged())
  // 書き込みの可否は一度だけ調べる（描画のたびに localStorage を触らないため）
  const [storageWritable] = useState(() => isStorageAvailable())
  const [profile, setProfile] = useState(() => loadProfile())
  const [demo, setDemo] = useState<DemoSettings>(() => loadDemo())

  useEffect(() => {
    // スキーマ初期化は localStorage のキーしか消さない。写真を消さないと、
    // 存在しない pull に紐づいたまま端末の容量を占め続ける（仕様 13）
    if (wasReset) void deleteAllPhotos()
  }, [wasReset])

  useEffect(() => {
    setPulls(loadPulls())
    loadGameData()
      .then(({ towns, genericMissions }) => {
        setTowns(towns)
        setGenerics(genericMissions)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  const townById = useCallback(
    (id: string) => towns.find((t) => t.id === id),
    [towns],
  )

  const total = useMemo(() => totalPoints(pulls, townById), [pulls, townById])
  const rank = useMemo(() => rankFor(total), [total])
  const canDrawNow = canDraw(profile.lastDrawnAt, new Date(), demo.unlimited)

  const draw = useCallback(
    (mode: DrawMode): Pull | null => {
      if (!canDrawNow) return null
      const pool = poolFor(towns, mode)
      const pull = createPull({
        pool,
        generics,
        rng: Math.random,
        memberId: profile.memberId,
        now: new Date(),
        newId,
        forcedRarity: demo.forcedRarity ?? undefined,
      })
      if (!pull) return null
      setPulls(addPull(pull))
      setProfile(recordDraw(new Date()))
      return pull
    },
    [canDrawNow, towns, generics, profile.memberId, demo.forcedRarity],
  )

  const toggleMission = useCallback((pullId: string, index: number, done: boolean) => {
    setPulls(setMissionDone(pullId, index, done))
  }, [])

  const updateDemo = useCallback((next: DemoSettings) => {
    saveDemo(next)
    setDemo(next)
  }, [])

  return {
    status, towns, generics, pulls, profile, demo, wasReset, storageWritable,
    total, rank, canDrawNow, townById,
    draw, toggleMission, updateDemo,
  }
}
