#!/usr/bin/env node
import assert from 'node:assert/strict';
import {parseFieldAddress,resolveFieldRoutes,declaredFieldMoves,formatFieldAddress,addressLaw} from '../lib/field-address.mjs';

const routes=[
  {href:'/',title:'FIELD INDEX',kind:'root',operation:'CONTINUE',state:'ACTIVE'},
  {href:'/interphase/',title:'INTERPHASE',kind:'system',operation:'PROJECT',state:'ACTIVE',field:{exit_paths:[
    {status:'AVAILABLE',via:'OPEN GENESIS',target:'/interphase/genesis/'},
    {status:'AVAILABLE',via:'RETURN FIELD',target:'/'},
    {status:'CANDIDATE',via:'UNSHIPPED',target:'/future/'},
    {status:'AVAILABLE',via:'THIRD',target:'/third/'},
    {status:'AVAILABLE',via:'FOURTH MUST DROP',target:'/fourth/'}
  ]}},
  {href:'/house/',title:'HOUSE OS',kind:'system',operation:'CONTROL',state:'ACTIVE'},
  {href:'/fold-bloom/live/',title:'FOLD BLOOM LIVE',kind:'experiment',operation:'PLAY',state:'ACTIVE'}
];

const a=parseFieldAddress('/interphase/','/');
assert.equal(a.verb,'HOLD');assert.equal(a.query,'/interphase/');assert.equal(a.explicitVerb,false);
const b=parseFieldAddress('→ /house/','/');
assert.equal(b.verb,'TURN');assert.equal(b.query,'/house/');assert.equal(b.explicitVerb,true);
const c=parseFieldAddress('TRACE /fold-bloom/live/','/');
assert.equal(c.verb,'TRACE');assert.equal(c.query,'/fold-bloom/live/');
const d=parseFieldAddress('↩','/interphase/');
assert.equal(d.verb,'RETURN');assert.equal(d.query,'/interphase/');
const e=parseFieldAddress('https://example.test/?focus=%2Fhouse%2F','/');
assert.equal(e.query,'/house/');
assert.equal(formatFieldAddress('TURN','/house/'),'→ /house/');
assert.equal(formatFieldAddress('HOLD','/house/'),'/house/');

assert.equal(resolveFieldRoutes(routes,'interphase')[0].href,'/interphase/');
assert.equal(resolveFieldRoutes(routes,'house os')[0].href,'/house/');
assert.equal(resolveFieldRoutes(routes,'fold live')[0].href,'/fold-bloom/live/');
assert.equal(resolveFieldRoutes(routes,'/')[0].href,'/');

const moves=declaredFieldMoves(routes[1]);
assert.equal(moves.length,3,'move aperture must remain <=3');
assert.deepEqual(moves.map(x=>x.target),['/interphase/genesis/','/','/third/']);
assert(moves.every(x=>x.authority==='OFFER'),'address bar must not mint execution authority');
assert(moves.every(x=>x.commitBoundary==='HOST_NATIVE'),'commit boundary stays native');

const law=addressLaw();
assert.match(law.authority,/grants NONE/);assert.match(law.storage,/no second queue/);
console.log('FIELD ADDRESS SELFTEST PASS · URL focus identity → glyph/text address → ≤3 host moves · authority NONE');
