from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


def sha256_file(path: str | Path) -> str:
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def _parts_to_text(parts) -> str:
    out=[]
    for p in parts or []:
        if isinstance(p, str):
            out.append(p)
        elif isinstance(p, dict):
            # Preserve structured fragments without inventing prose.
            out.append(json.dumps(p, ensure_ascii=False, sort_keys=True))
    return '\n'.join(out).strip()


def _iso(ts):
    if ts is None:
        return None
    try:
        return datetime.fromtimestamp(float(ts), tz=timezone.utc).isoformat()
    except Exception:
        return None


def current_branch_messages(conv: dict) -> list[dict]:
    """Return message-bearing nodes on the current branch, root -> current_node.

    ChatGPT exports keep a mapping graph. Traversing parent pointers from current_node
    avoids accidentally treating abandoned sibling branches as part of one linear thread.
    """
    mapping = conv.get('mapping') or {}
    nid = conv.get('current_node')
    chain=[]; seen=set()
    while nid and nid not in seen:
        seen.add(nid)
        node = mapping.get(nid)
        if not node:
            break
        chain.append(node)
        nid = node.get('parent')
    chain.reverse()
    rows=[]
    for node in chain:
        msg=node.get('message')
        if not msg:
            continue
        content=msg.get('content') or {}
        text=_parts_to_text(content.get('parts'))
        if not text:
            continue
        author=msg.get('author') or {}
        rows.append({
            'message_id': msg.get('id') or node.get('id'),
            'node_id': node.get('id'),
            'parent_node_id': node.get('parent'),
            'role': author.get('role'),
            'author_name': author.get('name'),
            'create_time': _iso(msg.get('create_time')),
            'content_type': content.get('content_type'),
            'text': text,
        })
    return rows


def slugify(s: str) -> str:
    s=re.sub(r'[^\w\-]+','-',s.strip(),flags=re.UNICODE).strip('-').lower()
    return s[:80] or 'thread'


def load_export(path: str | Path) -> list[dict]:
    with open(path,'r',encoding='utf-8') as f:
        obj=json.load(f)
    if not isinstance(obj,list):
        raise ValueError(f'Expected ChatGPT conversations export list: {path}')
    return obj


def freeze_chatgpt_exports(export_paths: Iterable[str | Path], selectors: list[dict], out_dir: str | Path) -> dict:
    """Freeze selected conversations with regenerable provenance.

    selectors contain conversation_id and optional label/tags. Exact source export hashes,
    selected branch and extracted text hashes are recorded in manifest.json.
    """
    out=Path(out_dir); raw_dir=out/'raw'; raw_dir.mkdir(parents=True,exist_ok=True)
    exports={}
    conversations={}
    for ep in export_paths:
        ep=Path(ep)
        h=sha256_file(ep)
        exports[str(ep.resolve())]={'name':ep.name,'sha256':h,'size_bytes':ep.stat().st_size}
        for conv in load_export(ep):
            cid=conv.get('conversation_id') or conv.get('id')
            if cid:
                conversations[cid]=(conv,ep,h)

    records=[]
    for i,sel in enumerate(selectors,1):
        cid=sel['conversation_id']
        if cid not in conversations:
            raise KeyError(f'Conversation not found in supplied exports: {cid}')
        conv,ep,eh=conversations[cid]
        messages=current_branch_messages(conv)
        title=conv.get('title') or cid
        stem=f'{i:02d}-{slugify(title)}-{cid[:8]}'
        jsonl_path=raw_dir/(stem+'.jsonl')
        md_path=raw_dir/(stem+'.md')
        with jsonl_path.open('w',encoding='utf-8') as f:
            for n,m in enumerate(messages,1):
                f.write(json.dumps({'turn_index':n,**m},ensure_ascii=False,sort_keys=True)+'\n')
        md=[]
        md.append(f'# {title}')
        md.append('')
        md.append(f'- conversation_id: `{cid}`')
        md.append(f'- source_export_sha256: `{eh}`')
        md.append(f'- current_node: `{conv.get("current_node")}`')
        md.append(f'- create_time: `{_iso(conv.get("create_time"))}`')
        md.append('')
        for n,m in enumerate(messages,1):
            md.append(f'## turn:{n:04d} · {m.get("role") or "unknown"}')
            if m.get('create_time'):
                md.append(f'`{m["create_time"]}`')
            md.append('')
            md.append(m['text'])
            md.append('')
        md_text='\n'.join(md)
        md_path.write_text(md_text,encoding='utf-8')
        records.append({
            'ordinal':i,
            'conversation_id':cid,
            'title':title,
            'tags':sel.get('tags',[]),
            'label':sel.get('label'),
            'source_export':ep.name,
            'source_export_sha256':eh,
            'current_node':conv.get('current_node'),
            'create_time':_iso(conv.get('create_time')),
            'message_count':len(messages),
            'jsonl':str(jsonl_path.relative_to(out)),
            'markdown':str(md_path.relative_to(out)),
            'markdown_sha256':sha256_text(md_text),
            'char_count':len(md_text),
        })
    manifest={
        'schema':'omega.corpus.freeze.v1',
        'created_at':datetime.now(timezone.utc).isoformat(),
        'selection_rule':'explicit conversation IDs; current branch only; no memory reconstruction',
        'exports':list(exports.values()),
        'conversations':records,
        'total_messages':sum(r['message_count'] for r in records),
        'total_chars':sum(r['char_count'] for r in records),
    }
    (out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2,sort_keys=True),encoding='utf-8')
    return manifest
