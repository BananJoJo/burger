(() => {
 'use strict';
 const core=window.AdminMenu,$=s=>document.querySelector(s),clone=v=>JSON.parse(JSON.stringify(v));
 const uid=()=>crypto.randomUUID(),connection=window.AdminConnection,remote=Boolean(connection?.remote);
 let data,selectedId='',working,dirty=false,db,busy=false,exportableFailure=false;
 const status=(message,error=false)=>{$('#status').textContent=message;$('#status').classList.toggle('error',error);};
 const find=id=>data.sections.flatMap(s=>s.items).find(p=>p.id===id);
 function openStore(){return new Promise((resolve,reject)=>{const request=indexedDB.open('sweet-sushi-admin-demo',1);request.onupgradeneeded=()=>request.result.createObjectStore('drafts');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('Хранилище занято другой вкладкой.'));});}
 function readDraft(){return new Promise((resolve,reject)=>{const tx=db.transaction('drafts'),request=tx.objectStore('drafts').get('menu');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
 function persist(next){if(remote)return connection.save(next);return new Promise((resolve,reject)=>{if(!db){reject(Error('Локальное сохранение недоступно'));return;}const tx=db.transaction('drafts','readwrite');tx.objectStore('drafts').put(next,'menu');tx.oncomplete=()=>resolve(next);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
 const option=(value,text)=>{const el=document.createElement('option');el.value=value;el.textContent=text;return el;};
 function categories(){for(const selector of ['#filter','#dish-category']){const el=$(selector),current=el.value;el.replaceChildren();if(selector==='#filter')el.append(option('','Все категории'));for(const s of data.sections)el.append(option(s.id,s.name));el.value=current;}}
 function renderList(){
  const query=$('#search').value.trim().toLocaleLowerCase('ru'),category=$('#filter').value,list=$('#dish-list');list.replaceChildren();
  let total=0,available=0,shown=0;
  for(const s of data.sections)for(const p of s.items){total++;available+=Number(p.available);if((category&&category!==s.id)||!`${p.name} ${p.description}`.toLocaleLowerCase('ru').includes(query))continue;shown++;
   const b=document.createElement('button');b.type='button';b.className='dish-button'+(p.id===selectedId?' selected':'')+(p.available?'':' unavailable');b.setAttribute('aria-pressed',String(p.id===selectedId));
   const image=document.createElement(p.photo?'img':'span');image.className='dish-thumb';if(p.photo){image.src=p.photo;image.alt='';image.loading='lazy';}else image.textContent=s.name.slice(0,1);
   const info=document.createElement('span'),name=document.createElement('strong'),hint=document.createElement('small');name.textContent=p.name;hint.textContent=(p.description?p.description.slice(0,55)+' · ':'')+s.name+(p.available?'':' · Скрыто');info.append(name,hint);b.append(image,info);b.addEventListener('click',()=>select(p.id));list.append(b);
  }
  if(!shown){const empty=document.createElement('p');empty.className='field-help';empty.textContent='Ничего не найдено. Измените поиск или добавьте блюдо.';list.append(empty);}
  $('#menu-count').textContent=`${total} блюд · ${data.sections.length} категорий · ${available} в наличии`;
 }
 function markDirty(){dirty=true;$('#save-badge').textContent='Есть изменения';$('#edit-hint').textContent='Сохраните изменения в черновик.';}
 function canLeave(){return !busy&&(!dirty||confirm('Изменения в карточке ещё не сохранены. Перейти без сохранения?'));}
 function renderPhoto(){const image=$('#photo-preview');image.hidden=!working.photo;$('#photo-placeholder').hidden=Boolean(working.photo);$('#remove-photo').hidden=!working.photo;if(working.photo)image.src=working.photo;else image.removeAttribute('src');$('#photo-input').value='';}
 function renderVariants(){
  const category=data.sections.find(s=>s.id===$('#dish-category').value),drinks=core.isDrinkCategory(category?.name);
  const list=$('#variant-list');list.replaceChildren();
  $('#price-heading').textContent=drinks?'Объёмы напитка':'Цена';
  $('#price-help').hidden=!drinks&&working.variants.length===1;
  $('#price-help').textContent=drinks?'Укажите объём и цену, например «1 л» и 180 ₽.':'Для этой категории используется одна цена. При сохранении останется только первая цена, без объёмов.';
  $('#add-variant').hidden=!drinks;
  (drinks?working.variants:working.variants.slice(0,1)).forEach((v,index)=>{
   const row=document.createElement('div');row.className='variant-row'+(drinks?'':' single-price');
   const label=document.createElement('label');label.textContent='Вариант / объём';const name=document.createElement('input');name.value=v.label;name.maxLength=60;name.placeholder='Например: 1 л';name.addEventListener('input',()=>{v.label=name.value;markDirty();});label.append(name);
   const priceLabel=document.createElement('label');priceLabel.textContent='Цена, ₽';const price=document.createElement('input');price.type='number';price.min='1';price.max='1000000';price.step='1';price.required=true;price.inputMode='numeric';price.value=v.price||'';price.addEventListener('input',()=>{v.price=Number(price.value);markDirty();});priceLabel.append(price);
   const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.disabled=working.variants.length===1;remove.setAttribute('aria-label','Убрать объём '+(v.label||index+1));remove.addEventListener('click',()=>{working.variants.splice(index,1);renderVariants();markDirty();});if(drinks)row.append(label,priceLabel,remove);else row.append(priceLabel);list.append(row);
  });
  $('#add-variant').disabled=working.variants.length>=8;
 }
 function renderEditor(item,categoryId){working=clone(item);selectedId=item.id;dirty=false;$('#dish-form').hidden=false;$('#editor-heading').textContent=item.name;$('#dish-name').value=item.name;$('#dish-category').value=categoryId;$('#dish-description').value=item.description;$('#dish-available').checked=item.available;$('#save-badge').textContent='Черновик';$('#edit-hint').textContent='Изменения сохраняются после нажатия кнопки.';renderPhoto();renderVariants();renderList();}
 function select(id){if(!canLeave())return;const category=data.sections.find(s=>s.items.some(p=>p.id===id));if(category)renderEditor(find(id),category.id);}
 async function save(){
  exportableFailure=false;
  if(busy||!working||!$('#dish-form').reportValidity())return false;
  const next=clone(data),item={...working,name:$('#dish-name').value,description:$('#dish-description').value,available:$('#dish-available').checked};
  const category=next.sections.find(s=>s.id===$('#dish-category').value);if(!category){status('Выберите категорию.',true);return false;}
  item.variants=core.variantsForCategory(item.variants,category.name);
  for(const s of next.sections)s.items=s.items.filter(p=>p.id!==item.id);category.items.push(item);
  // Keep the existing menu order when the category has not changed.
  const original=data.sections.find(s=>s.items.some(p=>p.id===item.id));
  if(original?.id===category.id){category.items.pop();category.items.splice(original.items.findIndex(p=>p.id===item.id),0,item);}
  let valid;try{valid=core.validate(next);}catch(error){status(error.message,true);return false;}
  busy=true;$('#save-button').disabled=true;$('#dish-form').inert=true;
  try{data=await persist(valid);renderEditor(find(item.id),category.id);$('#save-badge').textContent='Сохранено';status(remote?'Общий черновик сохранён. Проверьте его и нажмите «Опубликовать».':'Черновик сохранён на этом устройстве. Публичное меню не изменено.');return true;}
  catch(error){data=valid;working=clone(find(item.id));dirty=true;exportableFailure=true;renderList();status(remote?error.message:'Не удалось сохранить на устройстве. Скачайте копию меню, чтобы не потерять изменения.',true);return false;}
  finally{busy=false;$('#save-button').disabled=false;$('#dish-form').inert=false;}
 }
 async function photo(file){
  if(!file||busy)return;
  if(!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type)||file.size>12*1024*1024){status('Выберите JPG, PNG, WebP или AVIF размером до 12 МБ.',true);return;}
  const dishId=selectedId;busy=true;$('#save-button').disabled=true;$('#dish-form').inert=true;status('Подготавливаем фотографию…');
  try{const bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>80000000){bitmap.close();throw Error('Изображение слишком большое.');}const ratio=Math.min(1,1200/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const encoded=canvas.toDataURL('image/webp',.82);if(encoded.length>2200000)throw Error('Фото слишком большое после обработки. Попробуйте другой файл.');if(selectedId!==dishId)return;working.photo=encoded;renderPhoto();markDirty();status('Фото подготовлено. Сохраните карточку в черновик.');}
  catch(error){status(error.message||'Не удалось открыть фотографию.',true);}finally{busy=false;$('#save-button').disabled=false;$('#dish-form').inert=false;}
 }
 $('#dish-form').addEventListener('submit',event=>{event.preventDefault();save();});
 for(const selector of ['#dish-name','#dish-description','#dish-category','#dish-available'])$(selector).addEventListener('input',markDirty);
 $('#dish-category').addEventListener('change',renderVariants);
 $('#search').addEventListener('input',()=>data&&renderList());$('#filter').addEventListener('change',()=>data&&renderList());
 $('#add-button').addEventListener('click',()=>{if(!canLeave())return;const category=$('#filter').value||data.sections[0].id;renderEditor({id:uid(),name:'Новое блюдо',description:'',photo:'',available:true,variants:[{id:uid(),label:'',price:0}]},category);markDirty();$('#dish-name').focus();$('#dish-name').select();});
 $('#add-variant').addEventListener('click',()=>{if(working.variants.length>=8)return;working.variants.push({id:uid(),label:'',price:0});renderVariants();markDirty();});
 $('#photo-input').addEventListener('change',event=>photo(event.target.files[0]));$('#remove-photo').addEventListener('click',()=>{working.photo='';renderPhoto();markDirty();});
 $('#preview-button').addEventListener('click',async()=>{if(busy)return;if(dirty&&!await save())return;$('#preview-content').innerHTML=core.preview(data);$('#preview-dialog').showModal();});
 $('#close-preview').addEventListener('click',()=>$('#preview-dialog').close());
 async function download(){const snapshot=core.validate(data);busy=true;try{for(const s of snapshot.sections)for(const item of s.items)if(item.photo.startsWith('/media/')){const response=await fetch(item.photo,{credentials:'same-origin'});if(!response.ok)throw Error('Не удалось загрузить фотографию для копии. Повторите позже.');const blob=await response.blob();item.photo=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});}const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='sweet-sushi-menu-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Копия меню с фотографиями подготовлена.');}catch(error){status(error.message||'Не удалось подготовить копию.',true);}finally{busy=false;}}
 $('#export-button').addEventListener('click',async()=>{if(busy)return;if(dirty&&!await save()){if(exportableFailure)await download();return;}await download();});
 $('#reset-button').addEventListener('click',async()=>{if(busy)return;if(!confirm('Вернуть исходные 68 блюд? Тестовые правки на этом устройстве будут заменены. При необходимости сначала скачайте копию.'))return;busy=true;try{const response=await fetch('./seed.json',{cache:'no-store'});if(!response.ok)throw Error('Не удалось загрузить исходное меню.');const initial=core.validate(await response.json());await persist(initial);data=initial;dirty=false;selectedId='';working=null;categories();$('#search').value='';$('#filter').value='';const first=data.sections.find(s=>s.items.length);renderEditor(first.items[0],first.id);status('Исходное меню восстановлено. Можно начинать новый тест.');}catch(error){status(error.message,true);}finally{busy=false;}});
 $('#import-input').addEventListener('change',async event=>{const file=event.target.files[0];if(!file||busy)return;if(file.size>30*1024*1024){status('Копия слишком большая (максимум 30 МБ). Используйте резервную копию папки данных сервера.',true);return;}if(!canLeave())return;busy=true;$('#dish-form').inert=true;try{const imported=core.validate(JSON.parse(await file.text()));if(!confirm('Заменить текущий черновик этой копией меню?'))return;data=await persist(imported);categories();$('#search').value='';$('#filter').value='';selectedId='';working=null;dirty=false;$('#dish-form').hidden=true;$('#editor-heading').textContent='Выберите блюдо';renderList();status(remote?'Копия загружена в общий черновик. Проверьте её перед публикацией.':'Копия загружена. Публичный сайт не изменён.');}catch(error){status('Не удалось загрузить копию. '+error.message,true);}finally{busy=false;$('#dish-form').inert=false;event.target.value='';}});
 window.AdminEditor={save,isDirty:()=>dirty,isBusy:()=>busy,setPublishing:value=>{busy=value;$("#dish-form").inert=value;}};
 addEventListener('admin-menu-replaced',event=>{data=core.validate(event.detail);dirty=false;categories();const category=data.sections.find(s=>s.items.some(p=>p.id===selectedId))||data.sections.find(s=>s.items.length);if(category)renderEditor(category.items.find(p=>p.id===selectedId)||category.items[0],category.id);else{working=null;$('#dish-form').hidden=true;renderList();}});
 addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
 (async()=>{try{let saved;try{if(remote)saved=connection.state.menu;else{db=await openStore();saved=await readDraft();}}catch{status('Сохранение в браузере недоступно. Разрешите хранение данных, чтобы тестировать черновик.',true);}if(saved){try{data=core.validate(saved);}catch{status('Сохранённая копия повреждена. Открыли исходное меню; сохранение доступно после правки.',true);}}if(!data){const response=await fetch('./seed.json',{cache:'no-store'});if(!response.ok)throw Error('Не удалось загрузить исходное меню.');data=core.validate(await response.json());}categories();renderList();$('#workspace').hidden=false;for(const selector of ['#preview-button','#add-button','#export-button','#import-input','#reset-button'])$(selector).disabled=false;const first=data.sections.find(s=>s.items.length);if(first)renderEditor(first.items[0],first.id);}catch(error){status(error.message+' Обновите страницу или запустите сайт через локальный сервер.',true);}})();
})();
