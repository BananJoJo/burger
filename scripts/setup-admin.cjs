const path=require('node:path'),fs=require('node:fs/promises'),crypto=require('node:crypto');
const {passwordRecord,atomic}=require('../server/auth.cjs');
(async()=>{const dataDir=path.resolve(process.env.MENU_DATA_DIR||path.join(__dirname,'../../.sweet-sushi-private'));
 if(!process.argv.includes('--reset')){try{await fs.access(path.join(dataDir,'auth.json'));console.log('Вход уже настроен. Для замены пароля используйте --reset.');return;}catch{}}
 const seed=require('../admin/seed.json');for(const section of seed.sections)for(const item of section.items)if(/^\/media\/[a-f0-9]{64}\.(?:png|jpg|webp)$/.test(item.photo)){const name=item.photo.split('/').pop(),target=path.join(dataDir,'media',name);try{await fs.access(target);}catch{const source=path.join(__dirname,'../assets/media',name);const bytes=await fs.readFile(source);if(crypto.createHash('sha256').update(bytes).digest('hex')!==name.split('.')[0])throw Error('Повреждена фотография исходного меню.');await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes);}}
 const username=process.env.ADMIN_USERNAME||'admin';if(!/^[a-zA-Z0-9_-]{3,64}$/.test(username))throw Error('Логин: 3–64 латинские буквы, цифры, дефис или подчёркивание.');
 const password=process.env.ADMIN_PASSWORD||crypto.randomBytes(18).toString('base64url');
 await atomic(path.join(dataDir,'auth.json'),await passwordRecord(username,password));
 const accessFile=path.join(dataDir,'Доступ к админке.txt');
 await fs.writeFile(accessFile,`Sweet Sushi — доступ к рабочей админке\n\nЛокальный адрес: http://127.0.0.1:8766/admin/\nЛогин: ${username}\nПароль: ${password}\n\nНе загружайте этот файл или папку данных в GitHub. После размещения сервера поменяйте пароль командой setup-admin.cjs --reset. Секреты хранятся вне github-project.\n`,{mode:0o600});
 console.log('Пароль создан; в консоль не выводится. Данные для входа сохранены в '+accessFile);
})().catch(error=>{console.error(error.message);process.exitCode=1;});
