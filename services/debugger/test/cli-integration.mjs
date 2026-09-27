// Run after test:runtime: node test/cli-integration.mjs /path/to/contract-utils
import assert from 'node:assert/strict'
import {Miniflare} from 'miniflare'
import {mkdtemp, readFile, readdir, rm} from 'node:fs/promises'
import {join, resolve} from 'node:path'
import {tmpdir} from 'node:os'
import {pathToFileURL} from 'node:url'
import {makeTestWallet} from './wallet.js'
const cliRoot = resolve(process.argv[2])
const {importKey} = await import(pathToFileURL(join(cliRoot,'src/cli/import-key.mjs')))
const {installSharedProject} = await import(pathToFileURL(join(cliRoot,'src/cli/config.mjs')))
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
    const keyPage = await request(`keys/${keys[0].id}`,'GET',undefined,session)
    assert.equal(keyPage.status,200)
    assert.equal(keyPage.headers.get('Cache-Control'),'no-store')
    assert.equal((await keyPage.json()).apiKey,keys[0].apiKey)
    assert.equal((await request(`keys/${keys[0].id}`)).status,401)
    const otherWallet=makeTestWallet()
    const otherChallenge=await (await request('auth/challenge','POST',{address:otherWallet.address})).json()
    const otherVerify=await request('auth/verify','POST',{id:otherChallenge.id,...otherWallet.signData(otherChallenge.payload)})
    const otherSession={Cookie:otherVerify.headers.get('Set-Cookie').split(';')[0]}
    assert.equal((await request(`keys/${keys[0].id}`,'GET',undefined,otherSession)).status,404)
    const sharedConfig=join(directory,'collaborator','debugger.json')
    await importKey(keys[0].apiKey,{
        fetchImpl:(url,options)=>mf.dispatchFetch(url,options),
        save:(project,endpoint)=>installSharedProject(project,endpoint,sharedConfig),
        log:()=>{}
    })
    const collaborator=await readConfig(sharedConfig)
    assert.equal(collaborator.profiles[keys[0].id].name,'First project')
    assert.equal(collaborator.profiles[keys[0].id].apiKey,keys[0].apiKey)
    const {resolveProject}=await import(pathToFileURL(join(cliRoot,'src/cli/project.mjs')))
    assert.equal((await resolveProject('First project',{
        read:()=>readConfig(sharedConfig),
        fetchImpl:(url,options)=>mf.dispatchFetch(url,options)
    })).projectId,keys[0].id)
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
    assert.equal((await request(`keys/${keys[0].id}`,'GET',undefined,session)).status,404)
    await assert.rejects(importKey(keys[0].apiKey,{
        fetchImpl:(url,options)=>mf.dispatchFetch(url,options),log:()=>{}
    }),/invalid or revoked/)
    await runLogin()
    saved=await readConfig(config)
    assert.deepEqual(Object.keys(saved.profiles),[keys[1].id])
    assert.equal(saved.profiles[keys[1].id].apiKey, keys[1].apiKey)
    console.log('PASS: persistent owner key retrieval, wallet isolation, collaboration import, revocation, real CLI + workerd + D1 encrypted-key delivery, owner-only JSON persistence, repeat login and completion acknowledgment')
} finally {await mf.dispose();await rm(directory,{recursive:true,force:true})}
