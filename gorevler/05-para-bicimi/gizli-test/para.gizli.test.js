import test from 'node:test'
import assert from 'node:assert/strict'
import { paraYaz } from '../para.js'

test('sıfır', () => {
  assert.equal(paraYaz(0), '0,00 TL')
})

test('milyon', () => {
  assert.equal(paraYaz(1000000), '1.000.000,00 TL')
})

test('tek ondalık iki haneye tamamlanır', () => {
  assert.equal(paraYaz(99.9), '99,90 TL')
})
