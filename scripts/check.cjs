const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m=>m[1]);
for(const ref of refs){
 assert(!ref.startsWith('/'),`Absolute path breaks repository Pages: ${ref}`);
 assert(!/^(?:https?:|file:)/.test(ref),`Unexpected external asset: ${ref}`);
 assert(fs.statSync(path.resolve(root,ref.split('?')[0])).isFile(),`Missing asset: ${ref}`);
}
const dataFile=path.join(root,'assets/menu-data.json'),menu=fs.existsSync(dataFile)?require('../admin/core.js').validate(JSON.parse(fs.readFileSync(dataFile,'utf8'))):null;
const itemCount=menu?menu.sections.flatMap(s=>s.items).filter(p=>p.available).length:68,categoryCount=menu?menu.sections.filter(s=>s.items.some(p=>p.available)).length:10;
assert.equal((html.match(/class="item(?: with-photo)?"/g)||[]).length,itemCount,'Expected all available menu items');
assert.equal((html.match(/class="menu-section"/g)||[]).length,categoryCount,'Expected all available categories');
assert(!html.includes('backend-config.js'),'Public menu must not connect to admin backend');
assert(!/127\.0\.0\.1|C:\\Users|\/preview\//.test(html),'Local-only path in published HTML');
assert(!html.includes('three.module')&&!html.includes('burger-hero.png'),'Unused/old burger asset');
const css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');
for(const [,ref] of css.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g))assert(fs.existsSync(path.resolve(root,'assets',ref)),`Missing CSS resource: ${ref}`);
console.log(`OK: ${itemCount} items, ${categoryCount} categories, ${refs.length} local asset references; relative deployment paths`);
