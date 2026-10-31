import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const GOREV_KOKU = fileURLToPath(new URL('../gorevler/', import.meta.url))

export function gorevleriYukle(kok = GOREV_KOKU) {
  return readdirSync(kok, { withFileTypes: true })
    .filter((girdi) => girdi.isDirectory())
    .map((girdi) => girdi.name)
    .sort()
    .map((ad) => {
      const dizin = join(kok, ad)
      const meta = JSON.parse(readFileSync(join(dizin, 'meta.json'), 'utf8'))
      return { ...meta, dizin, talimat: readFileSync(join(dizin, 'gorev.md'), 'utf8') }
    })
}
