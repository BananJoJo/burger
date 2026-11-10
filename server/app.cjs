const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const {authManager}=require('./auth.cjs'),{menuStore}=require('./store.cjs'),{publisher}=require('./publisher.cjs');
const root=path.resolve(__dirname,'..'),mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ttf':'font/ttf'};
function createApp({dataDir=path.resolve(root,'../.sweet-sushi-private'),secure=process.env.NODE_ENV==='production',publicOrigin='https://bananjojo.github.io',ttl,now,publisherOptions={}}={}){
 const seed=require('../admin/seed.json'),publishing=publisher({dataDir,...publisherOptions}),store=menuStore({dataDir,seed,publishMenu:publishing.publish}),auth=authManager({dataDir,secure,ttl,now});
 const json=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
 async function body(req,limit=32*1024*1024){if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw Object.assign(Error('Нужен JSON.'),{status:415});if(Number(req.headers['content-length'])>limit)throw Object.assign(Error('Запрос слишком большой.'),{status:413});const buffers=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>limit)throw Object.assign(Error('Запрос слишком большой.'),{status:413});buffers.push(chunk);}try{const value=JSON.parse(Buffer.concat(buffers).toString('utf8'));if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value;}catch{throw Object.assign(Error('Некорректные данные.'),{status:400});}}
 const summary=s=>({menu:s.draft,draftRevision:s.draftRevision,publishedRevision:s.publishedRevision,updatedAt:s.updatedAt||null,updatedBy:s.updatedBy||null,publishedAt:s.publishedAt||null,publication:s.publication||null,publishing:publishing.info});
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
  let pathname;try{pathname=new URL(req.url,'http://localhost').pathname;}catch{json(res,400,{error:'Неверный адрес.'});return;}
  try{
   if(pathname.startsWith('/api/')){
    if(req.method==='GET'&&pathname==='/api/health'){json(res,200,{backend:true});return;}
    const sameOrigin=()=>{let incoming;try{incoming=new URL(req.headers.origin);}catch{throw Object.assign(Error('Запрос с другого сайта запрещён.'),{status:403});}if(incoming.host!==req.headers.host||!['http:','https:'].includes(incoming.protocol)||(secure&&incoming.protocol!=='https:'))throw Object.assign(Error('Запрос с другого сайта запрещён.'),{status:403});};
    if(req.method==='POST'&&pathname==='/api/login'){sameOrigin();const input=await body(req,2048);const result=await auth.login(input.username,input.password,req.socket.remoteAddress||'local');res.setHeader('Set-Cookie',result.cookie);json(res,200,{user:result.session.user,csrf:result.session.csrf});return;}
    const session=await auth.session(req);if(!session){json(res,401,{error:'Войдите в админку.'});return;}
    if(pathname==='/'||pathname==='/index.html'){res.writeHead(302,{Location:'/admin/','Cache-Control':'no-store'}).end();return;}
   if(!['GET','HEAD'].includes(req.method)){sameOrigin();if(req.headers['x-csrf-token']!==session.csrf){json(res,403,{error:'Обновите страницу и повторите действие.'});return;}}
    if(req.method==='GET'&&pathname==='/api/session'){json(res,200,{user:session.user,csrf:session.csrf});return;}
    if(req.method==='POST'&&pathname==='/api/logout'){res.setHeader('Set-Cookie',auth.logout(session));json(res,200,{ok:true});return;}
    if(req.method==='GET'&&pathname==='/api/admin/published'){const state=await store.read();json(res,200,{menu:state.published,revision:state.publishedRevision,publication:state.publication||null});return;}
    if(req.method==='GET'&&pathname==='/api/admin/menu'){json(res,200,summary(await store.read()));return;}
    if(req.method==='GET'&&pathname==='/api/admin/backup'){const state=await store.read(),backup=JSON.parse(JSON.stringify(state.draft));let size=0;for(const s of backup.sections)for(const p of s.items)if(p.photo.startsWith('/media/')){const bytes=await fs.readFile(path.join(dataDir,p.photo.slice(1)));size+=bytes.length;if(size>80*1024*1024)throw Object.assign(Error('Копия слишком большая. Используйте резервную копию папки данных сервера.'),{status:413});p.photo='data:'+mime[path.extname(p.photo)]+';base64,'+bytes.toString('base64');}json(res,200,backup);return;}
    if(req.method==='PUT'&&pathname==='/api/admin/menu'){const input=await body(req);let state;try{state=await store.save(input.menu,input.revision,session.user);}catch(error){if(!error.status)error.status=400;throw error;}json(res,200,summary(state));return;}
    if(req.method==='POST'&&pathname==='/api/admin/publish'){const input=await body(req,2048);json(res,200,summary(await store.publish(input.revision,session.user)));return;}
    if(req.method==='GET'&&pathname==='/api/admin/history'){const state=await store.read();json(res,200,{history:state.history.map(({revision,at,by})=>({revision,at,by}))});return;}
    if(req.method==='POST'&&pathname==='/api/admin/restore'){const input=await body(req,2048);json(res,200,summary(await store.restore(input.target,input.revision,session.user)));return;}
    json(res,404,{error:'Действие не найдено.'});return;
   }
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
   let filename,immutable=false;
   if(/^\/media\/[a-f0-9]{64}\.(?:png|jpg|webp)$/.test(pathname)){filename=path.join(dataDir,pathname.slice(1));immutable=true;res.setHeader('Access-Control-Allow-Origin',publicOrigin);}
   else if(pathname==='/assets/backend-config.js'){res.writeHead(200,{'Content-Type':mime['.js'],'Cache-Control':'no-store'});res.end('window.MenuBackendConfig={apiBase:location.origin};');return;}
   else{
    const allowed=pathname==='/'||pathname==='/index.html'||pathname==='/qr.html'||pathname==='/admin/'||/^\/admin\/(?:index\.html|style\.css|core\.js|app\.js|connection\.js|seed\.json)$/.test(pathname)||/^\/assets\/[a-zA-Z0-9_./-]+$/.test(pathname);
    if(!allowed){res.writeHead(404).end('Not found');return;}
    filename=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname==='/admin/'?'/admin/index.html':pathname));if(!filename.startsWith(root+path.sep)){res.writeHead(403).end();return;}
   }
   const content=await fs.readFile(filename);
   if(pathname.startsWith('/admin/'))res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
   res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream','Cache-Control':immutable?'public, max-age=31536000, immutable':'no-cache'});res.end(req.method==='HEAD'?undefined:content);
  }catch(error){if(res.headersSent){res.end();return;}if(error.code==='ENOENT'){res.writeHead(404).end('Not found');return;}const status=error.status||500;if(status===500)console.error('Server error:',error.message);json(res,status,{error:status===500?'Не удалось выполнить действие. Повторите позже.':error.message});}
 });
 server.requestTimeout=60000;server.headersTimeout=15000;server.keepAliveTimeout=5000;
 return {server,store};
}
module.exports={createApp};
