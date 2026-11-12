// Local donor preview only. The template is deliberately not a published route.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
const files=new Map([['/','specimen.html.in'],['/index.html','specimen.html.in'],
  ...['core.mjs','recognition.mjs','recognition-ui.mjs'].map(x=>['/'+x,x])]);
const server=http.createServer(async(req,res)=>{
  const file=files.get(new URL(req.url,'http://localhost').pathname);
  if(!file||req.method!=='GET'){res.writeHead(404);res.end('Not found');return}
  try{const text=await readFile(new URL(file,import.meta.url));res.writeHead(200,{'content-type':file.endsWith('.mjs')?'text/javascript':'text/html; charset=utf-8','cache-control':'no-store'});res.end(text)}
  catch{res.writeHead(500);res.end('Preview source unavailable')}
});
server.listen(Number(process.env.LAB_TYPE_PORT)||8766,'127.0.0.1',()=>console.log(`LAB/TYPE donor preview: http://127.0.0.1:${server.address().port}/`));
