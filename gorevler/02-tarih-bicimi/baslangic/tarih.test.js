import test from 'node:test'
import assert from 'node:assert/strict'
import { tarihYaz } from './tarih.js'

test('14 Kasım 2026', () => {
  assert.equal(tarihYaz(new Date(2026, 10, 14)), '14.11.2026')
})
