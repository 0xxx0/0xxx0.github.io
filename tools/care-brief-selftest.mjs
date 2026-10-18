import assert from 'node:assert/strict';
import { appendMarkdown } from '../care/brief-markdown.mjs';

// A bounded DOM fixture for text structure and interaction checks; not visual QA.
export class Node {
  constructor(tag='#text', value='') { this.tagName=tag; this.value=value; this.children=[]; this.dataset={}; this.attributes={}; this.style={}; }
  set textContent(value) { this.value=String(value); this.children=[]; }
  get textContent() { return this.value+this.children.map(n=>n.textContent).join(''); }
  append(...nodes) { for(const node of nodes){node.parentNode=this;this.children.push(node);} }
  replaceChildren(...nodes) { this.value='';this.children=[];this.append(...nodes); }
  remove() { const p=this.parentNode;if(p)p.children=p.children.filter(n=>n!==this); }
  setAttribute(key,value) { this.attributes[key]=String(value); }
  focus() { this.focused=true; }
  select() { this.selected=true; }
  scrollIntoView() { this.scrolled=true; }
  click() { return this.onclick?.(); }
  attachShadow() { this.shadowRoot=new Node('shadow');return this.shadowRoot; }
  querySelector(selector) { return this.querySelectorAll(selector)[0]||null; }
  querySelectorAll(selector) {
    const matches=n=>selector.startsWith('.') ? (n.className||'').split(' ').includes(selector.slice(1)) : n.tagName===selector;
    return this.children.flatMap(n=>[...(matches(n)?[n]:[]),...n.querySelectorAll(selector)]);
  }
}
export function fixtureDocument(){return {createElement:tag=>new Node(tag),createTextNode:value=>new Node('#text',value),documentElement:{dataset:{careShare:'0'}},body:new Node('body')};}
const doc=fixtureDocument(),root=new Node('article');
appendMarkdown(root,'# Record\n\n**Reported** with [source](https://example.test/a).\n\n| Date | Finding | Limit |\n|---|---|---|\n| Today | A \\| B | Unknown |\n\n1. Ask once\n2. Ask twice\n\n<img src=x onerror=alert(1)>\n\n[bad](javascript:alert(1))\n\n`literal`',doc);
assert.equal(root.querySelector('h2').textContent,'Record');
assert.equal(root.querySelector('strong').textContent,'Reported');
assert.equal(root.querySelectorAll('table').length,1);
assert.deepEqual(root.querySelectorAll('td').map(n=>n.dataset.label),['Date','Finding','Limit']);
assert.equal(root.querySelectorAll('td')[1].textContent,'A | B');
assert.equal(root.querySelector('ol').children.length,2);
assert.equal(root.querySelectorAll('img').length,0);
assert.ok(root.textContent.includes('<img src=x onerror=alert(1)>'));
assert.equal(root.querySelectorAll('a').length,1);
assert.equal(root.querySelector('a').referrerPolicy,'no-referrer');
assert.equal(root.querySelector('code').textContent,'literal');
let copied='';globalThis.document=doc;
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{language:'en',clipboard:{writeText:async value=>{copied=value;}}}});
globalThis.location={href:'https://example.test/care/?v=old#brief=synthetic',protocol:'https:'};globalThis.window={print:()=>{}};
const {render}=await import('../care/brief-view.mjs');
const packet={schema:'0xxx0/care-share/v0.1',as_of_label:'Synthetic date',case:{subject:{label:'Synthetic person'},events:[{at:'2025-01-01',summary:{en:'Old fact'}}]},presentation:{lead:{en:'Reported situation',zh:'转述情况'},status:[{en:'Reported only'}],background:{en:'Historical context'},unknowns:[{en:'Unknown only'}],priorities:[{en:'First?',zh:'第一？'},{en:'Second?',zh:'第二？'},{en:'Third?',zh:'第三？'}],questions:[{en:'First?'},{en:'Second?'},{en:'Third?'},{en:'Later?'}],decisions:[],care:[],aside:{setup:{en:'Optional setup'},punchline:{en:'Optional punchline'}}},full_record:'# Full record\n\n**Evidence**\n\n| Item | Limit |\n|---|---|\n| Fact | Unknown |'};
const before=JSON.stringify(packet),view=new Node('shadow');render(view,packet,'synthetic');
assert.equal(view.querySelector('h1').textContent,'Care update');
assert.equal(view.querySelectorAll('main').length,1);
assert.equal(view.querySelectorAll('table').length,1);
assert.equal(view.querySelectorAll('pre').length,0);
const buttons=()=>view.querySelectorAll('button'),button=label=>buttons().find(n=>n.textContent===label);
const visible=n=>{for(let p=n.parentNode;p;p=p.parentNode)if(p.tagName==='details'&&!p.open)return false;return true;};
assert.equal(buttons().filter(visible).length,2,'Only share and copy questions initially visible');
assert.equal(view.querySelectorAll('select').filter(visible).length,1);
assert.equal(view.querySelectorAll('nav').length,0,'No persistent action bar');
assert.equal(view.querySelector('.more').open,undefined);
assert.equal(view.querySelector('ol').children.length,3);
await button('Copy these questions').click();assert.equal(copied,'1. First?\n2. Second?\n3. Third?');
await button('Copy handover').click();assert.ok(copied.includes('Family reports and AI-prepared'));assert.ok(copied.includes('Unknown only'));assert.ok(copied.includes('Historical context'));assert.equal(copied.includes('Optional punchline'),false);
await button('Share brief').click();assert.equal(copied,'https://example.test/care/#brief=synthetic');
let shared; navigator.share=async value=>{shared=value;};await button('Share brief').click();assert.equal(shared.url,'https://example.test/care/#brief=synthetic');assert.equal('text' in shared,false,'No medical text in generic link share');delete navigator.share;
const select=view.querySelector('select');select.value='zh';select.onchange();assert.equal(view.querySelector('h1').textContent,'照护近况');assert.equal(view.querySelectorAll('main').length,1);assert.equal(view.querySelector('select').focused,true);
navigator.clipboard.writeText=async()=>{throw Error('Denied');};await button('复制这三个问题').click();assert.equal(view.querySelector('textarea').value,'1. 第一？\n2. 第二？\n3. 第三？');
location.protocol='file:';await button('分享简报').click();assert.ok(view.querySelector('.toast').textContent.includes('HTML'));
assert.equal(JSON.stringify(packet),before);
console.log('CARE brief: safe Markdown, labelled tables, 3 initial controls, no action bar, priority/full-question distinction, canonical share, native share, copy fallback, language and unchanged case PASS (DOM fixture; no visual proof)');
