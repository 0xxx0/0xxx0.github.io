import {hashText,stableKey} from '../../lib/id.js';

export const TRANSPORT_CANDIDATE_SCHEMA='comms-transport-candidate/v0.1';
export const TRANSPORT_RELEASE_SCHEMA='comms-transport-release/v0.1';
export const PROVIDER_RECEIPT_SCHEMA='comms-provider-receipt/v0.1';
export const TRANSPORT_RETURN_SCHEMA='comms-transport-return/v0.1';

const COMMS_RETURN_SCHEMA='comms-spine-return/v0.1';
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text=v=>String(v??'');
const trimmed=v=>text(v).trim();
const iso=v=>{
  const d=new Date(v);
  if(!Number.isFinite(d.getTime()))throw new TypeError('valid ISO timestamp required');
  return d.toISOString();
};

function requireCommsReturn(value){
  if(!value||value.schema!==COMMS_RETURN_SCHEMA)throw new TypeError('comms-spine-return/v0.1 required');
  if(!value.source||typeof value.source.id!=='string'||!value.source.id.startsWith('sha256:'))throw new TypeError('source identity required');
  if(!value.response||typeof value.response.text!=='string')throw new TypeError('response draft required');
  return value;
}

export function validateTransportCandidate(value){
  if(!value||value.schema!==TRANSPORT_CANDIDATE_SCHEMA)throw new TypeError('invalid transport candidate');
  if(value.authority!=='NO_SEND')throw new TypeError('candidate must carry NO_SEND authority');
  if(value.channel!=='email')throw new TypeError('email is the only admitted transport channel');
  if(!trimmed(value.provider))throw new TypeError('provider required');
  if(!EMAIL.test(trimmed(value.destination?.to)))throw new TypeError('valid destination email required');
  if(!trimmed(value.source?.object_id)?.startsWith('sha256:'))throw new TypeError('source identity required');
  if(!trimmed(value.response?.text))throw new TypeError('non-empty response required');
  if(!trimmed(value.response?.sha256)?.startsWith('sha256:'))throw new TypeError('response digest required');
  if(!trimmed(value.candidate_id)?.startsWith('sha256:'))throw new TypeError('candidate identity required');
  return value;
}

export function validateTransportRelease(value){
  if(!value||value.schema!==TRANSPORT_RELEASE_SCHEMA)throw new TypeError('invalid transport release');
  if(value.authority!=='HUMAN_RELEASE')throw new TypeError('explicit HUMAN_RELEASE required');
  if(!trimmed(value.release_id)?.startsWith('sha256:'))throw new TypeError('release identity required');
  if(!trimmed(value.candidate_id)?.startsWith('sha256:'))throw new TypeError('candidate identity required');
  if(value.channel!=='email'||!EMAIL.test(trimmed(value.destination?.to)))throw new TypeError('valid email release required');
  if(!trimmed(value.response?.text)||!trimmed(value.response?.sha256)?.startsWith('sha256:'))throw new TypeError('exact released response required');
  iso(value.released_at);
  return value;
}

export async function prepareEmailCandidate({commsReturn,to,subject='',provider='gmail'}={}){
  const source=requireCommsReturn(commsReturn);
  const destination=trimmed(to),body=text(source.response.text),providerName=trimmed(provider).toLowerCase();
  if(!EMAIL.test(destination))throw new TypeError('valid destination email required');
  if(!body.trim())throw new TypeError('non-empty response required');
  if(!providerName)throw new TypeError('provider required');
  const responseSha=await hashText(body);
  const fingerprint={
    channel:'email',provider:providerName,destination:{to:destination},
    source_object_id:source.source.id,subject:text(subject),response_sha256:responseSha
  };
  const candidate={
    schema:TRANSPORT_CANDIDATE_SCHEMA,
    candidate_id:await hashText(stableKey(fingerprint)),
    created_at:new Date().toISOString(),
    authority:'NO_SEND',
    channel:'email',
    provider:providerName,
    destination:{to:destination},
    source:{
      route:'/port/comms/',
      object_id:source.source.id,
      title:text(source.source.title||'COMMS SPINE'),
      message_count:Number(source.source.messageCount)||0,
      char_count:Number(source.source.charCount)||0
    },
    response:{
      subject:text(subject),
      text:body,
      sha256:responseSha,
      covers:Array.isArray(source.response.covers)?[...new Set(source.response.covers.map(String))]:[]
    },
    privacy:{source_text_included:false},
    law:'CANDIDATE != SEND. Only an explicit HUMAN_RELEASE may authorize an adapter to send the exact response bytes to the exact destination.'
  };
  return validateTransportCandidate(candidate);
}

export async function authorizeTransport(candidate,{operatorGesture=false,releasedAt=new Date().toISOString()}={}){
  const c=validateTransportCandidate(candidate);
  if(operatorGesture!==true)throw new TypeError('explicit operator gesture required');
  const released=iso(releasedAt);
  const releaseId=await hashText(stableKey({candidate_id:c.candidate_id,released_at:released}));
  return validateTransportRelease({
    ...c,
    schema:TRANSPORT_RELEASE_SCHEMA,
    authority:'HUMAN_RELEASE',
    release_id:releaseId,
    released_at:released,
    send:{allowed:true,scope:'ONE_EXACT_MESSAGE',response_sha256:c.response.sha256,destination:{...c.destination}},
    law:'HUMAN_RELEASE authorizes one send of these exact response bytes to this exact destination. It does not authorize retries, edits, forwarding, or COMMS state mutation.'
  });
}

export function buildMailtoHref(release){
  const r=validateTransportRelease(release);
  const q=new URLSearchParams();
  if(r.response.subject)q.set('subject',r.response.subject);
  q.set('body',r.response.text);
  return 'mailto:'+encodeURIComponent(r.destination.to)+'?'+q.toString();
}

export function providerReceiptTemplate(release){
  const r=validateTransportRelease(release);
  return {
    schema:PROVIDER_RECEIPT_SCHEMA,
    release_id:r.release_id,
    provider:r.provider,
    status:'SENT',
    provider_message_id:'',
    sent_at:'',
    destination:{...r.destination},
    source:{object_id:r.source.object_id},
    response_sha256:r.response.sha256
  };
}

export async function verifyProviderReceipt(release,receipt){
  const r=validateTransportRelease(release),x=receipt;
  if(!x||x.schema!==PROVIDER_RECEIPT_SCHEMA)throw new TypeError('invalid provider receipt');
  if(x.status!=='SENT')throw new TypeError('provider receipt must confirm SENT');
  if(trimmed(x.release_id)!==r.release_id)throw new TypeError('receipt release mismatch');
  if(trimmed(x.provider).toLowerCase()!==r.provider)throw new TypeError('receipt provider mismatch');
  if(trimmed(x.destination?.to)!==r.destination.to)throw new TypeError('receipt destination mismatch');
  if(trimmed(x.source?.object_id)!==r.source.object_id)throw new TypeError('receipt source mismatch');
  if(trimmed(x.response_sha256)!==r.response.sha256)throw new TypeError('receipt response mismatch');
  if(!trimmed(x.provider_message_id))throw new TypeError('provider message id required');
  const sentAt=iso(x.sent_at);
  const normalized={
    schema:PROVIDER_RECEIPT_SCHEMA,
    release_id:r.release_id,
    provider:r.provider,
    status:'SENT',
    provider_message_id:trimmed(x.provider_message_id),
    sent_at:sentAt,
    destination:{...r.destination},
    source:{object_id:r.source.object_id},
    response_sha256:r.response.sha256
  };
  return {
    schema:TRANSPORT_RETURN_SCHEMA,
    created_at:new Date().toISOString(),
    authority:'EVIDENCE_ONLY',
    result:'SENT_CONFIRMED',
    source:{route:r.source.route,object_id:r.source.object_id,title:r.source.title},
    release:{id:r.release_id,candidate_id:r.candidate_id,released_at:r.released_at,provider:r.provider,destination:{...r.destination}},
    receipt:{...normalized,evidence_sha256:await hashText(stableKey(normalized))},
    law:'Provider receipt is evidence that the released message was sent. Native COMMS alone decides COVERED / DEFERRED / OPEN.'
  };
}
