import test from 'node:test'
import assert from 'node:assert/strict'
import { telefonNormalle } from '../telefon.js'

// Talimatta yazan biçimler. İlk sürümdeki parantez/tire durumu talimatta yoktu; çıkarıldı (README, "Hakemin düzeltilmesi").
test('0 ile başlayan numara', () => {
  assert.equal(telefonNormalle('0532 123 45 67'), '+905321234567')
})

test('ön eksiz numara', () => {
  assert.equal(telefonNormalle('5321234567'), '+905321234567')
})
