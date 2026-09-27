import { decryptKey } from "./key-secrets.js"
const json = (value) =>
    Response.json(value, { headers: { "Cache-Control": "no-store" } })
const fail = (status, message) => {
    throw Object.assign(new Error(message), { status })
}
const hex = (bytes) =>
    Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
const hash = async (value) =>
    hex(
        new Uint8Array(
            await crypto.subtle.digest(
                "SHA-256",
                new TextEncoder().encode(value)
            )
        )
    )

export async function cliLogin(request, env, now, wallet) {
    const path = new URL(request.url).pathname
    if (path === "/v1/cli/logins" && request.method === "POST" && !wallet) {
        const id = crypto.randomUUID()
        const token = "hcli_" + hex(crypto.getRandomValues(new Uint8Array(32)))
        const code = hex(
            crypto.getRandomValues(new Uint8Array(4))
        ).toUpperCase()
        const expires = now + 600
        await env.DB.prepare(
            "INSERT INTO cli_logins(id,token_hash,code,expires) VALUES (?,?,?,?)"
        )
            .bind(id, await hash(token), code, expires)
            .run()
        return json({
            id,
            token,
            code,
            expires,
            interval: 5,
            verificationUri: `${env.WEBSITE_ORIGIN}/console?cli_login=${id}`
        })
    }
    const match = path.match(
        /^\/v1\/(?:auth\/cli-logins|cli\/logins)\/([a-f0-9-]{36})(\/complete)?$/
    )
    if (!match) fail(404, "Not found")
    const row = await env.DB.prepare("SELECT * FROM cli_logins WHERE id=?")
        .bind(match[1])
        .first()
    if (!row) fail(404, "Login not found")
    if (wallet) {
        if (row.wallet && row.wallet !== wallet)
            fail(403, "Login belongs to another wallet")
    } else {
        const token = request.headers
            .get("Authorization")
            ?.match(/^Bearer (hcli_[a-f0-9]{64})$/)?.[1]
        if (!token || (await hash(token)) !== row.token_hash)
            fail(401, "Login token required")
    }
    if (row.expires <= now) fail(410, "Login expired; run helios login again")
    if (wallet) {
        if (match[2]) fail(404, "Not found")
        if (request.method === "POST") {
            const keys = await env.DB.prepare(
                "SELECT id FROM api_keys WHERE wallet=? AND revoked=0"
            )
                .bind(wallet)
                .all()
            if (!keys.results.length)
                fail(409, "Create a project before authorizing the CLI")
            const result = await env.DB.prepare(
                "UPDATE cli_logins SET wallet=?,state='approved' WHERE id=? AND state='pending' AND expires>?"
            )
                .bind(wallet, row.id, now)
                .run()
            if (!result.meta.changes) fail(409, "Login is no longer pending")
            return json({ state: "approved" })
        }
        if (request.method === "DELETE") {
            const cancelled = await env.DB.prepare(
                "UPDATE cli_logins SET wallet=?,state='cancelled' WHERE id=? AND state IN ('pending','approved') AND (wallet IS NULL OR wallet=?) RETURNING state"
            )
                .bind(wallet, row.id, wallet)
                .first()
            if (cancelled) return json(cancelled)
            const current = await env.DB.prepare(
                "SELECT state,wallet FROM cli_logins WHERE id=?"
            )
                .bind(row.id)
                .first()
            if (!current || current.wallet !== wallet)
                fail(409, "Login state changed")
            return json({ state: current.state })
        }
        if (request.method === "GET")
            return json({
                state: row.state,
                code: row.code,
                expires: row.expires
            })
    } else {
        if (match[2] && request.method === "POST") {
            if (!["approved", "completed"].includes(row.state))
                fail(409, "Login is not approved")
            const result = await env.DB.prepare(
                "UPDATE cli_logins SET state='completed' WHERE id=? AND state IN ('approved','completed') AND expires>?"
            )
                .bind(row.id, now)
                .run()
            if (!result.meta.changes) fail(409, "Login cannot be completed")
            return json({ state: "completed" })
        }
        if (!match[2] && request.method === "GET") {
            if (row.state !== "approved") return json({ state: row.state })
            const keys = (
                await env.DB.prepare(
                    "SELECT id,wallet,name,created_at,encrypted_secret FROM api_keys WHERE wallet=? AND revoked=0 ORDER BY created_at,id"
                )
                    .bind(row.wallet)
                    .all()
            ).results
            const projects = await Promise.all(
                keys.map(async (key) => ({
                    id: key.id,
                    name: key.name,
                    created_at: key.created_at,
                    apiKey: await decryptKey(env, key)
                }))
            )
            return json({ state: "approved", wallet: row.wallet, projects })
        }
    }
    fail(404, "Not found")
}
