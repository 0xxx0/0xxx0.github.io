from __future__ import annotations
import hashlib, html, math
from pathlib import Path
from .db import connect


def render_dot(db_path, output):
    con=connect(db_path)
    try:
        nodes=con.execute("SELECT id,type,text,status FROM node ORDER BY id").fetchall()
        rels=con.execute("SELECT subject_id,predicate,object_id FROM relation ORDER BY id").fetchall()
    finally: con.close()
    lines=["digraph omega {", '  graph [rankdir="LR"];', '  node [shape="box",fontname="sans-serif"];']
    for n in nodes:
        label=f"[{n['type']}] {n['text']}".replace('"','\\"')
        lines.append(f'  "{n["id"]}" [label="{label}"];')
    for r in rels:
        lines.append(f'  "{r["subject_id"]}" -> "{r["object_id"]}" [label="{r["predicate"]}"];')
    lines.append("}")
    Path(output).write_text("\n".join(lines),encoding="utf-8")
    return output


def angle_for(s: str) -> float:
    h=int(hashlib.sha256(s.encode()).hexdigest()[:12],16)
    return (h/(16**12))*2*math.pi


def _pt(cx,cy,r,a): return cx+r*math.cos(a), cy+r*math.sin(a)


def render_datadisc(db_path, output, query_label="CURRENT TASK"):
    con=connect(db_path)
    try:
        nodes=[dict(x) for x in con.execute("SELECT id,type,text,status FROM node ORDER BY id").fetchall()]
        sources=[dict(x) for x in con.execute("SELECT id,title FROM source ORDER BY id").fetchall()]
        episodes=[dict(x) for x in con.execute("SELECT id,title FROM episode ORDER BY id").fetchall()]
        rels=[dict(x) for x in con.execute("SELECT subject_id,predicate,object_id FROM relation ORDER BY id").fetchall()]
    finally: con.close()
    W=H=1000; cx=cy=500
    radii={"task":70,"semantic":230,"episode":340,"source":440}
    pos={}
    out=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}">',
         '<rect width="100%" height="100%" fill="white"/>',
         '<g fill="none" stroke="black" stroke-width="1">']
    for r in radii.values(): out.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" opacity="0.20"/>')
    out.append('</g>')
    out.append(f'<circle cx="{cx}" cy="{cy}" r="58" fill="white" stroke="black" stroke-width="2"/>')
    out.append(f'<text x="{cx}" y="{cy}" text-anchor="middle" font-family="monospace" font-size="14">{html.escape(query_label)}</text>')
    for n in nodes:
        a=angle_for(n['id']); x,y=_pt(cx,cy,radii['semantic'],a); pos[n['id']]=(x,y)
    # explicit graph relations only; spatial proximity is not treated as semantics.
    out.append('<g stroke="black" stroke-width="1" opacity="0.45">')
    for r in rels:
        if r['subject_id'] in pos and r['object_id'] in pos:
            x1,y1=pos[r['subject_id']]; x2,y2=pos[r['object_id']]
            dash=' stroke-dasharray="5,4"' if r['predicate']=='CONTRADICTS' else ''
            out.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}"{dash}/>')
    out.append('</g>')
    glyph={"ENT":"E","EVT":"V","OBS":"O","CLM":"C","CON":"K","DEC":"D","ART":"A","TST":"T","QST":"Q","ACT":"X"}
    out.append('<g font-family="monospace">')
    for n in nodes:
        x,y=pos[n['id']]
        out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="11" fill="white" stroke="black" stroke-width="2"/>')
        out.append(f'<text x="{x:.1f}" y="{y+4:.1f}" text-anchor="middle" font-size="11">{glyph.get(n["type"],"?")}</text>')
        label=n['text'][:36] + ('…' if len(n['text'])>36 else '')
        out.append(f'<text x="{x+15:.1f}" y="{y+4:.1f}" font-size="9">{html.escape(label)}</text>')
    for e in episodes:
        a=angle_for(e['id']); x,y=_pt(cx,cy,radii['episode'],a)
        out.append(f'<rect x="{x-7:.1f}" y="{y-7:.1f}" width="14" height="14" fill="white" stroke="black"/>')
    for s in sources:
        a=angle_for(s['id']); x,y=_pt(cx,cy,radii['source'],a)
        out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="5" fill="black"/>')
    out.append('</g>')
    out.append('<text x="20" y="30" font-family="monospace" font-size="13">radius: TASK → SEMANTIC → EPISODE → SOURCE</text>')
    out.append('<text x="20" y="50" font-family="monospace" font-size="11">angle: stable hash address; lines: explicit relations; proximity: layout only</text>')
    out.append('</svg>')
    Path(output).write_text("\n".join(out),encoding="utf-8")
    return output



def _field_y(identifier: str, top: float = 105, bottom: float = 615) -> float:
    """Stable nominal vertical address; magnitude has no semantic meaning."""
    h=int(hashlib.sha256(identifier.encode()).hexdigest()[:12],16)
    return top + (h/(16**12))*(bottom-top)


def _cubic(x1,y1,x2,y2,bend=0.42):
    dx=x2-x1
    return f"M {x1:.1f},{y1:.1f} C {x1+dx*bend:.1f},{y1:.1f} {x2-dx*bend:.1f},{y2:.1f} {x2:.1f},{y2:.1f}"


def render_field(db_path, output, query_label="CURRENT TASK"):
    """FIELD/BRUSH v0: a conservative continuous-field projection.

    x-position is ordered process stage (SOURCE -> FOCUS -> RETURN); stable-y is
    nominal address only. Each evidence strand is backed by a node_source record.
    Styling never creates a semantic relation that is absent from the database.
    """
    con=connect(db_path)
    try:
        sources=[dict(x) for x in con.execute("SELECT id,title FROM source ORDER BY id").fetchall()]
        nodes=[dict(x) for x in con.execute("SELECT id,type,text,status FROM node ORDER BY id").fetchall()]
        ev=[dict(x) for x in con.execute("""SELECT ns.node_id,ns.evidence_root,sp.source_id,ns.source_role
             FROM node_source ns JOIN span sp ON sp.id=ns.span_id ORDER BY ns.node_id,sp.source_id""").fetchall()]
        rels=[dict(x) for x in con.execute("SELECT subject_id,predicate,object_id FROM relation ORDER BY id").fetchall()]
    finally:
        con.close()
    W,H=1200,720; xin,xfocus,xout=105,600,1095; cy=360
    source_pos={x['id']:(xin,_field_y(x['id'])) for x in sources}
    node_pos={n['id']:(xfocus,_field_y(n['id'],155,565)) for n in nodes}
    out=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}">',
         '<rect width="100%" height="100%" fill="#f4f0e7"/>',
         '<g font-family="monospace" fill="#171717">',
         '<text x="70" y="55" font-size="12" font-weight="700">INPUT / EVIDENCE</text>',
         '<text x="600" y="55" font-size="12" font-weight="700" text-anchor="middle">FOCUS / CENTER MASS</text>',
         '<text x="1130" y="55" font-size="12" font-weight="700" text-anchor="end">OUTPUT / RETURN</text>',
         '</g>',
         '<line x1="70" y1="78" x2="1130" y2="78" stroke="#bbb5aa"/>']
    # evidence strands: one path per explicit node-source relation.
    for e in ev:
        if e['source_id'] not in source_pos or e['node_id'] not in node_pos: continue
        x1,y1=source_pos[e['source_id']]; x2,y2=node_pos[e['node_id']]
        dash=' stroke-dasharray="5 5"' if e['source_role'] not in {'supports','observes'} else ''
        out.append(f'<path d="{_cubic(x1,y1,x2,y2)}" fill="none" stroke="#272727" stroke-width="1.25" opacity="0.62"{dash}/>')
    # explicit semantic relations around focus; short arcs only.
    for r in rels:
        if r['subject_id'] not in node_pos or r['object_id'] not in node_pos: continue
        x1,y1=node_pos[r['subject_id']]; x2,y2=node_pos[r['object_id']]
        midx=xfocus+58
        dash=' stroke-dasharray="5 5"' if r['predicate']=='CONTRADICTS' else ''
        out.append(f'<path d="M {x1:.1f},{y1:.1f} C {midx:.1f},{y1:.1f} {midx:.1f},{y2:.1f} {x2:.1f},{y2:.1f}" fill="none" stroke="#66615a" stroke-width="1"{dash}/>')
    # source endpoints and labels.
    for src in sources:
        x,y=source_pos[src['id']]
        out.append(f'<circle cx="{x}" cy="{y:.1f}" r="4" fill="#171717"/>')
        out.append(f'<text x="{x+10}" y="{y+3:.1f}" font-family="monospace" font-size="9" fill="#5e5a54">{html.escape((src.get("title") or src["id"])[:38])}</text>')
    glyph={"ENT":"E","EVT":"V","OBS":"O","CLM":"C","CON":"K","DEC":"D","ART":"A","TST":"T","QST":"Q","ACT":"X"}
    # semantic nodes act as bristle convergence points.
    for n in nodes:
        x,y=node_pos[n['id']]
        out.append(f'<circle cx="{x}" cy="{y:.1f}" r="8" fill="#f4f0e7" stroke="#171717" stroke-width="1.4"/>')
        out.append(f'<text x="{x}" y="{y+3.2:.1f}" text-anchor="middle" font-family="monospace" font-size="8" font-weight="700">{glyph.get(n["type"],"?")}</text>')
        out.append(f'<text x="{x+13}" y="{y+3:.1f}" font-family="monospace" font-size="9" fill="#171717">{html.escape(n["text"][:48])}</text>')
    # center mass is task identity, not another semantic node.
    out.append(f'<circle cx="{xfocus}" cy="{cy}" r="52" fill="none" stroke="#171717" stroke-width="1.8" opacity=".28"/>')
    out.append(f'<text x="{xfocus}" y="{cy-66}" text-anchor="middle" font-family="monospace" font-size="11" font-weight="700">{html.escape(query_label)}</text>')
    # forward return vector: explicitly generic; not evidence.
    out.append(f'<path d="M {xfocus+70},{cy} C 790,{cy} 925,{cy} {xout},{cy}" fill="none" stroke="#171717" stroke-width="2"/>')
    out.append(f'<path d="M {xout-12},{cy-7} L {xout},{cy} L {xout-12},{cy+7}" fill="none" stroke="#171717" stroke-width="2"/>')
    out.append(f'<text x="{xout}" y="{cy-14}" text-anchor="end" font-family="monospace" font-size="10">NEXT TRANSFORM / TEST / ARTIFACT</text>')
    out.append('<text x="70" y="687" font-family="monospace" font-size="10" fill="#5e5a54">FIELD/BRUSH v0 · x=process stage · y=stable nominal address · strands=explicit evidence · topology experimental · diffusion unassigned</text>')
    out.append('</svg>')
    Path(output).write_text("\n".join(out),encoding="utf-8")
    return output
