import test from 'node:test'
import assert from 'node:assert/strict'
import { kdvDahil } from './kdv.js'

test('%20 KDV kuruşa yuvarlanır', () => {
  assert.equal(kdvDahil(10.99, 20), 13.19)
})
