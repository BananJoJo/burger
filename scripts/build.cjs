const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const escape = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const sections=[]; let current;
for(const line of fs.readFileSync(path.join(root,'docs/content.md'),'utf8').split(/\r?\n/)) {
 if(line.startsWith('## ')) { const name=line.slice(3); current={name,items:[]}; sections.push(current); }
 if(current && line.startsWith('|') && line.includes('₽')) {
 const cells=line.split('|').slice(1,-1).map(s=>s.trim());
 if(cells[0]==='Позиция') continue;
 const prices=cells.filter(s=>s.includes('₽'));
 const desc=cells.slice(1).filter(s=>!s.includes('₽') && s!=='—' && !/не указан|не подписан/i.test(s));
 current.items.push(current.name==='Холодные напитки'?{name:cells[0],desc:'',variants:prices.map((price,i)=>({price,desc:(i+1)+' л'}))}:{name:cells[0],price:prices.join(' / '),desc:desc.join(' · ')});
 }
}
const menu=sections.filter(s=>s.items.length);
menu.sort((a,b)=> (a.name==='Бургеры'?-1:b.name==='Бургеры'?1:0));
const categoryIcons=['sandwich','sandwich','sandwich','utensils-crossed','drumstick','pizza','fish','salad','coffee','cup-soda'];
const nav=menu.map((s,i)=>`<a href="#menu-${i}"><img class="category-icon" src="./assets/icons/${categoryIcons[i]}.svg" alt="" aria-hidden="true"><span class="category-name">${escape(s.name)}</span><span class="category-count">${s.items.length}</span></a>`).join('');
const cart=require('./cart-markup.cjs')(menu,'./assets/');
const content=menu.map((s,i)=>`<section class="menu-section" id="menu-${i}"><h2>${escape(s.name)}</h2><div class="items">${s.items.map((item,j)=>`<article class="item"${item.variants?' data-drink="true"':''}><div><h3>${escape(item.name)}</h3>${item.desc?`<p>${escape(item.desc)}</p>`:''}</div>${cart.controls(i,j)}</article>`).join('')}</div></section>`).join('');
const html=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sweet Sushi — меню</title><meta name="description" content="Меню Sweet Sushi в Мескере-Юрт: бургеры, роллы, пицца, закуски и напитки."><style>
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:30px}body{margin:0;background:#111110;color:#f7f1e6;font:16px/1.5 Arial,sans-serif}a{color:inherit}a:focus-visible{outline:3px solid #ffb692;outline-offset:5px}header{max-width:1440px;margin:auto;padding:24px 6%;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #35332e}.brand{font-size:26px;font-weight:900;text-decoration:none;letter-spacing:-1px}.brand em{color:#f44139;font-style:normal}.header-link{font-size:14px;text-underline-offset:6px}.hero{max-width:1440px;margin:auto;padding:64px 6% 76px;display:grid;grid-template-columns:1.1fr 1fr;gap:50px;align-items:center}h1{font-size:clamp(48px,6vw,88px);line-height:.99;letter-spacing:-4px;margin:0 0 24px;font-weight:900}h1 span{color:#f44139}.hero p{color:#bcb7ad;font-size:19px;max-width:360px;margin:0 0 30px}.cta{display:inline-block;background:#f44139;color:#fff;padding:15px 25px;text-decoration:none;border-radius:4px;font-weight:700}.photo{height:360px;overflow:hidden;border-radius:6px;background:#252321;position:relative}.photo img{display:block;width:100%;height:auto;position:relative;top:-50px}.photo-caption{font-size:12px;color:#bcb7ad;margin-top:9px}.menu-layout{max-width:1440px;margin:auto;display:grid;grid-template-columns:230px minmax(0,1fr);gap:64px;padding:40px 6% 80px;border-top:1px solid #35332e}aside{align-self:start;position:sticky;top:25px}aside h2{font-size:16px;margin:0 0 16px;color:#aaa69d}nav{display:grid;gap:4px}nav a{min-height:44px;display:flex;align-items:center;justify-content:space-between;padding:9px 12px;text-decoration:none;border-radius:3px;color:#d8d3c9}nav a:hover,nav a.active{background:#f44139;color:#fff}nav span{font-size:12px;opacity:.7;margin-left:12px}.menu-section{margin:0 0 55px}.menu-section h2{font-size:36px;letter-spacing:-1px;line-height:1.15;margin:0 0 24px}.items{display:grid;grid-template-columns:1fr 1fr;column-gap:38px}.item{display:flex;justify-content:space-between;gap:15px;border-top:1px solid #35332e;padding:20px 0;align-items:baseline}.item h3{font-size:17px;font-weight:600;margin:0}.item p{font-size:14px;color:#bcb7ad;margin:6px 0 0}.item strong{font-size:16px;white-space:nowrap;color:#ff8f7b;font-weight:600}.note{font-size:13px;color:#bcb7ad}footer{padding:24px 6%;border-top:1px solid #35332e;display:flex;justify-content:space-between;gap:20px;color:#aaa69d;font-size:14px}.preview-notice{background:#25231e;padding:9px 6%;font-size:12px;color:#d8cfb9}.preview-notice p{max-width:1268px;margin:0 auto}@media(min-width:1600px){.photo{height:430px}}@media(max-width:1000px){.items{grid-template-columns:1fr}.hero{gap:25px}.photo{height:300px}.menu-layout{gap:35px;grid-template-columns:200px minmax(0,1fr)}}@media(max-width:650px){header{padding:18px 6%}.brand{font-size:23px}.hero{padding:35px 6%;grid-template-columns:1fr;gap:25px}h1{font-size:54px;letter-spacing:-2.5px}.hero p{font-size:17px}.photo{height:270px}.photo img{top:-45px}.menu-layout{display:block;padding-top:25px}aside{position:static;margin-bottom:35px}nav{grid-template-columns:1fr 1fr;gap:3px}nav a{padding:8px;font-size:13px}nav span{display:none}.menu-section h2{font-size:30px}.item h3{font-size:16px}.item strong{font-size:15px}.menu-section{margin-bottom:38px}footer{flex-wrap:wrap}.preview-notice{font-size:11px}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
</style></head><body><div class="preview-notice"><p>Предварительный макет · название — по исходным материалам · оформление ещё не согласовано</p></div><header><a class="brand" href="#">Sweet<span> / </span><em>Sushi</em></a><a class="header-link" href="#menu">Перейти к меню ↗</a></header><main><section class="hero"><div><h1>Всё меню.<br>На любой<br><span>аппетит.</span></h1><p>Бургеры, роллы, пицца и закуски.<br>Выбирайте, что попробовать.</p><a class="cta" href="#menu">Смотреть меню ↓</a></div><div><div class="photo"><img src="../исходники/5438536913506739038_119.jpg" alt="Гиро на тарелке: фотография из предоставленных материалов"></div><div class="photo-caption">Фотография из материалов заведения</div></div></section><div class="menu-layout" id="menu"><aside><h2>Наше меню</h2><nav aria-label="Категории меню">${nav}</nav></aside><div>${content}</div></div></main><footer><span>Sweet Sushi · Мескере-Юрт</span><a href="#">Вернуться наверх ↑</a></footer><script>const links=[...document.querySelectorAll('nav a')];const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){links.forEach(a=>a.classList.toggle('active',a.hash==='#'+entry.target.id))}}},{rootMargin:'-5% 0px -65% 0px'});document.querySelectorAll('.menu-section').forEach(s=>observer.observe(s));</script></body></html>`;
const updated = html.replace('</head>','<link rel="stylesheet" href="./assets/styles.css"></head>')
 .replace('<h1>Всё меню.<br>На любой<br><span>аппетит.</span></h1><p>Бургеры, роллы, пицца и закуски.<br>Выбирайте, что попробовать.</p>', '<h1>На что<br>сегодня<br><span>аппетит?</span></h1>')
 .replace('Смотреть меню ↓</a>', '<span class="cta-label">Выбрать своё</span></a>')
 .replace('<aside><h2>Наше меню</h2>', '<aside><div class="menu-intro"><span class="menu-kicker"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M13 2c1 6-4 6-2 10 2-1 3-3 3-5 5 4 7 8 4 12-3 4-10 3-12-1-2-4 0-7 3-10-1 4 0 5 1 5-1-5 4-7 3-11Z"/></svg> МЕНЮ НА ЛЮБОЙ АППЕТИТ</span><h2>Что попробуем?</h2></div>')
 .replace('<div class="photo"><img src="../исходники/5438536913506739038_119.jpg" alt="Гиро на тарелке: фотография из предоставленных материалов"></div><div class="photo-caption">Фотография из материалов заведения</div>', '<div class="photo burger-scene"><img class="hero-burger" src="/preview/assets/burger-hero.png" alt="Декоративная объёмная иллюстрация бургера"><span class="burger-shadow" aria-hidden="true"></span><button class="motion-toggle" type="button" aria-pressed="false">Приостановить анимацию</button></div>')
 .replace('src="/preview/assets/burger-hero.png"', 'src="./assets/burger.jpg"')
 .replace('<button class="motion-toggle" type="button" aria-pressed="false">Приостановить анимацию</button>', '')
 .replace(/<div class="preview-notice">[\s\S]*?<\/div>/, '')
 .replace(/<span class="menu-kicker">[\s\S]*?<\/span>/, '<span class="menu-kicker">Выбирайте по настроению</span>')
 .replace('<head>', '<head><script>history.scrollRestoration="manual";if(location.hash)history.replaceState(null,"",location.pathname+location.search);scrollTo({top:0,behavior:"instant"});addEventListener("pageshow",()=>scrollTo({top:0,behavior:"instant"}));</script>')
 .replace('</head>',cart.head+'</head>')
 .replace('</header>',cart.header+'</header>')
 .replace('<a href="#">Вернуться наверх ↑</a>', '<a href="./qr.html">QR-код меню</a><a href="#">Вернуться наверх ↑</a>')
 .replace('</body>', '<script src="./assets/motion.js"></script>'+cart.body+'</body>');
const bootstrapped=updated
 .replace(/<script>const links=\[[\s\S]*?<\/script>/,'')
 .replace(/<script src="\.\/assets\/(?:motion|cart-core|cart)\.js"><\/script>/g,'')
 .replace('</body>',`<script src="./assets/site.js" data-revision="${Date.now()}"></script></body>`);
// Changed assets get fresh URLs so Pages cannot mix new HTML with cached controls/styles.
const versioned=bootstrapped.replace(/(src|href)="(\.\/assets\/[^"?]+\.(?:css|js))"/g,(match,attribute,url)=>{
 const hash=require('node:crypto').createHash('sha256').update(fs.readFileSync(path.resolve(root,url))).digest('hex').slice(0,12);
 return `${attribute}="${url}?v=${hash}"`;
});
const {markers,renderStatic}=require('../server/static-menu.cjs');
const publishedFile=path.join(root,'assets/menu-data.json');
let finalHTML=fs.existsSync(publishedFile)?renderStatic(versioned,JSON.parse(fs.readFileSync(publishedFile,'utf8'))).html:markers(versioned);
// Temporary visual sketch: reuse the hero photo on the first burger only.
if(!fs.existsSync(publishedFile))finalHTML=finalHTML.replace('<article class="item">','<article class="item" data-burger-draft="true"><figure class="burger-card-photo"><img src="./assets/burger.jpg" alt="Пример оформления фотографии бургера" loading="lazy" decoding="async" width="640" height="480"><figcaption>Фото для примера</figcaption></figure>');
fs.writeFileSync(path.join(root,'index.html'),finalHTML);
console.log(JSON.stringify({categories:menu.length,items:menu.reduce((n,s)=>n+s.items.length,0),output:path.join(root,'index.html')}));
require('./prepare-admin.cjs');
