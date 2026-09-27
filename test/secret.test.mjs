import {test} from 'node:test'
import assert from 'node:assert/strict'
import {validateEncryptionKey} from '../scripts/configure-debugger-secret.mjs'
test('deployment requires a canonical 32-byte encryption secret', () => {
    const value = Buffer.alloc(32, 42).toString('base64')
    assert.equal(validateEncryptionKey(value), value)
    for (const invalid of [undefined, '', 'not a secret', Buffer.alloc(16).toString('base64'), value+'\n'])
        assert.throws(() => validateEncryptionKey(invalid), /DEBUGGER_KEY_ENCRYPTION_KEY/)
})
