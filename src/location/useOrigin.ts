import { useCallback, useState } from 'react'
import { resolveOrigin } from './resolveOrigin'

type State = 'idle' | 'asking' | 'granted' | 'denied' | 'manual'

/**
 * 出発地を決める。デモモードの擬装座標が渡されていればそれを優先する。
 * 現在地は経路の出発地にしか使わない（仕様 6.3）。
 */
export function useOrigin(fakeOrigin: { lat: number; lng: number } | null) {
  const [state, setState] = useState<State>('idle')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [manualValue, setManualValue] = useState('')

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState('manual')
      return
    }
    setState('asking')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude })
        setState('granted')
      },
      () => setState('denied'),
      { timeout: 10000 },
    )
  }, [])

  const setManual = useCallback((value: string) => {
    setManualValue(value)
    setState('manual')
  }, [])

  return {
    origin: resolveOrigin(fakeOrigin, coords, manualValue),
    state,
    request,
    setManual,
    manualValue,
  }
}
