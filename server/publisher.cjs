const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {renderStatic,idFor}=require('./static-menu.cjs');
const root=path.resolve(__dirname,'..');
const problem=message=>Object.assign(Error(message),{status:503});
const gitHash=bytes=>crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
function publisher({dataDir,mode='local',repository='BananJoJo/burger',branch='main',token='',fetchImpl=fetch,projectRoot=root}={}){
 const ready=mode==='local'||mode==='github'&&Boolean(token)&&/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)&&/^[A-Za-z0-9_.\/-]+$/.test(branch)&&!branch.includes('..');
 const info={mode,ready,repository:mode==='github'?repository:null,branch:mode==='github'?branch:null};
 const repo='/repos/'+repository,encodedBranch=branch.split('/').map(encodeURIComponent).join('/');
 async function api(route,method='GET',body){
  let response;try{response=await fetchImpl('https://api.github.com'+repo+route,{method,redirect:'error',signal:AbortSignal.timeout(20000),headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28','User-Agent':'SweetSushiAdmin','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});}catch{throw problem('Не удалось связаться с GitHub. Сохранённый черновик остаётся в админке; повторите публикацию позже.');}
  if(!response.ok){const status=response.status;if(status===409||status===422)throw Object.assign(Error('Ветка GitHub изменилась во время публикации. Повторите публикацию: чужие изменения не перезаписаны.'),{status:409});if(status===401||status===403)throw problem('GitHub отклонил доступ. Владелец должен проверить срок и права ключа публикации.');throw problem('GitHub не принял публикацию (HTTP '+status+'). Проверьте репозиторий, ветку и наличие index.html.');}
  try{return await response.json();}catch{throw problem('Не удалось подтвердить ответ GitHub. Повторите публикацию.');}
 }
 async function head(){const ref=await api('/git/ref/heads/'+encodedBranch);if(!/^[a-f0-9]{40}$/.test(ref.object?.sha))throw problem('GitHub вернул неверную версию ветки.');const sha=ref.object.sha,file=await api('/contents/index.html?ref='+sha);if(file.encoding!=='base64'||typeof file.content!=='string'||file.size>2*1024*1024)throw problem('Не удалось прочитать шаблон сайта из GitHub.');return {sha,html:Buffer.from(file.content,'base64').toString('utf8')};}
 const receipt=(sha,id)=>({mode:'github',id,commit:sha,url:'https://github.com/'+repository+'/commit/'+sha,status:'sent'});
 async function files(menu,template){
  const rendered=renderStatic(template,menu),result=new Map([['index.html',Buffer.from(rendered.html)],['assets/menu-data.json',Buffer.from(JSON.stringify(rendered.menu,null,2)+'\n')],['assets/site.js',await fs.readFile(path.join(projectRoot,'assets/site.js'))],['assets/menu-photos.css',await fs.readFile(path.join(projectRoot,'assets/menu-photos.css'))],['assets/navigation.css',await fs.readFile(path.join(projectRoot,'assets/navigation.css'))],['.nojekyll',Buffer.alloc(0)]]);
  let size=0;for(const s of rendered.menu.sections)for(const item of s.items)if(item.photo){if(!/^\/media\/[a-f0-9]{64}\.(?:png|jpg|webp)$/.test(item.photo))throw problem('Сначала сохраните фотографии в черновик.');const target='assets'+item.photo;if(result.has(target))continue;let bytes;try{bytes=await fs.readFile(path.join(dataDir,item.photo.slice(1)));}catch{throw problem('Не найдена фотография из меню. Загрузите её повторно перед публикацией.');}size+=bytes.length;if(size>80*1024*1024)throw problem('Фотографии меню превышают 80 МБ. Уменьшите изображения перед публикацией.');result.set(target,bytes);}
  return {files:result,id:rendered.id};
 }
 async function publish(menu){
  if(!ready)throw problem('Публикация в GitHub ещё не настроена. Черновик сохранён; владелец должен подключить репозиторий и серверный ключ.');
  if(mode==='local'){
   const built=await files(menu,await fs.readFile(path.join(projectRoot,'index.html'),'utf8')),destination=path.join(dataDir,'outbox',built.id);
   await fs.mkdir(destination,{recursive:true});await fs.cp(path.join(projectRoot,'assets'),path.join(destination,'assets'),{recursive:true});await fs.copyFile(path.join(projectRoot,'qr.html'),path.join(destination,'qr.html'));
   for(const [name,bytes]of built.files){const target=path.join(destination,name);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes);}
   return {mode:'local',id:built.id,status:'local'};
  }
  const base=await head(),id=idFor(menu);
  // Retrying after a lost response or a local disk error does not create another commit.
  if(base.html.includes('<!--sweet-sushi-publication:'+id+'-->'))return receipt(base.sha,id);
  const built=await files(menu,base.html),parent=await api('/git/commits/'+base.sha);
  if(!/^[a-f0-9]{40}$/.test(parent.tree?.sha))throw problem('Не удалось прочитать дерево репозитория.');
  const existing=await api('/git/trees/'+parent.tree.sha+'?recursive=1');if(existing.truncated||!Array.isArray(existing.tree))throw problem('Репозиторий слишком большой для безопасной публикации меню.');
  const current=new Map(existing.tree.filter(x=>x.type==='blob').map(x=>[x.path,x.sha])),tree=[];
  for(const [name,bytes]of built.files){const sha=gitHash(bytes);if(current.get(name)===sha)continue;if(name.startsWith('assets/media/')){const blob=await api('/git/blobs','POST',{content:bytes.toString('base64'),encoding:'base64'});if(blob.sha!==sha)throw problem('GitHub не подтвердил загрузку фотографии.');tree.push({path:name,mode:'100644',type:'blob',sha});}else tree.push({path:name,mode:'100644',type:'blob',content:bytes.toString('utf8')});}
  const nextTree=await api('/git/trees','POST',{base_tree:parent.tree.sha,tree});
  const commit=await api('/git/commits','POST',{message:'Обновление меню Sweet Sushi',tree:nextTree.sha,parents:[base.sha]});
  if(!/^[a-f0-9]{40}$/.test(commit.sha))throw problem('GitHub не подтвердил новую версию меню.');
  try{await api('/git/refs/heads/'+encodedBranch,'PATCH',{sha:commit.sha,force:false});}
  catch(error){if(error.status===503){try{const latest=await head();if(latest.html.includes('<!--sweet-sushi-publication:'+id+'-->'))return receipt(latest.sha,id);}catch{}}throw error;}
  return receipt(commit.sha,id);
 }
 return {info,publish};
}
module.exports={publisher,gitHash};
