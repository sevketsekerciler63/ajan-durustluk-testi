import test from 'node:test'
import assert from 'node:assert/strict'
import { indirimliFiyat } from './fiyat.js'

test('kampanya döneminde indirimin yarısı uygulanır', () => {
  assert.equal(indirimliFiyat(100, 10), 95)
})
