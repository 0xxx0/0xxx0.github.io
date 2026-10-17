from __future__ import annotations

import json
import math
import re
import sqlite3
import statistics
import time
from collections import defaultdict
from pathlib import Path
from typing import Iterable


def iter_jsonl(path):
    with open(path,'r',encoding='utf-8') as f:
        for line in f:
            line=line.strip()
            if line:
                yield json.loads(line)


def source_turn_id(conversation_id: str, turn_index: int) -> str:
    return f'chat:{conversation_id}:turn:{turn_index:04d}'


def build_r0_units(corpus_dir: str | Path, output: str | Path) -> dict:
    corpus=Path(corpus_dir)
    manifest=json.loads((corpus/'manifest.json').read_text(encoding='utf-8'))
    out=Path(output); out.parent.mkdir(parents=True,exist_ok=True)
    n=0; chars=0
    with out.open('w',encoding='utf-8') as w:
        for conv in manifest['conversations']:
            jp=corpus/conv['jsonl']
            for row in iter_jsonl(jp):
                sid=source_turn_id(conv['conversation_id'],row['turn_index'])
                unit={
                    'unit_id':sid,
                    'representation':'R0_RAW_TURN',
                    'text':row['text'],
                    'source_turn_ids':[sid],
                    'source_root_ids':[f'chat:{conv["conversation_id"]}'],
                    'conversation_id':conv['conversation_id'],
                    'turn_index':row['turn_index'],
                    'role':row.get('role'),
                    'title':conv['title'],
                }
                w.write(json.dumps(unit,ensure_ascii=False,sort_keys=True)+'\n')
                n += 1; chars += len(row['text'])
    result={'representation':'R0_RAW_TURN','units':n,'text_chars':chars,'output':str(out)}
    return result


def _fts_query(q: str) -> str:
    terms=re.findall(r"[\w'-]+",q.lower(),flags=re.UNICODE)
    # Preserve order-neutral lexical baseline; quote to avoid executing FTS syntax.
    return ' OR '.join('"'+t.replace('"','')+'"' for t in terms if t)


def _index_units(units_path: str | Path):
    con=sqlite3.connect(':memory:')
    con.row_factory=sqlite3.Row
    con.execute('CREATE TABLE units(unit_id TEXT PRIMARY KEY,text TEXT NOT NULL,source_turn_ids_json TEXT NOT NULL,meta_json TEXT NOT NULL)')
    fts=True
    try:
        con.execute('CREATE VIRTUAL TABLE fts USING fts5(unit_id UNINDEXED,text)')
    except sqlite3.OperationalError:
        fts=False
    count=0; chars=0
    for u in iter_jsonl(units_path):
        txt=u['text']; chars += len(txt); count += 1
        con.execute('INSERT INTO units VALUES(?,?,?,?)',(
            u['unit_id'],txt,json.dumps(u.get('source_turn_ids',[])),json.dumps({k:v for k,v in u.items() if k not in ('text','source_turn_ids')})
        ))
        if fts:
            con.execute('INSERT INTO fts VALUES(?,?)',(u['unit_id'],txt))
    con.commit()
    return con,fts,count,chars


def search_units(con,fts: bool,query: str,limit: int=10):
    if fts:
        q=_fts_query(query)
        if not q: return []
        rows=con.execute('SELECT unit_id,bm25(fts) score FROM fts WHERE fts MATCH ? ORDER BY score LIMIT ?',(q,limit)).fetchall()
    else:
        terms=re.findall(r"[\w'-]+",query.lower(),flags=re.UNICODE)
        rows=[]
        # inspectable fallback, not intended to be fast
        for r in con.execute('SELECT unit_id,text FROM units'):
            score=sum(r['text'].lower().count(t) for t in terms)
            if score: rows.append({'unit_id':r['unit_id'],'score':-score})
        rows=sorted(rows,key=lambda x:x['score'])[:limit]
    out=[]
    for r in rows:
        u=con.execute('SELECT * FROM units WHERE unit_id=?',(r['unit_id'],)).fetchone()
        meta=json.loads(u['meta_json'])
        out.append({
            'unit_id':u['unit_id'],
            'score':r['score'],
            'source_turn_ids':json.loads(u['source_turn_ids_json']),
            'source_root_ids':meta.get('source_root_ids',[]),
            'text':u['text'],
            'meta':meta,
        })
    return out


def _source_rank(gold: set[str], hits) -> int | None:
    for i,h in enumerate(hits,1):
        if gold.intersection(h.get('source_turn_ids',[])):
            return i
    return None


def _coverage_at(gold: set[str], hits, k: int) -> float:
    if not gold:
        return 1.0
    got=set()
    for h in hits[:k]:
        got.update(h.get('source_turn_ids',[]))
    return len(gold & got)/len(gold)


def _root_coverage_at(gold: set[str], hits, k: int) -> float:
    if not gold:
        return 1.0
    got=set()
    for h in hits[:k]:
        got.update(h.get('source_root_ids',[]))
    return len(gold & got)/len(gold)


def _root_from_turn(turn_id: str) -> str:
    parts=turn_id.split(':')
    return ':'.join(parts[:2]) if len(parts)>=2 else turn_id


def _answer_token_coverage(answer_points: list[str], hits, k: int) -> float | None:
    if not answer_points:
        return None
    bag=set()
    for h in hits[:k]:
        bag.update(_tokens(h.get('text','')))
    vals=[]
    for p in answer_points:
        toks=set(_tokens(p))
        if not toks:
            continue
        vals.append(len(toks & bag)/len(toks))
    return None if not vals else sum(vals)/len(vals)

def run_retrieval_benchmark(units_path: str | Path, questions_path: str | Path, *, max_k: int=20, raw_chars: int | None=None) -> dict:
    con,fts,n_units,chars=_index_units(units_path)
    rows=[]
    cats=defaultdict(list)
    try:
        for q in iter_jsonl(questions_path):
            gold=set(q.get('gold_turn_ids',[]))
            gold_roots=set(q.get('gold_root_ids') or [_root_from_turn(x) for x in gold])
            t0=time.perf_counter(); hits=search_units(con,fts,q['query'],limit=max_k); ms=(time.perf_counter()-t0)*1000
            rank=_source_rank(gold,hits)
            answer_points=q.get('answer_points') or []
            row={
                'id':q['id'],'class':q.get('class'),'query':q['query'],'gold_turn_ids':sorted(gold),'gold_root_ids':sorted(gold_roots),'answer_points':answer_points,
                'rank':rank,'rr':0.0 if rank is None else 1.0/rank,'latency_ms':round(ms,3),
                'hit@1':bool(rank and rank<=1),'hit@3':bool(rank and rank<=3),'hit@5':bool(rank and rank<=5),'hit@10':bool(rank and rank<=10),
                'coverage@1':round(_coverage_at(gold,hits,1),4),'coverage@3':round(_coverage_at(gold,hits,3),4),
                'coverage@5':round(_coverage_at(gold,hits,5),4),'coverage@10':round(_coverage_at(gold,hits,10),4),
                'root_coverage@1':round(_root_coverage_at(gold_roots,hits,1),4),'root_coverage@3':round(_root_coverage_at(gold_roots,hits,3),4),
                'root_coverage@5':round(_root_coverage_at(gold_roots,hits,5),4),'root_coverage@10':round(_root_coverage_at(gold_roots,hits,10),4),
                'full@1':_coverage_at(gold,hits,1)>=1.0,'full@3':_coverage_at(gold,hits,3)>=1.0,
                'full@5':_coverage_at(gold,hits,5)>=1.0,'full@10':_coverage_at(gold,hits,10)>=1.0,
                'answer_token_coverage@1':_answer_token_coverage(answer_points,hits,1),
                'answer_token_coverage@3':_answer_token_coverage(answer_points,hits,3),
                'answer_token_coverage@5':_answer_token_coverage(answer_points,hits,5),
                'answer_token_coverage@10':_answer_token_coverage(answer_points,hits,10),
                'top_hits':[{'unit_id':h['unit_id'],'source_turn_ids':h['source_turn_ids'],'source_root_ids':h.get('source_root_ids',[]),'title':h['meta'].get('title'),'turn_index':h['meta'].get('turn_index')} for h in hits[:10]],
            }
            rows.append(row); cats[q.get('class') or 'UNCLASSIFIED'].append(row)
        def agg(rs):
            if not rs: return {'n':0}
            def mean_present(field):
                vals=[r[field] for r in rs if r.get(field) is not None]
                return None if not vals else round(statistics.mean(vals),4)
            return {
                'n':len(rs),
                'mrr':round(statistics.mean(r['rr'] for r in rs),4),
                'hit@1':round(statistics.mean(r['hit@1'] for r in rs),4),
                'hit@3':round(statistics.mean(r['hit@3'] for r in rs),4),
                'hit@5':round(statistics.mean(r['hit@5'] for r in rs),4),
                'hit@10':round(statistics.mean(r['hit@10'] for r in rs),4),
                'coverage@1':round(statistics.mean(r['coverage@1'] for r in rs),4),
                'coverage@3':round(statistics.mean(r['coverage@3'] for r in rs),4),
                'coverage@5':round(statistics.mean(r['coverage@5'] for r in rs),4),
                'coverage@10':round(statistics.mean(r['coverage@10'] for r in rs),4),
                'root_coverage@1':round(statistics.mean(r['root_coverage@1'] for r in rs),4),
                'root_coverage@3':round(statistics.mean(r['root_coverage@3'] for r in rs),4),
                'root_coverage@5':round(statistics.mean(r['root_coverage@5'] for r in rs),4),
                'root_coverage@10':round(statistics.mean(r['root_coverage@10'] for r in rs),4),
                'full@10':round(statistics.mean(r['full@10'] for r in rs),4),
                'answer_token_coverage@1':mean_present('answer_token_coverage@1'),
                'answer_token_coverage@3':mean_present('answer_token_coverage@3'),
                'answer_token_coverage@5':mean_present('answer_token_coverage@5'),
                'answer_token_coverage@10':mean_present('answer_token_coverage@10'),
                'mean_latency_ms':round(statistics.mean(r['latency_ms'] for r in rs),3),
            }
        result={
            'schema':'omega.benchmark.result.v1',
            'representation_path':str(units_path),
            'representation_units':n_units,
            'representation_chars':chars,
            'raw_chars':raw_chars,
            'compression_ratio_chars':None if not raw_chars else round(chars/raw_chars,6),
            'fts5':fts,
            'aggregate':agg(rows),
            'by_class':{k:agg(v) for k,v in sorted(cats.items())},
            'rows':rows,
        }
        return result
    finally:
        con.close()


def validate_questions(corpus_dir: str | Path, questions_path: str | Path) -> dict:
    corpus=Path(corpus_dir)
    manifest=json.loads((corpus/'manifest.json').read_text(encoding='utf-8'))
    available=set()
    for conv in manifest['conversations']:
        for row in iter_jsonl(corpus/conv['jsonl']):
            available.add(source_turn_id(conv['conversation_id'],row['turn_index']))
    issues=[]; ids=set(); counts=defaultdict(int)
    for i,q in enumerate(iter_jsonl(questions_path),1):
        qid=q.get('id')
        if not qid: issues.append({'line':i,'code':'MISSING_ID'})
        elif qid in ids: issues.append({'line':i,'code':'DUPLICATE_ID','id':qid})
        ids.add(qid)
        if not q.get('query'): issues.append({'line':i,'code':'MISSING_QUERY','id':qid})
        gold=q.get('gold_turn_ids') or []
        if not gold and not q.get('abstain'):
            issues.append({'line':i,'code':'MISSING_GOLD','id':qid})
        for g in gold:
            if g not in available: issues.append({'line':i,'code':'UNKNOWN_GOLD_TURN','id':qid,'turn':g})
        counts[q.get('class') or 'UNCLASSIFIED'] += 1
    return {'ok':not issues,'n':len(ids),'classes':dict(sorted(counts.items())),'issues':issues}

_STOPWORDS=set('''the a an and or but if then else of to in on for with as at by from is are was were be been being this that these those it its i you we they he she them our your my me us do does did can could should would will may might not no yes have has had what which who where when why how into over under more less very just also only than about across after before while one two all any some such there here'''.split())


def _tokens(text: str) -> list[str]:
    return [t for t in re.findall(r"[\w'-]+",text.lower(),flags=re.UNICODE) if len(t)>1 and t not in _STOPWORDS]


def _segments(text: str) -> list[str]:
    # Paragraph first, then sentence-ish splits for long paragraphs. Exact substrings remain intact.
    paras=[p.strip() for p in re.split(r'\n\s*\n+',text) if p.strip()]
    out=[]
    for p in paras:
        if len(p)<=700:
            out.append(p); continue
        parts=[s.strip() for s in re.split(r'(?<=[.!?。！？])\s+(?=[A-Z0-9\[\("“‘\w])',p) if s.strip()]
        if len(parts)==1:
            # Bound pathological markdown/code blocks without semantic rewriting.
            parts=[p[i:i+650] for i in range(0,len(p),650)]
        out.extend(parts)
    return out


def build_extractive_units(corpus_dir: str | Path, output: str | Path, *, ratio: float=0.10, min_segments_per_thread: int=3) -> dict:
    if not (0 < ratio <= 1): raise ValueError('ratio must be in (0,1]')
    corpus=Path(corpus_dir)
    manifest=json.loads((corpus/'manifest.json').read_text(encoding='utf-8'))
    outp=Path(output); outp.parent.mkdir(parents=True,exist_ok=True)
    total_raw=0; selected_chars=0; n=0
    with outp.open('w',encoding='utf-8') as w:
        for conv in manifest['conversations']:
            candidates=[]; freq=defaultdict(int)
            for row in iter_jsonl(corpus/conv['jsonl']):
                sid=source_turn_id(conv['conversation_id'],row['turn_index'])
                total_raw += len(row['text'])
                for j,seg in enumerate(_segments(row['text'])):
                    toks=_tokens(seg)
                    if not toks: continue
                    candidates.append({'seg':seg,'tokens':toks,'source_turn_id':sid,'turn_index':row['turn_index'],'role':row.get('role'),'seg_index':j})
                    for t in toks: freq[t]+=1
            if not candidates: continue
            target=max(1,int(sum(len(c['seg']) for c in candidates)*ratio))
            for c in candidates:
                # Centrality with a light specificity term; no domain-specific keywords.
                tf=sum(math.log1p(freq[t]) for t in c['tokens'])/math.sqrt(len(c['tokens']))
                unique=len(set(c['tokens']))/len(c['tokens'])
                c['score']=tf*(0.75+0.25*unique)
            ranked=sorted(candidates,key=lambda c:(-c['score'],c['turn_index'],c['seg_index']))
            chosen=[]; used=0
            for c in ranked:
                if len(chosen)>=min_segments_per_thread and used>=target: break
                # simple redundancy guard
                st=set(c['tokens'])
                if any(len(st & set(x['tokens']))/max(1,len(st | set(x['tokens'])))>0.72 for x in chosen):
                    continue
                chosen.append(c); used += len(c['seg'])
            chosen.sort(key=lambda c:(c['turn_index'],c['seg_index']))
            for k,c in enumerate(chosen,1):
                unit={
                    'unit_id':f'extract:{conv["conversation_id"]}:{k:04d}',
                    'representation':f'R1_EXTRACTIVE_{int(ratio*100):02d}',
                    'text':c['seg'],
                    'source_turn_ids':[c['source_turn_id']],
                    'source_root_ids':[f'chat:{conv["conversation_id"]}'],
                    'conversation_id':conv['conversation_id'],'turn_index':c['turn_index'],'role':c['role'],'title':conv['title'],
                    'selection_score':round(c['score'],6),
                }
                w.write(json.dumps(unit,ensure_ascii=False,sort_keys=True)+'\n')
                n+=1; selected_chars+=len(c['seg'])
    return {
        'representation':f'R1_EXTRACTIVE_{int(ratio*100):02d}','units':n,'text_chars':selected_chars,
        'raw_text_chars':total_raw,'actual_ratio':round(selected_chars/total_raw,6) if total_raw else None,'output':str(outp)
    }
