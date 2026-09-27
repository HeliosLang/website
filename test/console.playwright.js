async (page) => {
  const origin = 'http://127.0.0.1:4318';
  const check = (condition, message) => {if (!condition) throw new Error(message);};
  await page.unrouteAll({behavior: 'ignoreErrors'});
  await page.setViewportSize({width:1280,height:900});
  await page.route('https://debugger.helios-lang.io/v1/**', route=>route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:'No session'})}));
  await page.goto(origin + '/console/');
  await page.getByRole('heading',{name:'Console',exact:true,level:1}).waitFor();
  check((await page.title()).startsWith('Console'), 'Page title');
  await page.getByRole('button',{name:'Connect wallet',exact:true}).click();
  const picker = page.getByRole('dialog',{name:'Connect wallet',exact:true});
  await picker.getByText('Install or enable a Cardano wallet to connect.').waitFor();
  for (const name of ['Eternl','Lace','VESPR','Yoroi','Begin']) {
    check(await picker.getByRole('button',{name,exact:true}).isDisabled(), name + ' must be unavailable');
  }
  await page.waitForFunction(() => [...document.querySelectorAll('dialog[open] img')].every(img => img.complete && img.naturalWidth > 0));
  const positions = await picker.locator('img').evaluateAll(images => images.map(img => img.getBoundingClientRect().x));
  check(positions.every(x => x === positions[0]), 'Wallet logos must be in one column');
  await page.screenshot({path:'output/playwright/wallet-picker-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'output/playwright/wallet-picker-mobile.png',fullPage:true});
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth), 'Wallet picker mobile overflow');
  await page.keyboard.press('Escape');
  await picker.waitFor({state:'hidden'});
  check(await page.getByRole('button',{name:'Connect wallet',exact:true}).evaluate(el=>el===document.activeElement), 'Focus must return to connection button');

  await page.evaluate(() => {window.cardano = {eternl: {name:'Eternl Wallet',enable:async()=>{throw new Error('User declined wallet access')}}}});
  await page.getByRole('button',{name:'Connect wallet',exact:true}).click();
  await picker.getByRole('button',{name:'Eternl',exact:true}).click();
  await picker.getByRole('alert').filter({hasText:'User declined wallet access'}).waitFor();
  await picker.getByRole('button',{name:'Close wallet selection'}).click();
  let keys = [];
  let sessionAlive = false;
  let challenges = 0;
  await page.route('https://debugger.helios-lang.io/v1/**', async route => {
    const path = route.request().url().replace('https://debugger.helios-lang.io', '').split('?')[0];
    const method = route.request().method();
    let body = {};
    let status = 200;
    if(path.endsWith('/session')) {status=sessionAlive?200:401;body={matches:sessionAlive};}
    else if(path.endsWith('/verify')) sessionAlive=true;
    else if(path.endsWith('/logout')) sessionAlive=false;
    else if (path.endsWith('/challenge')) {challenges++;body = {id:'challenge',payload:'abcd'};}
    else if (path === '/v1/keys' && method === 'POST') {
      const key = {id:'key'+(keys.length+1),name:route.request().postDataJSON().name,created_at:1727452800,revoked:0};
      keys.push(key); body = {id:key.id,apiKey:'hdbg_'+'ab'.repeat(32)};
    } else if (path === '/v1/keys' && method === 'GET') {status=sessionAlive?200:401;body=sessionAlive?{keys}:{error:'No session'};}
    else if(path.endsWith('/captures')) body={captures:[],nextCursor:null};
    else if (method === 'DELETE') keys.find(key=>path.endsWith('/'+key.id)).revoked=1;
    await route.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Credentials':'true'},body:JSON.stringify(body)});
  });
  await page.evaluate(() => {window.cardano.eternl.enable = async () => ({getUsedAddresses:async()=>['60'+'11'.repeat(28)],signData:async()=>({signature:'00',key:'00'})});});
  await page.getByRole('button',{name:'Connect wallet',exact:true}).click();
  await picker.getByRole('button',{name:'Eternl',exact:true}).click();
  await picker.waitFor({state:'hidden'});
  const table = page.getByRole('table',{name:'Projects'});
  await table.waitFor();
  const checkTableWidth = async () => {
    const bounds = await table.evaluate(el => {
      const table = el.getBoundingClientRect();
      const content = el.closest('section').getBoundingClientRect();
      return {left: table.left - content.left, width: table.width - content.width};
    });
    check(Math.abs(bounds.left) < 1 && Math.abs(bounds.width) < 1, 'Projects table must fill Console content width');
  };
  await checkTableWidth();
  check(await table.getByRole('columnheader').count()===2, 'Exactly two table columns');
  await table.getByRole('columnheader',{name:'Name',exact:true}).waitFor();
  await table.getByRole('columnheader',{name:'Creation time',exact:true}).waitFor();
  check(await page.getByLabel('Project name').isVisible()===false, 'Creation form starts hidden');
  check(await page.getByRole('button',{name:'New project',exact:true}).count()===0, 'No new-project button for empty table');
  const logout = page.getByRole('button',{name:'Log out',exact:true});
  const headingBox = await page.getByRole('heading',{name:'Console',exact:true,level:1}).boundingBox();
  const logoutBox = await logout.boundingBox();
  check(logoutBox.x>headingBox.x+headingBox.width && Math.abs(logoutBox.y+logoutBox.height/2-headingBox.y-headingBox.height/2)<3, 'Logout must align to heading');
  check(await logout.locator('svg').count()===1, 'Logout icon');
  await page.getByText('Manager your Debugger API keys',{exact:true}).waitFor();
  await page.screenshot({path:'output/playwright/projects-empty-mobile.png',fullPage:true});
  await page.setViewportSize({width:1280,height:900});
  await checkTableWidth();
  await page.screenshot({path:'output/playwright/projects-empty-desktop.png',fullPage:true});
  await table.getByRole('button',{name:'Create project',exact:true}).click();
  const create = page.getByRole('dialog',{name:'Create project',exact:true});
  check(await create.getByRole('button',{name:'Create project',exact:true}).isDisabled(), 'Blank names cannot submit');
  await create.getByLabel('Project name').fill('Browser test');
  await create.getByRole('button',{name:'Create project',exact:true}).click();
  await create.waitFor({state:'hidden'});
  await page.getByText('Copy this API key now, or install it later using helios login.').waitFor();
  await page.getByRole('button',{name:'Dismiss secret'}).click();
  check(await page.getByText('hdbg_'+'ab'.repeat(32),{exact:true}).count()===0, 'Secret dismissed');
  await table.getByRole('link',{name:'Browser test',exact:true}).waitFor();
  check(await table.locator('time').getAttribute('datetime')==='2024-09-27T16:00:00.000Z', 'Creation time must use server timestamp');
  await page.getByRole('button',{name:'New project',exact:true}).click();
  await create.getByLabel('Project name').fill('Second project');
  await create.getByRole('button',{name:'Create project',exact:true}).click();
  await create.waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Dismiss secret'}).click();
  check(await table.getByRole('row').count()===3, 'Two projects plus header');
  await checkTableWidth();
  await page.screenshot({path:'output/playwright/projects-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth), 'Projects mobile overflow');
  await checkTableWidth();
  await page.screenshot({path:'output/playwright/projects-mobile.png',fullPage:true});
  await table.getByRole('link',{name:'Browser test',exact:true}).click();
  await page.getByRole('heading',{name:'Browser test',exact:true}).waitFor();
  await page.evaluate(()=>{window.confirm=()=>true});
  await page.getByRole('button',{name:'Revoke API key',exact:true}).click();
  await page.getByText('API key revoked',{exact:true}).waitFor();
  await page.getByRole('navigation',{name:'Breadcrumb'}).getByRole('link',{name:'Console'}).click();
  await table.getByText('Revoked',{exact:true}).waitFor();
  check(challenges===1, 'Initial connection signs once');
  check(await page.evaluate(()=>localStorage.getItem('helios.debugger.wallet'))==='eternl', 'Remember provider only');
  check(await page.evaluate(()=>!JSON.stringify(localStorage).includes('hdbg_')), 'No API key in localStorage');
  await page.reload();
  await table.waitFor();
  check(challenges===1, 'Valid session must restore without signing');
  await logout.click();
  await page.getByRole('button',{name:'Connect wallet',exact:true}).waitFor();
  check(await logout.count()===0, 'Logout hidden when disconnected');
  check(await page.getByRole('table').count()===0, 'Projects cleared on logout');
  await page.unrouteAll({behavior:'ignoreErrors'});
  console.log('PASS: wallet picker, logos, keyboard focus, cancellation, empty/populated projects, timestamps, creation, secret dismissal, revocation, logout, mobile layout');
}
