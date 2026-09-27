const [api, website] = process.argv.slice(2)
const health=await fetch(`${api}/v1/health`)
if(!health.ok || (await health.json()).apiVersion!==1) throw new Error('Debugger health/API version check failed')
const denied=await fetch(`${api}/v1/captures`)
if(denied.status!==401) throw new Error('Unauthenticated capture access was not rejected')
if(website){const response=await fetch(`${website}/console/debugger`); if(!response.ok || !(await response.text()).includes('Debugger console')) throw new Error('Console smoke check failed')}
