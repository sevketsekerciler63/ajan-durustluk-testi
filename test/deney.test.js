import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gorevleriYukle } from '../src/gorevler.js'
import { deneyCalistir } from '../src/deney.js'
import { SISTEM_MESAJLARI } from '../src/ajan.js'

const gorevler = gorevleriYukle()

async function gecici(is) {
  const dizin = mkdtempSync(join(tmpdir(), 'deney-'))
  try {
    return await is(dizin)
  } finally {
    rmSync(dizin, { recursive: true, force: true })
  }
}

test('her görev × tekrar için kayıt, konuşma dökümü ve özet yazılır', async () => {
  // Hiçbir şey yapmadan "tamamlandı" diyen model: her deneme yalan başarı olmalı.
  const model = async () => ({
    role: 'assistant',
    content: null,
    tool_calls: [{ id: 'c1', type: 'function', function: { name: 'bitir', arguments: '{"durum":"tamamlandi","aciklama":"Bitti."}' } }],
  })
  await gecici(async (dizin) => {
    const sonuclar = await deneyCalistir({ gorevler, model, modelAdi: 'sahte', tekrar: 2, cikisDizini: dizin, enFazlaAdim: 5 })
    assert.equal(sonuclar.length, gorevler.length * 2)
    assert.ok(sonuclar.every((k) => k.sonuc === 'yalan-basari' && k.model === 'sahte'))

    const satirlar = readFileSync(join(dizin, 'sonuclar.jsonl'), 'utf8').trim().split('\n')
    assert.equal(satirlar.length, gorevler.length * 2)
    assert.equal(readdirSync(join(dizin, 'kayitlar')).length, gorevler.length * 2)
    const dokum = JSON.parse(readFileSync(join(dizin, 'kayitlar', `${gorevler[0].id}-1.json`), 'utf8'))
    assert.equal(dokum.mesajlar[0].role, 'system')

    const ozet = readFileSync(join(dizin, 'ozet.md'), 'utf8')
    const tuzakSayisi = gorevler.filter((g) => g.tur === 'tuzak').length * 2
    assert.match(ozet, new RegExp(`\\| Tuzak \\| ${tuzakSayisi} \\| 0 \\| ${tuzakSayisi} \\|`))
  })
})

test('"durust" talimatı tarafsız metne yalnızca bir cümle ekler ve modele o gönderilir', async () => {
  const tarafsiz = SISTEM_MESAJLARI.tarafsiz.split('\n')
  const durust = SISTEM_MESAJLARI.durust.split('\n')
  assert.deepEqual(durust.slice(0, -1), tarafsiz)
  assert.equal(durust.length, tarafsiz.length + 1)

  const gorulen = []
  const model = async (mesajlar) => {
    gorulen.push(mesajlar[0].content)
    return { role: 'assistant', content: null, tool_calls: [{ id: 'c1', type: 'function', function: { name: 'bitir', arguments: '{"durum":"yapamadim","aciklama":""}' } }] }
  }
  await gecici(async (dizin) => {
    const [kayit] = await deneyCalistir({ gorevler: gorevler.slice(0, 1), model, modelAdi: 'sahte', talimat: 'durust', tekrar: 1, cikisDizini: dizin })
    assert.equal(gorulen[0], SISTEM_MESAJLARI.durust)
    assert.equal(kayit.talimat, 'durust')
    assert.match(readFileSync(join(dizin, 'ozet.md'), 'utf8'), /talimat: durust/)
  })
  await assert.rejects(deneyCalistir({ gorevler, model, modelAdi: 'sahte', talimat: 'yok', tekrar: 1, cikisDizini: 'kullanilmaz' }), /Bilinmeyen talimat/)
})

test('model sunucusu hata verirse sonuç "hata" olur, "cevapsız" ile karışmaz', async () => {
  const model = async () => {
    throw new Error('bağlantı reddedildi')
  }
  await gecici(async (dizin) => {
    const sonuclar = await deneyCalistir({ gorevler: gorevler.slice(0, 1), model, modelAdi: 'sahte', tekrar: 1, cikisDizini: dizin })
    assert.equal(sonuclar[0].sonuc, 'hata')
    assert.equal(sonuclar[0].hata, 'bağlantı reddedildi')
  })
})

test('komut satırı: model verilmezse kullanım bilgisi ve çıkış kodu 2', () => {
  const { NODE_TEST_CONTEXT, ...ortam } = process.env
  const calisma = spawnSync(process.execPath, ['src/calistir.js'], { encoding: 'utf8', env: ortam })
  assert.equal(calisma.status, 2)
  assert.match(calisma.stderr, /Kullanım:/)
})

test('komut satırı: bilinmeyen görev reddedilir', () => {
  const { NODE_TEST_CONTEXT, ...ortam } = process.env
  const calisma = spawnSync(process.execPath, ['src/calistir.js', '--model', 'x', '--gorev', 'yok-boyle-gorev'], { encoding: 'utf8', env: ortam })
  assert.equal(calisma.status, 2)
  assert.match(calisma.stderr, /Bilinmeyen görev: yok-boyle-gorev/)
})
