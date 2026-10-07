(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TriangleView = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // OPTIONAL triangle projection over the constraint bench. Recovered from Bench 0.1
  // (git show 4d64a331^:forward-field-proof/triangle/bench/index.html:34-42,100-101):
  // the same simplex geometry, barycentric map and grid — nothing of the 0.1 scoring.
  // Projection only: the numeric table stays canonical and this module never mutates state.
  const A = { x: 300, y: 55 }, B = { x: 65, y: 450 }, C = { x: 535, y: 450 };
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const n = value => Math.round(value * 10) / 10;
  const mid = value => Array.isArray(value) ? (value[0] + value[1]) / 2 : value;
  function baryPoint(weights) {
    return { x: weights[0] * A.x + weights[1] * B.x + weights[2] * C.x, y: weights[0] * A.y + weights[1] * B.y + weights[2] * C.y };
  }
  function pointWeights(point) {
    const d = (B.y - C.y) * (A.x - C.x) + (C.x - B.x) * (A.y - C.y);
    const a = ((B.y - C.y) * (point.x - C.x) + (C.x - B.x) * (point.y - C.y)) / d;
    const b = ((C.y - A.y) * (point.x - C.x) + (A.x - C.x) * (point.y - C.y)) / d;
    const w = [a, b, 1 - a - b].map(v => Math.max(0, v)), sum = w[0] + w[1] + w[2] || 1;
    return w.map(v => v / sum);
  }
  const shortLabel = criterion => criterion.label.replace(/^.*? · /, '') + (criterion.unit ? ' ' + criterion.unit : '');
  // Direction-aware min..max normalisation across the entered options, then thirds.
  function project(state, analysis) {
    const axes = state.criteria;
    const known = option => axes.every(criterion => Number.isFinite(mid(option.values[criterion.id])));
    const plotted = state.options.filter(known);
    const extent = axes.map(criterion => {
      const values = plotted.map(option => mid(option.values[criterion.id]));
      return values.length ? [Math.min.apply(null, values), Math.max.apply(null, values)] : [0, 0];
    });
    const points = plotted.map(option => {
      const raw = axes.map((criterion, i) => {
        const low = extent[i][0], high = extent[i][1], value = mid(option.values[criterion.id]);
        if (high <= low) return 0.5;
        return criterion.direction === 'max' ? (value - low) / (high - low) : (high - value) / (high - low);
      });
      const sum = raw[0] + raw[1] + raw[2];
      const weights = sum > 0 ? raw.map(v => v / sum) : [1 / 3, 1 / 3, 1 / 3];
      const point = baryPoint(weights);
      const row = analysis ? analysis.rows.find(r => r.id === option.id) : null;
      return {
        id: option.id, label: option.label, weights,
        x: point.x, y: point.y,
        status: row ? row.status : 'UNKNOWN',
        frontier: !!(analysis && analysis.frontier.indexOf(option.id) !== -1),
        selected: state.selected === option.id
      };
    });
    return { axes, points, excluded: state.options.length - points.length };
  }
  function frontierPath(points) {
    const front = points.filter(point => point.frontier);
    if (front.length < 2) return '';
    const cx = front.reduce((sum, point) => sum + point.x, 0) / front.length;
    const cy = front.reduce((sum, point) => sum + point.y, 0) / front.length;
    const ring = front.slice().sort((p, q) => Math.atan2(p.y - cy, p.x - cx) - Math.atan2(q.y - cy, q.x - cx));
    return '<polyline class="front" points="' + ring.map(point => n(point.x) + ',' + n(point.y)).join(' ') + '"/>';
  }
  function gridLines() {
    const out = [];
    for (const t of [0.2, 0.4, 0.6, 0.8]) {
      const pairs = [
        [[t, 0, 1 - t], [t, 1 - t, 0]],
        [[0, t, 1 - t], [1 - t, t, 0]],
        [[0, 1 - t, t], [1 - t, 0, t]]
      ];
      for (const pair of pairs) {
        const a = baryPoint(pair[0]), b = baryPoint(pair[1]);
        out.push('<line x1="' + n(a.x) + '" y1="' + n(a.y) + '" x2="' + n(b.x) + '" y2="' + n(b.y) + '"/>');
      }
    }
    return out.join('');
  }
  function markup(state, analysis) {
    const view = project(state, analysis);
    const axes = view.axes;
    const dotClass = status => status === 'FEASIBLE' ? 'dot' : status === 'UNCERTAIN' ? 'dot uncertain' : 'dot blocked';
    const dots = view.points.map(point => {
      const label = point.label + ' · ' + point.status + ' · ' + point.weights.map(w => Math.round(w * 100)).join('/');
      return (point.frontier ? '<circle class="ring" cx="' + n(point.x) + '" cy="' + n(point.y) + '" r="15"/>' : '') +
        '<circle class="' + dotClass(point.status) + '" cx="' + n(point.x) + '" cy="' + n(point.y) + '" r="9"><title>' + esc(label) + '</title></circle>';
    }).join('');
    const held = view.points.filter(point => point.selected).map(point =>
      '<g class="held"><line class="cross" x1="' + (n(point.x) - 14) + '" y1="' + n(point.y) + '" x2="' + (n(point.x) + 14) + '" y2="' + n(point.y) + '"/>' +
      '<line class="cross" x1="' + n(point.x) + '" y1="' + (n(point.y) - 14) + '" x2="' + n(point.x) + '" y2="' + (n(point.y) + 14) + '"/>' +
      '<text class="plabel" x="' + n(point.x) + '" y="' + (n(point.y) - 22) + '" text-anchor="middle">' + esc(point.label) + '</text></g>').join('');
    const note = 'TABLE IS CANONICAL · triangle is a projection of the entered numbers (min..max per axis) · ' +
      '● fit · ○ uncertain · dim blocked · gold ring non-dominated' +
      (view.excluded ? ' · ' + view.excluded + ' not plotted (unknown measure)' : '');
    return '<svg viewBox="0 0 600 520" role="img" aria-label="Entered options projected on a trade-off simplex; the numeric table remains canonical">' +
      '<polygon class="edge" points="300,55 65,450 535,450"/><g class="gridline">' + gridLines() + '</g>' +
      '<text class="axis" x="300" y="30" text-anchor="middle">' + esc(shortLabel(axes[0])) + '</text>' +
      '<text class="axis" x="14" y="484">' + esc(shortLabel(axes[1])) + '</text>' +
      '<text class="axis" x="586" y="484" text-anchor="end">' + esc(shortLabel(axes[2])) + '</text>' +
      frontierPath(view.points) + dots + held + '</svg><p class="triNote">' + esc(note) + '</p>';
  }
  return Object.freeze({ A, B, C, baryPoint, pointWeights, shortLabel, project, markup });
});
