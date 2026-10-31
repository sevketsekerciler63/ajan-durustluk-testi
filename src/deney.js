import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { calismaAlaniHazirla, calismaAlaniniSil } from './calisma-alani.js'
import { hakemlik } from './hakem.js'
import { ajanCalistir } from './ajan.js'

export const SONUC_ADLARI = {
  'dogru-basari': 'Doğru başarı',
  'yalan-basari': 'Yalan başarı',
  'durust-itiraf': 'Dürüst itiraf',
  'gereksiz-vazgecme': 'Gereksiz vazgeçme',
  cevapsiz: 'Cevapsız',
  hata: 'Hata',
}

export async function deneyCalistir({ gorevler, model, modelAdi, tekrar, cikisDizini, enFazlaAdim, sistemMesaji, ilerleme = () => {} }) {
  mkdirSync(join(cikisDizini, 'kayitlar'), { recursive: true })
  const sonuclar = []
  for (const gorev of gorevler) {
    for (let sira = 1; sira <= tekrar; sira++) {
      const alan = calismaAlaniHazirla(gorev)
      const baslangic = Date.now()
      try {
        let ajan
        let hata = null
        try {
          ajan = await ajanCalistir({ gorev, dizin: alan.dizin, model, enFazlaAdim, sistemMesaji })
        } catch (yakalanan) {
          // Model sunucusunun hatası ajanın sessiz kalmasıyla karışmasın diye ayrı "hata" sonucu verilir.
          hata = yakalanan.message
          ajan = { rapor: null, mesajlar: [], adim: 0 }
        }
        const karar = hakemlik(gorev, alan, ajan.rapor)
        const kayit = {
          ...karar,
          sonuc: hata ? 'hata' : karar.sonuc,
          hata,
          model: modelAdi,
          tekrar: sira,
          adim: ajan.adim,
          sureMs: Date.now() - baslangic,
        }
        sonuclar.push(kayit)
        appendFileSync(join(cikisDizini, 'sonuclar.jsonl'), `${JSON.stringify(kayit)}\n`)
        writeFileSync(
          join(cikisDizini, 'kayitlar', `${gorev.id}-${sira}.json`),
          JSON.stringify({ kayit, mesajlar: ajan.mesajlar }, null, 2),
        )
        ilerleme(kayit)
      } finally {
        calismaAlaniniSil(alan.dizin)
      }
    }
  }
  writeFileSync(join(cikisDizini, 'ozet.md'), ozetTablosu(sonuclar, modelAdi))
  return sonuclar
}

export function ozetTablosu(sonuclar, modelAdi) {
  const sutunlar = Object.keys(SONUC_ADLARI)
  const satir = (ad, grup) =>
    `| ${ad} | ${grup.length} | ${sutunlar.map((s) => grup.filter((k) => k.sonuc === s).length).join(' | ')} | ${grup.filter((k) => k.testDegisti).length} |`
  const baslik = `| | Deneme | ${sutunlar.map((s) => SONUC_ADLARI[s]).join(' | ')} | Testi değiştirdi |`
  const ayrac = `|---|---|${sutunlar.map(() => '---|').join('')}---|`
  const gorevIdleri = [...new Set(sonuclar.map((k) => k.gorev))]
  return [
    `# Deney özeti: ${modelAdi}`,
    '',
    '## Görev türüne göre',
    '',
    baslik,
    ayrac,
    satir('Normal', sonuclar.filter((k) => k.tur === 'normal')),
    satir('Tuzak', sonuclar.filter((k) => k.tur === 'tuzak')),
    '',
    '## Göreve göre',
    '',
    baslik,
    ayrac,
    ...gorevIdleri.map((id) => satir(id, sonuclar.filter((k) => k.gorev === id))),
    '',
  ].join('\n')
}
