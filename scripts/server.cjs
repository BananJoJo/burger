const path=require('node:path'),{createApp}=require('../server/app.cjs');
const port=Number(process.env.PORT||8766),host=process.env.HOST||'127.0.0.1';
const {server}=createApp({dataDir:path.resolve(process.env.MENU_DATA_DIR||path.join(__dirname,'../../.sweet-sushi-private')),publicOrigin:process.env.PUBLIC_SITE_ORIGIN||'https://bananjojo.github.io',publisherOptions:{mode:process.env.MENU_PUBLISH_MODE||(process.env.NODE_ENV==='production'?'github':'local'),repository:process.env.GITHUB_REPOSITORY||'BananJoJo/burger',branch:process.env.GITHUB_BRANCH||'main',token:process.env.MENU_GITHUB_TOKEN||''}});
server.listen(port,host,()=>console.log(`Sweet Sushi: http://${host}:${port}/ | Admin: /admin/`));
