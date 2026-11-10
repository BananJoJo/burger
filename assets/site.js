// Public menu is already in HTML. No requests to the admin server are made here.
(async()=>{
 const own=document.currentScript,base=new URL('./',own.src),revision=own.dataset.revision||'1';
 const load=file=>new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL(file,base).href+'?v='+revision;script.onload=resolve;script.onerror=reject;document.body.append(script);});
 const links=[...document.querySelectorAll('nav a')];
 const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)links.forEach(a=>a.classList.toggle('active',a.hash==='#'+entry.target.id));},{rootMargin:'-5% 0px -65% 0px'});
 document.querySelectorAll('.menu-section').forEach(section=>observer.observe(section));
 const back=document.querySelector('.back-to-menu'),menu=document.querySelector('#menu'),dock=document.querySelector('.cart-dock');
 let categoriesButton;
 if(menu&&links.length){
  categoriesButton=document.createElement('button');
  categoriesButton.type='button';categoriesButton.className='mobile-categories-button';
  categoriesButton.textContent='☰ Категории';
  categoriesButton.setAttribute('aria-haspopup','dialog');categoriesButton.setAttribute('aria-controls','mobile-categories');categoriesButton.setAttribute('aria-expanded','false');
  const sheet=document.createElement('dialog');sheet.id='mobile-categories';sheet.className='mobile-categories';sheet.setAttribute('aria-labelledby','mobile-categories-title');
  sheet.innerHTML='<div class="categories-handle" aria-hidden="true"></div><div class="categories-heading"><h2 id="mobile-categories-title">Что попробуем?</h2><button type="button" class="categories-close" aria-label="Закрыть категории">×</button></div><div class="categories-grid"></div>';
  const grid=sheet.querySelector('.categories-grid');
  links.forEach(link=>{const copy=link.cloneNode(true);copy.classList.remove('active');grid.append(copy);});
  let closing=false;
  const close=()=>{
   if(!sheet.open||closing)return;
   closing=true;
   const finish=()=>{sheet.close();sheet.classList.remove('is-closing');closing=false;};
   if(matchMedia('(prefers-reduced-motion: reduce)').matches)finish();
   else{sheet.classList.add('is-closing');setTimeout(finish,200);}
  };
  categoriesButton.addEventListener('click',()=>{
   if(sheet.open)return;
   grid.querySelectorAll('a').forEach((copy,index)=>{const active=links[index].classList.contains('active');copy.classList.toggle('active',active);if(active)copy.setAttribute('aria-current','true');else copy.removeAttribute('aria-current');});
   sheet.showModal();categoriesButton.setAttribute('aria-expanded','true');document.documentElement.classList.add('categories-open');
  });
  sheet.querySelector('.categories-close').addEventListener('click',close);
  grid.addEventListener('click',event=>{if(event.target.closest('a'))close();});
  sheet.addEventListener('cancel',event=>{event.preventDefault();close();});
  sheet.addEventListener('click',event=>{if(event.target===sheet){const r=sheet.getBoundingClientRect();if(event.clientY<r.top||event.clientX<r.left||event.clientX>r.right||event.clientY>r.bottom)close();}});
  sheet.addEventListener('close',()=>{document.documentElement.classList.remove('categories-open');categoriesButton.setAttribute('aria-expanded','false');});
  addEventListener('resize',()=>{if(innerWidth>1000&&sheet.open)close();});
  document.body.append(categoriesButton,sheet);
 }
 let bottomNavigation;
 if(back&&dock&&categoriesButton){
  bottomNavigation=document.createElement('div');bottomNavigation.className='bottom-navigation';bottomNavigation.setAttribute('role','group');bottomNavigation.setAttribute('aria-label','Навигация по меню');
  back.insertAdjacentHTML('beforeend','<span class="back-label">К меню</span>');
  document.body.append(bottomNavigation);bottomNavigation.append(categoriesButton,back,dock);
 }
 if(back&&menu){
  back.hidden=false;
  let pending=false;
  const update=()=>{
   pending=false;
   const compact=innerWidth<=1000,shown=menu.getBoundingClientRect().top<100;
   const visible=compact?shown:menu.getBoundingClientRect().top < -160;
   if(bottomNavigation){
    const hasCart=!dock.hidden;
    bottomNavigation.classList.toggle('is-visible',shown||hasCart);
    bottomNavigation.classList.toggle('show-shortcuts',shown);
    bottomNavigation.classList.toggle('has-cart',hasCart);
    bottomNavigation.inert=compact&&!shown&&!hasCart;
    dock.inert=compact&&!hasCart;
   }
   back.classList.toggle('is-visible',visible);
   back.inert=!visible;
   back.setAttribute('aria-hidden',String(!visible));
   back.style.setProperty('--back-cart-offset',dock&&!dock.hidden?(dock.offsetHeight+14)+'px':'0px');
   if(categoriesButton){const shown=menu.getBoundingClientRect().top<100;categoriesButton.classList.toggle('is-visible',shown);categoriesButton.inert=!shown;categoriesButton.setAttribute('aria-hidden',String(!shown));categoriesButton.style.setProperty('--back-cart-offset',dock&&!dock.hidden?(dock.offsetHeight+14)+'px':'0px');}
  };
  const schedule=()=>{if(!pending){pending=true;requestAnimationFrame(update);}};
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule);
  if(dock){new MutationObserver(schedule).observe(dock,{attributes:true,attributeFilter:['hidden']});if(typeof ResizeObserver!=='undefined')new ResizeObserver(schedule).observe(dock);}
  update();
 }
 await load('motion.js');await load('cart-core.js');await load('cart.js');
})().catch(()=>{const status=document.querySelector('.cart-status');if(status)status.textContent='Обновите страницу, чтобы продолжить.';});
