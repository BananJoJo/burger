const crypto=require('node:crypto');
const bag='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h3l3 12h11l3-9H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>';
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
module.exports=(menu,prefix)=>{
 const products=menu.flatMap((section,categoryIndex)=>section.items.flatMap((item,itemIndex)=>(item.variants||[item]).map(variant=>{
  const amounts=[...variant.price.matchAll(/(\d+)\s*₽/g)].map(m=>Number(m[1]));
  return {id:crypto.createHash('sha256').update(JSON.stringify([section.name,item.name,variant.desc])).digest('hex').slice(0,16),category:section.name,name:item.name,description:variant.desc,price:amounts.length===1?amounts[0]:null,categoryIndex,itemIndex};
 })));
 const control=p=>{
  const original=p.price+' ₽';
  return `<div class="item-order">${p.price===null?`<strong class="price-unresolved">${escape(original)}</strong>`:`<button class="price-add" type="button" data-price-product="${p.id}" aria-label="Добавить за ${escape(original)}: ${escape(p.name+(p.description?' — '+p.description:''))}">${escape(original)}</button>`}${p.price===null?'<span class="item-unavailable">Варианты уточняются</span>':`<button class="add-to-cart" type="button" data-add-product="${p.id}" aria-label="В корзину: ${escape(p.name+(p.description?' — '+p.description:''))}"><span aria-hidden="true">+</span> В корзину</button><div class="menu-remove-wrap" inert aria-hidden="true"><div><button class="menu-remove" type="button" data-remove-product="${p.id}" aria-label="Убрать из корзины: ${escape(p.name+(p.description?' — '+p.description:''))}" disabled><span aria-hidden="true">−</span> Убрать</button></div></div>`}</div>`;
 };
 const controls=(categoryIndex,itemIndex)=>{
  const variants=products.filter(p=>p.categoryIndex===categoryIndex&&p.itemIndex===itemIndex);
  return menu[categoryIndex].items[itemIndex].variants?'<div class="drink-variants">'+variants.map(p=>'<div class="drink-variant"><span class="drink-volume">'+escape(p.description==='1 л'?'1 литр':p.description==='2 л'?'2 литра':p.description)+'</span>'+control(p)+'</div>').join('')+'</div>':control(variants[0]);
 };
 return {products,controls,head:`<link rel="stylesheet" href="${prefix}cart.css"><link rel="stylesheet" href="${prefix}navigation.css">`,header:`<button class="cart-header-button" type="button" data-open-cart aria-haspopup="dialog" aria-controls="cart-dialog">${bag}<span>Корзина</span><span data-cart-count>0</span></button>`,body:`
${require('./navigation-markup.cjs')}
<button class="cart-dock" type="button" data-open-cart aria-haspopup="dialog" aria-controls="cart-dialog" hidden><span class="dock-icon">${bag}<span data-cart-count>0</span></span><span class="dock-label"><span>Корзина</span></span><strong data-cart-total>0 ₽</strong></button>
<p class="cart-status" role="status" aria-live="polite" aria-atomic="true"></p>
<dialog class="cart-dialog" id="cart-dialog" aria-labelledby="cart-title">
 <div class="cart-dialog-header"><div class="cart-heading"><span class="cart-eyebrow">SWEET / SUSHI · ВАШ ВЫБОР</span><h2 id="cart-title">Уже в корзине<span>.</span></h2></div><button class="cart-close" type="button" data-close-cart aria-label="Закрыть корзину" autofocus>×</button></div>
 <div class="cart-content"><p class="cart-empty">Пока пусто. Выберите что-нибудь в меню — добавим сюда.</p><ul class="cart-lines" aria-label="Позиции заказа"></ul></div>
 <div class="cart-footer"><div class="cart-summary"><span><small>СОБРАЛИ САМОЕ ВКУСНОЕ</small>Итого по меню</span><strong data-cart-total>0 ₽</strong></div>
 <p class="cart-hint">Итоговую стоимость и получение заказа подтвердит кассир.</p>
 <div class="cart-delivery-note"><div class="delivery-highlight"><strong>Бесплатная доставка</strong><span class="delivery-threshold">от 500 ₽</span></div><p>По селу при заказе от 500 ₽.</p><small>Заказ меньше 500 ₽? Условия доставки уточнит кассир.</small></div>
 <fieldset class="cart-payment cart-fulfillment"><legend>Способ получения</legend><div class="payment-options"><label><input type="radio" name="order-fulfillment" value="delivery"><span>Доставка по селу</span></label><label><input type="radio" name="order-fulfillment" value="pickup"><span>Самовывоз</span></label></div></fieldset>
 <fieldset class="cart-payment"><legend>Способ оплаты</legend><div class="payment-options"><label><input type="radio" name="order-payment" value="cash" checked><span>Наличными</span></label><label><input type="radio" name="order-payment" value="transfer"><span>Переводом на карту</span></label></div></fieldset>
 <div class="cart-comment-field"><label for="order-comment">Пожелания к заказу</label><textarea id="order-comment" class="cart-comment" maxlength="500" rows="3" placeholder="Например: без лука, соус отдельно" aria-describedby="order-comment-hint"></textarea><p id="order-comment-hint" class="cart-hint">Необязательно. Передадим кассиру вместе с заказом.</p></div>
 <p class="cart-config-note" data-config-note hidden></p>
 <a class="whatsapp-order" data-whatsapp-order aria-disabled="true">Написать в WhatsApp</a>
 <p class="cart-explanation">В WhatsApp откроется готовый заказ. Нажмите там «Отправить», чтобы кассир получил сообщение.</p>
 <details class="cart-message-preview"><summary>Состав заказа для WhatsApp</summary><textarea class="cart-message" rows="6" readonly aria-label="Текст заказа для WhatsApp"></textarea></details>
 <button class="cart-copy" type="button" data-copy-order disabled>Скопировать заказ</button>
 </div>
</dialog>
<script id="menu-catalog" type="application/json">${JSON.stringify(products.map(({categoryIndex,itemIndex,...p})=>p)).replaceAll('<','\\u003c')}</script>
<script src="${prefix}ordering-config.js"></script><script src="${prefix}cart-core.js"></script><script src="${prefix}cart.js"></script>`};
};
