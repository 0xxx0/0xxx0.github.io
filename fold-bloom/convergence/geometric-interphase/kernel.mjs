// Executable convergence witness: stable host identity, unequal geometric projections.
// Geometry allocates attention. It does not acquire source or physical authority.

export const PROJECTIONS = Object.freeze(['LINEAR', 'RADIAL', 'AXIAL']);

export function makeHost() {
  return {
    objectId: 'field:fold-bloom:seed-01',
    source: { id: 'source:seed-01', address: '/fold-bloom/set/journey.html?demo=seed' },
    authority: 'SET owns member order and seams; LIVE owns ride state',
    facets: [
      { id: 'source', label: 'SOURCE', value: 'exact member references', order: 0 },
      { id: 'address', label: 'ADDRESS', value: 'sourceTime + journeyTime', order: 1 },
      { id: 'map', label: 'MAP', value: 'measured structure; uncertainty retained', order: 2 },
      { id: 'seam', label: 'SEAM', value: 'CUT / DISSOLVE / CARRY / RESET / RETURN', order: 3 },
      { id: 'focus', label: 'FOVEA', value: 'current addressed facet', order: 4 },
      { id: 'witness', label: 'WITNESS', value: 'operation trace and evidence', order: 5 }
    ],
    focusIds: ['focus'],
    returnAddress: '/fold-bloom/'
  };
}

export function hylo(seed, unfold, fold) {
  const layer = unfold(seed);
  const children = layer.children.map(child => hylo(child, unfold, fold));
  return fold(layer, children);
}

export function semanticTree(host) {
  return hylo(
    { id: host.objectId, facets: host.facets },
    node => node.facets
      ? { id: node.id, children: node.facets.map(f => ({ id: f.id, label: f.label, order: f.order })) }
      : { id: node.id, label: node.label, children: [] },
    (node, children) => ({ id: node.id, label: node.label ?? null, children })
  );
}

function place(facet, index, count, projection) {
  const t = count <= 1 ? 0 : index / (count - 1);
  if (projection === 'LINEAR') return { x: Math.round(t * 1000) / 10, y: 50, z: 0 };
  if (projection === 'RADIAL') {
    const angle = -Math.PI / 2 + index * (2 * Math.PI / Math.max(1, count));
    return { x: Math.round(50 + 38 * Math.cos(angle) * 10) / 10, y: Math.round(50 + 38 * Math.sin(angle) * 10) / 10, z: 0 };
  }
  return { x: 50, y: Math.round(t * 1000) / 10, z: Math.round(t * 1000) / 10 };
}

export function project(host, projection = 'LINEAR', aperture = null) {
  if (!PROJECTIONS.includes(projection)) throw new Error(`unsupported projection: ${projection}`);
  const requested = aperture == null ? host.facets.map(f => f.id) : [...aperture];
  const known = new Set(host.facets.map(f => f.id));
  if (requested.some(id => !known.has(id))) throw new Error('aperture contains an unknown facet');
  const included = new Set(requested);
  const visible = host.facets.filter(f => included.has(f.id));
  const visibleIds = new Set(visible.map(f => f.id));
  return {
    schema: 'geometric-interphase-projection/v0.1',
    objectId: host.objectId,
    sourceId: host.source.id,
    sourceAddress: host.source.address,
    projection,
    focusIds: [...host.focusIds],
    authority: host.authority,
    facets: visible.map((facet, index) => ({ ...facet, point: place(facet, index, visible.length, projection) })),
    residue: {
      suppressedFacetIds: host.facets.filter(f => !visibleIds.has(f.id)).map(f => f.id),
      reason: visible.length === host.facets.length ? null : 'outside current aperture; canonical host retains it'
    },
    returnAddress: host.returnAddress
  };
}

// Tzimtzum here is a strictly operational analogy: reduce visible allocation;
// retain an explicit residue against the same canonical host. No theology claim.
export function contract(host, projection, aperture) {
  const view = project(host, projection, aperture);
  return {
    schema: 'geometric-interphase-fold/v0.1',
    objectId: host.objectId,
    sourceId: host.source.id,
    projection,
    focusIds: [...host.focusIds],
    returnAddress: host.returnAddress,
    visibleFacetIds: view.facets.map(f => f.id),
    residueFacetIds: [...view.residue.suppressedFacetIds],
    canonicalHostRef: host
  };
}

export function returnToHost(packet, currentHost) {
  if (packet.objectId !== currentHost.objectId || packet.sourceId !== currentHost.source.id) {
    throw new Error('RETURN identity mismatch');
  }
  const valid = new Set(currentHost.facets.map(f => f.id));
  const focusIds = packet.focusIds.filter(id => valid.has(id));
  return {
    host: currentHost,
    context: {
      projection: packet.projection,
      focusIds: focusIds.length ? focusIds : [currentHost.facets[0]?.id].filter(Boolean),
      returnAddress: packet.returnAddress
    }
  };
}

export function changeFocus(host, focusIds) {
  const valid = new Set(host.facets.map(f => f.id));
  if (!focusIds.length || focusIds.some(id => !valid.has(id))) throw new Error('focus must address existing facets');
  return { ...host, focusIds: [...focusIds] };
}
