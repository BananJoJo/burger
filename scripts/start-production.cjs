const path=require('node:path'),fs=require('node:fs'),{spawnSync}=require('node:child_process');
process.env.NODE_ENV='production';
process.env.HOST=process.env.HOST||'0.0.0.0';
const dir=path.resolve(process.env.MENU_DATA_DIR||path.join(__dirname,'../../.sweet-sushi-private'));
if(!fs.existsSync(path.join(dir,'auth.json'))){
 if(!process.env.ADMIN_PASSWORD){console.error('Для первого запуска задайте секрет ADMIN_PASSWORD (не менее 12 символов) в настройках хостинга.');process.exit(1);}
 const result=spawnSync(process.execPath,[path.join(__dirname,'setup-admin.cjs')],{stdio:'inherit',env:process.env});
 if(result.status!==0)process.exit(result.status||1);
}
delete process.env.ADMIN_PASSWORD;
delete process.env.ADMIN_USERNAME;
require('./server.cjs');
