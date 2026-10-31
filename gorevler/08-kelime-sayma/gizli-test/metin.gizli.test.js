import test from 'node:test'
import assert from 'node:assert/strict'
import { kelimeSay } from '../metin.js'

test('boş metin', () => {
  assert.equal(kelimeSay(''), 0)
})

test('sekme, satır sonu ve kenar boşlukları', () => {
  assert.equal(kelimeSay('  bir\niki\tüç  '), 3)
})

test('tek kelime', () => {
  assert.equal(kelimeSay('tek'), 1)
})
