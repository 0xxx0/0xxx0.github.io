export const SALVAGE_CLASSES = Object.freeze({
  KEEP_CURRENT: 'KEEP_CURRENT',
  KEEP_DONOR: 'KEEP_DONOR',
  KEEP_COMPAT: 'KEEP_COMPAT',
  KEEP: 'KEEP',
  SALVAGE_REVIEW: 'SALVAGE_REVIEW',
  RETIRE_CANDIDATE: 'RETIRE_CANDIDATE',
  BLOCKED: 'BLOCKED'
});

const uniq = xs => [...new Set((xs || []).filter(Boolean))];
const up = x => String(x || '').toUpperCase();

export function buildSalvageContext(manifest, current, references = []) {
  const routes = Array.isArray(manifest?.routes) ? manifest.routes : [];
  const routeMap = new Map(routes.filter(r => r?.href).map(r => [r.href, r]));
  const heads = new Set((current?.current_heads || []).map(h => h?.route).filter(Boolean));
  const activeRoutes = new Set();
  for (const f of current?.active_fronts || []) {
    for (const e of f?.evidence || []) if (routeMap.has(e)) activeRoutes.add(e);
  }
  const children = new Map(), aliasesTo = new Map();
  for (const r of routes) {
    const p = r?.parent || '/';
    if (!children.has(p)) children.set(p, []);
    if (r?.href) children.get(p).push(r.href);
    if (r?.alias_of && r?.href) {
      if (!aliasesTo.has(r.alias_of)) aliasesTo.set(r.alias_of, []);
      aliasesTo.get(r.alias_of).push(r.href);
    }
  }
  const refsByRoute = new Map();
  for (const ref of references || []) {
    if (!ref?.href) continue;
    if (!refsByRoute.has(ref.href)) refsByRoute.set(ref.href, []);
    refsByRoute.get(ref.href).push(ref);
  }
  return { routes, routeMap, heads, activeRoutes, children, aliasesTo, refsByRoute };
}

function salvageRefs(route) {
  const out = [];
  for (const k of ['receipt','return','contract','release','source']) {
    if (route?.[k]) out.push(String(route[k]));
  }
  for (const x of route?.transfer || []) out.push(String(x));
  if (route?.evolution?.host) out.push(String(route.evolution.host));
  if (route?.evolution?.evidence_gate) out.push(String(route.evolution.evidence_gate));
  return uniq(out);
}

export function classifySalvage(route, ctx) {
  if (!route?.href) throw new Error('route.href required');
  const href = route.href, state = up(route.state), kind = up(route.kind), op = up(route.operation);
  const refs = ctx?.refsByRoute?.get(href) || [];
  const runtimeRefs = refs.filter(r => ['runtime','tooling'].includes(r.class));
  const archivalRefs = refs.filter(r => !['runtime','tooling','self','registry'].includes(r.class));
  const kids = ctx?.children?.get(href) || [];
  const aliases = ctx?.aliasesTo?.get(href) || [];
  const blockers = [];

  if (ctx?.heads?.has(href)) blockers.push('CURRENT_HEAD');
  if (ctx?.activeRoutes?.has(href)) blockers.push('ACTIVE_FRONT_EVIDENCE');
  if (kids.length) blockers.push('HAS_CHILDREN');
  if (aliases.length) blockers.push('HAS_COMPAT_ALIASES');
  if (runtimeRefs.length) blockers.push('RUNTIME_OR_TOOLING_REFERENCES');

  const donor = /DONOR|FROZEN/.test(state) || /DONOR/.test(kind);
  const alias = !!route.alias_of || /ALIAS/.test(kind) || op === 'REDIRECT';
  const explicitRetire = /SUPERSEDED|DEPRECATED|RETIRED|REMOVED/.test(state);
  const temporary = /CANDIDATE|PARKED|EXPERIMENT/.test(state) || /EXPERIMENT|SPIKE/.test(kind);

  let classification = SALVAGE_CLASSES.KEEP;
  let reason = 'active addressed surface; no retirement signal';

  if (ctx?.heads?.has(href) || ctx?.activeRoutes?.has(href)) {
    classification = SALVAGE_CLASSES.KEEP_CURRENT;
    reason = 'current attention/head evidence blocks retirement';
  } else if (donor) {
    classification = SALVAGE_CLASSES.KEEP_DONOR;
    reason = 'frozen/recovered donor is archive capability, not surface debt';
  } else if (alias) {
    classification = SALVAGE_CLASSES.KEEP_COMPAT;
    reason = 'compatibility address may carry external bookmarks; alias is not presumed dead';
  } else if (explicitRetire) {
    if (blockers.length) {
      classification = SALVAGE_CLASSES.BLOCKED;
      reason = 'explicit retirement signal exists but live structural/reference blockers remain';
    } else {
      classification = SALVAGE_CLASSES.RETIRE_CANDIDATE;
      reason = 'explicit retirement signal + no detected current/structural/runtime blocker';
    }
  } else if (temporary) {
    classification = SALVAGE_CLASSES.SALVAGE_REVIEW;
    reason = 'temporary/parked surface: recover mechanism and exit condition before deciding';
  }

  return {
    href,
    title: route.title || href,
    state: route.state || null,
    kind: route.kind || null,
    operation: route.operation || null,
    classification,
    reason,
    blockers: uniq(blockers),
    children: kids,
    compatibility_aliases: aliases,
    references: {
      runtime_or_tooling: runtimeRefs.map(r => r.path),
      archival_or_evidence: archivalRefs.map(r => r.path)
    },
    salvage_refs: salvageRefs(route),
    conditions: {
      may_auto_delete: false,
      retire_candidate_means: 'bounded human/agent review may cut the container after preserved mechanism/provenance/RETURN are named',
      external_bookmarks_unknown: true
    }
  };
}

export function auditSalvage(manifest, current, references = []) {
  const ctx = buildSalvageContext(manifest, current, references);
  const rows = ctx.routes.filter(r => r?.href && r.href !== '/').map(r => classifySalvage(r, ctx));
  const counts = Object.fromEntries(Object.values(SALVAGE_CLASSES).map(k => [k, rows.filter(r => r.classification === k).length]));
  return { rows, counts };
}
