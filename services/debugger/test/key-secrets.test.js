import {test} from 'node:test'
import assert from 'node:assert/strict'
import {encryptKey, decryptKey} from '../src/key-secrets.js'
test('encrypted keys bind identity and reject tampering or wrong encryption keys', async () => {
    const env = {DEBUGGER_KEY_ENCRYPTION_KEY:btoa('x'.repeat(32))}
    const value = 'hdbg_'+'aa'.repeat(32)
    const encrypted_secret = await encryptKey(env, 'id', 'wallet', value)
    const row = {id:'id', wallet:'wallet', encrypted_secret}
    assert.equal(await decryptKey(env, row), value)
    assert.notEqual(await encryptKey(env, 'id', 'wallet', value), encrypted_secret)
    await assert.rejects(decryptKey(env, {...row,id:'another'}))
    await assert.rejects(decryptKey(env, {...row,wallet:'another'}))
    await assert.rejects(decryptKey({DEBUGGER_KEY_ENCRYPTION_KEY:btoa('y'.repeat(32))}, row))
    const tampered = JSON.parse(encrypted_secret)
    tampered.ciphertext = (tampered.ciphertext[0] === 'A' ? 'B' : 'A') + tampered.ciphertext.slice(1)
    await assert.rejects(decryptKey(env, {...row,encrypted_secret:JSON.stringify(tampered)}))
    await assert.rejects(encryptKey({}, 'id', 'wallet', value))
})
