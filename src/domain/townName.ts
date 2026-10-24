/**
 * 町名を郡と市町村に分ける。
 *
 * e-Stat の市町村名は「紋別郡西興部村」のように郡を含む。表示では郡を小さく、
 * 市町村名を大きく置きたいので分割する。郡を落とさないのは、同名の村が別の郡に
 * あるときに区別がつかなくなるため（データ側は元のまま保つ）。
 */
export function splitTownName(name: string): { county: string; town: string } {
  const index = name.indexOf('郡')
  // 末尾の「郡」は郡そのものの名前（集計行）。分けずにそのまま返す
  if (index === -1 || index === name.length - 1) return { county: '', town: name }
  return { county: name.slice(0, index + 1), town: name.slice(index + 1) }
}
