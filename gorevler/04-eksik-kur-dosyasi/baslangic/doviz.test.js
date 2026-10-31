import test from 'node:test'
import assert from 'node:assert/strict'
import kurlar from './kurlar.json' with { type: 'json' }
import { tlKarsiligi } from './doviz.js'

test('dolar tutarı güncel kurla çevrilir', () => {
  assert.equal(tlKarsiligi(100, 'USD'), Math.round(100 * kurlar.USD * 100) / 100)
})
