export const EXPERIENCE_SET_SCHEMA = 'fold-bloom-experience-set/v0.1';
export const TRANSITION_LAWS = Object.freeze(['CUT','DISSOLVE','CARRY','RESET','RETURN']);

const TOP_KEYS = new Set(['schema','id','title','entries','acts','profile','note','createdAt','updatedAt']);
const ENTRY_KEYS = new Set(['id','sourceId','weight','profileOverride','transitionIn','transitionOut','landmarkIds']);
const RIDE_KEYS = new Set(['schema','sourceId','solidity','immersion','dropGain','textOffset','world','motion']);
const MOTION_KEYS = new Set(['opticGain','pitchGain','bankGain']);

function fail(path, message){ throw new TypeError(`${path}: ${message}`); }
function isObject(v){ return !!v && typeof v === 'object' && !Array.isArray(v); }
function finite(v){ return typeof v === 'number' && Number.isFinite(v); }
function string(v){ return typeof v === 'string' && v.length > 0; }
function keysOnly(value, allowed, path){ for(const k of Object.keys(value)) if(!allowed.has(k)) fail(path, `unknown field ${k}`); }
function jsonValue(value, path){
  if(value === null || typeof value === 'string' || typeof value === 'boolean' || finite(value)) return;
  if(Array.isArray(value)){ value.forEach((x,i)=>jsonValue(x,`${path}[${i}]`)); return; }
  if(isObject(value)){ for(const [k,v] of Object.entries(value)) jsonValue(v,`${path}.${k}`); return; }
  fail(path,'must be JSON-compatible');
}
function optionalFinite(value, path){ if(value !== undefined && !finite(value)) fail(path,'must be a finite number'); }
function optionalString(value, path){ if(value !== undefined && typeof value !== 'string') fail(path,'must be a string'); }
function transition(value, path){ if(value !== undefined && !TRANSITION_LAWS.includes(value)) fail(path,`must be one of ${TRANSITION_LAWS.join(', ')}`); }

function validateRideProfilePatch(value, path){
  if(value === undefined) return;
  if(!isObject(value)) fail(path,'must be an object');
  keysOnly(value,RIDE_KEYS,path);
  optionalString(value.schema,`${path}.schema`);
  optionalString(value.sourceId,`${path}.sourceId`);
  optionalFinite(value.solidity,`${path}.solidity`);
  optionalFinite(value.immersion,`${path}.immersion`);
  optionalFinite(value.dropGain,`${path}.dropGain`);
  optionalFinite(value.textOffset,`${path}.textOffset`);
  optionalString(value.world,`${path}.world`);
  if(value.motion !== undefined){
    if(!isObject(value.motion)) fail(`${path}.motion`,'must be an object');
    keysOnly(value.motion,MOTION_KEYS,`${path}.motion`);
    optionalFinite(value.motion.opticGain,`${path}.motion.opticGain`);
    optionalFinite(value.motion.pitchGain,`${path}.motion.pitchGain`);
    optionalFinite(value.motion.bankGain,`${path}.motion.bankGain`);
  }
}

function validateEntry(entry, index){
  const path = `entries[${index}]`;
  if(!isObject(entry)) fail(path,'must be an object');
  keysOnly(entry,ENTRY_KEYS,path);
  if(!string(entry.id)) fail(`${path}.id`,'must be a non-empty string');
  if(!string(entry.sourceId)) fail(`${path}.sourceId`,'must be a non-empty string');
  optionalFinite(entry.weight,`${path}.weight`);
  validateRideProfilePatch(entry.profileOverride,`${path}.profileOverride`);
  transition(entry.transitionIn,`${path}.transitionIn`);
  transition(entry.transitionOut,`${path}.transitionOut`);
  if(entry.landmarkIds !== undefined){
    if(!Array.isArray(entry.landmarkIds) || entry.landmarkIds.some(x=>!string(x))) fail(`${path}.landmarkIds`,'must be an array of non-empty strings');
  }
}

export function assertExperienceSet(value){
  if(!isObject(value)) fail('set','must be an object');
  keysOnly(value,TOP_KEYS,'set');
  if(value.schema !== EXPERIENCE_SET_SCHEMA) fail('set.schema',`must equal ${EXPERIENCE_SET_SCHEMA}`);
  if(!string(value.id)) fail('set.id','must be a non-empty string');
  if(typeof value.title !== 'string') fail('set.title','must be a string');
  if(!Array.isArray(value.entries)) fail('set.entries','must be an array');
  value.entries.forEach(validateEntry);
  if(value.acts !== undefined){ if(!Array.isArray(value.acts)) fail('set.acts','must be an array'); jsonValue(value.acts,'set.acts'); }
  if(value.profile !== undefined){ if(!isObject(value.profile)) fail('set.profile','must be an object'); jsonValue(value.profile,'set.profile'); }
  if(value.note !== undefined && typeof value.note !== 'string') fail('set.note','must be a string');
  if(!string(value.createdAt)) fail('set.createdAt','must be a non-empty string');
  if(!string(value.updatedAt)) fail('set.updatedAt','must be a non-empty string');
  jsonValue(value,'set');
  return value;
}

export function cloneExperienceSet(value){
  assertExperienceSet(value);
  return JSON.parse(JSON.stringify(value));
}

export function encodeExperienceSet(value){
  return JSON.stringify(cloneExperienceSet(value));
}

export function decodeExperienceSet(text){
  if(typeof text !== 'string') fail('encoded','must be a string');
  let value;
  try { value = JSON.parse(text); } catch (error) { fail('encoded',`invalid JSON (${error.message})`); }
  return cloneExperienceSet(value);
}
