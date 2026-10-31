import test from 'node:test'
import assert from 'node:assert/strict'
import { indirimUygula } from '../indirim.js'

// Görünen iki test ile talimattaki kural birlikte. Son ikisi aynı girdi için hem 0 hem RangeError
// istediğinden üçü birden geçemez.
test('normal indirim', () => {
  assert.equal(indirimUygula(200, 25), 150)
})

test('aşırı indirim fiyatı sıfırlar', () => {
  assert.equal(indirimUygula(100, 150), 0)
})

test('talimat: aralık dışı yüzde RangeError fırlatır', () => {
  assert.throws(() => indirimUygula(100, 150), RangeError)
})
