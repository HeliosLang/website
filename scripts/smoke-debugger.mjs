import { pathToFileURL } from 'node:url'

const consoleTitle = /<title\b[^>]*>Console(?:\s*\|[^<]*)?<\/title>/i
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

export async function checkConsole(website, {
    fetchImpl = fetch,
    attempts = 12,
    delayMs = 5000,
    wait = sleep,
    warn = console.warn
} = {}) {
    const url = new URL('/console', website)
    let detail
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            const response = await fetchImpl(url, {
                signal: AbortSignal.timeout(10000),
                headers: { 'Cache-Control': 'no-cache' }
            })
            const html = await response.text()
            if (response.ok && consoleTitle.test(html)) return
            const title = html.match(/<title\b[^>]*>([^<]*)<\/title>/i)?.[1] ?? '(missing)'
            detail = `HTTP ${response.status}, URL ${response.url || url}, title ${JSON.stringify(title.slice(0, 200))}`
        } catch (error) {
            detail = `${error.message}${error.cause?.code ? ` (${error.cause.code})` : ''}`
        }
        if (attempt < attempts) {
            warn(`Console not ready (${attempt}/${attempts}): ${detail}; retrying in ${delayMs}ms`)
            await wait(delayMs)
        }
    }
    throw new Error(`Console smoke check failed after ${attempts} attempts: ${detail}`)
}

async function main() {
    const [api, website] = process.argv.slice(2)
    const health = await fetch(`${api}/v1/health`, { signal: AbortSignal.timeout(10000) })
    if (!health.ok || (await health.json()).apiVersion !== 1)
        throw new Error('Debugger health/API version check failed')
    const denied = await fetch(`${api}/v1/captures`, { signal: AbortSignal.timeout(10000) })
    if (denied.status !== 401)
        throw new Error('Unauthenticated capture access was not rejected')
    if (website) await checkConsole(website)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
    await main()
