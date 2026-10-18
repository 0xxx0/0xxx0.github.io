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
const bilingual=(en,zh)=>({en,zh});
const packet={schema:'0xxx0/care-share/v0.1',as_of_label:'Synthetic received date',case:{subject:{label:'Synthetic person'},events:[{id:'latest',at:'2026-01-02',raw_note:'Original synthetic source.',summary:{en:'Current source'}},{id:'earlier',at:'2025-01-01',summary:{en:'Old fact'}}]},presentation:{lead:{en:'Reported situation',zh:'转述情况'},handover:{title:bilingual('Reported decision','转述决定'),status:bilingual('Outcome unknown','结果未知'),stages:[{title:bilingual('Source seen','已见来源'),note:bilingual('Reported only','仅转述'),state:'reported'},{title:bilingual('Proceed','继续'),note:bilingual('Decision reported','转述决定'),state:'current'},{title:bilingual('Outcome','结果'),note:bilingual('Not reported','尚未转述'),state:'pending'}],strands:[{label:bilingual('Context','背景'),value:bilingual('Relevant fact','相关事实'),note:bilingual('Earlier source','早前来源')}],next:[{label:bilingual('Result','结果'),question:bilingual('First?','第一？')},{label:bilingual('Recovery','恢复'),question:bilingual('Second?','第二？')},{label:bilingual('Plan','计划'),question:bilingual('Third?','第三？')}]},background:{en:'Historical context'},unknowns:[{en:'Unknown only'}],questions:[{en:'First?'},{en:'Second?'},{en:'Third?'},{en:'Later?'}],decisions:[],care:[],aside:{setup:{en:'Optional setup'},punchline:{en:'Optional punchline'}}},full_record:'# Full record\n\n**Evidence**\n\n## Findings\n\n| Item | Limit |\n|---|---|\n| Fact | Unknown |\n\n## History\n\nOriginal context.'};
const before=JSON.stringify(packet),view=new Node('shadow');render(view,packet,'synthetic');
assert.equal(view.querySelector('h1').textContent,'Reported decision');
assert.equal(view.querySelectorAll('main').length,1);
assert.equal(view.querySelectorAll('table').length,1);
assert.equal(view.querySelectorAll('pre').length,0);
const buttons=()=>view.querySelectorAll('button'),button=label=>buttons().find(n=>n.textContent===label);
const visible=n=>{for(let p=n.parentNode;p;p=p.parentNode)if((p.tagName==='details'&&!p.open)||(p.className||'').split(' ').includes('print-only'))return false;return true;};
const visibleWords=node=>{if(!visible(node))return '';if(node.tagName==='details'&&!node.open)return node.children[0]?.textContent||'';return node.value+' '+node.children.map(visibleWords).join(' ');};
assert.equal(buttons().filter(visible).length,1,'Only share initially visible');
assert.equal(view.querySelectorAll('select').filter(visible).length,1);
assert.equal(view.querySelectorAll('nav').length,0,'No persistent action bar');
const more=view.querySelector('.more'),next=view.querySelector('.next');assert.equal(more.open,false);assert.equal(next.open,false);
assert.equal(view.querySelector('.course').children.length,3);
assert.deepEqual(view.querySelector('.course').children.map(n=>n.className),['reported','current','pending']);
assert.equal(view.querySelector('.course').children[1].attributes['aria-current'],'step');
assert.ok(view.querySelector('.course').children[2].textContent.includes('Not reported'));
assert.equal(view.querySelector('.prompts').children.length,3);
assert.ok(visibleWords(view).trim().split(/\s+/).length<100,'Compact initial reading budget');
next.open=true;await button('Copy 3 questions').click();assert.equal(copied,'1. First?\n2. Second?\n3. Third?');
await button('Copy handover').click();assert.ok(copied.includes('not a clinician-verified'));assert.ok(copied.includes('Unknown only'));assert.ok(copied.includes('Historical context'));assert.equal(copied.includes('Optional punchline'),false);
await button('Share').click();assert.equal(copied,'https://example.test/care/#brief=synthetic');
let shared;navigator.share=async value=>{shared=value;};await button('Share').click();assert.equal(shared.url,'https://example.test/care/#brief=synthetic');assert.equal('text' in shared,false);delete navigator.share;
more.open=true;const select=view.querySelector('select');select.value='zh';select.onchange();assert.equal(view.querySelector('h1').textContent,'转述决定');assert.equal(view.querySelector('.more').open,true);assert.equal(view.querySelector('.next').open,true);assert.equal(view.querySelector('select').focused,true);
navigator.clipboard.writeText=async()=>{throw Error('Denied');};await button('复制三个问题').click();assert.equal(view.querySelector('textarea').value,'1. 第一？\n2. 第二？\n3. 第三？');
view.querySelector('.next').open=false;let printSawQuestions=false;window.print=()=>{printSawQuestions=view.querySelector('.next').open;};await button('打印交接简报').click();assert.equal(printSawQuestions,true);assert.equal(view.querySelector('.next').open,false);
location.protocol='file:';await button('分享').click();assert.ok(view.querySelector('.toast').textContent.includes('HTML'));
assert.equal(JSON.stringify(packet),before);
console.log('CARE handover: sourced stage states, compact initial view, indexed record, fold/language continuity, copy/share/fallback and print preservation PASS (DOM fixture; no visual proof)');
