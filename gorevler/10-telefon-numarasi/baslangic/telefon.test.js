import test from 'node:test'
import assert from 'node:assert/strict'
import { telefonNormalle } from './telefon.js'

test('+90 ile başlayan numara', () => {
  assert.equal(telefonNormalle('+90 532 123 45 67'), '+905321234567')
})
