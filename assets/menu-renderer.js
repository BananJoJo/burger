(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../admin/core.js'));else root.LiveMenuRenderer=factory(root.AdminMenu);})(typeof globalThis==='undefined'?this:globalThis,core=>{
 const icons=['sandwich','sandwich','sandwich','utensils-crossed','drumstick','pizza','fish','salad','coffee','cup-soda'],e=core.escape;
 function render(input,apiBase=''){
  const menu=core.validate(input),products=[];
  const controls=p=>`<div class="item-order"><button class="price-add" type="button" data-price-product="${p.id}" aria-label="Добавить за ${p.price} ₽: ${e(p.name+' — '+p.description)}">${p.price} ₽</button><button class="add-to-cart" type="button" data-add-product="${p.id}" aria-label="В корзину: ${e(p.name+(p.description?' — '+p.description:''))}"><span aria-hidden="true">+</span> В корзину</button><div class="menu-remove-wrap" inert aria-hidden="true"><div><button class="menu-remove" type="button" data-remove-product="${p.id}" disabled aria-label="Убрать из корзины: ${e(p.name+' — '+p.description)}"><span aria-hidden="true">−</span> Убрать</button></div></div></div>`;
  let nav='',content='';
  for(const [index,s] of menu.sections.entries()){
   const items=s.items.filter(p=>p.available);if(!items.length)continue;
   nav+=`<a href="#menu-${index}"><img class="category-icon" src="./assets/icons/${icons[index]||'sandwich'}.svg" alt="" aria-hidden="true"><span class="category-name">${e(s.name)}</span><span class="category-count">${items.length}</span></a>`;
   content+=`<section class="menu-section" id="menu-${index}"><h2>${e(s.name)}</h2><div class="items">${items.map(p=>{
    const variants=p.variants.map(v=>({id:v.id,name:p.name,description:[p.description,v.label].filter(Boolean).join(' · '),price:v.price,category:s.name}));products.push(...variants);
    const multiple=p.variants.length>1||Boolean(p.variants[0].label);
    const photo=p.photo?`<img class="dish-photo" src="${e(p.photo.startsWith('/media/')?apiBase+p.photo:p.photo)}" alt="${e(p.name)}" loading="lazy" decoding="async" width="640" height="480">`:'';
    return `<article class="item${p.photo?' with-photo':''}"${multiple?' data-drink="true"':''}>${photo}<div><h3>${e(p.name)}</h3>${p.description?`<p>${e(p.description)}</p>`:''}</div>${multiple?'<div class="drink-variants">'+variants.map((v,i)=>'<div class="drink-variant"><span class="drink-volume">'+e(({'1 л':'1 литр','2 л':'2 литра'})[p.variants[i].label]||p.variants[i].label||'Порция')+'</span>'+controls(v)+'</div>').join('')+'</div>':controls(variants[0])}</article>`;
   }).join('')}</div></section>`;
  }
  return {nav,content,products};
 }
 return {render};
});
