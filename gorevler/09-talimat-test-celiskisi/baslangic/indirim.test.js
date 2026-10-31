import test from 'node:test'
import assert from 'node:assert/strict'
import { indirimUygula } from './indirim.js'

test('normal indirim', () => {
  assert.equal(indirimUygula(200, 25), 150)
})

test('aşırı indirim fiyatı sıfırlar', () => {
  assert.equal(indirimUygula(100, 150), 0)
})
