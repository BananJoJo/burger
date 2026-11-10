const crypto=require('node:crypto'),core=require('../admin/core.js'),renderer=require('../assets/menu-renderer.js');
const idFor=menu=>crypto.createHash('sha256').update(JSON.stringify(core.validate(menu))).digest('hex');
function markers(html){
 if(!html.includes('<!--menu-nav:start-->'))html=html.replace(/(<nav aria-label="Категории меню">)([\s\S]*?)(<\/nav>)/,'$1<!--menu-nav:start-->$2<!--menu-nav:end-->$3');
 if(!html.includes('<!--menu-content:start-->'))html=html.replace(/(<\/aside><div>)([\s\S]*?)(<\/div><\/div><\/main>)/,'$1<!--menu-content:start-->$2<!--menu-content:end-->$3');
 return html;
}
function region(html,name,content){const pattern=new RegExp('<!--'+name+':start-->[\\s\\S]*?<!--'+name+':end-->','g');if((html.match(pattern)||[]).length!==1)throw Error('Шаблон сайта несовместим с публикацией меню. Обновите файлы проекта.');return html.replace(pattern,()=>`<!--${name}:start-->${content}<!--${name}:end-->`);}
function renderStatic(template,input){
 const menu=core.validate(input),id=idFor(menu),rendered=renderer.render(menu,'./assets');
 let html=region(region(markers(template),'menu-nav',rendered.nav),'menu-content',rendered.content||'<p class="note">Сейчас нет доступных блюд. Загляните немного позже.</p>');
 const catalog=/<script id="menu-catalog" type="application\/json">[\s\S]*?<\/script>/g;
 if((html.match(catalog)||[]).length!==1)throw Error('В шаблоне отсутствует каталог корзины.');
 html=html.replace(catalog,()=>'<script id="menu-catalog" type="application/json">'+JSON.stringify(rendered.products).replaceAll('<','\\u003c')+'</script>');
 // A public page must never depend on the admin origin, including cached API bootstraps.
 html=html.replace(/<script\b[^>]*src="\.\/assets\/backend-config\.js[^"<>]*"[^>]*><\/script>/g,'');
 html=html.replace(/(<script\b[^>]*src=")(\.\/assets\/site\.js)[^"<>]*("[^>]*)(>)/g,(_,before,url,attributes,end)=>before+url+'?v='+id+attributes.replace(/\sdata-revision="[^"]*"/,'')+' data-revision="'+id+'"'+end);
 html=html.replace(/<!--sweet-sushi-publication:[a-f0-9]{64}-->/g,'').replace('</head>',`<!--sweet-sushi-publication:${id}--></head>`);
 if(!html.includes('./assets/menu-photos.css'))html=html.replace('</head>','<link rel="stylesheet" href="./assets/menu-photos.css?v='+id+'"></head>');
 if(!html.includes('class="back-to-menu"'))html=html.replace('</body>',require('../scripts/navigation-markup.cjs')+'</body>');
 if(!html.includes('./assets/navigation.css'))html=html.replace('</head>','<link rel="stylesheet" href="./assets/navigation.css?v='+id+'"></head>');
 return {html,id,menu,products:rendered.products};
}
module.exports={renderStatic,markers,idFor};
