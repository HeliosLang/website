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
    db.exec(readFileSync(new URL("../migrations/0002_cli_login.sql", import.meta.url), "utf8"))
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
        DEBUGGER_KEY_ENCRYPTION_KEY: btoa("x".repeat(32)),
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
async function login(f, wallet = makeTestWallet()) {
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


test("wallet sessions resume only for their owner and expire or revoke normally", async () => {
    const f = fixture(), wallet = makeTestWallet(), other = makeTestWallet()
    const headers = await login(f, wallet)
    const resume = address => f.request("auth/session", "POST", {address}, headers)
    const result = await resume(wallet.address)
    assert.equal(result.status, 200)
    const session = await result.json()
    assert.equal(session.matches, true)
    assert.ok(session.expires > Date.now() / 1000)
    assert.equal(result.headers.get("Set-Cookie"), null)
    assert.equal((await (await resume(other.address)).json()).matches, false)
    assert.equal((await resume("invalid")).status, 400)
    assert.equal((await f.request("auth/session", "POST", {address:wallet.address})).status, 401)
    assert.equal((await f.request("auth/session", "POST", {address:wallet.address}, {...headers,Origin:"https://other.test"})).status, 403)
    await f.request("auth/logout", "POST", {}, headers)
    assert.equal((await resume(wallet.address)).status, 401)
    const renewed = await login(f, wallet)
    f.db.exec("UPDATE sessions SET expires=0")
    assert.equal((await f.request("auth/session", "POST", {address:wallet.address}, renewed)).status, 401)
})


test("project metadata is scoped to the bearer key and rejects revoked credentials", async () => {
    const f = fixture()
    const session = await login(f)
    const create = async (name, owner = session) =>
        (await f.request("keys", "POST", { name }, owner)).json()
    const keys = [await create("Browser"), await create("CLI"), await create("Other wallet", await login(f))]
    for (const [index, key] of keys.entries()) {
        const response = await f.request("project", "GET", undefined, {
            Authorization: `Bearer ${key.apiKey}`,
            Origin: "https://app.example"
        })
        assert.equal(response.status, 200)
        const project = await response.json()
        assert.deepEqual(Object.keys(project).sort(), ["created_at", "id", "name"])
        assert.equal(project.id, key.id)
        assert.equal(project.name, ["Browser", "CLI", "Other wallet"][index])
        assert.equal(project.created_at, f.db.prepare("SELECT created_at FROM api_keys WHERE id=?").get(key.id).created_at)
        assert.equal(response.headers.get("Cache-Control"), "no-store")
        assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*")
        assert.equal(response.headers.get("Access-Control-Allow-Credentials"), null)
    }
    for (const headers of [{}, session, {Authorization: "Bearer invalid"}, {Authorization: "Bearer hdbg_" + "00".repeat(32)}]) {
        assert.equal((await f.request("project", "GET", undefined, headers)).status, 401)
    }
    assert.equal((await f.request(`keys/${keys[0].id}`, "DELETE", undefined, session)).status, 200)
    assert.equal((await f.request("project", "GET", undefined, {Authorization: `Bearer ${keys[0].apiKey}`})).status, 401)
    assert.equal((await f.request("project", "GET", undefined, {Authorization: `Bearer ${keys[1].apiKey}`})).status, 200)
})

test("CLI login exports the same active keys only after wallet approval and stops at completion", async () => {
    const f = fixture(), session = await login(f), other = await login(f)
    const create = async (name, owner = session) => (await f.request("keys", "POST", {name}, owner)).json()
    const a = await create("App"), b = await create("App"), revoked = await create("Revoked")
    await create("Other wallet", other)
    await f.request(`keys/${revoked.id}`, "DELETE", undefined, session)
    const flow = await (await f.request("cli/logins", "POST")).json()
    const token = {Authorization:`Bearer ${flow.token}`}
    const poll = () => f.request(`cli/logins/${flow.id}`, "GET", undefined, token)
    const approve = () => f.request(`auth/cli-logins/${flow.id}`, "POST", undefined, session)
    assert.equal(flow.verificationUri, `https://helios-lang.io/console?cli_login=${flow.id}`)
    assert.ok(!flow.verificationUri.includes(flow.token))
    assert.deepEqual(await (await poll()).json(), {state:"pending"})
    assert.equal((await f.request(`cli/logins/${flow.id}`, "GET")).status, 401)
    assert.equal((await f.request(`auth/cli-logins/${flow.id}`, "POST", undefined, token)).status, 401)
    assert.equal((await f.request(`auth/cli-logins/${flow.id}`, "POST", undefined, {...session,Origin:"https://evil.test"})).status, 403)
    const status = await (await f.request(`auth/cli-logins/${flow.id}`, "GET", undefined, session)).json()
    assert.equal(status.code, flow.code)
    assert.equal((await approve()).status, 200)
    assert.equal((await approve()).status, 409)
    assert.equal((await f.request(`auth/cli-logins/${flow.id}`, "GET", undefined, other)).status, 403)
    const response = await poll(), data = await response.json()
    assert.equal(response.headers.get("Cache-Control"), "no-store")
    assert.deepEqual(new Set(data.projects.map(p => p.apiKey)), new Set([a.apiKey,b.apiKey]))
    assert.deepEqual(await (await poll()).json(), data)
    const encrypted = f.db.prepare("SELECT encrypted_secret FROM api_keys WHERE id=?").get(a.id).encrypted_secret
    assert.ok(!encrypted.includes(a.apiKey))
    assert.notEqual(f.db.prepare("SELECT token_hash FROM cli_logins WHERE id=?").get(flow.id).token_hash, flow.token)
    assert.equal((await f.request(`cli/logins/${flow.id}/complete`, "POST", undefined, token)).status, 200)
    assert.deepEqual(await (await poll()).json(), {state:"completed"})
    assert.equal((await (await f.request(`auth/cli-logins/${flow.id}`, "DELETE", undefined, session)).json()).state, "completed")
    assert.equal((await f.request(`cli/logins/${flow.id}/complete`, "POST", undefined, token)).status, 200)
    assert.equal((await (await f.request(`auth/cli-logins/${flow.id}`, "GET", undefined, session)).json()).state, "completed")
})

test("CLI login requires a project and handles wrong tokens, cancellation and expiry", async () => {
    const f = fixture(), session = await login(f)
    const start = async () => (await (await f.request("cli/logins", "POST")).json())
    const flow = await start(), token = {Authorization:`Bearer ${flow.token}`}
    assert.equal((await f.request(`auth/cli-logins/${flow.id}`, "POST", undefined, session)).status, 409)
    assert.equal((await f.request(`cli/logins/${flow.id}/complete`, "POST", undefined, token)).status, 409)
    assert.equal((await f.request(`cli/logins/${flow.id}`, "GET", undefined, {Authorization:'Bearer hcli_'+'00'.repeat(32)})).status, 401)
    await f.request(`auth/cli-logins/${flow.id}`, "DELETE", undefined, session)
    assert.deepEqual(await (await f.request(`cli/logins/${flow.id}`, "GET", undefined, token)).json(), {state:"cancelled"})
    await f.request("keys", "POST", {name:"First"}, session)
    assert.equal((await f.request(`auth/cli-logins/${flow.id}`, "POST", undefined, session)).status, 409)
    const expired = await start()
    f.db.exec("UPDATE cli_logins SET expires=0")
    assert.equal((await f.request(`cli/logins/${expired.id}`, "GET", undefined, {Authorization:`Bearer ${expired.token}`})).status, 410)
    assert.equal((await f.request(`auth/cli-logins/${expired.id}`, "POST", undefined, session)).status, 410)
    await worker.scheduled({}, f.env)
    assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM cli_logins").get().n, 0)
})

test('website capture browsing is wallet scoped, failed-only, paginated and survives revocation', async () => {
    const f = fixture(), session = await login(f), stranger = await login(f);
    const project = await (await f.request('keys', 'POST', {name:'Time lock'}, session)).json();
    const other = await (await f.request('keys', 'POST', {name:'Other'}, stranger)).json();
    const auth = {Authorization:`Bearer ${project.apiKey}`};
    const ids = [];
    for(let i=0;i<12;i++) {
        const captureId=crypto.randomUUID(); ids.push(captureId);
        assert.equal((await f.request('captures','POST',{version:1,captureId,status:'failed',evaluations:[]},auth)).status,201);
    }
    const success=crypto.randomUUID();
    await f.request('captures','POST',{version:1,captureId:success,status:'succeeded',evaluations:[]},auth);
    const path=`keys/${project.id}/captures`;
    const response=await f.request(path,'GET',undefined,session);
    assert.equal(response.status,200);
    assert.equal(response.headers.get('Access-Control-Allow-Credentials'),'true');
    assert.equal(response.headers.get('Cache-Control'),'no-store');
    const first=await response.json();
    assert.equal(first.captures.length,10);
    assert.equal(first.captures[0].captureId,ids[11]);
    const second=await (await f.request(`${path}?before=${first.nextCursor}`,'GET',undefined,session)).json();
    assert.equal(second.captures.length,2); assert.equal(second.nextCursor,null);
    assert.equal((await f.request(path,'GET',undefined,stranger)).status,404);
    assert.equal((await f.request(path,'GET',undefined,auth)).status,401);
    assert.equal((await f.request(path,'GET',undefined,{...session,Origin:'https://evil.example'})).status,403);
    assert.equal((await f.request(`${path}?before=bad`,'GET',undefined,session)).status,400);
    assert.equal((await f.request(`${path}/${success}`,'GET',undefined,session)).status,404);
    assert.equal((await f.request(`keys/${other.id}/captures/${ids[0]}`,'GET',undefined,stranger)).status,404);
    const detail=await (await f.request(`${path}/${ids[0]}`,'GET',undefined,session)).json();
    assert.equal(detail.captureId,ids[0]);
    assert.ok(!JSON.stringify(first).includes(project.apiKey));
    await f.request(`keys/${project.id}`,'DELETE',undefined,session);
    assert.equal((await f.request(`${path}/${ids[0]}`,'GET',undefined,session)).status,200);
    f.db.prepare('UPDATE captures SET expires=0 WHERE capture_id=?').run(ids[0]);
    assert.equal((await f.request(`${path}/${ids[0]}`,'GET',undefined,session)).status,404);
    f.objects.clear();
    assert.equal((await f.request(`${path}/${ids[1]}`,'GET',undefined,session)).status,404);
});
