const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const esc=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));

export const SOURCE_SPINE_SCHEMA='field-source-spine/v0.1';

export class FieldSourceSpine extends HTMLElement{
  constructor(){
    super();this.attachShadow({mode:'open'});this.S={progress:0,projectionProgress:null,marks:[],label:'SOURCE',scope:'—',address:'—'};this.fadeTimer=null;this.drag=false;
  }
  connectedCallback(){this.render();this.addEventListener('pointerenter',()=>this.wake());this.addEventListener('pointerleave',()=>this.quietSoon())}
  setState(next={}){
    this.S={...this.S,...next,progress:clamp(Number(next.progress??this.S.progress)||0,0,1),projectionProgress:next.projectionProgress==null?this.S.projectionProgress:clamp(Number(next.projectionProgress)||0,0,1),marks:Array.isArray(next.marks)?next.marks:this.S.marks};
    this.paint();this.wake();return this.S;
  }
  wake(){this.classList.add('awake');clearTimeout(this.fadeTimer);this.fadeTimer=setTimeout(()=>this.classList.remove('awake'),1700)}
  quietSoon(){clearTimeout(this.fadeTimer);this.fadeTimer=setTimeout(()=>this.classList.remove('awake'),650)}
  render(){
    this.shadowRoot.innerHTML='<style>:host{--spine-hot:#ffb347;--spine-cool:#6dbdff;--spine-line:rgba(255,255,255,.17);position:fixed;z-index:26;left:12px;right:12px;bottom:var(--source-spine-bottom,12px);height:48px;display:block;opacity:.28;transition:opacity .28s ease,transform .28s ease;transform:translateY(5px);pointer-events:none;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#dce8ef}:host(.awake),:host(:hover),:host(:focus-within){opacity:.94;transform:none}.wrap{height:100%;display:grid;grid-template-rows:auto 16px auto;gap:2px;background:linear-gradient(180deg,rgba(4,8,12,.08),rgba(4,8,12,.62));padding:3px 7px;pointer-events:auto}.meta{display:flex;justify-content:space-between;gap:12px;font-size:7px;letter-spacing:.11em;color:#8c9ba7;white-space:nowrap}.meta b{color:#dce8ef;max-width:55%;overflow:hidden;text-overflow:ellipsis}.meta .right{overflow:hidden;text-overflow:ellipsis}.track{position:relative;height:16px;cursor:crosshair;touch-action:none}.base{position:absolute;left:0;right:0;top:7px;height:1px;background:var(--spine-line)}.fill{position:absolute;left:0;top:6px;height:3px;background:linear-gradient(90deg,var(--spine-cool),var(--spine-hot));opacity:.55}.head{position:absolute;top:1px;width:2px;height:13px;background:#fff;box-shadow:0 0 8px rgba(255,255,255,.42)}.head.proj{background:var(--spine-cool);height:8px;top:5px;opacity:.9}.mark{position:absolute;top:4px;width:1px;height:7px;background:rgba(255,255,255,.32)}.mark.PIN,.mark.MARK{height:11px;top:2px;background:var(--spine-hot)}.mark.SECTION{height:12px;top:2px;background:var(--spine-cool)}.mark.ANCHOR{height:13px;top:1px;background:#e6a7ff}.mark:hover{width:3px}.layers{display:flex;justify-content:space-between;gap:8px;font-size:6px;letter-spacing:.13em;color:#61717c}.layers .scope{color:#a9b8c2}@media(max-width:700px){:host{left:7px;right:7px}.meta{font-size:6px}.wrap{padding-left:5px;padding-right:5px}}</style><div class="wrap"><div class="meta"><b id="label">SOURCE</b><span class="right"><span id="address">—</span> · <span id="status">—</span></span></div><div class="track" id="track"><i class="base"></i><i class="fill" id="fill"></i><i class="head" id="head"></i><i class="head proj" id="proj"></i><div id="marks"></div></div><div class="layers"><span id="layers">SOURCE ADDRESS</span><span class="scope" id="scope">—</span></div></div>';
    const tr=this.shadowRoot.querySelector('#track');
    const seek=e=>{const r=tr.getBoundingClientRect(),p=clamp((e.clientX-r.left)/Math.max(1,r.width),0,1);this.dispatchEvent(new CustomEvent('source-spine-seek',{bubbles:true,composed:true,detail:{fraction:p}}));this.wake()};
    tr.onpointerdown=e=>{this.drag=true;tr.setPointerCapture?.(e.pointerId);seek(e)};
    tr.onpointermove=e=>{if(this.drag)seek(e)};
    tr.onpointerup=tr.onpointercancel=()=>{this.drag=false};
    this.paint();
  }
  paint(){
    if(!this.shadowRoot)return;const s=this.S,p=clamp(Number(s.progress)||0,0,1),pp=s.projectionProgress==null?p:clamp(Number(s.projectionProgress)||0,0,1);
    this.shadowRoot.querySelector('#label').textContent=s.label||'SOURCE';
    this.shadowRoot.querySelector('#address').textContent=s.address||'—';
    this.shadowRoot.querySelector('#status').textContent=s.status||'—';
    this.shadowRoot.querySelector('#scope').textContent=s.scope||'—';
    this.shadowRoot.querySelector('#layers').textContent=s.layers||'SOURCE ADDRESS';
    this.shadowRoot.querySelector('#fill').style.width=(p*100).toFixed(3)+'%';
    this.shadowRoot.querySelector('#head').style.left='calc('+(p*100).toFixed(3)+'% - 1px)';
    const proj=this.shadowRoot.querySelector('#proj');proj.style.left='calc('+(pp*100).toFixed(3)+'% - 1px)';proj.hidden=Math.abs(pp-p)<.003;
    const marks=(Array.isArray(s.marks)?s.marks:[]).slice(0,160);
    this.shadowRoot.querySelector('#marks').innerHTML=marks.map(m=>'<i class="mark '+esc(String(m.kind||'MARK').toUpperCase())+'" data-id="'+esc(m.id||'')+'" title="'+esc(m.label||m.kind||'mark')+'" style="left:'+(clamp(Number(m.p)||0,0,1)*100).toFixed(3)+'%"></i>').join('');
    this.shadowRoot.querySelectorAll('.mark').forEach(el=>el.onclick=e=>{e.stopPropagation();const m=marks.find(x=>String(x.id||'')===el.dataset.id);this.dispatchEvent(new CustomEvent('source-spine-mark',{bubbles:true,composed:true,detail:{mark:m||null}}));this.wake()});
  }
}
if(!customElements.get('field-source-spine'))customElements.define('field-source-spine',FieldSourceSpine);
