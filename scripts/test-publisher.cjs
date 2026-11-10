const assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const {publisher,gitHash}=require('../server/publisher.cjs'),{renderStatic}=require('../server/static-menu.cjs'),{menuStore}=require('../server/store.cjs'),cart=require('../assets/cart-core.js');
const root=path.resolve(__dirname,'..'),seed=require('../admin/seed.json');
function fakeGitHub(template){
 const blobs=new Map(),trees=new Map(),commits=new Map();let serial=0;
 const sha=()=>crypto.createHash('sha1').update('object-'+ ++serial).digest('hex');
 const base=new Map([['index.html',Buffer.from(template)],['CNAME',Buffer.from('example.test')],['unrelated.txt',Buffer.from('Keep this file')]]);
 const initialTree=sha(),initial=sha();trees.set(initialTree,base);commits.set(initial,{tree:initialTree,files:base});let head=initial,updates=0,conflict=false,lostResponse=false;
 const response=(body,status=200)=>new Response(JSON.stringify(body),{status});
 async function fetchImpl(input,options){
  const url=new URL(input);assert.equal(url.origin,'https://api.github.com');assert.equal(options.headers.Authorization,'Bearer test-server-only-key');
  assert(url.pathname.startsWith('/repos/test-owner/menu/'));const route=url.pathname.slice('/repos/test-owner/menu'.length),method=options.method,body=options.body?JSON.parse(options.body):null;
  if(method==='GET'&&route==='/git/ref/heads/main')return response({object:{sha:head}});
  if(method==='GET'&&route==='/contents/index.html'){const data=commits.get(url.searchParams.get('ref')).files.get('index.html');return response({encoding:'base64',size:data.length,content:data.toString('base64')});}
  if(method==='GET'&&route.startsWith('/git/commits/'))return response({tree:{sha:commits.get(route.split('/').pop()).tree}});
  if(method==='GET'&&route.startsWith('/git/trees/'))return response({tree:[...trees.get(route.split('/').pop())].map(([name,bytes])=>({path:name,type:'blob',sha:gitHash(bytes)})),truncated:false});
  if(method==='POST'&&route==='/git/blobs'){const bytes=Buffer.from(body.content,'base64'),key=gitHash(bytes);blobs.set(key,bytes);return response({sha:key});}
  if(method==='POST'&&route==='/git/trees'){const next=new Map(trees.get(body.base_tree));for(const item of body.tree)next.set(item.path,item.sha?blobs.get(item.sha):Buffer.from(item.content));const id=sha();trees.set(id,next);return response({sha:id});}
  if(method==='POST'&&route==='/git/commits'){const id=sha();commits.set(id,{tree:body.tree,files:trees.get(body.tree),parent:body.parents[0]});return response({sha:id});}
  if(method==='PATCH'&&route==='/git/refs/heads/main'){
   assert.equal(body.force,false);if(conflict||commits.get(body.sha).parent!==head)return response({error:'not fast forward'},422);
   head=body.sha;updates++;if(lostResponse){lostResponse=false;throw Error('Response lost after successful update');}return response({object:{sha:head}});
  }
  throw Error('Unexpected mock request: '+route);
 }
 return {fetchImpl,get files(){return commits.get(head).files;},get updates(){return updates;},set conflict(v){conflict=v;},set lostResponse(v){lostResponse=v;}};
}
(async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'sweet-static-publication-'));
 try{
  const template=await fs.readFile(path.join(root,'index.html'),'utf8'),menu=structuredClone(seed);
  const photo=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64'),name=crypto.createHash('sha256').update(photo).digest('hex')+'.png';
  await fs.mkdir(path.join(dir,'media'));await fs.writeFile(path.join(dir,'media',name),photo);
  const dish=menu.sections[0].items[0];dish.photo='/media/'+name;dish.name='Бургер </script><script>alert(1)</script>';dish.variants[0].price=321;menu.sections[0].items[1].available=false;
  const rendered=renderStatic(template,menu);assert(rendered.html.includes('./assets/media/'+name));assert(!rendered.html.includes('backend-config.js'));assert(!rendered.html.includes('https://admin.'));assert(rendered.html.includes('&lt;/script&gt;'));
  assert.equal(rendered.html.match(/<section class="hero">[\s\S]*?<\/section>/)?.[0],template.match(/<section class="hero">[\s\S]*?<\/section>/)?.[0]);
  const catalog=JSON.parse(rendered.html.match(/<script id="menu-catalog" type="application\/json">([\s\S]*?)<\/script>/)[1]);assert.equal(catalog[0].name,dish.name);assert.equal(cart.total({[dish.variants[0].id]:2},catalog),642);assert(!catalog.some(p=>p.id===menu.sections[0].items[1].variants[0].id));
  const drinks=catalog.filter(p=>p.category==='Холодные напитки');assert.equal(drinks.length,10);assert.deepEqual(drinks.slice(0,2).map(p=>p.price),[180,400]);
  const oldTemplate=template.replaceAll('<!--menu-nav:start-->','').replaceAll('<!--menu-nav:end-->','').replaceAll('<!--menu-content:start-->','').replaceAll('<!--menu-content:end-->','');assert(renderStatic(oldTemplate,menu).html.includes('./assets/media/'+name));
  assert.throws(()=>renderStatic('<html></html>',menu));
  const local=publisher({dataDir:dir});const localReceipt=await local.publish(menu),outbox=path.join(dir,'outbox',localReceipt.id);assert.equal(localReceipt.mode,'local');assert.deepEqual(await fs.readFile(path.join(outbox,'assets/media',name)),photo);
  const localHTML=await fs.readFile(path.join(outbox,'index.html'),'utf8');
  for(const [,ref]of localHTML.matchAll(/(?:src|href)="([^"#]+)"/g)){assert(!/^(?:https?:|\/)/.test(ref));assert((await fs.stat(path.resolve(outbox,ref.split('?')[0]))).isFile());}
  const buildRoot=path.join(dir,'build-project');await fs.mkdir(buildRoot);await fs.copyFile(path.join(root,'qr.html'),path.join(buildRoot,'qr.html'));for(const name of ['scripts','server','admin','docs'])await fs.cp(path.join(root,name),path.join(buildRoot,name),{recursive:true});await fs.cp(path.join(outbox,'assets'),path.join(buildRoot,'assets'),{recursive:true});
  require('node:child_process').execFileSync(process.execPath,[path.join(buildRoot,'scripts/build.cjs')],{stdio:'pipe'});require('node:child_process').execFileSync(process.execPath,[path.join(buildRoot,'scripts/check.cjs')],{stdio:'pipe'});
  const rebuilt=await fs.readFile(path.join(buildRoot,'index.html'),'utf8');assert(rebuilt.includes('./assets/media/'+name));assert.deepEqual(JSON.parse(await fs.readFile(path.join(buildRoot,'admin/seed.json'),'utf8')),menu);
  // Booting a public page must work even when no admin API or fetch exists.
  const loaded=[],context={URL,document:{currentScript:{src:'https://static.example/burger/assets/site.js',dataset:{revision:'test'}},querySelectorAll:()=>[],querySelector:()=>null,createElement:()=>({}),body:{append(script){loaded.push(script.src);queueMicrotask(()=>script.onload());}}},IntersectionObserver:class{observe(){}},fetch(){throw Error('Public page contacted a backend');}};
  await vm.runInNewContext(await fs.readFile(path.join(outbox,'assets/site.js'),'utf8'),context);assert.equal(loaded.length,3);assert(loaded.every(src=>src.startsWith('https://static.example/burger/assets/')));
  const github=fakeGitHub(oldTemplate),remote=publisher({dataDir:dir,mode:'github',repository:'test-owner/menu',token:'test-server-only-key',fetchImpl:github.fetchImpl});
  const sent=await remote.publish(menu);assert.equal(sent.status,'sent');assert.equal(github.updates,1);assert(github.files.get('index.html').toString().includes('./assets/media/'+name));assert.deepEqual(github.files.get('assets/media/'+name),photo);assert.equal(github.files.get('CNAME').toString(),'example.test');assert.equal(github.files.get('unrelated.txt').toString(),'Keep this file');
  for(const bytes of github.files.values())assert(!bytes.toString().includes('test-server-only-key'));
  assert.equal((await remote.publish(menu)).commit,sent.commit);assert.equal(github.updates,1);
  const changed=structuredClone(menu);changed.sections[0].items[0].variants[0].price=456;github.conflict=true;await assert.rejects(remote.publish(changed),error=>error.status===409);assert.equal(github.updates,1);github.conflict=false;github.lostResponse=true;assert.equal((await remote.publish(changed)).status,'sent');assert.equal(github.updates,2);
  await assert.rejects(publisher({dataDir:dir,mode:'github'}).publish(menu),error=>error.status===503);
  await assert.rejects(publisher({dataDir:dir,mode:'github',repository:'test-owner/menu',token:'secret',fetchImpl:async()=>{throw Error('offline');}}).publish(menu),error=>error.status===503);
  const stateDir=path.join(dir,'failed-state'),store=menuStore({dataDir:stateDir,seed,publishMenu:async()=>{throw Error('offline');}});const failureMenu=structuredClone(menu);failureMenu.sections[0].items[0].photo='data:image/png;base64,'+photo.toString('base64');const saved=await store.save(failureMenu,0,'admin');await assert.rejects(store.publish(saved.draftRevision,'admin'));const after=await store.read();assert.equal(after.publishedRevision,0);assert.equal(after.draftRevision,saved.draftRevision);assert.equal(after.published.sections[0].items[0].name,seed.sections[0].items[0].name);
  console.log('PASS: standalone HTML/photos/cart, no admin API at public startup, escaped content, legacy templates, local complete snapshot, GitHub atomic commit and photo upload, unrelated files preserved, secret isolation, retry idempotency, branch conflict, lost response, offline/missing setup and unchanged published state on failure');
 }finally{const resolved=path.resolve(dir);assert(resolved.startsWith(path.resolve(os.tmpdir())+path.sep+'sweet-static-publication-'));await fs.rm(resolved,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
