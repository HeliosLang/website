import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkConsole } from '../scripts/smoke-debugger.mjs'

const good = () => new Response('<title data-rh="true">Console | Helios</title>')

test('console check retries transient network, missing page and old content', async () => {
    const responses = [new Error('fetch failed'), new Response('Not found', { status: 404 }),
        new Response('<title>Debugger console | Helios</title>'), good()]
    let calls = 0, waits = 0
    await checkConsole('https://helios-lang.io', {
        attempts: 4,
        fetchImpl: async (url, options) => {
            assert.equal(String(url), 'https://helios-lang.io/console')
            assert.equal(options.headers['Cache-Control'], 'no-cache')
            assert.ok(options.signal)
            const result = responses[calls++]
            if (result instanceof Error) throw result
            return result
        },
        wait: async () => { waits++ }, warn: () => {}
    })
    assert.equal(calls, 4)
    assert.equal(waits, 3)
})

test('console check fails with status, URL and title after bounded retries', async () => {
    let calls = 0
    await assert.rejects(checkConsole('https://helios-lang.io', {
        attempts: 2,
        fetchImpl: async () => { calls++; return new Response('<title>Page Not Found</title>', { status: 404 }) },
        wait: async () => {}, warn: () => {}
    }), /after 2 attempts: HTTP 404, URL https:\/\/helios-lang.io\/console, title "Page Not Found"/)
    assert.equal(calls, 2)
})

test('healthy console succeeds without waiting', async () => {
    await checkConsole('https://helios-lang.io', {
        fetchImpl: async () => good(),
        wait: async () => assert.fail('Unexpected retry')
    })
})
