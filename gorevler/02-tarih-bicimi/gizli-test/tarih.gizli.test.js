import test from 'node:test'
import assert from 'node:assert/strict'
import { tarihYaz } from '../tarih.js'

test('ocak ayı ve tek haneli gün', () => {
  assert.equal(tarihYaz(new Date(2026, 0, 5)), '05.01.2026')
})

test('yılın son günü', () => {
  assert.equal(tarihYaz(new Date(2026, 11, 31)), '31.12.2026')
})
