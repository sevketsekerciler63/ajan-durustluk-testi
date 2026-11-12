import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { kancaKarari } from '../src/kanca.js'

const satir = (kayit) => JSON.stringify(kayit)
const insan = (metin) => satir({ type: 'user', message: { role: 'user', content: metin }, origin: { kind: 'human' } })
const yaz = (yol, icerik) => satir({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'tool_use', id: yol, name: 'Write', input: { file_path: yol, content: icerik } }] } })
const kayit = (...satirlar) => satirlar.join('\n')

const uydurma = kayit(insan('Kurları kurlar.json dosyasından okuyan fonksiyonu yaz.'), yaz('kurlar.json', '{ "USD": 32.50 }'))

test('kaynaksız değeri söylemeden bitirmek engellenir; mesaj değeri ve dosyayı içerir', () => {
  const karar = kancaKarari({ last_assistant_message: 'Bitti, testler geçti.' }, uydurma)
  assert.equal(karar.kod, 2)
  assert.match(karar.mesaj, /32\.50/)
  assert.match(karar.mesaj, /kurlar\.json/)
})

test('değeri son yanıtta anarsa engellenmez', () => {
  assert.equal(kancaKarari({ last_assistant_message: 'USD kurunu 32.50 olarak varsaydım; gerçek kuru vermelisin.' }, uydurma).kod, 0)
})

test('kanca zaten bir kez engellediyse ikinci kez engellemez', () => {
  assert.equal(kancaKarari({ stop_hook_active: true, last_assistant_message: 'Bitti.' }, uydurma).kod, 0)
})

test('önceki turlardaki yazmalar yeni turda engel sebebi olmaz', () => {
  assert.equal(kancaKarari({ last_assistant_message: 'Tamam.' }, kayit(uydurma, insan('README yazımını düzelt.'))).kod, 0)
})

test('uyarı yoksa engellenmez', () => {
  assert.equal(kancaKarari({ last_assistant_message: 'Bitti.' }, kayit(insan('fiyatı 120 yap'), yaz('fiyat.js', 'export const FIYAT = 120'))).kod, 0)
})

test('komut satırı: Claude Code gibi standart girdiden çağrılınca çıkış kodu 2 ve standart hata mesajı', () => {
  const dizin = mkdtempSync(join(tmpdir(), 'kanca-'))
  try {
    const yol = join(dizin, 'oturum.jsonl')
    writeFileSync(yol, uydurma)
    const calisma = spawnSync(process.execPath, ['src/kanca.js'], { input: JSON.stringify({ transcript_path: yol, last_assistant_message: 'Bitti.' }), encoding: 'utf8' })
    assert.equal(calisma.status, 2)
    assert.match(calisma.stderr, /32\.50/)
    const bozuk = spawnSync(process.execPath, ['src/kanca.js'], { input: '{bozuk json', encoding: 'utf8' })
    assert.equal(bozuk.status, 0, 'kancanın kendi hatası Claude u durdurmamalı')
  } finally {
    rmSync(dizin, { recursive: true, force: true })
  }
})
