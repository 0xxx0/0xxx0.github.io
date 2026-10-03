import {
  prepareEmailCandidate,authorizeTransport,buildMailtoHref,providerReceiptTemplate,verifyProviderReceipt
} from './transport.js';

const $=s=>document.querySelector(s);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let release=null,verified=null;

async function copy(text){
  await navigator.clipboard.writeText(String(text));
}
function readJsonFile(file){return file.text().then(JSON.parse)}
function status(text,kind=''){
  const el=$('#transportStatus');if(!el)return;
  el.textContent=text;el.dataset.kind=kind;
}
function setReady(yes){
  ['#transportMail','#transportReceiptTemplate','#transportReceiptBtn'].forEach(sel=>{const el=$(sel);if(el)el.disabled=!yes});
}
function mount(){
  const host=$('.replyActions');
  if(!host||!window.CommsSpine||$('#transportBtn'))return false;
  const trigger=document.createElement('button');
  trigger.id='transportBtn';trigger.textContent='RELEASE EMAIL →';trigger.title='Explicit human release boundary; this page never silently sends.';
  host.append(trigger);

  const panel=document.createElement('section');
  panel.id='transportPanel';panel.className='returnOffer';panel.hidden=true;
  panel.innerHTML=`
    <div style="min-width:min(100%,360px)">
      <b>COMMS TRANSPORT / ONE EXACT MESSAGE</b>
      <span id="transportStatus">NO RELEASE · candidate ≠ send</span>
      <div style="display:grid;grid-template-columns:minmax(0,1fr);gap:5px;margin-top:8px">
        <input id="transportTo" type="email" autocomplete="email" placeholder="email destination" aria-label="Email recipient" style="width:100%;background:#0b1114;border:1px solid #2a353a;padding:8px">
        <input id="transportSubject" maxlength="180" placeholder="subject (optional)" aria-label="Email subject" style="width:100%;background:#0b1114;border:1px solid #2a353a;padding:8px">
      </div>
    </div>
    <div class="returnOfferActions">
      <button id="transportAuthorize" class="primary">AUTHORIZE + COPY PACKET</button>
      <button id="transportMail" disabled>OPEN MAIL CLIENT</button>
      <button id="transportReceiptTemplate" disabled>COPY RECEIPT TEMPLATE</button>
      <button id="transportReceiptBtn" disabled>IMPORT PROVIDER RECEIPT</button>
      <input id="transportReceiptFile" type="file" accept="application/json,.json" hidden>
      <button id="transportReturn" disabled>COPY VERIFIED RETURN</button>
      <button id="transportClose">CLOSE</button>
    </div>`;
  host.insertAdjacentElement('afterend',panel);

  trigger.onclick=()=>{panel.hidden=!panel.hidden;if(!panel.hidden)$('#transportTo')?.focus()};
  const launch=new URLSearchParams(location.search);
  if(launch.get('transport')==='1'){
    panel.hidden=false;
    document.documentElement.dataset.commsTransportLaunch='field';
    queueMicrotask(()=>$('#transportTo')?.focus());
  }
  $('#transportClose').onclick=()=>{panel.hidden=true};
  $('#transportAuthorize').onclick=async()=>{
    try{
      const commsReturn=window.CommsSpine.returnObject();
      if(!commsReturn)throw new TypeError('load a source first');
      const candidate=await prepareEmailCandidate({
        commsReturn,
        to:$('#transportTo').value,
        subject:$('#transportSubject').value,
        provider:'gmail'
      });
      release=await authorizeTransport(candidate,{operatorGesture:true});
      verified=null;$('#transportReturn').disabled=true;setReady(true);
      status('HUMAN RELEASE · packet ready · NOT YET SENT','released');
      document.documentElement.dataset.commsTransportState='released';
      try{
        await copy(JSON.stringify(release,null,2));
        status('HUMAN RELEASE · packet copied · NOT YET SENT','released');
      }catch(_){
        status('HUMAN RELEASE · COPY BLOCKED · NOT YET SENT','released');
      }
    }catch(error){
      release=null;verified=null;setReady(false);$('#transportReturn').disabled=true;
      status('BLOCKED · '+String(error?.message||error).slice(0,120),'error');
      document.documentElement.dataset.commsTransportState='blocked';
    }
  };
  $('#transportMail').onclick=()=>{
    if(!release)return;
    location.href=buildMailtoHref(release);
    status('EXTERNAL MAIL CLIENT OPENED · SEND UNVERIFIED','external');
    document.documentElement.dataset.commsTransportState='external-unverified';
  };
  $('#transportReceiptTemplate').onclick=async()=>{
    if(!release)return;
    try{await copy(JSON.stringify(providerReceiptTemplate(release),null,2));status('RECEIPT TEMPLATE COPIED · provider must fill message id + sent_at','template')}
    catch(error){status('COPY BLOCKED · release remains valid · '+String(error?.message||error).slice(0,90),'error')}
  };
  $('#transportReceiptBtn').onclick=()=>$('#transportReceiptFile').click();
  $('#transportReceiptFile').onchange=async e=>{
    const file=e.target.files?.[0];e.target.value='';if(!file||!release)return;
    try{
      verified=await verifyProviderReceipt(release,await readJsonFile(file));
      $('#transportReturn').disabled=false;
      status('SENT CONFIRMED · '+verified.receipt.provider+' · '+verified.receipt.provider_message_id,'verified');
      document.documentElement.dataset.commsTransportState='sent-confirmed';
      window.dispatchEvent(new CustomEvent('comms:transport-return',{detail:verified}));
    }catch(error){
      verified=null;$('#transportReturn').disabled=true;
      status('RECEIPT REJECTED · '+String(error?.message||error).slice(0,120),'error');
      document.documentElement.dataset.commsTransportState='receipt-rejected';
    }
  };
  $('#transportReturn').onclick=async()=>{
    if(!verified)return;
    try{await copy(JSON.stringify(verified,null,2));status('VERIFIED TRANSPORT RETURN COPIED · native COMMS still decides signal state','verified')}
    catch(_){status('COPY BLOCKED · verified RETURN remains in this session','error')}
  };

  document.documentElement.dataset.commsTransport='ready';
  window.CommsTransport={
    state:()=>({release,verified}),
    prepareCandidate:async({to,subject='',provider='gmail'}={})=>prepareEmailCandidate({commsReturn:window.CommsSpine.returnObject(),to,subject,provider})
  };
  return true;
}

for(let i=0;i<40&&!mount();i++)await sleep(25);
