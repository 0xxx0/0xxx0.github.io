const ACTIONS=new Set(['KEEP','PARK','WRONG_FRAME']);
const STATES=new Map([
  ['KEEP','FRAME_ACCEPTED'],
  ['PARK','PARKED_RESIDUE'],
  ['WRONG_FRAME','SOURCE_REQUIRED']
]);
const text=v=>String(v??'').replace(/\s+/g,' ').trim();

export function compileCrewResponse(handoff,action){
  if(!handoff||typeof handoff!=='object'||Array.isArray(handoff))throw new Error('FIELD_CREW_RESPONSE_HANDOFF_OBJECT_REQUIRED');
  if(handoff.schema!=='field-crew-handoff/v0.1')throw new Error('FIELD_CREW_RESPONSE_HANDOFF_SCHEMA');
  const handle=text(handoff.context_handle);
  const objectRef=text(handoff.source?.object_ref);
  if(!/^crew:[0-9a-f]{16}$/i.test(handle))throw new Error('FIELD_CREW_RESPONSE_CONTEXT_HANDLE');
  if(!objectRef)throw new Error('FIELD_CREW_RESPONSE_OBJECT_REF');
  const a=text(action).toUpperCase();
  if(!ACTIONS.has(a))throw new Error('FIELD_CREW_RESPONSE_ACTION_'+a);
  const state=STATES.get(a);
  const meaning=
    a==='KEEP'
      ?'The receiver accepts this coordination frame as sufficient to continue otherwise-lawful work on the same object. KEEP is not EFFECT, merge, publish, NOW or priority approval.'
      :a==='PARK'
        ?'Retain this handoff as residue/later possibility and stop active continuation. PARK is not rejection of source truth and grants no NEXT.'
        :'The receiver rejects the current coordination frame for continuation. Re-SOURCE/re-HOLD before any TURN; do not silently repair the frame and continue.';
  const requires=
    a==='KEEP'
      ?['re-read current host truth before any consequential TURN; existing human/source/effect gates remain in force']
      :a==='PARK'
        ?['release active attention; preserve provenance/handle only if useful for later recovery']
        :['re-SOURCE the same object or explicitly re-address a different object, then establish a fresh HOLD'];
  return Object.freeze({
    schema:'field-crew-response/v0.1',
    authority:'NONE / COORDINATION ONLY',
    context_handle:handle,
    object_ref:objectRef,
    action:a,
    state,
    meaning,
    requires:Object.freeze(requires),
    return:Object.freeze({
      target:text(handoff.return?.target||objectRef)||objectRef,
      next_authority:'NONE'
    }),
    laws:Object.freeze([
      'RESPONSE REFERENCES THE SAME HANDOFF OBJECT; IT DOES NOT COPY OR MUTATE HIDDEN INTERNAL STATE.',
      'KEEP != EFFECT APPROVAL != MERGE APPROVAL != NOW != PRIORITY.',
      'PARK != DELETE != REJECT SOURCE TRUTH.',
      'WRONG_FRAME INVALIDATES CONTINUATION ONLY; IT REQUIRES FRESH SOURCE/HOLD BEFORE TURN.',
      'RESPONSE IS TRANSIENT AND STATELESS; DO NOT COMMIT IT AS A TASK STORE OR SHARED MEMORY.',
      'RETURN/NEXT AUTHORITY REMAINS NONE.'
    ])
  });
}

export function crewResponseMarkdown(response){
  const r=response?.authority?response:compileCrewResponse(response?.handoff,response?.action);
  return [
    '# FIELD CREW RESPONSE',
    'handle: '+r.context_handle,
    'object: '+r.object_ref,
    'action: '+r.action,
    'state: '+r.state,
    'authority: '+r.authority,
    '',
    r.meaning,
    '',
    '## RECEIVER',
    ...r.requires.map(x=>'- '+x),
    '',
    '## RETURN',
    '- '+r.return.target+' · next_authority NONE',
    ''
  ].join('\n');
}
