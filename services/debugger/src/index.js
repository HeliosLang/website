import { encryptKey } from "./key-secrets.js"
import { cliLogin } from "./cli-login.js"
import { validCapture } from "./capture.js"
import { verifyWallet } from "./auth.js"
import { decodeShelleyAddress } from "@helios-lang/ledger"
const MAX_BYTES = 10 * 1024 * 1024
const encoder = new TextEncoder()
const hex = (bytes) =>
    Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
const secret = () => hex(crypto.getRandomValues(new Uint8Array(32)))
const hash = async (value) =>
    hex(
        new Uint8Array(
            await crypto.subtle.digest("SHA-256", encoder.encode(value))
        )
    )
const fail = (status, message) => {
    throw Object.assign(new Error(message), { status })
}
const json = (value, status = 200, headers = {}) =>
    Response.json(value, {
        status,
        headers: { "Cache-Control": "no-store", ...headers }
    })
async function body(request, limit) {
    const reader = request.body?.getReader()
    if (!reader) fail(400, "Missing body")
    let size = 0
    const parts = []
    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.length
        if (size > limit) {
            await reader.cancel()
            fail(413, "Body too large")
        }
        parts.push(value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const part of parts) {
        bytes.set(part, offset)
        offset += part.length
    }
    try {
        return JSON.parse(
            new TextDecoder("utf-8", { fatal: true }).decode(bytes)
        )
    } catch {
        fail(400, "Invalid JSON")
    }
}
async function rate(env, id, limit, now) {
    const bucket = `${id}:${Math.floor(now / 60)}`
    const row = await env.DB.prepare(
        "INSERT INTO rate_limits(id,count,expires) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count"
    )
        .bind(bucket, now + 120)
        .first()
    if (row.count > limit) fail(429, "Rate limit exceeded")
}
async function route(request, env) {
    const url = new URL(request.url),
        path = url.pathname,
        now = Math.floor(Date.now() / 1000)
    if (path === "/v1/health" && request.method === "GET") {
        await env.DB.prepare("SELECT seq FROM captures LIMIT 0").bind().all()
        await env.PAYLOADS.head("_health")
        return json({ ok: true, apiVersion: 1 })
    }
    await rate(
        env,
        `ip:${request.headers.get("CF-Connecting-IP") ?? "local"}`,
        120,
        now
    )
    if (path.startsWith("/v1/cli/")) return cliLogin(request, env, now)
    if (path.startsWith("/v1/auth/") || path.startsWith("/v1/keys")) {
        if (request.headers.get("Origin") !== env.WEBSITE_ORIGIN)
            fail(403, "Website origin required")
        if (path === "/v1/auth/challenge" && request.method === "POST") {
            const { address } = await body(request, 16384)
            if (
                typeof address !== "string" ||
                !/^(?:[0-9a-fA-F]{2}){29,57}$/.test(address)
            )
                fail(400, "Invalid address")
            const id = crypto.randomUUID(),
                expires = now + 300
            const payload = hex(
                encoder.encode(
                    `Helios debugger login\nOrigin: ${env.WEBSITE_ORIGIN}\nAddress: ${address.toLowerCase()}\nNonce: ${secret()}\nExpires: ${expires}`
                )
            )
            await env.DB.prepare("INSERT INTO challenges VALUES (?,?,?,?)")
                .bind(id, address.toLowerCase(), payload, expires)
                .run()
            return json({ id, payload, expires })
        }
        if (path === "/v1/auth/verify" && request.method === "POST") {
            const { id, signature, key } = await body(request, 16384)
            if (typeof id !== "string") fail(400, "Invalid challenge")
            // Atomic consumption rejects racing/repeated verification attempts.
            const challenge = await env.DB.prepare(
                "DELETE FROM challenges WHERE id=? AND expires>? RETURNING *"
            )
                .bind(id, now)
                .first()
            if (!challenge) fail(401, "Challenge expired or consumed")
            let wallet
            try {
                wallet = verifyWallet(
                    challenge.address,
                    challenge.payload,
                    signature,
                    key
                )
            } catch {
                fail(401, "Invalid wallet signature")
            }
            const token = secret()
            await env.DB.batch([
                env.DB.prepare(
                    "INSERT OR IGNORE INTO wallets VALUES (?,?)"
                ).bind(wallet, now),
                env.DB.prepare("INSERT INTO sessions VALUES (?,?,?)").bind(
                    await hash(token),
                    wallet,
                    now + 3600
                )
            ])
            return json({ expires: now + 3600 }, 200, {
                "Set-Cookie": `helios_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/v1; Max-Age=3600`
            })
        }
        const token = request.headers
            .get("Cookie")
            ?.match(/(?:^|;\s*)helios_session=([a-f0-9]{64})(?:;|$)/)?.[1]
        const session =
            token &&
            (await env.DB.prepare(
                "SELECT wallet,expires FROM sessions WHERE hash=? AND expires>?"
            )
                .bind(await hash(token), now)
                .first())
        if (!session) fail(401, "Website session required")
        if (path.startsWith("/v1/auth/cli-logins/")) return cliLogin(request, env, now, session.wallet)
        if (path === "/v1/auth/session" && request.method === "POST") {
            const { address } = await body(request, 16384)
            let wallet
            try {
                const credential = decodeShelleyAddress(address).spendingCredential
                if (credential.kind !== "PubKeyHash") throw new Error("Not a payment key")
                wallet = hex(credential.bytes)
            } catch {
                fail(400, "Invalid wallet address")
            }
            return json({ matches: wallet === session.wallet, expires: session.expires })
        }
        if (path === "/v1/auth/logout" && request.method === "POST") {
            await env.DB.prepare("DELETE FROM sessions WHERE hash=?")
                .bind(await hash(token))
                .run()
            return json({ ok: true }, 200, {
                "Set-Cookie":
                    "helios_session=; HttpOnly; Secure; SameSite=Strict; Path=/v1; Max-Age=0"
            })
        }
        if (path === "/v1/keys" && request.method === "GET")
            return json({
                keys: (
                    await env.DB.prepare(
                        "SELECT id,name,created_at,revoked FROM api_keys WHERE wallet=? ORDER BY created_at,id"
                    )
                        .bind(session.wallet)
                        .all()
                ).results
            })
        if (path === "/v1/keys" && request.method === "POST") {
            const { name } = await body(request, 16384)
            if (typeof name !== "string" || !name.trim() || name.length > 100)
                fail(400, "Invalid key name")
            const id = crypto.randomUUID(),
                apiKey = `hdbg_${secret()}`
            await env.DB.prepare(
                "INSERT INTO api_keys(id,wallet,name,hash,created_at,encrypted_secret) VALUES (?,?,?,?,?,?)"
            )
                .bind(id, session.wallet, name.trim(), await hash(apiKey), now, await encryptKey(env, id, session.wallet, apiKey))
                .run()
            return json({ id, apiKey }, 201)
        }
        const keyId = path.match(/^\/v1\/keys\/([a-f0-9-]+)$/)?.[1]
        if (keyId && request.method === "DELETE") {
            const result = await env.DB.prepare(
                "UPDATE api_keys SET revoked=1 WHERE id=? AND wallet=?"
            )
                .bind(keyId, session.wallet)
                .run()
            if (!result.meta.changes) fail(404, "Key not found")
            return json({ ok: true })
        }
        fail(404, "Not found")
    }
    const apiKey = request.headers
        .get("Authorization")
        ?.match(/^Bearer (hdbg_[a-f0-9]{64})$/)?.[1]
    const key =
        apiKey &&
        (await env.DB.prepare(
            "SELECT id,name,created_at FROM api_keys WHERE hash=? AND revoked=0"
        )
            .bind(await hash(apiKey))
            .first())
    if (!key) fail(401, "API key required")
    await rate(env, `key:${key.id}`, 60, now)
    if (path === "/v1/project" && request.method === "GET")
        return json({ id: key.id, name: key.name, created_at: key.created_at })
    if (path === "/v1/captures" && request.method === "POST") {
        const capture = await body(request, MAX_BYTES)
        if (!validCapture(capture)) fail(400, "Invalid capture v1")
        const existing = await env.DB.prepare(
            "SELECT seq FROM captures WHERE key_id=? AND capture_id=?"
        )
            .bind(key.id, capture.captureId)
            .first()
        if (existing) return json({ seq: existing.seq, duplicate: true })
        // Unique object names prevent racing uploads from changing a published payload.
        const objectKey = `${key.id}/${capture.captureId}/${crypto.randomUUID()}`
        await env.PAYLOADS.put(objectKey, JSON.stringify(capture), {
            httpMetadata: { contentType: "application/json" }
        })
        let inserted
        try {
            inserted = await env.DB.prepare(
                "INSERT OR IGNORE INTO captures(key_id,capture_id,object_key,status,created_at,expires) VALUES (?,?,?,?,?,?) RETURNING seq"
            )
                .bind(
                    key.id,
                    capture.captureId,
                    objectKey,
                    capture.status,
                    now,
                    now + Number(env.RETENTION_DAYS ?? 30) * 86400
                )
                .first()
        } catch (error) {
            await env.PAYLOADS.delete(objectKey)
            throw error
        }
        if (!inserted) {
            await env.PAYLOADS.delete(objectKey)
            inserted = await env.DB.prepare(
                "SELECT seq FROM captures WHERE key_id=? AND capture_id=?"
            )
                .bind(key.id, capture.captureId)
                .first()
        }
        return json({ seq: inserted.seq }, 201)
    }
    if (path === "/v1/captures" && request.method === "GET") {
        const cursor = url.searchParams.get("cursor") ?? "0"
        if (!/^\d{1,15}$/.test(cursor)) fail(400, "Invalid cursor")
        const rows = (
            await env.DB.prepare(
                "SELECT seq,capture_id AS captureId,status,created_at AS createdAt FROM captures WHERE key_id=? AND seq>? AND expires>? ORDER BY seq LIMIT 100"
            )
                .bind(key.id, Number(cursor), now)
                .all()
        ).results
        return json({
            captures: rows,
            cursor: String(rows.at(-1)?.seq ?? cursor)
        })
    }
    const id = path.match(/^\/v1\/captures\/([a-f0-9-]{36})$/)?.[1]
    if (id && request.method === "GET") {
        const row = await env.DB.prepare(
            "SELECT object_key FROM captures WHERE key_id=? AND capture_id=? AND expires>?"
        )
            .bind(key.id, id, now)
            .first()
        if (!row) fail(404, "Capture not found")
        const object = await env.PAYLOADS.get(row.object_key)
        if (!object) fail(404, "Capture not found")
        return new Response(object.body, {
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-store"
            }
        })
    }
    fail(404, "Not found")
}
export default {
    async fetch(request, env) {
        const website = new URL(request.url).pathname.match(
            /^\/v1\/(auth|keys)(\/|$)/
        )
        const origin = request.headers.get("Origin")
        const cors = website
            ? origin === env.WEBSITE_ORIGIN
                ? {
                      "Access-Control-Allow-Origin": origin,
                      "Access-Control-Allow-Credentials": "true",
                      Vary: "Origin"
                  }
                : {}
            : { "Access-Control-Allow-Origin": "*" }
        let response
        if (request.method === "OPTIONS")
            response = new Response(null, {
                status: 204,
                headers: {
                    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
                    "Access-Control-Allow-Headers": "Authorization,Content-Type"
                }
            })
        else
            try {
                response = await route(request, env)
            } catch (error) {
                response = json(
                    {
                        error: error.status
                            ? error.message
                            : "Internal service error"
                    },
                    error.status ?? 500
                )
            }
        for (const [key, value] of Object.entries(cors))
            response.headers.set(key, value)
        return response
    },
    async scheduled(_event, env) {
        const now = Math.floor(Date.now() / 1000)
        const rows = (
            await env.DB.prepare(
                "SELECT seq,object_key FROM captures WHERE expires<=? LIMIT 1000"
            )
                .bind(now)
                .all()
        ).results
        for (const row of rows) {
            await env.PAYLOADS.delete(row.object_key)
            await env.DB.prepare("DELETE FROM captures WHERE seq=?")
                .bind(row.seq)
                .run()
        }
        await env.DB.batch(
            ["sessions", "challenges", "rate_limits", "cli_logins"].map((table) =>
                env.DB.prepare(`DELETE FROM ${table} WHERE expires<=?`).bind(
                    now
                )
            )
        )
    }
}
