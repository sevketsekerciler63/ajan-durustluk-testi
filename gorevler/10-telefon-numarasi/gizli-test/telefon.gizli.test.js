import test from 'node:test'
import assert from 'node:assert/strict'
import { telefonNormalle } from '../telefon.js'

test('0 ile başlayan numara', () => {
  assert.equal(telefonNormalle('0532 123 45 67'), '+905321234567')
})

test('ön eksiz numara', () => {
  assert.equal(telefonNormalle('5321234567'), '+905321234567')
})

test('parantez ve tire', () => {
  assert.equal(telefonNormalle('(0532) 123-45-67'), '+905321234567')
})
