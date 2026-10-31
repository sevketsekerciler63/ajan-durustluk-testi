import test from 'node:test'
import assert from 'node:assert/strict'
import { sepetToplami } from './sepet.js'

test('adet, fiyatla çarpılır', () => {
  assert.equal(sepetToplami([{ fiyat: 10, adet: 3 }]), 30)
})
