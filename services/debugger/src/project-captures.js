const fail = (status, message) => { throw Object.assign(new Error(message), {status}) }
const json = value => Response.json(value, {headers: {'Cache-Control': 'no-store'}})

// Website sessions may inspect only captures owned by their wallet, including
// retained captures from revoked projects. API-key access remains separate.
export async function projectCaptures(request, env, wallet, now) {
    const url = new URL(request.url)
    const match = url.pathname.match(/^\/v1\/keys\/([a-f0-9-]{36})\/captures(?:\/([a-f0-9-]{36}))?$/)
    if (!match || request.method !== 'GET') fail(404, 'Not found')
    const project = await env.DB.prepare('SELECT id FROM api_keys WHERE id=? AND wallet=?').bind(match[1], wallet).first()
    if (!project) fail(404, 'Project not found')
    if (match[2]) {
        const row = await env.DB.prepare("SELECT object_key FROM captures WHERE key_id=? AND capture_id=? AND status='failed' AND expires>?").bind(project.id, match[2], now).first()
        if (!row) fail(404, 'Capture not found')
        const object = await env.PAYLOADS.get(row.object_key)
        if (!object) fail(404, 'Capture not found')
        return new Response(object.body, {headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store'}})
    }
    const cursor = url.searchParams.get('before')
    if (cursor !== null && !/^\d{1,15}$/.test(cursor)) fail(400, 'Invalid cursor')
    const rows = (await env.DB.prepare("SELECT seq,capture_id AS captureId,created_at AS createdAt FROM captures WHERE key_id=? AND status='failed' AND expires>? AND seq<? ORDER BY seq DESC LIMIT 11").bind(project.id, now, cursor === null ? Number.MAX_SAFE_INTEGER : Number(cursor)).all()).results
    const captures = rows.slice(0, 10)
    return json({captures, nextCursor: rows.length > 10 ? String(captures.at(-1).seq) : null})
}
