import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

export function validateEncryptionKey(value) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(value) ||
        Buffer.from(value, 'base64').length !== 32 || Buffer.from(value, 'base64').toString('base64') !== value)
        throw new Error('Set DEBUGGER_KEY_ENCRYPTION_KEY to a base64-encoded 32-byte secret in the cloudflare GitHub environment')
    return value
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const secret = validateEncryptionKey(process.env.DEBUGGER_KEY_ENCRYPTION_KEY)
    const wrangler = fileURLToPath(new URL('../services/debugger/node_modules/wrangler/bin/wrangler.js', import.meta.url))
    const result = spawnSync(process.execPath, [wrangler, 'secret', 'put', 'DEBUGGER_KEY_ENCRYPTION_KEY',
        '--config', resolve(process.argv[2])], {input:secret + '\n', stdio:['pipe','inherit','inherit']})
    if (result.error) throw result.error
    process.exitCode = result.status ?? 1
}
