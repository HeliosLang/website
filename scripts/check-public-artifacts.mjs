import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
async function check(dir) {
 for(const entry of await readdir(dir,{withFileTypes:true})){
   const path=join(dir,entry.name)
   if(entry.isDirectory()) await check(path)
   else if(/\.(js|json|html|css|map)$/.test(entry.name)) {
     const text=await readFile(path,'utf8')
     if(/hdbg_[a-f0-9]{64}|hcli_[a-f0-9]{64}|DEBUGGER_KEY_ENCRYPTION_KEY|CLOUDFLARE_API_TOKEN|BEGIN (?:RSA |EC )?PRIVATE KEY/.test(text)) throw new Error(`Potential credential in frontend artifact: ${path}`)
   }
 }
}
await check(process.argv[2]??'dist')
console.log('Public artifacts contain no debugger secrets, deployment token variable, or private keys')
