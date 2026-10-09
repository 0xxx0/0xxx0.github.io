// Explicit, immutable extension composition. Imports and installation are separate:
// module code is trusted code; JSON admission never evaluates source or expressions.
import './fieldtypes.js';
const T = globalThis.FieldTypes;
export const protocol = 'interphase-extension/v1';
const groups = ['types', 'laws', 'operators'];
const idPattern = /^[a-z][a-z0-9._-]{0,79}$/i;
const fail = message => { throw new TypeError('INTERPHASE_EXTENSION: ' + message); };
const freeze = x => {
  if (x && typeof x === 'object' && !Object.isFrozen(x)) {
    Object.freeze(x); Object.values(x).forEach(freeze);
  }
  return x;
};
const copy = x => structuredClone(x);
const entries = value => Object.entries(value || {});
export function define(spec) {
  if (spec?.protocol !== protocol || !idPattern.test(spec.id || '') || !/^\d+\.\d+\.\d+$/.test(spec.version || '')) fail('id, protocol and exact version required');
  const out = {protocol, id:spec.id, version:spec.version, requires:{...spec.requires}};
  for (const [id, version] of entries(out.requires)) if (!idPattern.test(id) || !/^\d+\.\d+\.\d+$/.test(version)) fail('exact dependency required');
  for (const group of groups) {
    out[group] = Object.fromEntries(entries(spec[group]).map(([name, fn]) => {
      if (!idPattern.test(name) || typeof fn !== 'function') fail(group + ' requires named functions');
      return [name, fn];
    }));
  }
  return freeze(out);
}
export function compose(...input) {
  const plugins = input.flat().map(define), byId = new Map(), visited = new Set(), visiting = new Set(), ordered = [];
  for (const p of plugins) { if (byId.has(p.id)) fail('duplicate plugin ' + p.id); byId.set(p.id, p); }
  function visit(p) {
    if (visited.has(p.id)) return;
    if (visiting.has(p.id)) fail('dependency cycle ' + p.id);
    visiting.add(p.id);
    for (const [id, version] of entries(p.requires)) {
      const dependency = byId.get(id);
      if (!dependency || dependency.version !== version) fail('missing exact dependency ' + id + '@' + version);
      visit(dependency);
    }
    visiting.delete(p.id); visited.add(p.id); ordered.push(p);
  }
  plugins.forEach(visit);
  const out = {protocol, plugins:ordered.map(p => ({id:p.id, version:p.version})), types:{}, laws:{}, operators:{}};
  for (const p of ordered) for (const group of groups) for (const [name, fn] of entries(p[group])) {
    if (Object.hasOwn(out[group], name)) fail('duplicate ' + group + ' name ' + name);
    out[group][name] = fn;
  }
  return freeze(out);
}
export async function loadModule(specifier, importer = url => import(url)) {
  if (typeof specifier !== 'string' || !specifier.trim()) fail('module specifier required');
  // Trusted code import, deliberately absent from the arbitrary file/omnibar UI.
  // Caller can supply its own importer for package/import-map resolution.
  return define((await importer(specifier)).default);
}
function verdict(result) {
  if (typeof result === 'boolean') return {ok:result, errors:result?[]:[{path:'$', message:'predicate failed'}]};
  if (result && typeof result.ok === 'boolean' && Array.isArray(result.errors)) return result;
  fail('check must return boolean or {ok, errors}');
}
export function check(catalog, name, value) {
  const fn = catalog.types[name]; if (!fn) fail('unknown type ' + name);
  try { return verdict(fn(freeze(copy(value)))); }
  catch (e) { return {ok:false, errors:[{path:'$', message:e.message}]}; }
}
export function inspect(catalog, value) {
  const results = {};
  for (const [name, fn] of entries(catalog.laws)) {
    try { results[name] = verdict(fn(freeze(copy(value)))); }
    catch (e) { results[name] = {ok:false, errors:[{path:'$', message:e.message}]}; }
  }
  return freeze(results);
}
export function propose(catalog, name, value, args = {}) {
  const fn = catalog.operators[name]; if (!fn) fail('unknown operator ' + name);
  // This returns a candidate only. Native hosts validate/admit the candidate.
  return freeze(copy(fn(freeze(copy(value)), freeze(copy(args)))));
}
function schema(spec, depth = 0) {
  if (depth > 16 || !spec || typeof spec !== 'object') fail('schema depth/shape');
  if(Object.keys(spec).some(k=>!['kind','fields','item','values','min','max','minLength','maxLength'].includes(k)))fail('unknown schema field');
  let s;
  switch (spec.kind) {
    case 'string': s=T.str(); break;
    case 'number': s=T.num(); break;
    case 'boolean': s=T.bool(); break;
    case 'enum': if (!Array.isArray(spec.values) || !spec.values.length || spec.values.some(v=>v!==null && !['string','number','boolean'].includes(typeof v)||typeof v==='number'&&!Number.isFinite(v))) fail('enum values'); s=T.enum(...spec.values); break;
    case 'array': s=T.arrayOf(schema(spec.item, depth+1)); break;
    case 'object': s=T.objectOf(Object.fromEntries(entries(spec.fields).map(([k,v])=>[k,schema(v,depth+1)]))); break;
    default: fail('unknown schema kind');
  }
  for (const k of ['min','max','minLength','maxLength']) if (spec[k] != null && (!Number.isFinite(spec[k]) || (k.includes('Length') && (!Number.isInteger(spec[k]) || spec[k]<0)))) fail('finite bound required');
  if ((spec.min != null || spec.max != null) && spec.kind !== 'number') fail('numeric bounds need number');
  if ((spec.minLength != null || spec.maxLength != null) && !['string','array'].includes(spec.kind)) fail('length bounds need string/array');
  if (spec.min != null) s=T.refine(s, x=>x>=spec.min, 'below minimum ' + spec.min);
  if (spec.max != null) s=T.refine(s, x=>x<=spec.max, 'above maximum ' + spec.max);
  if (spec.minLength != null) s=T.refine(s, x=>x.length>=spec.minLength, 'too short');
  if (spec.maxLength != null) s=T.refine(s, x=>x.length<=spec.maxLength, 'too long');
  return s;
}
export function fromJSON(packet) {
  if (JSON.stringify(packet).length > 100000) fail('packet too large');
  if (Object.keys(packet || {}).some(k=>!['protocol','id','version','requires','types','laws'].includes(k))) fail('JSON only accepts types and laws');
  const types = Object.fromEntries(entries(packet.types).map(([name, spec]) => { const s=schema(spec); return [name, value=>T.check(value,s)]; }));
  const laws = Object.fromEntries(entries(packet.laws).map(([name, spec]) => {
    if (spec?.kind !== 'type' || !Object.hasOwn(types, spec.type)) fail('JSON law must reference its declared type');
    return [name, types[spec.type]];
  }));
  return define({...packet,types,laws});
}
export const native = define({protocol,id:'native',version:'1.0.0',types:{
  object:value=>T.check(value,T.objectOf({id:T.str(),title:T.str(),thesis:T.str(),state:T.enum('SOURCE','HOLD','RETURN')}))
},laws:{
  addressed:value=>typeof value.id==='string' && value.id.length>0,
  finiteState:value=>['SOURCE','HOLD','RETURN'].includes(value.state)
},operators:{
  trim:value=>({...value,title:value.title.trim(),thesis:value.thesis.trim()})
}});
