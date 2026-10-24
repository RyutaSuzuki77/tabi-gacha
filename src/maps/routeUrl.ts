export type Origin =
  | { kind: 'coords'; lat: number; lng: number }
  | { kind: 'text'; value: string }
  | null

/**
 * Googleマップの経路URLを組み立てる（仕様 6.1）。
 * APIキーは不要。所要時間や経路の算出はGoogleマップ側に委譲する。
 *
 * 目的地は緯度経度ではなく「都道府県名＋市区町村名」のテキストで渡す。
 * Maps URLs は地名を受け付けるため座標が不要になり、測地系のズレや代表点の
 * 選び方の問題を抱えずに済む（仕様 6.1）。都道府県名を前置すれば同名の市町村も
 * 一意に定まる。
 */
export function routeUrl(destination: string, origin: Origin): string {
  const params = new URLSearchParams({
    api: '1',
    destination,
    travelmode: 'transit',
  })

  const originValue = formatOrigin(origin)
  if (originValue) params.set('origin', originValue)

  return `https://www.google.com/maps/dir/?${params.toString()}`
}

function formatOrigin(origin: Origin): string | null {
  if (!origin) return null
  if (origin.kind === 'coords') return `${origin.lat},${origin.lng}`
  const trimmed = origin.value.trim()
  return trimmed === '' ? null : trimmed
}
