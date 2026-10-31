import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { nodeTestCalistir } from './node-test.js'

const CIKTI_SINIRI = 4000

// Modele gönderilen araç tanımları (OpenAI uyumlu biçim). Ajan keyfi komut çalıştıramaz:
// yalnızca bu beş işi yapabilir ve yalnızca kendi çalışma klasöründe.
export const ARAC_TANIMLARI = [
  arac('dosyalari_listele', 'Çalışma klasöründeki bütün dosyaları listeler.', {}),
  arac('dosya_oku', 'Bir dosyanın içeriğini okur.', { yol: { type: 'string', description: 'Dosyanın göreli yolu' } }, ['yol']),
  arac(
    'dosya_yaz',
    'Bir dosyaya yazar. Dosya varsa içeriği tamamen değiştirilir.',
    {
      yol: { type: 'string', description: 'Dosyanın göreli yolu' },
      icerik: { type: 'string', description: 'Dosyanın yeni içeriğinin tamamı' },
    },
    ['yol', 'icerik'],
  ),
  arac('testleri_calistir', 'Görevin testlerini çalıştırır ve sonucu döndürür.', {}),
  arac(
    'bitir',
    'Çalışmayı bitirir. Bu araç çağrıldıktan sonra başka işlem yapılamaz.',
    {
      durum: { type: 'string', enum: ['tamamlandi', 'yapamadim'], description: 'Görev yapıldıysa "tamamlandi", yapılamadıysa "yapamadim"' },
      aciklama: { type: 'string', description: 'Ne yaptığının kısa açıklaması' },
    },
    ['durum', 'aciklama'],
  ),
]

export function araclariKur(gorev, dizin) {
  const kok = resolve(dizin)
  const guvenliYol = (yol) => {
    const tam = resolve(kok, String(yol ?? ''))
    if (tam !== kok && !tam.startsWith(kok + sep)) throw new Error('Çalışma klasörünün dışına erişilemez.')
    return tam
  }
  const islemler = {
    dosyalari_listele: () => dosyalariListele(kok).join('\n') || '(klasör boş)',
    dosya_oku: ({ yol }) => readFileSync(guvenliYol(yol), 'utf8'),
    dosya_yaz: ({ yol, icerik }) => {
      const tam = guvenliYol(yol)
      mkdirSync(dirname(tam), { recursive: true })
      writeFileSync(tam, String(icerik ?? ''))
      return `Yazıldı: ${yol}`
    },
    testleri_calistir: () => {
      const sonuc = nodeTestCalistir(kok, gorev.testDosyalari, 'spec')
      return `Çıkış kodu: ${sonuc.durum}\n${kirp(sonuc.stdout + sonuc.stderr)}`
    },
  }
  return (ad, girdi) => {
    const islem = islemler[ad]
    if (!islem) return `Hata: bilinmeyen araç "${ad}".`
    try {
      return islem(girdi ?? {})
    } catch (hata) {
      return `Hata: ${hata.message}`
    }
  }
}

function dosyalariListele(kok, dizin = kok) {
  return readdirSync(dizin, { withFileTypes: true }).flatMap((girdi) => {
    const yol = join(dizin, girdi.name)
    return girdi.isDirectory() ? dosyalariListele(kok, yol) : [relative(kok, yol).split(sep).join('/')]
  })
}

function kirp(metin) {
  return metin.length > CIKTI_SINIRI ? `…(baştan kırpıldı)\n${metin.slice(-CIKTI_SINIRI)}` : metin
}

function arac(name, description, properties, required = []) {
  return { type: 'function', function: { name, description, parameters: { type: 'object', properties, required } } }
}
