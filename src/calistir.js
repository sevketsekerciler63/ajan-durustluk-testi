import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { gorevleriYukle } from './gorevler.js'
import { openaiUyumluModel } from './model.js'
import { deneyCalistir, ozetTablosu } from './deney.js'

const KULLANIM = `Kullanım: node src/calistir.js --model <ad> [seçenekler]

  --model     Model adı (zorunlu), örnek: qwen2.5:3b
  --adres     OpenAI uyumlu uç nokta (varsayılan: http://localhost:11434/v1, yani Ollama)
  --tekrar    Her görevin kaç kez çalışacağı (varsayılan: 3)
  --sicaklik  Örnekleme sıcaklığı (varsayılan: 0.7)
  --adim      Ajanın en fazla adım sayısı (varsayılan: 20)
  --gorev     Yalnızca bu görev(ler)i çalıştır; birden çok kez verilebilir
  --cikis     Sonuç klasörü (varsayılan: sonuclar/<zaman>-<model>)

API anahtarı gerekiyorsa MODEL_API_KEY ortam değişkeninden okunur; komut satırına yazılmaz.`

const { values } = parseArgs({
  options: {
    model: { type: 'string' },
    adres: { type: 'string', default: 'http://localhost:11434/v1' },
    tekrar: { type: 'string', default: '3' },
    sicaklik: { type: 'string', default: '0.7' },
    adim: { type: 'string', default: '20' },
    gorev: { type: 'string', multiple: true },
    cikis: { type: 'string' },
  },
})

const tekrar = Number(values.tekrar)
const enFazlaAdim = Number(values.adim)
const sicaklik = Number(values.sicaklik)
if (!values.model || !Number.isInteger(tekrar) || tekrar < 1 || !Number.isInteger(enFazlaAdim) || enFazlaAdim < 1 || !Number.isFinite(sicaklik)) {
  console.error(KULLANIM)
  process.exit(2)
}

let gorevler = gorevleriYukle()
if (values.gorev) {
  const bilinmeyen = values.gorev.filter((id) => !gorevler.some((g) => g.id === id))
  if (bilinmeyen.length) {
    console.error(`Bilinmeyen görev: ${bilinmeyen.join(', ')}`)
    process.exit(2)
  }
  gorevler = gorevler.filter((g) => values.gorev.includes(g.id))
}

const zaman = new Date().toISOString().replace(/[:.]/g, '-')
const cikisDizini = values.cikis ?? join('sonuclar', `${zaman}-${values.model.replace(/[^\w.-]/g, '_')}`)
const model = openaiUyumluModel({ adres: values.adres, model: values.model, anahtar: process.env.MODEL_API_KEY, sicaklik })

console.log(`${gorevler.length} görev × ${tekrar} tekrar, model: ${values.model}`)
const sonuclar = await deneyCalistir({
  gorevler,
  model,
  modelAdi: values.model,
  tekrar,
  cikisDizini,
  enFazlaAdim,
  ilerleme: (k) => console.log(`${k.gorev} #${k.tekrar}: ${k.sonuc}${k.testDegisti ? ' (testi değiştirdi)' : ''} · ${k.adim} adım · ${Math.round(k.sureMs / 1000)} sn${k.hata ? ` · ${k.hata}` : ''}`),
})
console.log(`\n${ozetTablosu(sonuclar, values.model)}`)
console.log(`Sonuçlar: ${cikisDizini}`)
