import { test } from 'node:test'
import assert from 'node:assert/strict'
import { provision } from '../scripts/provision-debugger.mjs'
const config={pagesProject:'test-site',worker:'test-worker',database:'test-db',bucket:'test-captures',apiHost:'debugger.test.io',websiteOrigin:'https://test.io'}
test('resource discovery is repeatable and provisioned config contains no token',async()=>{
 const databases=[],buckets=[],calls=[]
 let project
 const fetchImpl=async(url,init)=>{
   const path=new URL(url).pathname.replace('/client/v4/accounts/account','')
   calls.push([path,init.method])
   let result={}
   if(path==='/pages/projects/test-site') {
      if (!project) return Response.json({success:false,errors:[]},{status:404})
      result=project
   } else if(path==='/pages/projects') {
      assert.equal(init.method,'POST')
      project=JSON.parse(init.body)
      assert.deepEqual(project,{name:'test-site',production_branch:'main'})
      result=project
   } else if(path==='/d1/database') {
      if(init.method==='POST'){result={uuid:'db-id',...JSON.parse(init.body)};databases.push(result)} else result=databases
   } else if(path==='/r2/buckets') {
      if(init.method==='POST') buckets.push(JSON.parse(init.body))
      else result={buckets}
   }
   return Response.json({success:true,result})
 }
 const options={account:'account',token:'SENTINEL_DEPLOYMENT_TOKEN',template:{main:'src/index.js'},fetchImpl}
 const first=await provision(config,options),second=await provision(config,options)
 assert.deepEqual(first,second)
 assert.equal(calls.filter(([,method])=>method==='POST').length,3)
 assert.equal(first.d1_databases[0].database_id,'db-id')
 assert.ok(!JSON.stringify(first).includes(options.token))
 await assert.rejects(provision(config,{...options,fetchImpl:async()=>Response.json({success:false,errors:[{message:'denied'}]},{status:403})}),/denied/)
})

test('reuse existing Pages project without changing its domains or configuration',async()=>{
 const calls=[]
 const project={name:'existing-site',production_branch:'main',domains:['helios-lang.io']}
 const before=structuredClone(project)
 const fetchImpl=async(url,init)=>{
   const path=new URL(url).pathname.replace('/client/v4/accounts/account','')
   calls.push([path,init.method])
   const result=path==='/pages/projects/existing-site' ? project
     : path==='/d1/database' ? [{name:config.database,uuid:'existing-db'}]
     : path==='/r2/buckets' ? {buckets:[{name:config.bucket}]} : {}
   return Response.json({success:true,result})
 }
 await provision({...config,pagesProject:'existing-site'},{account:'account',token:'token',template:{},fetchImpl})
 assert.deepEqual(project,before)
 assert.deepEqual(calls.filter(([path])=>path.startsWith('/pages/')),[['/pages/projects/existing-site','GET']])
 assert.ok(!calls.some(([,method])=>method==='POST'))
})

test('Pages permission and creation failures stop provisioning',async()=>{
 for(const failure of ['lookup','create']){
   const calls=[]
   const fetchImpl=async(url,init)=>{
     calls.push(init.method)
     if(failure==='create' && init.method==='GET')
       return Response.json({success:false,errors:[]},{status:404})
     return Response.json({success:false,errors:[{message:'denied'}]},{status:403})
   }
   await assert.rejects(provision(config,{account:'account',token:'token',template:{},fetchImpl}),/denied/)
   assert.deepEqual(calls,failure==='lookup'?['GET']:['GET','POST'])
 }
})

test('reject a non-production project branch before provisioning other resources',async()=>{
 let calls=0
 await assert.rejects(provision(config,{account:'account',token:'token',template:{},fetchImpl:async()=>{
   calls++
   return Response.json({success:true,result:{production_branch:'preview'}})
 }}),/must use main/)
 assert.equal(calls,1)
})
