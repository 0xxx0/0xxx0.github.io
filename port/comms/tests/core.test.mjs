import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseConversation,deriveSignals,createHumanMark,createMachineMark,confirmMachine,dismissMachine,mergeSignals,setSignalState,
  sourceSlice,coverageSummary,buildAgentPacket,makeReturn,validateReturn,stateFromReturn,demoConversation,SIGNAL_ORIGINS
} from '../core.js';

test('conversation parser preserves exact source addresses',()=>{
  const src='User: Can you fix this?\nAssistant: I will fix it.\nUser: Do not publish it.';
  const doc=parseConversation(src);
  assert.equal(doc.messages.length,3);
  assert.equal(doc.messages[0].speaker,'USER');
  assert.equal(doc.messages[1].speaker,'ASSISTANT');
  for(const m of doc.messages)assert.equal(src.slice(m.start,m.end),m.text);
  for(const m of doc.messages)for(const c of m.clauses)assert.equal(src.slice(c.start,c.end),c.text);
});

test('parser degrades to one unknown message without speaker markers',()=>{
  const src='A plain pasted note with no transcript markers.';
  const doc=parseConversation(src);
  assert.equal(doc.messages.length,1);
  assert.equal(doc.messages[0].speaker,'UNKNOWN');
  assert.equal(doc.messages[0].text,src);
});

test('derived signal suggestions remain advisory',()=>{
  const doc=parseConversation(demoConversation());
  const sig=deriveSignals(doc);
  assert.ok(sig.some(x=>x.kind==='ASK'));
  assert.ok(sig.some(x=>x.kind==='PROMISE'));
  assert.ok(sig.some(x=>x.kind==='CONSTRAINT'));
  assert.ok(sig.every(x=>x.origin==='DERIVED'));
  assert.ok(sig.every(x=>x.confidence<1));
});

test('human mark has explicit authored origin and exact range',()=>{
  const src='User: please keep this exact.';
  const doc=parseConversation(src),c=doc.messages[0].clauses[0];
  const h=createHumanMark({kind:'DECISION',messageId:c.messageId,clauseId:c.id,speaker:'USER',start:c.start,end:c.end,text:c.text});
  assert.equal(h.origin,'HUMAN');
  assert.equal(h.confidence,1);
  assert.equal(sourceSlice(src,h),c.text);
});

test('human and derived signals coexist without source mutation',()=>{
  const doc=parseConversation('User: Can you do this?');
  const d=deriveSignals(doc),c=doc.messages[0].clauses[0];
  const h=createHumanMark({kind:'NOTE',messageId:c.messageId,clauseId:c.id,start:c.start,end:c.end,text:c.text});
  const all=mergeSignals(d,[h]);
  assert.equal(all.length,d.length+1);
  assert.equal(doc.source,'User: Can you do this?');
});

test('signal state transition preserves signal identity',()=>{
  const doc=parseConversation('User: Can you do this?');
  const d=deriveSignals(doc),id=d[0].id;
  const next=setSignalState(d,id,'COVERED');
  assert.equal(next.find(x=>x.id===id).state,'COVERED');
  assert.equal(next.find(x=>x.id===id).start,d[0].start);
});

test('coverage summary exposes residue instead of deleting it',()=>{
  const doc=parseConversation('User: Can you do this?\nAssistant: I will do it.');
  let s=deriveSignals(doc);
  s=setSignalState(s,s[0].id,'COVERED');
  const c=coverageSummary(s);
  assert.equal(c.total,s.length);
  assert.equal(c.COVERED,1);
  assert.equal(c.OPEN,s.length-1);
});

test('agent packet carries exact addressed asks and constraints',()=>{
  const doc=parseConversation('User: Can you do this? Do not publish it.');
  const s=deriveSignals(doc);
  const p=buildAgentPacket({doc,signals:s,draft:'Working on it.'});
  assert.ok(p.requested_outcomes.length>=1);
  assert.ok(p.constraints.length>=1);
  for(const x of [...p.requested_outcomes,...p.constraints]){
    assert.equal(doc.source.slice(x.address[0],x.address[1]),x.text);
  }
});

test('RETURN round-trips validation without source-address loss',()=>{
  const doc=parseConversation(demoConversation()),s=deriveSignals(doc);
  const r=makeReturn({doc,sourceId:'sha256:test',signals:s,draft:'Demo response',coverageLinks:[s[0].id],includeSource:true});
  assert.equal(validateReturn(JSON.parse(JSON.stringify(r))).schema,'comms-spine-return/v0.1');
  for(const x of r.signals)assert.equal(r.source.text.slice(x.start,x.end),x.text);
});

test('RETURN may omit source bytes/text while retaining addresses',()=>{
  const doc=parseConversation('User: Can you help?'),s=deriveSignals(doc);
  const r=makeReturn({doc,sourceId:'sha256:test',signals:s,includeSource:false});
  assert.equal(r.source.text,null);
  assert.ok(r.signals[0].start>=0);
});


test('source-bearing RETURN resumes human marks, states, draft and coverage',()=>{
  const doc=parseConversation(demoConversation()),c=doc.messages[0].clauses[0];
  const h=createHumanMark({kind:'NOTE',messageId:c.messageId,clauseId:c.id,speaker:'USER',start:c.start,end:c.end,text:c.text});
  const signals=[{...h,state:'COVERED'}];
  const r=makeReturn({doc,sourceId:'sha256:resume-proof',signals,draft:'I covered this.',coverageLinks:[h.id],title:'Resume proof',includeSource:true});
  const st=stateFromReturn(r);
  assert.equal(st.source,doc.source);
  assert.equal(st.sourceId,'sha256:resume-proof');
  assert.equal(st.humanMarks.length,1);
  assert.equal(st.states[h.id],'COVERED');
  assert.deepEqual(st.coverageLinks,[h.id]);
  assert.equal(st.draft,'I covered this.');
  assert.equal(st.doc.messages.length,doc.messages.length);
});

test('address-only RETURN cannot pretend to be a resumable source',()=>{
  const doc=parseConversation('User: Can you help?'),s=deriveSignals(doc);
  const r=makeReturn({doc,sourceId:'sha256:test',signals:s,includeSource:false});
  assert.throws(()=>stateFromReturn(r),/source-bearing RETURN/);
});

test('machine mark is a third origin class, never authored',()=>{
  const src='User: please fix the login bug tomorrow.';
  const doc=parseConversation(src),c=doc.messages[0].clauses[0];
  const m=createMachineMark({kind:'CONSTRAINT',messageId:c.messageId,clauseId:c.id,speaker:'USER',start:c.start,end:c.end,text:c.text});
  assert.equal(m.origin,'MACHINE');
  assert.ok(m.confidence<1);
  assert.equal(sourceSlice(src,m),c.text);
  assert.deepEqual([...SIGNAL_ORIGINS],['DERIVED','MACHINE','HUMAN']);
});

test('machine claims coexist with human and derived signals without silent promotion',()=>{
  const doc=parseConversation('User: Can you do this?');const d=deriveSignals(doc),c=doc.messages[0].clauses[0];
  const m=createMachineMark({kind:'ASK',messageId:c.messageId,clauseId:c.id,start:c.start,end:c.end,text:c.text});
  const h=createHumanMark({kind:'NOTE',messageId:c.messageId,clauseId:c.id,start:c.start,end:c.end,text:c.text});
  const all=mergeSignals(d,[m],[h]);
  assert.equal(all.length,d.length+2);
  assert.equal(all.find(x=>x.id===m.id).origin,'MACHINE');
  assert.equal(all.find(x=>x.id===h.id).origin,'HUMAN');
  assert.ok(all.filter(x=>x.origin==='DERIVED').every(x=>x.confidence<1));
});

test('confirm promotes a machine claim to HUMAN at confidence 1; nothing else can be confirmed',()=>{
  const doc=parseConversation('User: Can you do this?');const d=deriveSignals(doc),c=doc.messages[0].clauses[0];
  const m=createMachineMark({kind:'ASK',messageId:c.messageId,clauseId:c.id,start:c.start,end:c.end,text:c.text});
  const h=createHumanMark({kind:'NOTE',messageId:c.messageId,clauseId:c.id,start:c.start,end:c.end,text:c.text});
  const owned=confirmMachine(m);
  assert.equal(owned.origin,'HUMAN');
  assert.equal(owned.confidence,1);
  assert.equal(owned.id,m.id);
  assert.equal(owned.start,m.start);
  assert.equal(m.origin,'MACHINE');
  assert.ok(m.confidence<1);
  assert.throws(()=>confirmMachine(h),/MACHINE/);
  assert.throws(()=>confirmMachine(d[0]),/MACHINE/);
});

test('dismiss retires a machine claim to DROPPED without deleting or promoting it',()=>{
  const doc=parseConversation('User: Can you do this?');const d=deriveSignals(doc),c=doc.messages[0].clauses[0];
  const m=createMachineMark({kind:'ASK',messageId:c.messageId,clauseId:c.id,start:c.start,end:c.end,text:c.text});
  const h=createHumanMark({kind:'NOTE',messageId:c.messageId,clauseId:c.id,start:c.start,end:c.end,text:c.text});
  const dropped=dismissMachine(m);
  assert.equal(dropped.state,'DROPPED');
  assert.equal(dropped.origin,'MACHINE');
  assert.equal(dropped.confidence,m.confidence);
  const all=mergeSignals(d,[dropped],[h]);
  assert.ok(all.some(x=>x.id===m.id));
  assert.equal(coverageSummary(all).DROPPED,1);
  assert.throws(()=>dismissMachine(h),/MACHINE/);
  assert.throws(()=>dismissMachine(d[0]),/MACHINE/);
});

test('machine marks reject unknown kinds and confidence 1 instead of degrading silently',()=>{
  const doc=parseConversation('User: Can you do this?'),c=doc.messages[0].clauses[0];
  assert.throws(()=>createMachineMark({kind:'NEED',messageId:c.messageId,start:c.start,end:c.end,text:c.text}),/kind/);
  assert.throws(()=>createMachineMark({kind:'ASK',messageId:c.messageId,start:c.start,end:c.end,text:c.text,confidence:1}),/confidence/);
});

test('RETURN round-trips MACHINE provenance and dismissal residue',()=>{
  const doc=parseConversation('User: Can you do this?'),c=doc.messages[0].clauses[0];
  const m=createMachineMark({kind:'ASK',messageId:c.messageId,clauseId:c.id,start:c.start,end:c.end,text:c.text});
  const owned=confirmMachine(createMachineMark({kind:'NOTE',messageId:c.messageId,clauseId:c.id,start:c.start,end:c.end,text:c.text,confidence:.95}));
  const r=makeReturn({doc,sourceId:'sha256:machine',signals:[dismissMachine(m),owned],includeSource:true});
  assert.equal(validateReturn(JSON.parse(JSON.stringify(r))).schema,'comms-spine-return/v0.1');
  const st=stateFromReturn(r);
  assert.equal(st.machineMarks.length,1);
  assert.equal(st.machineMarks[0].id,m.id);
  assert.equal(st.states[m.id],'DROPPED');
  assert.equal(st.humanMarks.some(x=>x.id===owned.id&&x.confidence===1),true);
});

import './transport.test.mjs';
