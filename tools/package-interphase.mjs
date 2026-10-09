// Optional local package transport. No manifest/build/dependencies in the browser.
import {mkdtempSync, readFileSync, mkdirSync, writeFileSync, copyFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve, dirname, relative, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const destination=resolve(process.argv[2]||join(tmpdir(),'interphase-package'));
const stage=mkdtempSync(join(tmpdir(),'interphase-pack-')),seen=new Set();
function include(path){
  const absolute=resolve(root,path),name=relative(root,absolute);
  if(name.startsWith('..'))throw Error('dependency outside source repository');
  if(seen.has(name))return;seen.add(name);
  const target=join(stage,name);mkdirSync(dirname(target),{recursive:true});copyFileSync(absolute,target);
  if(/\.(?:mjs|js)$/.test(name)){
    const text=readFileSync(absolute,'utf8');
    const re=/(?:import\s*(?:[^'";]*?\sfrom\s*)?['"]|require\(['"])(\.[^'"]+)['"]/g;
    for(const m of text.matchAll(re))include(relative(root,resolve(dirname(absolute),m[1])));
  }
}
try{
  include('lib/interphase.mjs');include('lib/interphase.d.mts');include('interphase/extensions/vector.mjs');
  writeFileSync(join(stage,'package.json'),JSON.stringify({name:'@0xxx0/interphase',version:'0.1.0',private:true,description:'One source: addressed objects, lawful projections, contracts and explicit extensions',engines:{node:'>=22'},exports:{'.':{types:'./lib/interphase.d.mts',default:'./lib/interphase.mjs'},'./extensions':'./lib/interphase-extensions.mjs','./vector':'./interphase/extensions/vector.mjs'},files:[...seen]},null,2));
  mkdirSync(destination,{recursive:true});
  const result=JSON.parse(execFileSync('npm',['pack','--json','--ignore-scripts','--pack-destination',destination],{cwd:stage,encoding:'utf8'}));
  console.log(JSON.stringify({file:join(destination,result[0].filename),sourceFiles:seen.size,bytes:result[0].size},null,2));
}finally{rmSync(stage,{recursive:true,force:true});}
