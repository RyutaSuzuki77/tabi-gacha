/**
 * Googleマップの経路URLを組み立てる（仕様 6.1）。
 * APIキーは不要。所要時間や経路の算出はGoogleマップ側に委譲する。
 *
 * 目的地は緯度経度ではなく「都道府県名＋市区町村名」のテキストで渡す。
 * Maps URLs は地名を受け付けるため座標が不要になり、測地系のズレや代表点の
 * 選び方の問題を抱えずに済む（仕様 6.1）。都道府県名を前置すれば同名の市町村も
 * 一意に定まる。
 *
 * 出発地（origin）は付けない（仕様 6.3）。省略するとGoogleマップが端末の位置を
 * 出発地に使う。こちらから渡すと、スマホではGPSより精度の劣るブラウザの座標で
 * 上書きしてしまう。出発地を変えたい利用者はGoogleマップ側で編集する。
 */
export function routeUrl(destination: string): string {
  const params = new URLSearchParams({
    api: '1',
    destination,
    travelmode: 'transit',
  })

  return `https://www.google.com/maps/dir/?${params.toString()}`
}
