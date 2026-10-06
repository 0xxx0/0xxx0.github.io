(function(root){
  'use strict';
  function esc(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function short(id){return id?String(id).replace(/^chg:/,'').slice(0,10):'SOURCE'}
  function bind(ctx){
    if(!ctx||!ctx.store||!ctx.effect||document.getElementById('continuityProof'))return;
    const host=document.querySelector('.boundary');if(!host)return;
    const section=document.createElement('section');section.id='continuityProof';section.className='continuityProof';
    section.innerHTML=`<style>
      .continuityProof{padding:0 0 26px}.continuityGrid{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--line);background:var(--bg)}.continuityCell{padding:14px;min-width:0}.continuityCell+ .continuityCell{border-left:1px solid var(--line)}.continuityCell h2{margin:0 0 9px;font-size:10px;letter-spacing:.2em}.continuityCell p{margin:5px 0;color:var(--mut);font-size:10px}.continuityCell code{color:var(--cool);font:9px var(--mono);overflow-wrap:anywhere}.continuityMeta{display:flex;gap:5px;flex-wrap:wrap;margin:9px 0}.continuityTag{border:1px solid var(--line);padding:4px 6px;color:var(--mut);font-size:8px;letter-spacing:.08em}.continuityTag.good{color:var(--green)}.headList{display:flex;gap:5px;flex-wrap:wrap;margin:8px 0}.headList button{border:1px solid var(--line);background:#080b0d;padding:5px 7px;color:var(--cool);font-size:8px}.headList button.sel{border-color:var(--hot);color:var(--hot)}@media(max-width:700px){.continuityGrid{grid-template-columns:1fr}.continuityCell+ .continuityCell{border-left:0;border-top:1px solid var(--line)}}
    </style><div class="eyebrow">continuity substrate · real FIELD specimen</div><div class="continuityGrid"><div class="continuityCell"><h2>CHANGE DAG</h2><div id="dagProof"></div><div class="headList" id="dagHeads"></div><div class="actions"><button class="btn" id="checkoutSource" type="button">CHECKOUT SOURCE</button></div><p>Checkout does not delete a head. Edit from an older point and the document branches. <strong>Merge is not claimed.</strong></p></div><div class="continuityCell"><h2>EFFECT / COMPENSATION</h2><div id="effectProof"></div><div class="actions"><button class="btn hot" id="effectCommit" type="button">MARK FIELD SEEN</button><button class="btn" id="effectCompensate" type="button">COMPENSATE</button></div><p><strong>RETURN</strong> appends canonical semantic history only. <strong>COMPENSATE</strong> restores FIELD's browser-local orientation key exactly.</p></div></div>`;
    host.parentNode.insertBefore(section,host);
    const dagProof=section.querySelector('#dagProof'),dagHeads=section.querySelector('#dagHeads'),effectProof=section.querySelector('#effectProof');
    function rerenderMain(){if(typeof root.__interphaseRender==='function')root.__interphaseRender()}
    function renderDag(){
      const s=ctx.store.snapshot();
      dagProof.innerHTML=`<p>OBJECT <code>${esc(s.source.id)}</code></p><div class="continuityMeta"><span class="continuityTag good">PERSIST ${s.persisted?'LOCAL':'MEMORY'}</span><span class="continuityTag">CHANGES ${s.history.length}</span><span class="continuityTag">HEADS ${s.heads.length}</span><span class="continuityTag">SELECTED ${esc(short(s.selected_head))}</span></div><p>BASE <code>${esc(s.base_fingerprint)}</code></p>`;
      dagHeads.innerHTML=s.heads.length?s.heads.map(h=>`<button type="button" data-head="${esc(h)}" class="${h===s.selected_head?'sel':''}">h:${esc(short(h))}</button>`).join(''):'<span class="micro">no changes · SOURCE is the only point</span>';
    }
    function renderEffect(){
      const s=ctx.effect.snapshot(),i=s.inspection;
      effectProof.innerHTML=`<p>STATE <code>${esc(s.state)}</code></p><div class="continuityMeta"><span class="continuityTag">KEY ${esc(i.key)}</span><span class="continuityTag">ROUTE ${esc(i.href)}</span><span class="continuityTag ${i.stamp?'good':''}">${i.stamp?'STAMP '+esc(i.stamp):'UNSEEN'}</span></div><p>Browser effect is external to the canonical INTERPHASE DAG.</p>`;
    }
    section.querySelector('#checkoutSource').addEventListener('click',()=>{ctx.store.checkout(null);rerenderMain();renderDag()});
    dagHeads.addEventListener('click',e=>{const b=e.target.closest('[data-head]');if(!b)return;ctx.store.checkout(b.dataset.head);rerenderMain();renderDag()});
    section.querySelector('#effectCommit').addEventListener('click',()=>{ctx.effect.commit({cause:'INTERPHASE_WORKBENCH'});renderEffect()});
    section.querySelector('#effectCompensate').addEventListener('click',()=>{ctx.effect.compensate({cause:'INTERPHASE_WORKBENCH'});renderEffect()});
    ctx.store.subscribe(()=>{renderDag();renderEffect()});renderDag();renderEffect();
  }
  root.addEventListener&&root.addEventListener('interphase:ready',e=>bind(e.detail||root.__interphaseContinuity));
  if(root.__interphaseContinuity&&typeof document!=='undefined')bind(root.__interphaseContinuity);
  root.InterphaseContinuityUI=Object.freeze({bind});
})(typeof globalThis!=='undefined'?globalThis:this);
