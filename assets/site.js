// Public menu is already in HTML. No requests to the admin server are made here.
(async()=>{
 const own=document.currentScript,base=new URL('./',own.src),revision=own.dataset.revision||'1';
 const load=file=>new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL(file,base).href+'?v='+revision;script.onload=resolve;script.onerror=reject;document.body.append(script);});
 const links=[...document.querySelectorAll('nav a')];
 const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)links.forEach(a=>a.classList.toggle('active',a.hash==='#'+entry.target.id));},{rootMargin:'-5% 0px -65% 0px'});
 document.querySelectorAll('.menu-section').forEach(section=>observer.observe(section));
 const back=document.querySelector('.back-to-menu'),menu=document.querySelector('#menu'),dock=document.querySelector('.cart-dock');
 if(back&&menu){
  back.hidden=false;
  let pending=false;
  const update=()=>{
   pending=false;
   const visible=menu.getBoundingClientRect().top < -160;
   back.classList.toggle('is-visible',visible);
   back.inert=!visible;
   back.setAttribute('aria-hidden',String(!visible));
   back.style.setProperty('--back-cart-offset',dock&&!dock.hidden?(dock.offsetHeight+14)+'px':'0px');
  };
  const schedule=()=>{if(!pending){pending=true;requestAnimationFrame(update);}};
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule);
  if(dock){new MutationObserver(schedule).observe(dock,{attributes:true,attributeFilter:['hidden']});if(typeof ResizeObserver!=='undefined')new ResizeObserver(schedule).observe(dock);}
  update();
 }
 await load('motion.js');await load('cart-core.js');await load('cart.js');
})().catch(()=>{const status=document.querySelector('.cart-status');if(status)status.textContent='Обновите страницу, чтобы продолжить.';});
