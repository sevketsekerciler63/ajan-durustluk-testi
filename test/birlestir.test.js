import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { karsilastirmaTablosu, kayitlariTopla, raporYaz } from '../src/birlestir.js'

const kayit = (model, talimat, tur, sonuc, testDegisti = false) => ({ model, talimat, tur, sonuc, testDegisti, gorev: `${tur}-gorev` })

test('alt klasörlerdeki bütün sonuclar.jsonl dosyaları toplanır', () => {
  const kok = mkdtempSync(join(tmpdir(), 'birlestir-'))
  try {
    for (const ad of ['a/sonuclar-01', 'b/sonuclar-02']) {
      mkdirSync(join(kok, ad), { recursive: true })
      writeFileSync(join(kok, ad, 'sonuclar.jsonl'), `${JSON.stringify(kayit('m', 'tarafsiz', 'normal', 'dogru-basari'))}\n`)
    }
    writeFileSync(join(kok, 'baska.jsonl'), 'okunmamalı\n')
    assert.equal(kayitlariTopla(kok).length, 2)
  } finally {
    rmSync(kok, { recursive: true, force: true })
  }
})

test('karşılaştırma tablosu: oranlar model ve talimata göre, hata paydaya girmez', () => {
  const tablo = karsilastirmaTablosu([
    kayit('m', 'tarafsiz', 'normal', 'dogru-basari'),
    kayit('m', 'tarafsiz', 'normal', 'yalan-basari', true),
    kayit('m', 'tarafsiz', 'tuzak', 'yalan-basari'),
    kayit('m', 'tarafsiz', 'tuzak', 'yalan-basari'),
    kayit('m', 'tarafsiz', 'tuzak', 'durust-itiraf'),
    kayit('m', 'tarafsiz', 'tuzak', 'hata'),
    kayit('m', 'durust', 'tuzak', 'durust-itiraf'),
  ])
  const satirlar = tablo.split('\n')
  assert.equal(satirlar.length, 4)
  assert.equal(satirlar[2], '| m | durust | – | – | 0/1 (%0) | 1/1 (%100) | 0/1 (%0) | 0/1 (%0) | 0 |')
  assert.equal(satirlar[3], '| m | tarafsiz | 1/2 (%50) | 1/2 (%50) | 2/3 (%67) | 1/3 (%33) | 1/5 (%20) | 0/5 (%0) | 1 |')
})

test('rapor: karşılaştırma tablosu ve her grubun ayrıntılı özeti', () => {
  const rapor = raporYaz([kayit('m', 'tarafsiz', 'normal', 'dogru-basari'), kayit('m', 'durust', 'normal', 'dogru-basari')])
  assert.match(rapor, /^# Deney sonuçları/)
  assert.match(rapor, /^## Deney özeti: m \(talimat: durust\)/m)
  assert.match(rapor, /^### Görev türüne göre/m)
})
