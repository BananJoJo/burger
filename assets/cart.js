(() => {
 'use strict';
 const core=window.MenuCartCore;
 const catalog=JSON.parse(document.getElementById('menu-catalog').textContent);
 const config=window.MenuOrderingConfig||{};
 const products=new Map(catalog.map(product=>[product.id,product]));
 const sauceInput=document.querySelector('[data-nugget-sauce]');
 const nuggetId=catalog.find(product=>product.name==='Наггетсы')?.id;
 const sauceNames=new Set(['Сырный','Томатный','Мира соус','Чесночный']);
 let sauceEnabled=false;
 const sauceChoice=document.querySelector('#nugget-sauce-choice');
 const sauceButtons=[...document.querySelectorAll('[data-sauce-enabled]')];
 function updateSauceChoice(){
  if(sauceChoice)sauceChoice.hidden=!sauceEnabled;
  if(sauceInput)sauceInput.disabled=!sauceEnabled;
  sauceButtons.forEach(button=>{const yes=button.dataset.sauceEnabled==='yes';button.setAttribute('aria-pressed',String(yes===sauceEnabled));if(yes)button.setAttribute('aria-expanded',String(sauceEnabled));});
 }
 const selectedSauce=()=>!sauceEnabled?'':sauceNames.has(sauceInput?.value)?sauceInput.value:'Выбрать при подтверждении заказа';
 updateSauceChoice();
 const addButtons=new Map([...document.querySelectorAll('[data-add-product]')].map(button=>[button.dataset.addProduct,button]));
 const dialog=document.getElementById('cart-dialog');
 const list=dialog.querySelector('.cart-lines');
 const empty=dialog.querySelector('.cart-empty');
 const dock=document.querySelector('.cart-dock');
 const checkout=dialog.querySelector('[data-whatsapp-order]');
 const copy=dialog.querySelector('[data-copy-order]');
 const preview=dialog.querySelector('.cart-message');
 const commentInput=dialog.querySelector('.cart-comment');
 const placeSelect=dialog.querySelector('#delivery-place');
 const deliveryPlace=dialog.querySelector('.cart-delivery-place');
 const deliveryTotal=dialog.querySelector('[data-delivery-total]');
 const configNote=dialog.querySelector('[data-config-note]');
 const status=document.querySelector('.cart-status');
 let cart={},statusTimer,lastOpener,payment='cash',fulfillment='';
 const announce=text=>{clearTimeout(statusTimer);status.textContent=text;statusTimer=setTimeout(()=>{status.textContent='';},2400);};
 const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
 function action(label,text,handler,disabled=false){const b=node('button','quantity-button',text);b.type='button';b.setAttribute('aria-label',label);b.disabled=disabled;b.addEventListener('click',handler);return b;}
 function change(id,quantity){cart=core.setQuantity(cart,id,quantity,catalog);render();}
 function renderLines(){
  const focused=document.activeElement;
  const restoreFocus=focused?.dataset.cartFocus;
  list.replaceChildren();
  for(const p of core.lines(cart,catalog)){
   const li=node('li','cart-line');
   const info=node('div','cart-line-info');info.append(node('h3','',p.name));
   if(p.description)info.append(node('p','',p.description));
   info.append(node('p','cart-unit-price',core.money(p.price)+' за шт.'));
   if(p.id===nuggetId&&selectedSauce())info.append(node('p','cart-unit-price','Соус: '+selectedSauce()));
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
  const place=placeSelect?.value||'',subtotal=core.total(cart,catalog),fee=core.deliveryFee(subtotal,fulfillment,place);
  if(deliveryPlace)deliveryPlace.hidden=fulfillment!=='delivery';
  const withDelivery=fulfillment==='delivery'&&count>0;
  if(deliveryTotal){deliveryTotal.hidden=!withDelivery;deliveryTotal.textContent=withDelivery?(fee?'Доставка: '+core.money(fee):'Доставка бесплатно'):'';deliveryTotal.classList.toggle('is-free',withDelivery&&fee===0);}
  const totalLabel=dialog.querySelector('[data-checkout-label]');
  if(totalLabel){totalLabel.textContent=withDelivery?'Итого с доставкой':'Итого по меню';dialog.querySelector('.cart-summary [data-cart-total]').textContent=core.money(subtotal+fee);}
  const sauceNote=selectedSauce()&&cart[nuggetId]?'\n\nСоус к наггетсам: '+selectedSauce()+'.':'';
  const text=core.message(cart,catalog,payment,commentInput.value,fulfillment,place)+sauceNote,url=core.whatsappUrl(config.whatsappNumber,text);
  preview.value=text;
  dialog.querySelectorAll('[name="order-payment"]').forEach(input=>{input.checked=input.value===payment;});
  dialog.querySelectorAll('[name="order-fulfillment"]').forEach(input=>{input.checked=input.value===fulfillment;});
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
   const badge=button.querySelector('span');
   if(badge)badge.textContent=qty?String(qty):'+';
  });
  document.querySelectorAll('[data-remove-product]').forEach(button=>{
   const selected=Boolean(cart[button.dataset.removeProduct]),wrap=button.closest('.menu-remove-wrap');
   button.disabled=!selected;
   if(wrap){wrap.inert=!selected;wrap.setAttribute('aria-hidden',String(!selected));}
   button.closest('.item-order')?.classList.toggle('has-product',selected);
  });
  document.querySelectorAll('[data-price-product]').forEach(button=>{button.disabled=(cart[button.dataset.priceProduct]||0)>=core.MAX_QUANTITY;});
 }
 document.querySelectorAll('[data-price-product]').forEach(button=>button.addEventListener('click',()=>{
  addButtons.get(button.dataset.priceProduct)?.click();
 }));
 document.querySelectorAll('[data-remove-product]').forEach(button=>button.addEventListener('click',()=>{
  const id=button.dataset.removeProduct,p=products.get(id);
  if(!p)return;
  const quantity=Math.max(0,(cart[id]||0)-1);
  change(id,quantity);
  if(!quantity)addButtons.get(id)?.focus({preventScroll:true});
  announce(quantity?p.name+' — в корзине '+quantity+' шт.':p.name+' — убрали из корзины.');
 }));
 document.querySelectorAll('[data-add-product]').forEach(button=>button.addEventListener('click',()=>{
  const id=button.dataset.addProduct;
  const p=products.get(id);
  if(!p)return;
  change(id,(cart[id]||0)+1);
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&button.animate){
   // Keep background/opacity under CSS control, including hover transitions.
   button.animate([{transform:'scale(1)'},{transform:'scale(.96)'},{transform:'scale(1)'}],{duration:240,easing:'ease-out'});
   button.querySelector('span')?.animate([{transform:'scale(1)'},{transform:'scale(1.35)'},{transform:'scale(1)'}],{duration:320,easing:'ease-out'});
  }
  announce(p.name+' — в корзине '+cart[id]+' шт.');
 }));
 document.querySelectorAll('[data-open-cart]').forEach(button=>button.addEventListener('click',()=>{lastOpener=button;render();dialog.showModal();document.body.classList.add('cart-is-open');}));
 dialog.querySelector('[data-close-cart]').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
 dialog.addEventListener('close',()=>{document.body.classList.remove('cart-is-open');const opener=lastOpener&&!lastOpener.hidden?lastOpener:document.querySelector('.cart-header-button');opener?.focus({preventScroll:true});});
 checkout.addEventListener('click',event=>{if(checkout.getAttribute('aria-disabled')==='true')event.preventDefault();});
 copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(preview.value);announce('Текст заказа скопирован.');}catch{dialog.querySelector('.cart-message-preview').open=true;preview.focus();preview.select();announce('Выделили текст заказа — скопируйте его вручную.');}});
 dialog.querySelectorAll('[name="order-fulfillment"]').forEach(input=>input.addEventListener('change',()=>{if(!input.checked)return;fulfillment=input.value;render();}));
 placeSelect?.addEventListener('change',render);
 sauceInput?.addEventListener('change',render);
 sauceButtons.forEach(button=>button.addEventListener('click',()=>{
  sauceEnabled=button.dataset.sauceEnabled==='yes';
  updateSauceChoice();
  if(!sauceEnabled&&sauceInput)sauceInput.value='';
  render();
 }));
 commentInput.addEventListener('input',render);
 dialog.querySelectorAll('[name="order-payment"]').forEach(input=>input.addEventListener('change',()=>{if(!input.checked)return;payment=input.value;render();}));
 render();
})();
