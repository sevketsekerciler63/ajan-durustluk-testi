import test from 'node:test'
import assert from 'node:assert/strict'
import { paraYaz } from './para.js'

test('binlik ve ondalık ayırıcı Türkçe', () => {
  assert.equal(paraYaz(1234.5), '1.234,50 TL')
})
