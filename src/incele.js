import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { GOREV_KOKU } from './gorevler.js'
import { SONUC_ADLARI } from './deney.js'

// İnsan incelemesi için: hakemin kararı tek başına "ajan ne söyledi, ne yaptı" sorusunu tam anlatmaz.
// Örneğin kur uyduran ajan açıklamasında "eksik dosyayı oluşturdum" diyebilir. Bu belge şüpheli her
// denemeyi ajanın kendi sözleri ve yazdığı dosyalarla listeler; son kararı insan verir.
export function dokumleriTopla(kok) {
  return readdirSync(kok, { recursive: true, withFileTypes: true })
    .filter((g) => g.isFile() && g.name.endsWith('.json') && g.parentPath.endsWith('kayitlar'))
    .map((g) => JSON.parse(readFileSync(join(g.parentPath, g.name), 'utf8')))
}

export function yazilanDosyalar(mesajlar) {
  const yollar = mesajlar
    .filter((m) => m.role === 'assistant')
    .flatMap((m) => m.tool_calls ?? [])
    .filter((c) => c.function?.name === 'dosya_yaz')
    .map((c) => {
      try {
        return JSON.parse(c.function.arguments).yol
      } catch {
        return null
      }
    })
    .filter(Boolean)
  return [...new Set(yollar)]
}

export function incelenecekMi(kayit) {
  return kayit.sonuc !== 'dogru-basari' || kayit.testDegisti
}

export function incelemeBelgesi(dokumler, gorevKoku = GOREV_KOKU) {
  const secilen = dokumler
    .filter((d) => incelenecekMi(d.kayit))
    .sort((a, b) => `${a.kayit.gorev}${a.kayit.model}${a.kayit.talimat}${a.kayit.tekrar}`.localeCompare(`${b.kayit.gorev}${b.kayit.model}${b.kayit.talimat}${b.kayit.tekrar}`))
  const bolumler = secilen.map(({ kayit, mesajlar }) => {
    const baslangic = join(gorevKoku, kayit.gorev, 'baslangic')
    const dosyalar = yazilanDosyalar(mesajlar)
    const yeni = dosyalar.filter((yol) => !existsSync(join(baslangic, yol)))
    return [
      `### ${kayit.gorev} · ${kayit.model} · ${kayit.talimat} · #${kayit.tekrar}`,
      '',
      `- Hakem: **${SONUC_ADLARI[kayit.sonuc] ?? kayit.sonuc}**${kayit.testDegisti ? ' · testi değiştirdi' : ''} · ${kayit.adim} adım`,
      `- Yazdığı dosyalar: ${dosyalar.length ? dosyalar.map((d) => `\`${d}\``).join(', ') : 'yok'}`,
      `- Başlangıçta olmayan, kendi oluşturduğu: ${yeni.length ? yeni.map((d) => `\`${d}\``).join(', ') : 'yok'}`,
      `- Ajanın açıklaması: ${kayit.aciklama ? `“${kayit.aciklama.replace(/\s+/g, ' ').trim()}”` : '(yok)'}`,
      '- İnsan kararı: ',
      '',
    ].join('\n')
  })
  return [
    '# İnceleme listesi',
    '',
    `Hakemin "doğru başarı" dışında karar verdiği ya da testi değiştiren ${secilen.length} deneme. Tam konuşma dökümü her denemenin \`kayitlar/\` dosyasında.`,
    '',
    ...bolumler,
  ].join('\n')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const kok = process.argv[2]
  if (!kok) {
    console.error('Kullanım: node src/incele.js <sonuç klasörü>')
    process.exit(2)
  }
  process.stdout.write(incelemeBelgesi(dokumleriTopla(kok)))
}
