(()=>{'use strict';
const api=globalThis.FieldIntakePublicRelease;
if(!api)return;

const STYLE=`
.fi-release{border-color:#8265b8!important;color:#6b4ba5!important}
.fi-release-dialog{width:min(760px,calc(100vw - 24px));max-height:calc(100vh - 24px);border:1px solid #2d2b31;background:#f3efe4;color:#181817;padding:0;box-shadow:0 20px 70px #0008}
.fi-release-dialog::backdrop{background:#161616a8}
.fi-release-dialog .fi-r-head{padding:12px 14px;border-bottom:1px solid #c7c0b0;display:flex;justify-content:space-between;gap:12px;align-items:start}
.fi-release-dialog .fi-r-head b{font-size:12px;letter-spacing:.08em}.fi-release-dialog .fi-r-head small{display:block;margin-top:4px;max-width:62ch;color:#635d54;line-height:1.35}
.fi-release-dialog .fi-r-body{padding:12px 14px}.fi-release-dialog textarea{display:block;width:100%;min-height:280px;max-height:55vh;resize:vertical;border:1px solid #aaa190;background:#fbf8ef;color:#181817;padding:10px;font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.fi-release-dialog .fi-r-law{margin:0 0 10px;padding:8px 10px;border-left:3px solid #8265b8;background:#e9e2d3;font:10px/1.4 system-ui,sans-serif}.fi-release-dialog .fi-r-actions{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap;margin-top:10px}.fi-release-dialog button{padding:7px 9px}.fi-release-dialog .fi-r-open{border-color:#8265b8;color:#56358e;font-weight:700}
`;
const style=document.createElement('style');style.textContent=STYLE;document.head.appendChild(style);

let dialog=null;
function ensureDialog(){
  if(dialog)return dialog;
  dialog=document.createElement('dialog');
  dialog.className='fi-release-dialog';
  dialog.innerHTML=`<div class="fi-r-head"><div><b>PUBLIC RELEASE / REVIEW</b><small>Reduced projection only. Raw capture, notes, parser evidence and undeclared canonical fields are excluded by default. Remaining text still needs public-safety review.</small></div><button data-fi-close aria-label="Close public release review">×</button></div><div class="fi-r-body"><p class="fi-r-law"><b>PUBLIC BOUNDARY.</b> Nothing leaves this browser when this review opens. COPY stays local. OPEN GITHUB DRAFT sends the edited packet to GitHub in the draft URL; GitHub submission remains a separate explicit act.</p><textarea spellcheck="false" aria-label="Public release packet"></textarea><div class="fi-r-actions"><button data-fi-copy>COPY PACKET</button><button class="fi-r-open" data-fi-open>OPEN GITHUB DRAFT</button><button data-fi-close>CLOSE</button></div></div>`;
  document.body.appendChild(dialog);
  dialog.querySelectorAll('[data-fi-close]').forEach(b=>b.onclick=()=>dialog.close());
  dialog.querySelector('[data-fi-copy]').onclick=async()=>{
    const text=dialog.querySelector('textarea').value;
    try{
      await navigator.clipboard.writeText(text);
      setNotice('Public-release packet copied. No external effect.','ok');
    }catch(_){setNotice('Could not copy packet. Select the review text manually.','error')}
  };
  dialog.querySelector('[data-fi-open]').onclick=()=>{
    const area=dialog.querySelector('textarea');
    let value;
    try{value=JSON.parse(area.value)}catch(_){setNotice('Public-release packet is not valid JSON.','error');return}
    try{
      const draft=api.issueDraft(value);
      window.open(draft.url,'_blank','noopener,noreferrer');
      setNotice('GitHub draft opened. No issue exists until you submit it.','warn');
    }catch(error){setNotice(error instanceof Error?error.message:'Could not build GitHub draft.','error')}
  };
  return dialog;
}

function openRelease(id){
  const record=allRecords(state).find(item=>item.id===id);
  if(!record){setNotice('Canonical record not found.','error');return}
  const value=api.packet(record);
  const d=ensureDialog();
  d.querySelector('textarea').value=JSON.stringify(value,null,2);
  d.showModal();
}

function inject(){
  document.querySelectorAll('.ledger-record').forEach(card=>{
    if(card.querySelector('[data-fi-release]'))return;
    const source=card.querySelector('[data-copy-id]');
    const actions=card.querySelector('.ledger-actions');
    const id=source?.dataset.copyId;
    if(!id||!actions)return;
    const button=document.createElement('button');
    button.type='button';
    button.className='fi-release';
    button.dataset.fiRelease=id;
    button.textContent='PUBLIC RELEASE';
    button.onclick=()=>openRelease(id);
    actions.appendChild(button);
  });
}

inject();
const root=document.querySelector('#app');
if(root)new MutationObserver(inject).observe(root,{childList:true,subtree:true});
})();
