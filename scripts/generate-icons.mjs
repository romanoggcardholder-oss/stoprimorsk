import { deflateSync } from "node:zlib"
import { writeFileSync, mkdirSync } from "node:fs"

function crc(bytes) {
  let value = 0xffffffff
  for (const byte of bytes) {
    value ^= byte
    for (let bit = 0; bit < 8; bit += 1) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0)
  }
  return value ^ 0xffffffff
}

function chunk(type, data) {
  const name = Buffer.from(type)
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const checksum = Buffer.alloc(4)
  checksum.writeUInt32BE((crc(Buffer.concat([name, data])) >>> 0))
  return Buffer.concat([length, name, data, checksum])
}

function png(size) {
  const rows = []
  for (let y = 0; y < size; y += 1) {
    const row = Buffer.alloc(1 + size * 3)
    for (let x = 0; x < size; x += 1) {
      const nx = x / size
      const ny = y / size
      const inBody = ny > 0.48 && ny < 0.68 && nx > 0.16 && nx < 0.86
      const cabin = ny > 0.36 && ny < 0.5 && nx > 0.3 && nx < 0.62
      const wheel = (nx - 0.32) ** 2 + (ny - 0.68) ** 2 < 0.004 || (nx - 0.7) ** 2 + (ny - 0.68) ** 2 < 0.004
      const yellow = inBody || cabin
      const graphite = wheel
      const color = graphite ? [32, 33, 36] : yellow ? [255, 201, 40] : [247, 248, 250]
      row[1 + x * 3] = color[0]
      row[2 + x * 3] = color[1]
      row[3 + x * 3] = color[2]
    }
    rows.push(row)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

mkdirSync("public/icons", { recursive: true })
writeFileSync("public/icons/icon-192.png", png(192))
writeFileSync("public/icons/icon-512.png", png(512))
writeFileSync("public/icons/apple-touch-icon.png", png(180))
writeFileSync("src/app/icon.png", png(192))
