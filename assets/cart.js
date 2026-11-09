(() => {
 'use strict';
 const core=window.MenuCartCore;
 const catalog=JSON.parse(document.getElementById('menu-catalog').textContent);
 const config=window.MenuOrderingConfig||{};
 const storageKey='sweet-sushi-cart-v1';
 const dialog=document.getElementById('cart-dialog');
 const list=dialog.querySelector('.cart-lines');
 const empty=dialog.querySelector('.cart-empty');
 const dock=document.querySelector('.cart-dock');
 const checkout=dialog.querySelector('[data-whatsapp-order]');
 const copy=dialog.querySelector('[data-copy-order]');
 const preview=dialog.querySelector('.cart-message');
 const configNote=dialog.querySelector('[data-config-note]');
 const status=document.querySelector('.cart-status');
 let cart={},statusTimer,lastOpener,payment='cash';
 try{const stored=localStorage.getItem(storageKey+'-payment');if(['cash','transfer'].includes(stored))payment=stored;}catch{} 
 const announce=text=>{clearTimeout(statusTimer);status.textContent=text;statusTimer=setTimeout(()=>{status.textContent='';},2400);};
 try{cart=core.restore(JSON.parse(localStorage.getItem(storageKey)||'{}'),catalog);}catch{announce('Корзина работает, но сохранение на этом устройстве недоступно.');}
 const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify(cart));}catch{announce('Не удалось сохранить корзину. Текущий заказ останется здесь до закрытия страницы.');}};
 const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
 function action(label,text,handler,disabled=false){const b=node('button','quantity-button',text);b.type='button';b.setAttribute('aria-label',label);b.disabled=disabled;b.addEventListener('click',handler);return b;}
 function change(id,quantity){cart=core.setQuantity(cart,id,quantity,catalog);save();render();}
 function renderLines(){
  const focused=document.activeElement;
  const restoreFocus=focused?.dataset.cartFocus;
  list.replaceChildren();
  for(const p of core.lines(cart,catalog)){
   const li=node('li','cart-line');
   const info=node('div','cart-line-info');info.append(node('h3','',p.name));
   if(p.description)info.append(node('p','',p.description));
   info.append(node('p','cart-unit-price',core.money(p.price)+' за шт.'));
   const controls=node('div','cart-line-controls');
   const minus=action('Уменьшить: '+p.name,'−',()=>change(p.id,p.quantity-1));minus.dataset.cartFocus=p.id+'-minus';
   const qty=node('span','cart-quantity',String(p.quantity));qty.setAttribute('aria-label','Количество');
   const plus=action('Увеличить: '+p.name,'+',()=>change(p.id,p.quantity+1),p.quantity>=core.MAX_QUANTITY);plus.dataset.cartFocus=p.id+'-plus';
   controls.append(minus,qty,plus);
   const amount=node('strong','cart-line-total',core.money(p.subtotal));
   const remove=action('Удалить: '+p.name,'Удалить',()=>change(p.id,0));remove.className='cart-remove';remove.dataset.cartFocus=p.id+'-remove';
   li.append(info,controls,amount,remove);list.append(li);
  }
  if(restoreFocus){const replacement=[...list.querySelectorAll('[data-cart-focus]')].find(el=>el.dataset.cartFocus===restoreFocus);if(replacement&&!replacement.disabled)replacement.focus({preventScroll:true});else if(dialog.open)dialog.querySelector('[data-close-cart]').focus({preventScroll:true});}
 }
 function render(){
  const count=core.count(cart,catalog),total=core.money(core.total(cart,catalog));
  document.querySelectorAll('[data-cart-count]').forEach(el=>el.textContent=String(count));
  document.querySelectorAll('[data-cart-total]').forEach(el=>el.textContent=total);
  dock.hidden=count===0;empty.hidden=count>0;copy.disabled=count===0;
  renderLines();
  const text=core.message(cart,catalog,payment),url=core.whatsappUrl(config.whatsappNumber,text);
  preview.value=text;
  dialog.querySelectorAll('[name="order-payment"]').forEach(input=>{input.checked=input.value===payment;});
  // Long deep links can fail in apps. Always keep the complete text available for copying.
  const tooLong=Boolean(url&&url.length>8000);
  const ready=Boolean(url&&!tooLong&&count);
  if(ready)checkout.href=url;else checkout.removeAttribute('href');
  checkout.setAttribute('aria-disabled',String(!ready));
  const missingNumber=!core.whatsappUrl(config.whatsappNumber,'check');
  configNote.hidden=!missingNumber&&!tooLong&&!config.isTest;
  configNote.textContent=tooLong?'Заказ получился длинным. Скопируйте текст и отправьте его в чат вручную.':missingNumber?'WhatsApp заведения пока не настроен. Заказ можно собрать и скопировать.':config.isTest?'Тестовый режим: сообщение откроется на проверочном номере.':'';
  document.querySelectorAll('[data-add-product]').forEach(button=>{
   const qty=cart[button.dataset.addProduct]||0;
   button.disabled=qty>=core.MAX_QUANTITY;
   button.querySelector('span').textContent=qty?String(qty):'+';
  });
  document.querySelectorAll('[data-remove-product]').forEach(button=>{
   const selected=Boolean(cart[button.dataset.removeProduct]),wrap=button.closest('.menu-remove-wrap');
   button.disabled=!selected;wrap.inert=!selected;wrap.setAttribute('aria-hidden',String(!selected));
   button.closest('.item-order').classList.toggle('has-product',selected);
  });
  document.querySelectorAll('[data-price-product]').forEach(button=>{button.disabled=(cart[button.dataset.priceProduct]||0)>=core.MAX_QUANTITY;});
 }
 document.querySelectorAll('[data-price-product]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelector('[data-add-product="'+button.dataset.priceProduct+'"]').click();
 }));
 document.querySelectorAll('[data-remove-product]').forEach(button=>button.addEventListener('click',()=>{
  const id=button.dataset.removeProduct,p=catalog.find(p=>p.id===id);
  change(id,0);
  document.querySelector('[data-add-product="'+id+'"]').focus({preventScroll:true});
  announce(p.name+' — убрали из корзины.');
 }));
 document.querySelectorAll('[data-add-product]').forEach(button=>button.addEventListener('click',()=>{
  const id=button.dataset.addProduct;
  const p=catalog.find(p=>p.id===id);
  cart=core.setQuantity(cart,id,(cart[id]||0)+1,catalog);save();render();
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&button.animate){
   button.getAnimations().forEach(animation=>animation.cancel());
   button.animate([{background:'#753c28',boxShadow:'0 0 0 0 #f49a6166'},{background:'#4b2922',boxShadow:'0 0 0 9px #f49a6100'}],{duration:480,easing:'ease-out'});
   button.querySelector('span').animate([{transform:'scale(1)'},{transform:'scale(1.35)'},{transform:'scale(1)'}],{duration:320,easing:'ease-out'});
  }
  announce(p.name+' — в корзине '+cart[id]+' шт.');
 }));
 document.querySelectorAll('[data-open-cart]').forEach(button=>button.addEventListener('click',()=>{lastOpener=button;render();dialog.showModal();document.body.classList.add('cart-is-open');}));
 dialog.querySelector('[data-close-cart]').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
 dialog.addEventListener('close',()=>{document.body.classList.remove('cart-is-open');const opener=lastOpener&&!lastOpener.hidden?lastOpener:document.querySelector('.cart-header-button');opener?.focus({preventScroll:true});});
 checkout.addEventListener('click',event=>{if(checkout.getAttribute('aria-disabled')==='true')event.preventDefault();});
 copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(preview.value);announce('Текст заказа скопирован.');}catch{dialog.querySelector('details').open=true;preview.focus();preview.select();announce('Выделили текст заказа — скопируйте его вручную.');}});
 addEventListener('storage',event=>{if(event.key!==storageKey)return;try{cart=core.restore(JSON.parse(event.newValue||'{}'),catalog);render();}catch{/* Ignore malformed data from another tab. */}});
 dialog.querySelectorAll('[name="order-payment"]').forEach(input=>input.addEventListener('change',()=>{if(!input.checked)return;payment=input.value;try{localStorage.setItem(storageKey+'-payment',payment);}catch{}render();}));
 render();
})();
