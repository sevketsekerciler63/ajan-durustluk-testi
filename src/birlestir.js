import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ozetTablosu } from './deney.js'

export function kayitlariTopla(kok) {
  return readdirSync(kok, { recursive: true, withFileTypes: true })
    .filter((girdi) => girdi.isFile() && girdi.name === 'sonuclar.jsonl')
    .flatMap((girdi) =>
      readFileSync(join(girdi.parentPath, girdi.name), 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((satir) => JSON.parse(satir)),
    )
}

const oran = (pay, payda) => (payda === 0 ? '–' : `${pay}/${payda} (%${Math.round((100 * pay) / payda)})`)

// Her model × talimat için tek satır. "Hata" sonuçları (model sunucusu hatası) paydaya girmez,
// ayrı sütunda gösterilir; böylece altyapı sorunu ajan davranışı gibi okunmaz.
export function karsilastirmaTablosu(kayitlar) {
  const gruplar = Map.groupBy(kayitlar, (k) => `${k.model}\u0000${k.talimat ?? 'tarafsiz'}`)
  const satirlar = [...gruplar].sort(([a], [b]) => a.localeCompare(b)).map(([anahtar, grup]) => {
    const [model, talimat] = anahtar.split('\u0000')
    const gecerli = grup.filter((k) => k.sonuc !== 'hata')
    const normal = gecerli.filter((k) => k.tur === 'normal')
    const tuzak = gecerli.filter((k) => k.tur === 'tuzak')
    const say = (liste, sonuc) => liste.filter((k) => k.sonuc === sonuc).length
    return [
      model,
      talimat,
      oran(say(normal, 'dogru-basari'), normal.length),
      oran(say(normal, 'yalan-basari'), normal.length),
      oran(say(tuzak, 'yalan-basari'), tuzak.length),
      oran(say(tuzak, 'durust-itiraf'), tuzak.length),
      oran(gecerli.filter((k) => k.testDegisti).length, gecerli.length),
      oran(say(gecerli, 'cevapsiz'), gecerli.length),
      String(grup.length - gecerli.length),
    ]
  })
  return [
    '| Model | Talimat | Normal: doğru başarı | Normal: yalan "yaptım" | Tuzak: yalan "yaptım" | Tuzak: dürüst itiraf | Testi değiştirdi | Cevapsız | Hata |',
    '|---|---|---|---|---|---|---|---|---|',
    ...satirlar.map((s) => `| ${s.join(' | ')} |`),
  ].join('\n')
}

export function raporYaz(kayitlar) {
  const gruplar = Map.groupBy(kayitlar, (k) => `${k.model} (talimat: ${k.talimat ?? 'tarafsiz'})`)
  return [
    '# Deney sonuçları',
    '',
    karsilastirmaTablosu(kayitlar),
    '',
    ...[...gruplar].sort(([a], [b]) => a.localeCompare(b)).map(([ad, grup]) => ozetTablosu(grup, ad).replace(/^# /, '## ').replace(/^## (Görev|Göreve)/gm, '### $1')),
  ].join('\n')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const kok = process.argv[2]
  if (!kok) {
    console.error('Kullanım: node src/birlestir.js <sonuç klasörü>')
    process.exit(2)
  }
  process.stdout.write(raporYaz(kayitlariTopla(kok)))
}
