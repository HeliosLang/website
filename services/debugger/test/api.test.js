import { test } from "node:test"
import assert from "node:assert/strict"
import { DatabaseSync } from "node:sqlite"
import { readFileSync } from "node:fs"
import worker from "../src/index.js"
import { makeTestWallet } from "./wallet.js"

function fixture() {
    const db = new DatabaseSync(":memory:")
    db.exec(
        readFileSync(
            new URL("../migrations/0001_initial.sql", import.meta.url),
            "utf8"
        )
    )
    const prepare = (sql) => ({
        bind(...args) {
            return {
                async first() {
                    return db.prepare(sql).get(...args) ?? null
                },
                async all() {
                    return { results: db.prepare(sql).all(...args) }
                },
                async run() {
                    return {
                        meta: { changes: db.prepare(sql).run(...args).changes }
                    }
                }
            }
        }
    })
    const objects = new Map()
    const env = {
        WEBSITE_ORIGIN: "https://helios-lang.io",
        DB: {
            prepare,
            async batch(statements) {
                return Promise.all(statements.map((s) => s.run()))
            }
        },
        PAYLOADS: {
            async head(k) {
                return objects.has(k) ? {} : null
            },
            async put(k, v) {
                objects.set(k, v)
            },
            async get(k) {
                return objects.has(k) ? { body: objects.get(k) } : null
            },
            async delete(k) {
                objects.delete(k)
            }
        }
    }
    const request = async (path, method = "GET", data, headers = {}) =>
        worker.fetch(
            new Request(`https://debugger.helios-lang.io/v1/${path}`, {
                method,
                headers: { Origin: env.WEBSITE_ORIGIN, ...headers },
                body: data === undefined ? undefined : JSON.stringify(data)
            }),
            env
        )
    return { env, request, db, objects }
}
async function login(f) {
    const wallet = makeTestWallet()
    const challenge = await (
        await f.request("auth/challenge", "POST", {
            address: wallet.address
        })
    ).json()
    const signed = {
        id: challenge.id,
        ...wallet.signData(challenge.payload)
    }
    const response = await f.request("auth/verify", "POST", signed)
    assert.equal(
        response.status,
        200,
        JSON.stringify(await response.clone().json())
    )
    return { Cookie: response.headers.get("Set-Cookie").split(";")[0], signed }
}
test("wallet challenge, multiple keys, feed isolation, idempotency, revocation", async () => {
    const f = fixture(),
        session = await login(f)
    assert.equal(
        (await f.request("auth/verify", "POST", session.signed)).status,
        401
    )
    const create = async (name) =>
        (await f.request("keys", "POST", { name }, session)).json()
    const a = await create("browser"),
        b = await create("cli")
    assert.notEqual(a.apiKey, b.apiKey)
    assert.equal(
        (await (await f.request("keys", "GET", undefined, session)).json()).keys
            .length,
        2
    )
    const auth = { Authorization: `Bearer ${a.apiKey}` },
        other = { Authorization: `Bearer ${b.apiKey}` }
    assert.equal((await f.request("keys", "GET", undefined, auth)).status, 401)
    const capture = {
        version: 1,
        captureId: crypto.randomUUID(),
        status: "failed",
        evaluations: []
    }
    assert.equal(
        (await f.request("captures", "POST", capture, auth)).status,
        201
    )
    assert.equal(
        (await f.request("captures", "POST", capture, auth)).status,
        200
    )
    assert.equal(f.objects.size, 1)
    const page = await (
        await f.request("captures", "GET", undefined, auth)
    ).json()
    assert.equal(page.captures.length, 1)
    assert.equal(
        (
            await (
                await f.request(
                    `captures?cursor=${page.cursor}`,
                    "GET",
                    undefined,
                    auth
                )
            ).json()
        ).captures.length,
        0
    )
    assert.equal(
        (
            await f.request(
                `captures/${capture.captureId}`,
                "GET",
                undefined,
                other
            )
        ).status,
        404
    )
    assert.deepEqual(
        await (
            await f.request(
                `captures/${capture.captureId}`,
                "GET",
                undefined,
                auth
            )
        ).json(),
        capture
    )
    assert.equal(
        (await f.request(`keys/${a.id}`, "DELETE", undefined, session)).status,
        200
    )
    assert.equal(
        (await f.request("captures", "GET", undefined, auth)).status,
        401
    )
    assert.equal(
        (await f.request("captures", "GET", undefined, other)).status,
        200
    )
})
test("failed storage never publishes, expiry, wrong origin, invalid signatures", async () => {
    const f = fixture(),
        session = await login(f)
    const key = await (
        await f.request("keys", "POST", { name: "one" }, session)
    ).json()
    const auth = { Authorization: `Bearer ${key.apiKey}` }
    f.env.PAYLOADS.put = async () => {
        throw new Error("unavailable")
    }
    assert.equal(
        (
            await f.request(
                "captures",
                "POST",
                {
                    version: 1,
                    captureId: crypto.randomUUID(),
                    status: "failed",
                    evaluations: []
                },
                auth
            )
        ).status,
        500
    )
    assert.equal(
        (await (await f.request("captures", "GET", undefined, auth)).json())
            .captures.length,
        0
    )
    assert.equal(
        (
            await f.request("keys", "GET", undefined, {
                ...session,
                Origin: "https://evil.test"
            })
        ).status,
        403
    )
    f.db.exec("UPDATE sessions SET expires=0")
    assert.equal(
        (await f.request("keys", "GET", undefined, session)).status,
        401
    )
})

test("wrong wallet cannot revoke keys, expired challenges fail and rate limits apply", async () => {
    const f = fixture(),
        alice = await login(f),
        bob = await login(f)
    const key = await (
        await f.request("keys", "POST", { name: "alice" }, alice)
    ).json()
    assert.equal(
        (await f.request(`keys/${key.id}`, "DELETE", undefined, bob)).status,
        404
    )
    assert.equal(
        (await (await f.request("keys", "GET", undefined, bob)).json()).keys
            .length,
        0
    )
    const response = await f.request("auth/challenge", "POST", {
        address: "60" + "11".repeat(28)
    })
    const challenge = await response.json()
    f.db.exec("UPDATE challenges SET expires=0")
    assert.equal(
        (
            await f.request("auth/verify", "POST", {
                id: challenge.id,
                signature: "00",
                key: "00"
            })
        ).status,
        401
    )
    const invalid = await (
        await f.request("auth/challenge", "POST", {
            address: "60" + "11".repeat(28)
        })
    ).json()
    assert.equal(
        (
            await f.request("auth/verify", "POST", {
                id: invalid.id,
                signature: "00",
                key: "00"
            })
        ).status,
        401
    )
    const auth = { Authorization: `Bearer ${key.apiKey}` }
    let limited = false
    for (let i = 0; i < 65; i++) {
        const r = await f.request("captures", "GET", undefined, auth)
        if (r.status === 429) {
            limited = true
            break
        }
    }
    assert.ok(limited)
})

test("health readiness, size limit, CORS and retention cleanup", async () => {
    const f = fixture()
    assert.equal((await f.request("health")).status, 200)
    const session = await login(f),
        key = await (
            await f.request("keys", "POST", { name: "retention" }, session)
        ).json()
    const auth = { Authorization: `Bearer ${key.apiKey}` }
    const capture = {
        version: 1,
        captureId: crypto.randomUUID(),
        status: "failed",
        evaluations: []
    }
    assert.equal(
        (
            await f.request(
                "captures",
                "POST",
                { ...capture, sources: { huge: "x".repeat(10 * 1024 * 1024) } },
                auth
            )
        ).status,
        413
    )
    assert.equal(
        (
            await f.request(
                "captures",
                "POST",
                { ...capture, evaluations: [{}] },
                auth
            )
        ).status,
        400
    )
    const upload = await f.request("captures", "POST", capture, auth)
    assert.equal(upload.headers.get("Access-Control-Allow-Origin"), "*")
    assert.equal(upload.headers.get("Access-Control-Allow-Credentials"), null)
    f.db.exec("UPDATE captures SET expires=0")
    await worker.scheduled({}, f.env)
    assert.equal(f.objects.size, 0)
    assert.equal(
        (await (await f.request("captures", "GET", undefined, auth)).json())
            .captures.length,
        0
    )
    f.db.exec("DROP TABLE captures")
    assert.equal((await f.request("health")).status, 500)
})
