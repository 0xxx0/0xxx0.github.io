import test from 'node:test';
import assert from 'node:assert/strict';
import '../../lib/document-structure.js';
import {adaptDocumentFile,analyzeDocumentText,isDocumentFile,makeReadfieldHandoff,documentGlyphDescriptor} from './document-source.js';
import {atlasPacket,encodeAtlas} from './atlas-core.js';

const fakeFile=(name,text,type='text/plain')=>{const bytes=new TextEncoder().encode(text);return{name,type,size:bytes.byteLength,arrayBuffer:async()=>bytes.buffer.slice(0)}};

test('document detection is extension bounded',()=>{
  assert.equal(isDocumentFile({name:'paper.md'}),true);
  assert.equal(isDocumentFile({name:'PAPER.MARKDOWN'}),true);
  assert.equal(isDocumentFile({name:'notes.txt'}),true);
  assert.equal(isDocumentFile({name:'paper.pdf'}),false);
});

test('markdown hierarchy ignores fenced headings and preserves depth parents',()=>{
  const s=analyzeDocumentText('# A\none\n\n## B\ntwo\n\n\`\`\`md\n# Fake\n\`\`\`\n\n### C\nthree\n\n## D\nfour',{format:'MD'});
  assert.deepEqual(s.sections.map(x=>[x.address,x.label,x.depth,x.parent]),[
    ['section://0','A',1,null],
    ['section://1','B',2,'section://0'],
    ['section://2','C',3,'section://1'],
    ['section://3','D',2,'section://0']
  ]);
  assert.equal(s.paragraphs.some(p=>p.start===s.sections[0].start),false);
});

test('heading syntax, CRLF and closing hashes stay deterministic',()=>{
  const s=analyzeDocumentText('\uFEFF# Title ###\r\nbody\r\n\r\n#NoSpace\r\ntext\r\n\r\n    ## Indented\r\ncode',{format:'MD'});
  assert.equal(s.sections.length,1);
  assert.equal(s.sections[0].label,'Title');
  assert.equal(s.sections[0].start,0);
});

test('longer closing fence closes and unterminated fence suppresses headings',()=>{
  const closed=analyzeDocumentText('## Real\n\n\`\`\`\`js\n# Fake\n\`\`\`\`\`\n\n### After',{format:'MD'});
  assert.deepEqual(closed.sections.map(x=>x.label),['Real','After']);
  const open=analyzeDocumentText('# A\n\n~~~txt\n## Fake\nnever closes',{format:'MD'});
  assert.deepEqual(open.sections.map(x=>x.label),['A']);
});

test('plain text fallback groups paragraphs four at a time',()=>{
  const s=analyzeDocumentText(Array.from({length:9},(_,i)=>'P'+(i+1)).join('\n\n'),{format:'TXT'});
  assert.deepEqual(s.sections.map(x=>x.label),['§ 1','§ 2','§ 3']);
  assert.equal(s.paragraphs.length,9);
});

test('markdown without headings uses plain fallback',()=>{
  const s=analyzeDocumentText(['a','b','c','d','e'].join('\n\n'),{format:'MD'});
  assert.deepEqual(s.sections.map(x=>x.label),['§ 1','§ 2']);
});

test('exact bytes yield stable identity and changed bytes do not',async()=>{
  const a=await adaptDocumentFile(fakeFile('essay.md','# A\nhello'));
  const b=await adaptDocumentFile(fakeFile('essay.md','# A\nhello'));
  const c=await adaptDocumentFile(fakeFile('essay.md','# A\nhello!'));
  assert.equal(a.entry.id,a.entry.sourceHash);
  assert.equal(a.entry.id,b.entry.id);
  assert.notEqual(a.entry.id,c.entry.id);
});

test('empty document is not materialized',async()=>{
  const x=await adaptDocumentFile(fakeFile('empty.txt',' \n\t\n'));
  assert.equal(x.materializable,false);assert.equal(x.reason,'EMPTY_DOCUMENT');
});

test('atlas packet preserves bounded document witness but not raw source',async()=>{
  const phrase='UNIQUE_RAW_SENTENCE_4f9e';
  const x=await adaptDocumentFile(fakeFile('essay.md','# A\n'+phrase));
  const packet=atlasPacket({entries:[x.entry]}),encoded=encodeAtlas(packet),raw=JSON.stringify(packet);
  assert.equal(packet.entries[0].document.sections,1);
  assert.equal(raw.includes(phrase),false);
  assert.equal(encoded.includes(phrase),false);
});

test('document glyph is deterministic and renderer-compatible',()=>{
  const text='# A\none\n\n## B\ntwo',structure=analyzeDocumentText(text,{format:'MD'});
  const a=documentGlyphDescriptor({hash:'abc',text,structure}),b=documentGlyphDescriptor({hash:'abc',text,structure});
  assert.deepEqual(a,b);assert.equal(a.radial.length,24);assert.equal(a.chroma.length,12);assert.equal(a.sectionCount,2);
});

test('READFIELD handoff keeps exact source identity and starting address',async()=>{
  const x=await adaptDocumentFile(fakeFile('essay.md','# A\nhello'));
  const h=makeReadfieldHandoff(x.entry,x.runtime.text);
  assert.equal(h.schema,'readfield.handoff/v1');
  assert.equal(h.source,x.runtime.text);
  assert.equal(h.sourceIdentity.hash,x.entry.sourceHash);
  assert.equal(h.address,'section://0');
});
