import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PORTS,port,rockAt,inspect,fresh,sail,finish,validate,witness,homeward} from './engine.mjs';
// Grid search independently finds navigable strokes; these are not preapproved paths.
function route(a,b){
 const start=port(a), goal=port(b), nodes=[start,goal];
 for(let x=80;x<=3200;x+=20)for(let y=520;y<=940;y+=20)if(!rockAt({x,y}))nodes.push({x,y});
 const cost=new Map([[0,0]]),prev=new Map(),open=new Set([0]);
 while(open.size){let i=[...open].reduce((a,b)=>cost.get(a)<cost.get(b)?a:b);open.delete(i);if(i===1)break;
 for(let j=0;j<nodes.length;j++){const d=Math.hypot(nodes[i].x-nodes[j].x,nodes[i].y-nodes[j].y);if(d>32||!d)continue;
 let clear=true;for(let t=0;t<=1;t+=.1)if(rockAt({x:nodes[i].x+(nodes[j].x-nodes[i].x)*t,y:nodes[i].y+(nodes[j].y-nodes[i].y)*t}))clear=false;
 const n=cost.get(i)+d;if(clear&&n<(cost.get(j)??Infinity)){cost.set(j,n);prev.set(j,i);open.add(j);}}
 }
 assert.ok(prev.has(1),a+' -> '+b);const path=[];for(let i=1;i!==undefined;i=prev.get(i))path.unshift(nodes[i]);return path;
}
const paths={};
test('all four authored branch combinations sail, return, and restore',()=>{
 for(const first of ['bell','willow'])for(const second of ['rain','stone']){
 let s=fresh();for(const to of ['reed',first,'moon',second,'shrine']){const key=s.at+'-'+to;const p=paths[key]??=route(s.at,to);const r=sail(s,p);assert.ok(r.ok,JSON.stringify(r));s=r.state;}
 assert.ok(homeward(s).length);s=finish(s);assert.equal(s.at,'home');assert.deepEqual(validate(s),s);assert.deepEqual(validate(witness(s)),s);
 }
});
test('malformed, tampered and impossible voyages rejected',()=>{
 assert.throws(()=>validate({}));assert.throws(()=>validate({...fresh(),complete:true}));
 assert.equal(inspect([{x:160,y:780},{x:1e100,y:780}],'home').ok,false);
 assert.equal(inspect([{x:160,y:780},{x:680,y:660}],'home').kind,'rock');
 assert.equal(inspect([{x:160,y:780},{x:680,y:660}],'unknown').ok,false);
 const p=route('home','reed');const s=sail(fresh(),p).state;assert.throws(()=>validate({...s,legs:[{...s.legs[0],to:'moon'}]}));
});
