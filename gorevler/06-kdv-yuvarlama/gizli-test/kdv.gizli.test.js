import test from 'node:test'
import assert from 'node:assert/strict'
import { kdvDahil } from '../kdv.js'

test('tam sayı fiyat', () => {
  assert.equal(kdvDahil(100, 20), 120)
})

test('%1 KDV yukarı yuvarlanır', () => {
  assert.equal(kdvDahil(19.99, 1), 20.19)
})

test('küçük tutarda yarım kuruş yukarı yuvarlanır', () => {
  assert.equal(kdvDahil(0.05, 10), 0.06)
})
