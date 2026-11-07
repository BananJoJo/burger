(() => {
 const jump = hash => {
  const target=hash && hash!=='#' ? document.getElementById(hash.slice(1)) : document.body;
  if(target) target.scrollIntoView({behavior:'instant',block:'start'});
 };
 document.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',event=>{
  event.preventDefault();
  const hash=link.getAttribute('href');
  history.replaceState(null,'',hash);
  jump(hash);
 }));
 if(location.hash) requestAnimationFrame(()=>jump(location.hash));
 const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
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
  const progress=mobile.matches && !reduced.matches && !paused ? Math.max(0,Math.min(1,-rect.top/rect.height)) : 0;
  scene.style.setProperty('--burger-retreat-y', `${-36*progress}px`);
  scene.style.setProperty('--burger-retreat-scale', String(1-.18*progress));
  scene.style.setProperty('--burger-retreat-opacity', String(1-.55*progress));
 };
 const scheduleRetreat = () => {if(!scrollFrame)scrollFrame=requestAnimationFrame(updateRetreat);};
 addEventListener('scroll',scheduleRetreat,{passive:true});
 addEventListener('resize',scheduleRetreat);
 mobile.addEventListener('change',scheduleRetreat);
 reduced.addEventListener('change',scheduleRetreat);
 button.addEventListener('click',scheduleRetreat);
 updateRetreat();
 const updateMotion = () => { burger.style.animationPlayState = paused || !onScreen || document.hidden || reduced.matches ? 'paused' : 'running'; };
 button.addEventListener('click', () => {paused = !paused;button.setAttribute('aria-pressed', String(paused));button.textContent=paused?'Продолжить анимацию':'Приостановить анимацию';updateMotion();});
 document.addEventListener('visibilitychange', updateMotion);
 new IntersectionObserver(entries => {onScreen=entries[0].isIntersecting;updateMotion();}).observe(burger);
 const animations = new Set();
 const reveal = (el, delay=0) => {
  if(reduced.matches || !el.animate) return;
  const anim=el.animate([{opacity:0,transform:'translateY(22px)'},{opacity:1,transform:'translateY(0)'}],{duration:650,delay,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});
  animations.add(anim);anim.finished.then(()=>animations.delete(anim)).catch(()=>animations.delete(anim));
 };
 document.querySelectorAll('header,.hero h1,.hero p,.hero .cta,.hero>div:nth-child(2)').forEach((el,i)=>reveal(el,i*85));
 const sections = new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){reveal(entry.target);sections.unobserve(entry.target);}}},{threshold:.08});
 document.querySelectorAll('aside,.menu-section').forEach(el=>sections.observe(el));
 reduced.addEventListener('change',()=>{if(reduced.matches){for(const animation of animations)animation.cancel();animations.clear();}updateMotion();});
 updateMotion();
})();
