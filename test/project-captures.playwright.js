async (page) => {
  const origin='http://127.0.0.1:4318';
  const id='11111111-1111-1111-1111-111111111111';
  const captureId='22222222-2222-2222-2222-222222222222';
  const check=(ok,msg)=>{if(!ok)throw Error(msg)};
  let revoked=false, more=false;
  const cbor='d8799f'+'ab'.repeat(300)+'ff';
  await page.unrouteAll({behavior:'ignoreErrors'});
  await page.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__copiedCbor=value}}})});
  await page.route('https://debugger.helios-lang.io/v1/**',async route=>{
    const raw=route.request().url().replace('https://debugger.helios-lang.io','');const url={pathname:raw.split('?')[0],search:raw.includes('?')};let status=200,body;
    if(url.pathname==='/v1/keys')body={keys:[{id,name:'catalyst_time_lock',created_at:1727452800,revoked:Number(revoked)}]};
    else if(route.request().method()==='DELETE'){revoked=true;body={ok:true};}
    else if(url.pathname.endsWith('/captures'))body={captures:[{captureId: url.search ? '33333333-3333-3333-3333-333333333333' : captureId,createdAt:1727452800}],nextCursor:url.search?null:'9'};
    else if(url.pathname.endsWith(captureId))body={captureId,evaluations:[{phase:'construction',scriptHash:'ab'.repeat(28),arguments:[cbor,'00','d87980'],result:{error:'time lock not yet expired'},sourceMap:{sourceNames:['time_lock','asset_search']}}],sources:{time_lock:'spending time_lock\nfunc main() -> Bool {false}',asset_search:'module asset_search'}};
    else body={captureId:'33333333-3333-3333-3333-333333333333',evaluations:[]};
    await route.fulfill({status,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Credentials':'true'},contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto(`${origin}/console/project?id=${id}`);
  await page.getByRole('heading',{name:'catalyst_time_lock',exact:true}).waitFor();
  const table=page.getByRole('table',{name:'Failed capture contexts'});
  await table.getByText('time_lock',{exact:true}).waitFor();
  await table.getByRole('button',{name:'Copy argument 1 CBOR'}).click();
  check(await page.evaluate(()=>window.__copiedCbor)===cbor,'Copy must use full unabridged CBOR');
  check(!(await table.innerText()).includes(cbor),'Long CBOR must be abbreviated');
  await page.getByRole('button',{name:'Load more',exact:true}).click();
  await table.getByText('No validator evaluations recorded').waitFor();
  await page.setViewportSize({width:390,height:844});
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile overflow');
  await page.screenshot({path:'output/playwright/project-captures-mobile.png',fullPage:true});
  await page.setViewportSize({width:1280,height:900});
  await page.screenshot({path:'output/playwright/project-captures-desktop.png',fullPage:true});
  await page.evaluate(()=>{window.confirm=()=>true});
  await page.getByRole('button',{name:'Revoke API key'}).click();
  await page.getByText('API key revoked',{exact:true}).waitFor();
  check(revoked,'Revoke request');
  await page.getByRole('navigation',{name:'Breadcrumb'}).getByRole('link',{name:'Console'}).click();
  await page.getByRole('heading',{name:'Console',exact:true}).waitFor();
  await page.goto(`${origin}/console/project?id=00000000-0000-0000-0000-000000000000`);
  await page.getByRole('heading',{name:'Project not found'}).waitFor();
  await page.unrouteAll({behavior:'ignoreErrors'});
  console.log('PASS: project deep link, session restore, validator name, full CBOR copy, pagination, mobile, revoke, breadcrumb, missing project');
}
