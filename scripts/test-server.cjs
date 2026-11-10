const assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {createApp}=require('../server/app.cjs'),{passwordRecord,atomic,authManager}=require('../server/auth.cjs'),renderer=require('../assets/menu-renderer.js');
(async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'sweet-sushi-test-'));let current=Date.now(),app,origin;
 const password='Test-only-'+require('node:crypto').randomBytes(20).toString('hex');
 async function start(){app=createApp({dataDir:dir,now:()=>current,ttl:10000});await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+app.server.address().port;}
 async function call(url,method='GET',body,auth={},extra={}){const response=await fetch(origin+url,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{Origin:origin}:{}),...(auth.cookie?{Cookie:auth.cookie}:{}),...(auth.csrf?{'X-CSRF-Token':auth.csrf}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})});let data;try{data=await response.json();}catch{data=null;}return {status:response.status,data,headers:response.headers};}
 async function login(){const result=await call('/api/login','POST',{username:'admin',password});assert.equal(result.status,200);assert.match(result.headers.get('set-cookie'),/HttpOnly/);assert.match(result.headers.get('set-cookie'),/SameSite=Strict/);return {cookie:result.headers.get('set-cookie').split(';')[0],csrf:result.data.csrf};}
 try{
  await atomic(path.join(dir,'auth.json'),await passwordRecord('admin',password));await start();
  assert.equal((await call('/api/admin/menu')).status,401);
  const page=await fetch(origin+'/admin/');assert.equal(page.status,200);assert.match(page.headers.get('content-security-policy'),/frame-ancestors 'none'/);assert((await page.text()).includes('id="login-form"'));
  assert((await (await fetch(origin+'/assets/backend-config.js')).text()).includes('apiBase:location.origin'));
  const malformed=await fetch(origin+'/api/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'null'});assert.equal(malformed.status,400);
  assert.equal((await call('/api/login','POST',{username:'admin',password:'wrong'})).status,401);
  assert.equal((await call('/api/login','POST',{username:'admin',password}, {},{Origin:'https://evil.example'})).status,403);
  let auth=await login();assert.equal((await call('/api/session','GET',null,auth)).data.user,'admin');
  let state=(await call('/api/admin/menu','GET',null,auth)).data;const original=structuredClone(state.menu);
  state.menu.sections[0].items[0].name='Серверный тест';state.menu.sections[0].items[0].variants[0].price=345;
  const request={menu:state.menu,revision:state.draftRevision};
  assert.equal((await call('/api/admin/menu','PUT',request,{cookie:auth.cookie})).status,403);
  assert.equal((await call('/api/admin/menu','PUT',request,auth,{Origin:'https://evil.example'})).status,403);
  const results=await Promise.all([call('/api/admin/menu','PUT',request,auth),call('/api/admin/menu','PUT',request,auth)]);assert.deepEqual(results.map(x=>x.status).sort(),[200,409]);
  state=results.find(x=>x.status===200).data;
  assert.notEqual((await call('/api/admin/published','GET',null,auth)).data.menu.sections[0].items[0].name,'Серверный тест');
  const invalid=structuredClone(state.menu);invalid.sections[0].items[0].variants[0].price=-1;assert.equal((await call('/api/admin/menu','PUT',{menu:invalid,revision:state.draftRevision},auth)).status,400);
  state.menu.sections[0].items[0].photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
  const saved=await call('/api/admin/menu','PUT',{menu:state.menu,revision:state.draftRevision},auth);assert.equal(saved.status,200);state=saved.data;const photo=state.menu.sections[0].items[0].photo;assert.match(photo,/^\/media\/[a-f0-9]{64}\.png$/);assert.equal((await fetch(origin+photo)).status,200);
  const backup=await call('/api/admin/backup','GET',null,auth);assert(backup.data.sections[0].items[0].photo.startsWith('data:image/png;base64,'));
  state=(await call('/api/admin/publish','POST',{revision:state.draftRevision},auth)).data;
  const published=(await call('/api/admin/published','GET',null,auth)).data;assert.equal(published.menu.sections[0].items[0].name,'Серверный тест');assert.equal(published.menu.sections[0].items[0].variants[0].price,345);
  const rendered=renderer.render(published.menu,origin);assert(rendered.content.includes('Серверный тест'));assert(rendered.content.includes(origin+photo));assert.equal(rendered.products[0].id,original.sections[0].items[0].variants[0].id);
  const hidden=structuredClone(published.menu);hidden.sections[0].items[0].available=false;assert(!renderer.render(hidden,origin).products.some(p=>p.id===rendered.products[0].id));
  const history=(await call('/api/admin/history','GET',null,auth)).data.history;assert.equal(history[0].revision,0);
  state=(await call('/api/admin/restore','POST',{target:0,revision:state.draftRevision},auth)).data;assert.equal(state.menu.sections[0].items[0].name,original.sections[0].items[0].name);assert.equal((await call('/api/admin/published','GET',null,auth)).data.menu.sections[0].items[0].name,'Серверный тест');
  assert.equal((await call('/auth.json')).status,404);assert.equal((await call('/server/auth.cjs')).status,404);assert.equal((await call('/.git/config')).status,404);
  assert.equal((await call('/api/menu')).status,401);
  await call('/api/logout','POST',{},auth);assert.equal((await call('/api/session','GET',null,auth)).status,401);
  auth=await login();current+=11000;assert.equal((await call('/api/session','GET',null,auth)).status,401);
  for(let i=0;i<5;i++)assert.equal((await call('/api/login','POST',{username:'admin',password:'wrong'})).status,401);assert.equal((await call('/api/login','POST',{username:'admin',password})).status,429);current+=15*60*1000+1;auth=await login();
  await app.server.closeAllConnections();await new Promise(resolve=>app.server.close(resolve));await start();assert.equal((await call('/api/session','GET',null,auth)).status,401);auth=await login();assert.equal((await call('/api/admin/published','GET',null,auth)).data.menu.sections[0].items[0].name,'Серверный тест');auth=await login();
  await atomic(path.join(dir,'auth.json'),await passwordRecord('admin',password+'-changed'));assert.equal((await call('/api/session','GET',null,auth)).status,401);
  const secureAuth=authManager({dataDir:dir,secure:true});assert.match((await secureAuth.login('admin',password+'-changed','test')).cookie,/; Secure/);
  console.log('PASS: login, wrong password, server sessions/expiry/logout/reset, CSRF/Origin, rate limiting, concurrent edits, draft/publish/history/restore, uploaded media/backup, current public catalog, private-file isolation, local static publication and restart persistence');
 }finally{if(app){app.server.closeAllConnections();await new Promise(resolve=>app.server.close(resolve));}await fs.rm(dir,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
