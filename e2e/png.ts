import { deflateSync, crc32 } from 'node:zlib'

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** 単色の正方形PNGを生成する。size がそのまま naturalWidth になる（どの写真か見分ける用） */
export function makePng(size: number, rgb: [number, number, number]): Buffer {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // truecolor
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: size }, () => rgb).flat())])
  const raw = Buffer.concat(Array.from({ length: size }, () => row))
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

export function pngFile(name: string, size: number, rgb: [number, number, number]) {
  return { name, mimeType: 'image/png', buffer: makePng(size, rgb) }
}
