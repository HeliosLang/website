async (page) => {
  await page.unrouteAll({behavior: 'ignoreErrors'});
  await page.goto('http://127.0.0.1:4317/console/debugger/');
  await page.evaluate(() => {window.cardano = {test: {name:'Test Wallet',enable:async()=>{throw new Error('User declined wallet access')}}}});
  await page.getByRole('button',{name:'Find wallets'}).click();
  await page.getByRole('button', {name:'Connect Test Wallet'}).click();
  await page.getByRole('alert').filter({hasText:'User declined wallet access'}).waitFor();
  let keys = [];
  await page.route('https://debugger.helios-lang.io/v1/**', async route => {
    const path = route.request().url().replace('https://debugger.helios-lang.io', '');
    const method = route.request().method();
    let body = {};
    if (path.endsWith('/challenge')) body = {id:'challenge',payload:'abcd'};
    else if (path === '/v1/keys' && method === 'POST') {keys.push({id:'key1',name:'Browser test',revoked:0}); body = {id:'key1',apiKey:'hdbg_'+'ab'.repeat(32)};}
    else if (path === '/v1/keys' && method === 'GET') body = {keys};
    else if (method === 'DELETE') keys[0].revoked=1;
    await route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'http://127.0.0.1:4317','Access-Control-Allow-Credentials':'true'},body:JSON.stringify(body)});
  });
  await page.evaluate(() => {window.cardano.test.enable = async () => ({getUsedAddresses:async()=>['60'+'11'.repeat(28)],signData:async()=>({signature:'00',key:'00'})});});
  await page.getByRole('button',{name:'Find wallets'}).click();
  await page.getByRole('button',{name:'Connect Test Wallet'}).click();
  await page.getByLabel('Key name').fill('Browser test');
  await page.getByRole('button',{name:'Create API key'}).click();
  await page.getByText('Copy this secret now. It will not be shown again.').waitFor();
  await page.getByRole('button',{name:'Dismiss secret'}).click();
  await page.getByRole('button',{name:'Revoke',exact:true}).click();
  await page.getByText('Browser test — Revoked').waitFor();
  await page.getByRole('button',{name:'Sign out'}).click();
  await page.getByRole('button',{name:'Find wallets'}).waitFor();
  console.log('PASS: cancellation, wallet connect, create, one-time secret dismissal, revoke, logout');
}
