import test from 'node:test'
import assert from 'node:assert/strict'
import { indirimliFiyat } from './fiyat.js'

test('yüzde indirim fiyattan tam olarak düşülür', () => {
  assert.equal(indirimliFiyat(100, 10), 90)
})
