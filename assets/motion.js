(() => {
 const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
 let navigationFrame=0;
 const stopNavigation=()=>{cancelAnimationFrame(navigationFrame);navigationFrame=0;};
 ['wheel','touchstart','pointerdown'].forEach(type=>addEventListener(type,stopNavigation,{passive:true}));
 addEventListener('keydown',event=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End','Escape',' '].includes(event.key))stopNavigation();});
 const targetTop = target => {
  let top=0;
  for(let node=target;node;node=node.offsetParent)top+=node.offsetTop||0;
  return Math.max(0,Math.min(document.documentElement.scrollHeight-innerHeight,top-24));
 };
 const jump = (hash, animate=true) => {
  stopNavigation();
  const target=hash && hash!=='#' ? document.getElementById(hash.slice(1)) : document.body;
  if(!target)return;
  const start=scrollY,end=targetTop(target),distance=end-start;
  if(!animate||reduced.matches){scrollTo({top:end,behavior:'instant'});return;}
  const duration=Math.min(1050,500+Math.abs(distance)*.1);
  let started;
  const frame=now=>{
   started??=now;
   const p=Math.min(1,(now-started)/duration);
   const eased=p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
   scrollTo({top:start+distance*eased,behavior:'instant'});
   if(p<1)navigationFrame=requestAnimationFrame(frame);
   else{navigationFrame=0;scrollTo({top:targetTop(target),behavior:'instant'});}
  };
  navigationFrame=requestAnimationFrame(frame);
 };
 document.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',event=>{
  event.preventDefault();
  const hash=link.getAttribute('href');
  history.replaceState(null,'',hash);
  jump(hash);
 }));
 if(location.hash) requestAnimationFrame(()=>jump(location.hash,false));
 const burger = document.querySelector('.hero-burger');
 const button = document.querySelector('.motion-toggle');
 let paused = false, onScreen = true;
 const hero = document.querySelector('.hero');
 const scene = document.querySelector('.burger-scene');
 const mobile = window.matchMedia('(max-width: 700px)');
 let scrollFrame = 0;
 const updateRetreat = () => {
  scrollFrame = 0;
  const rect=hero.getBoundingClientRect();
  const progress=mobile.matches && !reduced.matches && !paused ? Math.max(0,Math.min(1,-rect.top/(rect.height*.65))) : 0;
  scene.style.setProperty('--burger-retreat-x', `${8*progress}px`);
  scene.style.setProperty('--burger-retreat-y', `${-6*progress}px`);
  scene.style.setProperty('--burger-retreat-scale', String(1-.07*progress));
  scene.style.setProperty('--burger-retreat-opacity', String(1-.6*progress));
  scene.style.setProperty('--sushi-opacity', String(Math.max(0,(progress-.15)/.85)));
 };
 const scheduleRetreat = () => {if(!scrollFrame)scrollFrame=requestAnimationFrame(updateRetreat);};
 addEventListener('scroll',scheduleRetreat,{passive:true});
 addEventListener('resize',scheduleRetreat);
 mobile.addEventListener('change',scheduleRetreat);
 reduced.addEventListener('change',scheduleRetreat);
 button?.addEventListener('click',scheduleRetreat);
 updateRetreat();
 const updateMotion = () => { burger.style.animationPlayState = paused || !onScreen || document.hidden || reduced.matches ? 'paused' : 'running'; };
 button?.addEventListener('click', () => {paused = !paused;button.setAttribute('aria-pressed', String(paused));button.textContent=paused?'Продолжить анимацию':'Приостановить анимацию';updateMotion();});
 document.addEventListener('visibilitychange', updateMotion);
 new IntersectionObserver(entries => {onScreen=entries[0].isIntersecting;updateMotion();}).observe(burger);
 const animations = new Set();
 const activeReveals = new WeakMap();
 const reveal = (el, delay=0) => {
  if(reduced.matches || !el.animate) return;
  activeReveals.get(el)?.cancel();
  const stableTarget=el.matches('.menu-section h2,aside');
  const anim=el.animate([{opacity:0,transform:stableTarget?'none':'translateY(38px)',filter:'blur(3px)'},{opacity:1,transform:stableTarget?'none':'translateY(0)',filter:'blur(0)'}],{duration:850,delay,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});
  activeReveals.set(el,anim);
  animations.add(anim);anim.finished.then(()=>animations.delete(anim)).catch(()=>animations.delete(anim));
 };
 const heroParts=[...document.querySelectorAll('.hero h1,.hero p,.hero .cta,.hero>div:nth-child(2)')];
 document.querySelectorAll('header').forEach(el=>reveal(el));
 const entered=new WeakSet();
 const sections = new IntersectionObserver(entries=>{
  let index=0;
  for(const entry of entries){
   if(!entry.isIntersecting){entered.delete(entry.target);continue;}
   if(entered.has(entry.target))continue;
   entered.add(entry.target);
   const targets=entry.target===hero?heroParts:entry.target.matches('.item')?[...entry.target.children]:[entry.target];
   targets.forEach((el,i)=>reveal(el,Math.min((index+i)*70,280)));
   index++;
  }
 },{threshold:0});
 document.querySelectorAll('aside,.menu-section h2,.item,.hero').forEach(el=>sections.observe(el));
 reduced.addEventListener('change',()=>{if(reduced.matches){stopNavigation();for(const animation of animations)animation.cancel();animations.clear();}updateMotion();});
 updateMotion();
})();
