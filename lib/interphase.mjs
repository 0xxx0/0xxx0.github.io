// One import face over the surviving implementations. No copied bodies, loader,
// registry, host registration, storage or rendering at import time.
import './path.js';
import './interphase-ring.js';
import './interphase-glyph.js';
import './interphase-lenses.js';
import './interphase-history.js';
import './interphase-composition.js';
import './fieldtypes.js';
import * as audio from '../fold-bloom/listen/audio-glyph.js';

export const optics = globalThis.InterphasePath;
export const ring = globalThis.InterphaseRing;
export const glyph = globalThis.InterphaseGlyph;
export const lenses = globalThis.InterphaseLenses;
export const history = globalThis.InterphaseHistory;
export const composition = globalThis.InterphaseComposition;
export const contracts = globalThis.FieldTypes;
export {audio};

// Stateful factories remain explicitly named on their native namespaces.
// Change composition is deterministic when callers supply id/at; defaults use
// the clock. History is a local graph, not a CRDT or authenticated signature.
export default Object.freeze({optics, ring, glyph, lenses, history, composition, contracts, audio});
