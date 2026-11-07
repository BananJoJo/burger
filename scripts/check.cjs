const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m=>m[1]);
for(const ref of refs){
 assert(!ref.startsWith('/'),`Absolute path breaks repository Pages: ${ref}`);
 assert(!/^(?:https?:|file:)/.test(ref),`Unexpected external asset: ${ref}`);
 assert(fs.statSync(path.resolve(root,ref.split('?')[0])).isFile(),`Missing asset: ${ref}`);
}
assert.equal((html.match(/class="item"/g)||[]).length,68,'Expected all 68 menu items');
assert.equal((html.match(/class="menu-section"/g)||[]).length,10,'Expected all 10 categories');
assert(!/127\.0\.0\.1|C:\\Users|\/preview\//.test(html),'Local-only path in published HTML');
assert(!html.includes('three.module')&&!html.includes('burger-hero.png'),'Unused/old burger asset');
const css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');
for(const [,ref] of css.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g))assert(fs.existsSync(path.resolve(root,'assets',ref)),`Missing CSS resource: ${ref}`);
console.log(`OK: 68 items, 10 categories, ${refs.length} local asset references; relative deployment paths`);
