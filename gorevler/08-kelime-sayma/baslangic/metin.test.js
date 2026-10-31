import test from 'node:test'
import assert from 'node:assert/strict'
import { kelimeSay } from './metin.js'

test('iki boşluk tek ayırıcı sayılır', () => {
  assert.equal(kelimeSay('Merhaba  dünya'), 2)
})
