async (page) => {
  const check = (ok,message) => {if(!ok) throw new Error(message)};
  const id = '12345678-1234-1234-1234-123456789012';
  const origin = 'http://127.0.0.1:4318';
  await page.unrouteAll({behavior:'ignoreErrors'});
  let state = 'pending', keys = [], refused = false, approvals = 0, authenticated = false;
  await page.route('https://debugger.helios-lang.io/v1/**', async route => {
    const path = route.request().url().replace('https://debugger.helios-lang.io/v1/','');
    const method = route.request().method();
    let body={}, status=200;
    if(path==='auth/session') {status=401;body={error:'No session'}}
    else if(path==='auth/challenge') body={id:'challenge',payload:'abcd'};
    else if(path==='auth/verify') {authenticated=true;body={expires:Math.floor(Date.now()/1000)+3600};}
    else if(path===`auth/cli-logins/${id}`) {
      if(method==='POST') {state='approved';approvals++;}
      else if(method==='DELETE') state='cancelled';
      body={state,code:'ABCDEF12',expires:Math.floor(Date.now()/1000)+600};
    } else if(path==='keys' && method==='GET') {status=authenticated?200:401;body=authenticated?{keys}:{error:'No session'};}
    else if(path==='keys' && method==='POST') {
      const name=route.request().postDataJSON().name;
      keys.push({id:'key',name,created_at:1727452800,revoked:0});
      body={id:'key',apiKey:'hdbg_'+'ab'.repeat(32)};
    }
    await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body),headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Credentials':'true'}});
  });
  const connect = async (cancel=false) => {
    await page.evaluate(cancel => {window.cardano={eternl:{name:'Eternl',enable:async()=>{
      if(cancel) throw new Error('User declined wallet access');
      return {getUsedAddresses:async()=>['60'+'11'.repeat(28)],signData:async()=>({signature:'00',key:'00'})};
    }}}}, cancel);
    await page.getByRole('button',{name:'Connect wallet',exact:true}).click();
    await page.getByRole('dialog',{name:'Connect wallet'}).getByRole('button',{name:'Eternl',exact:true}).click();
  };
  await page.setViewportSize({width:1280,height:900});
  await page.goto(`${origin}/console?cli_login=${id}`);
  await connect(true);
  await page.getByRole('alert').filter({hasText:'User declined wallet access'}).waitFor();
  check(approvals===0,'Wallet cancellation must not approve');
  await page.getByRole('button',{name:'Close wallet selection'}).click();
  await connect();
  const panel=page.getByRole('region',{name:'CLI authorization'});
  await panel.getByText('ABCDEF12',{exact:true}).waitFor();
  check(await panel.getByRole('button',{name:'Authorize CLI',exact:true}).count()===0,'No authorization without project');
  await panel.getByRole('button',{name:'Create project',exact:true}).click();
  const create=page.getByRole('dialog',{name:'Create project',exact:true});
  await create.getByLabel('Project name').fill('First project');
  await create.getByRole('button',{name:'Create project',exact:true}).click();
  await create.waitFor({state:'hidden'});
  await panel.getByRole('button',{name:'Authorize CLI',exact:true}).waitFor();
  check(await page.getByText('hdbg_'+'ab'.repeat(32),{exact:true}).count()===0,'CLI flow must not render project secrets');
  await panel.getByRole('button',{name:'Authorize CLI',exact:true}).click();
  await panel.getByText('Waiting for the CLI to save your project keys…',{exact:true}).waitFor();
  check(await page.getByText('You can now close this tab',{exact:true}).count()===0,'Wait for CLI write acknowledgment');
  await page.screenshot({path:'output/playwright/cli-login-waiting.png',fullPage:true});
  state='completed';
  await panel.getByText('You can now close this tab',{exact:true}).waitFor({timeout:15000});
  await page.screenshot({path:'output/playwright/cli-login-completed.png',fullPage:true});
  state='pending'; keys.push({id:'second',name:'Second project',created_at:1727452800,revoked:0});
  await page.reload();
  await panel.getByText('Second project',{exact:true}).waitFor();
  await page.setViewportSize({width:390,height:844});
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'CLI authorization mobile layout');
  await panel.getByRole('button',{name:'Cancel CLI login'}).click();
  await panel.getByText('CLI login cancelled. Run helios login to try again.').waitFor();
  check(approvals===1,'Cancel existing-project login without approval');
  check(await page.evaluate(()=>!JSON.stringify(localStorage).includes('hdbg_')),'No API key in localStorage');
  await page.unrouteAll({behavior:'ignoreErrors'});
  console.log('PASS: wallet cancellation, first project, explicit CLI approval, delayed acknowledgment, existing projects, cancellation and mobile layout');
}
