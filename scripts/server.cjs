const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const port=Number(process.env.PORT||8766);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
http.createServer((req,res)=>{
 let url;
 try{url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end('Bad request');return;}
 if(url!=='/'&&url!=='/index.html'&&!url.startsWith('/assets/')){res.writeHead(404).end('Not found');return;}
 const file=path.resolve(root,'.'+(url==='/'?'/index.html':url));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end('Forbidden');return;}
 fs.readFile(file,(error,data)=>{
  if(error){res.writeHead(404).end('Not found');return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
  res.end(data);
 });
}).listen(port,'127.0.0.1',()=>console.log(`Open http://127.0.0.1:${port}/ — Ctrl+C to stop`));
