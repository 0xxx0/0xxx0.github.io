const fs=require('node:fs');
const vm=require('node:vm');

const html=fs.readFileSync('docs/index.html','utf8');
const re=/<script([^>]*)>([\s\S]*?)<\/script>/gi;
let m,i=0,classic=0;
while((m=re.exec(html))){
  const attrs=m[1]||'',body=m[2]||'';
  if(!body.trim()||/type\s*=\s*["']module["']/i.test(attrs)){i++;continue}
  classic++;
  new vm.Script(body,{filename:'docs/index.inline-'+i+'.js'});
  i++;
}
if(!classic)throw new Error('no classic inline READFIELD script found');
console.log(JSON.stringify({ok:true,classicScripts:classic}));
