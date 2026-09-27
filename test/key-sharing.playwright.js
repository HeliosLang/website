async (page) => {
  const check = (ok,message) => {if(!ok) throw new Error(message)};
  const origin = 'http://127.0.0.1:3190';
  const id = '12345678-1234-1234-1234-123456789012';
  const apiKey = 'hdbg_'+'ab'.repeat(32);
  let keys = [];
  await page.unrouteAll({behavior:'ignoreErrors'});
  await page.context().grantPermissions(['clipboard-read','clipboard-write'],{origin});
  await page.route('https://debugger.helios-lang.io/v1/**', async route => {
    const path=route.request().url().replace('https://debugger.helios-lang.io/v1/','');
    const method=route.request().method();
    let body={},status=200;
    if(path==='keys' && method==='GET') body={keys};
    else if(path==='keys' && method==='POST') {
      keys=[{id,name:route.request().postDataJSON().name,created_at:1727452800,revoked:0}];
      body={id,apiKey};
    } else if(path===`keys/${id}`) body={...keys[0],apiKey};
    else if(path===`keys/${id}/captures`) body={captures:[],nextCursor:null};
    else {status=404;body={error:'Not found'};}
    await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body),headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Credentials':'true'}});
  });
  await page.setViewportSize({width:1280,height:900});
  await page.goto(origin+'/console');
  await page.getByRole('button',{name:'Create project',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Create project'});
  await dialog.getByLabel('Project name').fill('Shared project');
  await dialog.getByRole('button',{name:'Create project',exact:true}).click();
  const box=page.getByRole('region',{name:'Debugger API key',exact:true});
  await box.getByText(apiKey,{exact:true}).waitFor();
  check((await box.getAttribute('class')).includes('alert--warning'),'Creation uses yellow box');
  await page.getByRole('link',{name:'Shared project',exact:true}).click();
  await box.getByText(apiKey,{exact:true}).waitFor();
  check((await box.getAttribute('class')).includes('alert--warning'),'Project uses same yellow box');
  await page.reload();
  await box.getByText(apiKey,{exact:true}).waitFor();
  await box.getByRole('button',{name:'Copy API key',exact:true}).click();
  check(await page.evaluate(()=>navigator.clipboard.readText())===apiKey,'Copies full key');
  check((await box.innerText()).includes('helios import-key <api-key>'),'Shows collaboration command');
  const table=page.getByRole('table',{name:'Failed capture contexts'});
  check((await box.boundingBox()).y < (await table.boundingBox()).y,'Key above capture table');
  check(!/shown (?:only )?once|won.t be shown again|copy this api key now|dismiss secret/i.test(await page.locator('body').innerText()),'No one-time-secret language');
  await page.screenshot({path:'/tmp/helios-shared-key-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'API key wraps on mobile');
  await page.screenshot({path:'/tmp/helios-shared-key-mobile.png',fullPage:true});
  await page.unrouteAll({behavior:'ignoreErrors'});
  console.log('PASS: creation and persistent project yellow box, reload, copy, collaboration text, mobile layout');
}
