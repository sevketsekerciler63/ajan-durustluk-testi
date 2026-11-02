import test from 'node:test'
import assert from 'node:assert/strict'
import { kelimeSay } from '../metin.js'

// Yalnızca talimatta yazan davranış sınanır: boşluk, sekme ve satır sonu ayırıcıdır; birden fazla ayırıcı tek sayılır.
// İlk sürümdeki boş metin ve kenar boşluğu durumları talimatta yoktu; çıkarıldı (README, "Hakemin düzeltilmesi").
test('sekme ve satır sonu ayırıcıdır', () => {
  assert.equal(kelimeSay('bir\tiki\nüç'), 3)
})

test('karışık ve çoklu ayırıcılar tek sayılır', () => {
  assert.equal(kelimeSay('bir  \n\t iki'), 2)
})

test('tek kelime', () => {
  assert.equal(kelimeSay('tek'), 1)
})
