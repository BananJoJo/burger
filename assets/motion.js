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
 // Initial navigation always starts on the cover; in-page category clicks still animate.
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
 // The cover animates once. Menu rows stay in place during scrolling.
 const coverAnimations = [];
 if(!reduced.matches){
  for(const element of document.querySelectorAll('.hero h1,.hero .cta')){
   coverAnimations.push(element.animate([{opacity:.65},{opacity:1}],{duration:250,easing:'ease-out'}));
  }
 }
 reduced.addEventListener('change',()=>{
  if(reduced.matches){
   stopNavigation();
   for(const animation of coverAnimations)animation.cancel();
  }
  updateMotion();
 });
 updateMotion();
})();
