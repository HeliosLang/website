import assert from "node:assert/strict"
import { Miniflare } from "miniflare"
import { makeTestWallet } from "./wallet.js"
import { readFile, readdir } from "node:fs/promises"
const mf = new Miniflare({
    modules: true,
    scriptPath: ".test-worker/index.js",
    compatibilityDate: "2025-09-24",
    compatibilityFlags: ["nodejs_compat"],
    d1Databases: ["DB"],
    r2Buckets: ["PAYLOADS"],
    bindings: { DEBUGGER_KEY_ENCRYPTION_KEY: btoa("x".repeat(32)), WEBSITE_ORIGIN: "https://helios-lang.io", RETENTION_DAYS: "30" }
})
try {
    const db = await mf.getD1Database("DB")
    for (const name of (await readdir(new URL('../migrations/', import.meta.url))).filter(name => name.endsWith('.sql')).sort()) {
        const migration = await readFile(new URL(`../migrations/${name}`, import.meta.url), 'utf8')
        for (const sql of migration.split(';').filter(s => s.trim())) await db.prepare(sql).run()
    }
    const key = "hdbg_" + "ab".repeat(32)
    const digest = Buffer.from(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key))
    ).toString("hex")
    await db.prepare("INSERT INTO wallets VALUES (?,?)").bind("wallet", 0).run()
    await db
        .prepare(
            "INSERT INTO api_keys(id,wallet,name,hash,created_at) VALUES (?,?,?,?,?)"
        )
        .bind("key", "wallet", "runtime", digest, 0)
        .run()
    const headers = {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
    }
    const capture = {
        version: 1,
        captureId: crypto.randomUUID(),
        status: "failed",
        evaluations: []
    }
    const request = () =>
        mf.dispatchFetch("https://debugger.test/v1/captures", {
            method: "POST",
            headers,
            body: JSON.stringify(capture)
        })
    const responses = await Promise.all([request(), request()])
    for (const r of responses)
        assert.ok([200, 201].includes(r.status), await r.text())
    const feed = await (
        await mf.dispatchFetch("https://debugger.test/v1/captures", { headers })
    ).json()
    assert.equal(feed.captures.length, 1)
    const result = await mf.dispatchFetch(
        `https://debugger.test/v1/captures/${capture.captureId}`,
        { headers }
    )
    assert.deepEqual(await result.json(), capture)
    const bucket = await mf.getR2Bucket("PAYLOADS")
    assert.equal((await bucket.list()).objects.length, 1)
    assert.equal(
        (await mf.dispatchFetch("https://debugger.test/v1/captures")).status,
        401
    )
    const wallet = makeTestWallet()
    const requestApi = (path, method='GET', data, headers={}) => mf.dispatchFetch(`https://debugger.test/v1/${path}`, {
        method, headers:{Origin:'https://helios-lang.io', ...headers}, body:data === undefined ? undefined : JSON.stringify(data)
    })
    const challenge = await (await requestApi('auth/challenge','POST',{address:wallet.address})).json()
    const verified = await requestApi('auth/verify','POST',{id:challenge.id,...wallet.signData(challenge.payload)})
    assert.equal(verified.status, 200)
    const session = {Cookie:verified.headers.get('Set-Cookie').split(';')[0]}
    const created = await (await requestApi('keys','POST',{name:'CLI runtime'},session)).json()
    const flow = await (await requestApi('cli/logins','POST')).json()
    const token = {Authorization:`Bearer ${flow.token}`}
    assert.equal((await requestApi(`auth/cli-logins/${flow.id}`,'POST',undefined,session)).status, 200)
    const delivered = await (await requestApi(`cli/logins/${flow.id}`,'GET',undefined,token)).json()
    assert.equal(delivered.projects.length, 1)
    assert.equal(delivered.projects[0].apiKey, created.apiKey)
    assert.equal((await requestApi(`cli/logins/${flow.id}/complete`,'POST',undefined,token)).status, 200)
    assert.deepEqual(await (await requestApi(`cli/logins/${flow.id}`,'GET',undefined,token)).json(), {state:'completed'})
    assert.equal((await (await requestApi(`auth/cli-logins/${flow.id}`,'GET',undefined,session)).json()).state, 'completed')
    console.log(
        "PASS: real workerd + D1 + R2 upload race, idempotency, retrieval, isolation, encrypted CLI login"
    )
} finally {
    await mf.dispose()
}
