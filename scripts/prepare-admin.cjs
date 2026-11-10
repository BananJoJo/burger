const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const catalog=JSON.parse(html.match(/<script id="menu-catalog" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const publishedFile=path.join(root,'assets/menu-data.json');
if(fs.existsSync(publishedFile)){const menu=require('../admin/core.js').validate(JSON.parse(fs.readFileSync(publishedFile,'utf8')));fs.writeFileSync(path.join(root,'admin/seed.json'),JSON.stringify(menu,null,2)+'\n');console.log('Admin seed: published menu');return;}
const sections=[...html.matchAll(/<section class="menu-section" id="([^"]+)">([\s\S]*?)<\/section>/g)].map(([,,body],index)=>{
 const items=[...body.matchAll(/<article class="item"[^>]*>([\s\S]*?)<\/article>/g)].map(([,card])=>{
  const ids=[...card.matchAll(/data-add-product="([^"]+)"/g)].map(m=>m[1]),variants=ids.map(id=>catalog.find(p=>p.id===id));
  if(!variants.length)throw Error('Menu item has no products');
  const first=variants[0],multiple=variants.length>1;
  return {id:'dish-'+first.id,name:first.name,description:multiple?'':first.description||'',photo:'',available:true,variants:variants.map(p=>({id:p.id,label:multiple?p.description:'',price:p.price}))};
 });
 return {id:'category-'+index,name:catalog.find(p=>p.id===items[0].variants[0].id).category,items};
});
fs.mkdirSync(path.join(root,'admin'),{recursive:true});
fs.writeFileSync(path.join(root,'admin/seed.json'),JSON.stringify({version:1,sections},null,2)+'\n');
console.log('Admin seed: '+sections.reduce((n,s)=>n+s.items.length,0)+' dishes');
