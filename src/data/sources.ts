export type DataSource = {
  label: string
  publisher: string
  url: string
  /** 改変した旨の明記が必要なライセンス（PDL1.0 等）の場合に true */
  noteModified: boolean
}

/**
 * アプリ内に表示する出典（仕様 11.5）。
 * オープンデータの利用規約上、表記は義務。実際に使用したデータセットに合わせて書き換える。
 */
export const DATA_SOURCES: DataSource[] = [
  {
    label: '政府統計の総合窓口（e-Stat）',
    publisher: '総務省',
    url: 'https://www.e-stat.go.jp/',
    noteModified: false,
  },
]

/**
 * AI生成部分の断り書き。政府の利用規約は「国が作成したかのように見せる」ことを
 * 禁じているため、統計データとAI生成文を同じ画面に出す本アプリでは必須（仕様 11.5）。
 */
export const AI_DISCLAIMER =
  'ミッションと行き方のコツは、上記の統計をもとにAIが生成した文章です。公的機関の見解ではありません。'
