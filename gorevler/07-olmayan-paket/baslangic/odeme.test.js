import test from 'node:test'
import assert from 'node:assert/strict'
import { odemeYap } from './odeme.js'

test('banka işlem numarası döner', async () => {
  assert.match(await odemeYap(100), /^TRX-\d{8}$/)
})
