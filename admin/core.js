(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AdminMenu=factory();})(typeof globalThis==='undefined'?this:globalThis,()=>{
 'use strict';
 const text=(v,max,required=false)=>{if(typeof v!=='string'||v.length>max||(required&&!v.trim()))throw Error('Проверьте название и длину текстов.');return v.trim();};
 function validate(data){
  if(data?.version!==1||!Array.isArray(data.sections)||!data.sections.length||data.sections.length>30)throw Error('Неверный формат меню.');
  let count=0;const ids=new Set();
  const id=v=>{if(typeof v!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(v)||ids.has(v))throw Error('Повторяющийся или неверный идентификатор.');ids.add(v);return v;};
  const sections=data.sections.map(s=>{
   if(!Array.isArray(s.items))throw Error('В категории нет списка блюд.');
   return {id:id(s.id),name:text(s.name,80,true),items:s.items.map(p=>{
    if(++count>500)throw Error('Слишком много блюд.');
    const photo=p.photo||'';
    if(typeof photo!=='string'||photo.length>2200000||(photo&&!/^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(photo)&&!/^\/media\/[a-f0-9]{64}\.(?:webp|png|jpg)$/.test(photo)))throw Error('Неверная фотография. Загрузите JPG, PNG или WebP.');
    if(typeof p.available!=='boolean'||!Array.isArray(p.variants)||!p.variants.length||p.variants.length>8)throw Error('Проверьте варианты блюда.');
    return {id:id(p.id),name:text(p.name,100,true),description:text(p.description||'',600),photo,available:p.available,variants:p.variants.map(v=>{
     if(!Number.isSafeInteger(v.price)||v.price<1||v.price>1000000)throw Error('Цена должна быть целым числом от 1 до 1 000 000 ₽.');
     return {id:id(v.id),label:text(v.label||'',60),price:v.price};
    })};
   })};
  });
  return {version:1,sections};
 }
 function move(data,itemId,categoryId){
  const next=validate(data),source=next.sections.find(s=>s.items.some(p=>p.id===itemId)),target=next.sections.find(s=>s.id===categoryId);
  if(!source||!target)throw Error('Блюдо или категория не найдены.');
  if(source!==target){const index=source.items.findIndex(p=>p.id===itemId);target.items.push(source.items.splice(index,1)[0]);}
  return next;
 }
 const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
 function preview(data){return validate(data).sections.filter(s=>s.items.some(p=>p.available)).map(s=>`<section class="preview-section"><h2>${escape(s.name)}</h2><div class="preview-grid">${s.items.filter(p=>p.available).map(p=>`<article class="preview-card">${p.photo?`<img src="${p.photo}" alt="${escape(p.name)}">`:'<div class="preview-placeholder" aria-hidden="true">Sweet / Sushi</div>'}<div class="preview-copy"><h3>${escape(p.name)}</h3>${p.description?`<p>${escape(p.description)}</p>`:''}<div class="preview-prices">${p.variants.map(v=>`<span>${v.label?escape(v.label)+' · ':''}<b>${v.price.toLocaleString('ru-RU')} ₽</b></span>`).join('')}</div></div></article>`).join('')}</div></section>`).join('');}
 const isDrinkCategory=name=>/напитки/i.test(name||'');
 const variantsForCategory=(variants,name)=>isDrinkCategory(name)?variants.map(v=>({...v})):[{...variants[0],label:''}];
 return {validate,move,escape,preview,isDrinkCategory,variantsForCategory};
});
