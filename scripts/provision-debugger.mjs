import { appendFile, readFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

export async function provision(config, {account, token, template, fetchImpl = fetch}) {
  const {pagesProject} = config
  if (!account || !token) throw new Error('Cloudflare deployment credentials required')
  if (!/^[a-z0-9][a-z0-9-]{0,57}[a-z0-9]$/.test(pagesProject ?? '')) throw new Error('Valid pagesProject in deployment config required')
  for (const name of ['worker', 'database', 'bucket']) if (!/^[a-z0-9-]+$/.test(config[name])) throw new Error(`Invalid ${name} name`)
  if (new URL(config.websiteOrigin).origin !== config.websiteOrigin || !config.websiteOrigin.startsWith('https://')) throw new Error('Exact HTTPS website origin required')
  if (!/^[a-z0-9.-]+$/.test(config.apiHost)) throw new Error('Invalid API hostname')
  const base = `https://api.cloudflare.com/client/v4/accounts/${account}`
  async function api(path, method = 'GET', body, allowMissing = false) {
    const response = await fetchImpl(base + path, {
      method, headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000), redirect: 'error'
    })
    const result = await response.json()
    if (allowMissing && response.status === 404) return undefined
    if (!response.ok || !result.success) throw new Error(`Cloudflare ${method} ${path}: ${JSON.stringify(result.errors)}`)
    return result.result
  }
  const project = await api(`/pages/projects/${pagesProject}`, 'GET', undefined, true)
  if (!project) {
    await api('/pages/projects', 'POST', {name: pagesProject, production_branch: 'main'})
  } else if (project.production_branch !== 'main') {
    throw new Error(`Pages project ${pagesProject} must use main as its production branch (currently ${project.production_branch})`)
  }
  const databases = []
  for (let page = 1; ; page++) {
    const rows = await api(`/d1/database?per_page=100&page=${page}`)
    databases.push(...rows)
    if (rows.length < 100) break
  }
  let database = databases.find(db => db.name === config.database)
  if (!database) database = await api('/d1/database', 'POST', {name: config.database})
  const buckets = await api('/r2/buckets')
  if (!buckets.buckets.some(bucket => bucket.name === config.bucket)) await api('/r2/buckets', 'POST', {name: config.bucket})
  await api(`/r2/buckets/${config.bucket}/lifecycle`, 'PUT', {
    rules: [{id: 'debugger-retention', enabled: true, conditions: {prefix: ''}, deleteObjectsTransition: {condition: {type: 'Age', maxAge: 30 * 86400}}}]
  })
  return {
    ...template, name: config.worker, workers_dev: false,
    vars: {WEBSITE_ORIGIN: config.websiteOrigin, RETENTION_DAYS: '30'},
    routes: [{pattern: config.apiHost, custom_domain: true}],
    d1_databases: [{binding: 'DB', database_name: config.database, database_id: database.uuid, migrations_dir: 'migrations'}],
    r2_buckets: [{binding: 'PAYLOADS', bucket_name: config.bucket}]
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [configPath, outputPath] = process.argv.slice(2)
  const config = JSON.parse(await readFile(configPath, 'utf8'))
  const template = JSON.parse(await readFile(new URL('../services/debugger/wrangler.jsonc', import.meta.url), 'utf8'))
  const result = await provision(config, {account: process.env.CLOUDFLARE_ACCOUNT_ID, token: process.env.CLOUDFLARE_API_TOKEN, template})
  await writeFile(outputPath, JSON.stringify(result, null, 2) + '\n')
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `pagesProject=${config.pagesProject}\n`)
}
