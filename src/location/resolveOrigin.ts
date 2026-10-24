import type { Origin } from '../maps/routeUrl'

/**
 * 出発地を決める（仕様 6.3）。
 *
 * 手入力を現在地より優先する。PCの現在地はIP推定で県を外すことがあり、
 * 利用者が手で直したものを無視してはならない。仕様6.3は「手入力の経路は常に
 * 用意しておく」と定めている。
 */
export function resolveOrigin(
  fakeOrigin: { lat: number; lng: number } | null,
  coords: { lat: number; lng: number } | null,
  manualValue: string,
): Origin {
  if (fakeOrigin) return { kind: 'coords', lat: fakeOrigin.lat, lng: fakeOrigin.lng }
  if (manualValue.trim() !== '') return { kind: 'text', value: manualValue }
  if (coords) return { kind: 'coords', lat: coords.lat, lng: coords.lng }
  return null
}
