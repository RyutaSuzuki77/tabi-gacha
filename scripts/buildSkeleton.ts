/**
 * scripts/raw/towns.csv から骨格の towns.json を作る。
 * 使い方: npx tsx scripts/buildSkeleton.ts [1地方1レア度あたりの件数]
 *
 * 投入済みの実データの形（確認済み）：
 * - 文字コード UTF-8（BOMなし）、改行 CRLF、2,226行
 * - 列名 code,prefecture,name,population
 * - code は6桁（末尾が検査数字）なので5桁に落とす
 * - 都道府県名は47件すべて「北海道」「青森県」…の表記で、地方への割り当てに漏れなし
 * - 集計行（全国計・都道府県計）は含まれない
 *
 * 別のデータに差し替えた場合は、下の normalizeRow を直す。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { buildSkeletonTown, curate, mergeEnrichment, parseCsv } from './skeleton.logic'
import type { Town } from '../src/domain/types'

const INPUT = 'scripts/raw/towns.csv'
const OUTPUT = 'public/data/towns.json'

function normalizeRow(row: Record<string, string>) {
  return {
    // 6桁コードの末尾は検査数字。5桁に落として自治体コードとして使う
    code: row.code.length === 6 ? row.code.slice(0, 5) : row.code,
    prefecture: row.prefecture,
    name: row.name,
    population: row.population,
  }
}

const perRegionPerRarity = Number(process.argv[2] ?? '10')

const rows = parseCsv(readFileSync(INPUT, 'utf8'))
const all = rows
  .map((row) => buildSkeletonTown(normalizeRow(row)))
  .filter((t): t is Town => t !== null)
const selected = curate(all, perRegionPerRarity, Math.random)

// 既存の補完を引き継ぐ。再実行で Claude Code が埋めた内容を失わないため、また
// 利用者の端末に残るカードが参照する町のidを消さないため（仕様 11.3 / 13）
const existing: Town[] = existsSync(OUTPUT) ? JSON.parse(readFileSync(OUTPUT, 'utf8')) : []
const merged = mergeEnrichment(existing, selected)

writeFileSync(OUTPUT, JSON.stringify(merged, null, 2) + '\n', 'utf8')

const carriedOver = merged.filter((t) => t.enriched).length
console.log(`読み込み: ${rows.length} 行`)
console.log(`対象（10万人未満）: ${all.length} 件`)
console.log(`キュレート後: ${selected.length} 件`)
console.log(`補完を引き継いだ町: ${carriedOver} 件`)
console.log(`出力: ${merged.length} 件 → ${OUTPUT}`)
