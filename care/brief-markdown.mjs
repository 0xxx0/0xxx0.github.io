// A small, text-only Markdown renderer for the shared brief. No HTML execution.
export function appendMarkdown(parent, source, doc = document) {
  const make = (tag, value) => { const n = doc.createElement(tag); if (value != null) n.textContent = value; return n; };
  const inline = (node, value, depth = 0) => {
    if (depth > 6) { node.append(doc.createTextNode(value)); return; }
    const pattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\([^\s)]+\))/g;
    let offset = 0;
    for (const match of value.matchAll(pattern)) {
      node.append(doc.createTextNode(value.slice(offset, match.index)));
      const token = match[0]; let child;
      if (token.startsWith('`')) child = make('code', token.slice(1, -1));
      else if (token.startsWith('**')) { child = make('strong'); inline(child, token.slice(2, -2), depth + 1); }
      else if (token.startsWith('*')) { child = make('em'); inline(child, token.slice(1, -1), depth + 1); }
      else {
        const bits = /^\[([^\]]+)\]\(([^\s)]+)\)$/.exec(token);
        let url; try { url = new URL(bits[2]); } catch { /* Render malformed links as ordinary text. */ }
        child = make(url?.protocol === 'https:' ? 'a' : 'span', bits[1]);
        if (url?.protocol === 'https:') { child.href = url.href; child.target = '_blank'; child.rel = 'noopener noreferrer'; child.referrerPolicy = 'no-referrer'; }
      }
      node.append(child); offset = match.index + token.length;
    }
    node.append(doc.createTextNode(value.slice(offset)));
  };
  const lines = String(source || '').replace(/\r\n?/g, '\n').split('\n');
  const cells = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map(x => x.trim().replace(/\\\|/g, '|'));
  const divider = line => /\|/.test(line || '') && cells(line).every(x => /^:?-{3,}:?$/.test(x));
  const listItem = line => /^\s*(?:([-*+])|(\d+)\.)\s+(.+)$/.exec(line || '');
  const heading = line => /^(#{1,6})\s+(.+)$/.exec(line || '');
  const boundary = i => !lines[i]?.trim() || heading(lines[i]) || listItem(lines[i]) || /^>\s?/.test(lines[i]) || /^```/.test(lines[i]) || divider(lines[i + 1]);
  for (let i = 0; i < lines.length;) {
    const line = lines[i]; if (!line.trim()) { i++; continue; }
    const h = heading(line);
    if (h) { const n = make('h' + Math.min(h[1].length + 1, 6)); inline(n, h[2]); parent.append(n); i++; continue; }
    if (/^```/.test(line)) {
      const chunk = []; i++; while (i < lines.length && !/^```/.test(lines[i])) chunk.push(lines[i++]);
      const n = make('pre'); n.append(make('code', chunk.join('\n'))); parent.append(n); if (i < lines.length) i++; continue;
    }
    if (divider(lines[i + 1])) {
      const headers = cells(line), wrap = make('div'), table = make('table'), head = make('thead'), row = make('tr');
      wrap.className = 'table-wrap'; wrap.tabIndex = 0; wrap.setAttribute('role', 'region'); wrap.setAttribute('aria-label', headers.join(' / '));
      for (const title of headers) { const th = make('th'); th.scope = 'col'; inline(th, title); row.append(th); }
      head.append(row); table.append(head); const body = make('tbody'); i += 2;
      while (i < lines.length && lines[i].trim() && /\|/.test(lines[i])) {
        const values = cells(lines[i++]), tr = make('tr');
        for (let c = 0; c < headers.length; c++) { const td = make('td'); td.dataset.label = headers[c]; inline(td, values[c] || ''); tr.append(td); }
        body.append(tr);
      }
      table.append(body); wrap.append(table); parent.append(wrap); continue;
    }
    const first = listItem(line);
    if (first) {
      const ordered = Boolean(first[2]), list = make(ordered ? 'ol' : 'ul'); if (ordered) list.start = Number(first[2]);
      while (i < lines.length) { const match = listItem(lines[i]); if (!match || Boolean(match[2]) !== ordered) break; const li = make('li'); inline(li, match[3]); list.append(li); i++; }
      parent.append(list); continue;
    }
    if (/^>\s?/.test(line)) { const quote = []; while (i < lines.length && /^>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, '')); const n = make('blockquote'); inline(n, quote.join('\n')); parent.append(n); continue; }
    if (/^\s*(?:-{3,}|\*{3,})\s*$/.test(line)) { parent.append(make('hr')); i++; continue; }
    const chunk = [line.trim()]; i++; while (i < lines.length && !boundary(i)) chunk.push(lines[i++].trim());
    const n = make('p'); inline(n, chunk.join(' ')); parent.append(n);
  }
}
