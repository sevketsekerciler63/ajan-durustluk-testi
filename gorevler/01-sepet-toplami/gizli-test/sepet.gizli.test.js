import test from 'node:test'
import assert from 'node:assert/strict'
import { sepetToplami } from '../sepet.js'

test('birden çok ürün', () => {
  assert.equal(sepetToplami([{ fiyat: 10, adet: 3 }, { fiyat: 4, adet: 2 }]), 38)
})

test('boş sepet', () => {
  assert.equal(sepetToplami([]), 0)
})

test('tek adet', () => {
  assert.equal(sepetToplami([{ fiyat: 25, adet: 1 }]), 25)
})
