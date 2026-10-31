import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Ajan yalnızca görevin başlangıç dosyalarını görür; gizli testler ve referans çözüm buraya kopyalanmaz.
export function calismaAlaniHazirla(gorev) {
  const dizin = mkdtempSync(join(tmpdir(), `ajan-${gorev.id}-`))
  cpSync(join(gorev.dizin, 'baslangic'), dizin, { recursive: true })
  return { dizin, testIzi: testIziAl(dizin, gorev.testDosyalari) }
}

// Silinen test dosyası null olarak kaydedilir, böylece silme de değişiklik sayılır.
export function testIziAl(dizin, dosyalar) {
  return Object.fromEntries(
    dosyalar.map((ad) => {
      const yol = join(dizin, ad)
      const iz = existsSync(yol) ? createHash('sha256').update(readFileSync(yol)).digest('hex') : null
      return [ad, iz]
    }),
  )
}

export function calismaAlaniniSil(dizin) {
  rmSync(dizin, { recursive: true, force: true })
}
