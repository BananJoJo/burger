(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MenuCartCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const MAX_QUANTITY=99;
 const money=value=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(value)+' ₽';
 const catalogMap=catalog=>new Map(catalog.filter(p=>typeof p.id==='string'&&Number.isSafeInteger(p.price)&&p.price>0).map(p=>[p.id,p]));
 function restore(raw,catalog){
  const allowed=catalogMap(catalog),result={};
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return result;
  for(const [id,qty] of Object.entries(raw))if(allowed.has(id)&&Number.isSafeInteger(qty)&&qty>0)result[id]=Math.min(qty,MAX_QUANTITY);
  return result;
 }
 function setQuantity(cart,id,qty,catalog){
  const next=restore(cart,catalog);
  if(!catalogMap(catalog).has(id)||!Number.isSafeInteger(qty))return next;
  if(qty<=0)delete next[id];else next[id]=Math.min(qty,MAX_QUANTITY);
  return next;
 }
 function lines(cart,catalog){const valid=restore(cart,catalog);return catalog.filter(p=>valid[p.id]).map(p=>({...p,quantity:valid[p.id],subtotal:p.price*valid[p.id]}));}
 function total(cart,catalog){return lines(cart,catalog).reduce((sum,p)=>sum+p.subtotal,0);}
 function count(cart,catalog){return lines(cart,catalog).reduce((sum,p)=>sum+p.quantity,0);}
 function orderName(p){return String(p.category||'').trim().toLowerCase()==='пиццы'&&!/пицц/i.test(p.name)?'Пицца «'+p.name+'»':p.name;}
 function message(cart,catalog,payment,comment='',fulfillment=''){
  const entries=lines(cart,catalog);
  if(!entries.length)return '';
  return ['Ассаляму алейкум! 👋','Хочу сделать заказ в *Sweet Sushi* 🍔','','*Мой заказ:*','',...entries.flatMap((p,i)=>[`${i+1}. *${orderName(p)}${p.description&&!p.name.toLowerCase().includes(p.description.toLowerCase())?' — '+p.description:''}*`,`   *${p.quantity} шт.* · ${money(p.price)} за шт. — *${money(p.subtotal)}*`,'']),`🧾 *Сумма по меню: ${money(total(cart,catalog))}*`,...(['cash','transfer'].includes(payment)?['💳 *Оплата: '+(payment==='cash'?'Наличными':'Перевод на карту')+'*']:[]),...(['delivery','pickup'].includes(fulfillment)?[(fulfillment==='delivery'?'🚚 *Получение: Доставка*':'🛍️ *Получение: Самовывоз*')]:[]),...(String(comment||'').trim()?['','💬 *Комментарий к заказу:*',String(comment).trim().slice(0,500)]:[]),'','Подтвердите, пожалуйста, заказ и итоговую стоимость. Подскажите, когда будет готово и как можно получить заказ. Спасибо! 😊'].join('\n');
 }
 function whatsappUrl(number,text){
  const phone=String(number||'').replace(/[\s()+-]/g,'');
  if(!/^[1-9]\d{7,14}$/.test(phone)||!text)return null;
  return 'https://wa.me/'+phone+'?text='+encodeURIComponent(text);
 }
 return {MAX_QUANTITY,money,restore,setQuantity,lines,total,count,message,whatsappUrl};
});
