const http = require('http');
const fs = require('fs');
const path = require('path');
const server = require('./server');
const ROOT = __dirname;
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
server.on('request',(req,res)=>{
  const pathname = new URL(req.url,'http://localhost').pathname;
  const file = pathname==='/' ? 'index.html' : path.basename(pathname);
  if(!['index.html','client.js','style.css'].includes(file)){res.writeHead(404);return res.end('Not found')}
  fs.readFile(path.join(ROOT,file),(err,data)=>{if(err){res.writeHead(500);return res.end('Server error')}res.writeHead(200,{'content-type':mime[path.extname(file)]});res.end(data)});
});
const port=process.env.PORT||3000;
server.listen(port,'0.0.0.0',()=>console.log(`Color Clash listening on ${port}`));
