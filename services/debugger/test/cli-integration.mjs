// Run after test:runtime: node test/cli-integration.mjs /path/to/contract-utils
import assert from 'node:assert/strict'
import {Miniflare} from 'miniflare'
import {mkdtemp, readFile, readdir, rm} from 'node:fs/promises'
import {join, resolve} from 'node:path'
import {tmpdir} from 'node:os'
import {pathToFileURL} from 'node:url'
import {makeTestWallet} from './wallet.js'
const cliRoot = resolve(process.argv[2])
const {login} = await import(pathToFileURL(join(cliRoot,'src/cli/login.mjs')))
const {installProjects, readConfig} = await import(pathToFileURL(join(cliRoot,'src/cli/config.mjs')))
const directory = await mkdtemp(join(tmpdir(),'helios-cli-integration-'))
const config = join(directory,'private','debugger.json')
const mf = new Miniflare({modules:true,scriptPath:'.test-worker/index.js',compatibilityDate:'2026-09-25',
    compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['PAYLOADS'],
    bindings:{WEBSITE_ORIGIN:'https://helios-lang.io',DEBUGGER_KEY_ENCRYPTION_KEY:btoa('x'.repeat(32))}})
try {
    const db = await mf.getD1Database('DB')
    for (const name of (await readdir(new URL('../migrations/',import.meta.url))).filter(n=>n.endsWith('.sql')).sort()) {
        const sql = await readFile(new URL(`../migrations/${name}`,import.meta.url),'utf8')
        for (const statement of sql.split(';').filter(s=>s.trim())) await db.prepare(statement).run()
    }
    const request = (path,method='GET',data,headers={}) => mf.dispatchFetch(`https://debugger.helios-lang.io/v1/${path}`,{
        method,headers:{Origin:'https://helios-lang.io',...headers},body:data===undefined?undefined:JSON.stringify(data)})
    const wallet = makeTestWallet()
    const challenge = await (await request('auth/challenge','POST',{address:wallet.address})).json()
    const verified = await request('auth/verify','POST',{id:challenge.id,...wallet.signData(challenge.payload)})
    assert.equal(verified.status,200)
    const session = {Cookie:verified.headers.get('Set-Cookie').split(';')[0]}
    const keys=[]
    for (const name of ['First project','Second project']) keys.push(await (await request('keys','POST',{name},session)).json())
    let currentId
    const runLogin = () => login({
        fetchImpl:(url,options)=>mf.dispatchFetch(url,options),log:()=>{},
        save:(wallet,projects,endpoint)=>installProjects(wallet,projects,endpoint,config),
        openBrowser:async url=>{
            currentId=new URL(url).searchParams.get('cli_login')
            assert.equal((await request(`auth/cli-logins/${currentId}`,'POST',undefined,session)).status,200)
        }
    })
    await runLogin()
    let saved=await readConfig(config)
    assert.deepEqual(new Set(Object.values(saved.profiles).map(p=>p.apiKey)),new Set(keys.map(k=>k.apiKey)))
    assert.equal((await (await request(`auth/cli-logins/${currentId}`,'GET',undefined,session)).json()).state,'completed')
    await request(`keys/${keys[0].id}`,'DELETE',undefined,session)
    await runLogin()
    saved=await readConfig(config)
    assert.deepEqual(Object.keys(saved.profiles),[keys[1].id])
    assert.equal(saved.profiles[keys[1].id].apiKey, keys[1].apiKey)
    console.log('PASS: real CLI + workerd + D1 encrypted-key delivery, owner-only JSON persistence, repeat login and completion acknowledgment')
} finally {await mf.dispose();await rm(directory,{recursive:true,force:true})}
