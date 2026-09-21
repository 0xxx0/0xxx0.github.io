#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy>=2.0", "pillow>=10.0"]
# ///
"""FIELD MEDIA REFINERY batch worker. Read-only source; rendering disabled."""
from __future__ import annotations
import argparse, hashlib, html, importlib.util, json, math, shutil, subprocess, time
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any
import numpy as np
from PIL import Image, ImageOps

IM={'.png','.jpg','.jpeg','.webp','.tif','.tiff','.bmp','.gif'}
VID={'.mp4','.mov','.m4v','.webm','.mkv','.avi'}
FEATS=('luminance_mean','contrast','entropy','saturation','colorfulness','gradient_mean','gradient_p90','edge_density_strong','quiet_fraction','dark_fraction','light_fraction')
DEFAULT={'profile':'archive-recovery','recursive':True,'workers':4,'batching':{'max_items':24},'contact_sheets':True,'appearance_clustering':{'enabled':True,'max_clusters':8},'control_maps':{'mode':'exemplars','max_per_batch':4},'videos':{'probe':True,'extract_frames':False},'semantic':{'required_fields':['composition_class','composition_subtype','axis','scaffold','flow','depth','surface','pattern','meaning']},'recipes':{'auto_render':False,'max_candidates_per_batch':4},'exports':{'share':True,'memory':True}}

def dump(p,o): p.parent.mkdir(parents=True,exist_ok=True); p.write_text(json.dumps(o,indent=2,ensure_ascii=False,sort_keys=True)+'\n')
def load(p,d=None): return json.loads(p.read_text()) if p and p.exists() else d
def merge(a,b):
    o=dict(a)
    for k,v in b.items(): o[k]=merge(o[k],v) if isinstance(v,dict) and isinstance(o.get(k),dict) else v
    return o
def sha(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for x in iter(lambda:f.read(1<<20),b''): h.update(x)
    return h.hexdigest()
def sid(s,n=16): return hashlib.sha256(s.encode()).hexdigest()[:n]
def module(p):
    s=importlib.util.spec_from_file_location('field_media_refinery',p); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); return m
def discover(root,recursive=True):
    it=root.rglob('*') if recursive else root.iterdir(); out=[]
    for p in it:
        if not p.is_file() or p.suffix.lower() not in IM|VID: continue
        st=p.stat(); out.append({'rel':p.relative_to(root).as_posix(),'path':p,'kind':'image' if p.suffix.lower() in IM else 'video','bytes':st.st_size,'mtime_ns':st.st_mtime_ns})
    return sorted(out,key=lambda x:x['rel'].casefold())
def snapshot(rows): return hashlib.sha256(''.join(f"{r['rel']}\0{r['bytes']}\0{r['mtime_ns']}\0{r['kind']}\n" for r in rows).encode()).hexdigest()
def ffprobe(p):
    x=shutil.which('ffprobe')
    if not x:return {'available':False,'reason':'ffprobe_not_found'}
    try:
        q=subprocess.run([x,'-v','error','-show_entries','format=duration,size:stream=codec_type,codec_name,width,height,avg_frame_rate','-of','json',str(p)],capture_output=True,text=True,check=True,timeout=30)
        return {'available':True,**json.loads(q.stdout)}
    except Exception as e:return {'available':True,'error':type(e).__name__,'message':str(e)[:200]}
def probe_image(p):
    with Image.open(p) as im:
        x=ImageOps.exif_transpose(im); return {'width':x.width,'height':x.height,'mode':x.mode,'format':x.format}
def old_index(p):
    o={}
    if p.exists():
        for line in p.read_text().splitlines():
            if line.strip():
                r=json.loads(line);o[(r['relative_path'],r['bytes'],r['mtime_ns'])]=r
    return o
def standard(x):
    med=np.median(x,0); q1=np.percentile(x,25,0);q3=np.percentile(x,75,0);s=q3-q1;std=np.std(x,0);s=np.where(s<1e-9,np.where(std<1e-9,1,std),s);return (x-med)/s
def kmeans(x,k):
    k=max(1,min(k,len(x)));c=[x[0]]
    while len(c)<k:
        a=np.asarray(c);d=((x[:,None,:]-a[None,:,:])**2).sum(2).min(1);c.append(x[int(np.argmax(d))])
    c=np.asarray(c,float);lab=np.zeros(len(x),int)
    for _ in range(40):
        d=((x[:,None,:]-c[None,:,:])**2).sum(2);nl=np.argmin(d,1);nc=c.copy()
        for j in range(k):
            pts=x[nl==j]
            if len(pts):nc[j]=pts.mean(0)
        if np.array_equal(lab,nl) and np.allclose(c,nc):break
        lab,c=nl,nc
    return lab
def cluster(rows,mx):
    imgs=[r for r in rows if r['kind']=='image' and r.get('quantitative')]
    if not imgs:return {'clusters':0}
    if len(imgs)<4:
        for r in imgs:r['appearance_cluster']=0
        return {'clusters':1,'note':'too_few_images_for_useful_clustering'}
    x=standard(np.asarray([[r['quantitative'][k] for k in FEATS] for r in imgs],float));k=min(mx,max(2,round(math.sqrt(len(imgs)/2))));lab=kmeans(x,k)
    for r,v in zip(imgs,lab):r['appearance_cluster']=int(v)
    return {'clusters':k,'counts':dict(Counter(map(int,lab))),'features':list(FEATS),'law':'appearance clusters are triage only; not composition or meaning'}
def batches(rows,cap,scope):
    g=defaultdict(list)
    for r in rows:g[Path(r['relative_path']).parent.as_posix()].append(r)
    out=[]
    for parent in sorted(g):
        a=sorted(g[parent],key=lambda r:r['relative_path'].casefold())
        for off in range(0,len(a),cap):
            c=a[off:off+cap];ident=scope+parent+str(off)+'|'.join(r['item_id'] for r in c);out.append({'batch_id':'B-'+sid(ident),'source_group':parent,'ordinal':off//cap,'items':[r['item_id'] for r in c],'count':len(c)})
    return out
def overlay(mem,bid):
    p=mem/'semantic-overlays'/f'{bid}.json';d=load(p,{}) or {};return {x['item_id']:{k:v for k,v in x.items() if k!='item_id'} for x in d.get('items',[]) if x.get('item_id')}
def scalar(v): return json.dumps(v,ensure_ascii=False,sort_keys=True) if isinstance(v,(dict,list)) else str(v)
def review_task(b,rows,cfg):
    return {'schema':'0xxx0/media-semantic-review-task/v0.1','task_id':'SEM-'+b['batch_id'],'batch_id':b['batch_id'],'status':'WAITING_HUMAN_OR_MODEL_REVIEW','inputs':[{'item_id':r['item_id'],'sha256':r['sha256'],'relative_path':r['relative_path'],'appearance_cluster':r.get('appearance_cluster')} for r in rows if r['kind']=='image'],'required_fields':cfg['semantic']['required_fields'],'instructions':['Classify composition independently from appearance cluster.','Do not infer semantic lineage from filename alone.','Record uncertainty rather than forcing a class.'],'stop':'One overlay; no rendering from unreviewed semantic guesses.'}
def recipes(b,rows):
    imgs=[r for r in rows if r['kind']=='image' and r.get('quantitative')];out=[]
    if len(imgs)<2:return out
    a=min(imgs,key=lambda r:(r['quantitative']['contrast'],r['relative_path']));d=max(imgs,key=lambda r:(r['quantitative']['contrast'],r['relative_path']))
    out.append({'schema':'0xxx0/media-recipe-candidate/v0.1','id':'A-'+b['batch_id']+'-01','operator':'PAINT','hypothesis':'Aesthetic density can change while composition, pattern and meaning remain locked.','source':{'item_id':a['item_id'],'sha256':a['sha256']},'donor':{'item_id':d['item_id'],'sha256':d['sha256']},'unlock':['surface'],'lock':['composition','pattern','meaning','transformation'],'targets':{k:d['quantitative'][k] for k in ('contrast','luminance_mean','gradient_mean')},'backend':'UNBOUND','budget':{'max_outputs':1,'max_attempts':2,'allow_sweep':False},'status':'READY_FOR_TRANSLATE'})
    rv=[r for r in imgs if r.get('semantic')]
    if len(rv)<2:return out
    def pair(field):
        for x in rv:
            for y in rv:
                if x is not y and x['semantic'].get(field) and y['semantic'].get(field) and scalar(x['semantic'][field])!=scalar(y['semantic'][field]):return x,y
    p=pair('composition_class')
    if p:
        x,y=p;out.append({'schema':'0xxx0/media-recipe-candidate/v0.1','id':'C-'+b['batch_id']+'-01','operator':'COMPOSE','hypothesis':'Composition can change independently while surface, pattern and meaning remain locked.','source':{'item_id':x['item_id'],'sha256':x['sha256'],'composition':x['semantic']['composition_class']},'donor':{'item_id':y['item_id'],'sha256':y['sha256'],'composition':y['semantic']['composition_class']},'unlock':['composition'],'lock':['surface','pattern','meaning','transformation'],'scaffold_preference':['structure','focus','tone','layout/vector when available'],'backend':'UNBOUND','budget':{'max_outputs':1,'max_attempts':2,'allow_sweep':False},'status':'READY_FOR_COMPOSE_THEN_TRANSLATE'})
    for field,code,unlock,locks in [('pattern','P',['pattern'],['composition','surface','meaning','transformation']),('meaning','M',['meaning','transformation'],['composition','surface','pattern'])]:
        p=pair(field)
        if p:
            x,y=p;out.append({'schema':'0xxx0/media-recipe-candidate/v0.1','id':code+'-'+b['batch_id']+'-01','operator':'PAINT','hypothesis':f'{field.title()} can change while locked axes remain stable.','source':{'item_id':x['item_id'],'sha256':x['sha256'],field:x['semantic'][field]},'donor':{'item_id':y['item_id'],'sha256':y['sha256'],field:y['semantic'][field]},'unlock':unlock,'lock':locks,'backend':'UNBOUND','budget':{'max_outputs':1,'max_attempts':2,'allow_sweep':False},'status':'READY_FOR_TRANSLATE'})
    return out
def choose(rows,cap):
    imgs=[r for r in rows if r['kind']=='image' and r.get('quantitative')];g=defaultdict(list)
    for r in imgs:g[r.get('appearance_cluster',0)].append(r)
    o=[]
    for k in sorted(g):o.append(max(g[k],key=lambda r:r['quantitative']['entropy']))
    for r in sorted(imgs,key=lambda r:-r['quantitative']['contrast']):
        if r not in o:o.append(r)
    return o[:cap]
def share_page(run,bs,out):
    cards=[]
    for b in bs:
        im=f'<img src="../{html.escape(b["contact_sheet"])}">' if b.get('contact_sheet') else ''
        cards.append(f'<article><h2>{b["batch_id"]}</h2><p>{html.escape(b["source_group"])} · {b["count"]}</p>{im}</article>')
    out.parent.mkdir(parents=True,exist_ok=True);out.write_text('<!doctype html><meta charset=utf-8><style>body{font:15px system-ui;margin:2rem}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:1rem}article{border:1px solid #aaa;padding:1rem}img{width:100%}</style><h1>FIELD / MEDIA REFINERY</h1><p>'+run['run_id']+'</p><main>'+''.join(cards)+'</main>')

def main():
    ap=argparse.ArgumentParser();ap.add_argument('source_dir',type=Path);ap.add_argument('--out',type=Path,required=True);ap.add_argument('--config',type=Path);ap.add_argument('--profile');ap.add_argument('--refinery-script',type=Path,default=Path(__file__).with_name('media-refinery.py'));ap.add_argument('--workers',type=int);ap.add_argument('--max-files',type=int,default=0);ap.add_argument('--no-resume',action='store_true');a=ap.parse_args()
    root=a.source_dir.expanduser().resolve();out=a.out.expanduser().resolve()
    if not root.is_dir():raise SystemExit('source directory missing')
    if out==root or root in out.parents:raise SystemExit('refusing output inside source tree')
    doc=load(a.config,{}) or {};name=a.profile or doc.get('default_profile') or DEFAULT['profile'];cfg=merge(DEFAULT,doc.get('profiles',{}).get(name,{}) if 'profiles' in doc else doc);cfg=merge(cfg,doc.get('global',{}));cfg['profile']=name
    if a.workers:cfg['workers']=a.workers
    mod=module(a.refinery_script.resolve());src=discover(root,cfg.get('recursive',True));src=src[:a.max_files] if a.max_files else src;snap=snapshot(src);run_id='MR-'+snap[:12];mem=out/'memory';der=out/'derived';share=out/'share';mem.mkdir(parents=True,exist_ok=True)
    prev={} if a.no_resume else old_index(mem/'index.jsonl');rows=[];lookup={};todo=[]
    for s in src:
        r=prev.get((s['rel'],s['bytes'],s['mtime_ns']))
        if r and r.get('sha256') and (s['kind']!='image' or r.get('quantitative')):r=dict(r);r['reused']=True;rows.append(r);lookup[r['item_id']]=s['path']
        else:todo.append(s)
    def analyze(s):
        h=sha(s['path']);r={'schema':'0xxx0/media-index-record/v0.1','item_id':'media:'+h[:20],'relative_path':s['rel'],'kind':s['kind'],'bytes':s['bytes'],'mtime_ns':s['mtime_ns'],'sha256':h,'reused':False}
        try:
            if s['kind']=='image':r['probe']=probe_image(s['path']);r['quantitative']=mod.metrics(s['path'])
            else:r['probe']=ffprobe(s['path']) if cfg['videos'].get('probe',True) else {'skipped':True}
        except Exception as e:r['analysis_error']={'type':type(e).__name__,'message':str(e)[:200]}
        return r
    with ThreadPoolExecutor(max_workers=max(1,int(cfg['workers']))) as ex:
        fs={ex.submit(analyze,s):s for s in todo}
        for f in as_completed(fs):r=f.result();rows.append(r);lookup[r['item_id']]=fs[f]['path']
    rows.sort(key=lambda r:r['relative_path'].casefold());cnt=Counter(r['sha256'] for r in rows);dups=[{'sha256':h,'count':n,'items':[r['item_id'] for r in rows if r['sha256']==h]} for h,n in cnt.items() if n>1];cs=cluster(rows,int(cfg['appearance_clustering'].get('max_clusters',8))) if cfg['appearance_clustering'].get('enabled',True) else {'clusters':0,'disabled':True};bs=batches(rows,int(cfg['batching']['max_items']),snap);by={r['item_id']:r for r in rows};tasks=[];rq=[];workers=[]
    for b in bs:
        rr=[by[i] for i in b['items']];ov=overlay(mem,b['batch_id'])
        for r in rr:
            if r['item_id'] in ov:r['semantic']=ov[r['item_id']]
        if ov:b['semantic_overlay']=f"memory/semantic-overlays/{b['batch_id']}.json";b['semantic_reviewed_items']=sum(bool(r.get('semantic')) for r in rr)
        if cfg.get('contact_sheets'):
            items=[{'basename':r['relative_path'],'_path':str(lookup[r['item_id']])} for r in rr if r['kind']=='image'];p=der/'contact-sheets'/f"{b['batch_id']}.png"
            if items:mod.make_contact_sheet(items,p,cols=min(5,max(1,math.ceil(math.sqrt(len(items))))));b['contact_sheet']=p.relative_to(out).as_posix()
        exs=choose(rr,int(cfg['control_maps'].get('max_per_batch',4)));b['exemplars']=[r['item_id'] for r in exs]
        if cfg['control_maps'].get('mode')=='exemplars':
            maps={};md=der/'maps'/b['batch_id']
            for r in exs:maps[r['item_id']]=mod.write_maps({'_path':str(lookup[r['item_id']])},md)
            if maps:b['control_maps']=maps
        t=review_task(b,rr,cfg);tasks.append(t);b['semantic_task']=t['task_id'];rq.extend(recipes(b,rr)[:int(cfg['recipes'].get('max_candidates_per_batch',4))]);workers.append({'schema':'0xxx0/media-worker-packet/v0.1','packet_id':'WORK-'+b['batch_id'],'batch_id':b['batch_id'],'authority':'READ/ANALYZE/ANNOTATE_ONLY','inputs':[{'item_id':r['item_id'],'sha256':r['sha256'],'relative_path':r['relative_path']} for r in rr],'contact_sheet':b.get('contact_sheet'),'task':t,'domain_constraints':cfg.get('domain_constraints',[]),'expected_output':{'path':f"memory/semantic-overlays/{b['batch_id']}.json",'schema':'0xxx0/media-semantic-overlay/v0.1'},'stop':'Return one semantic overlay; no mutation, publication or generation.'})
    with (mem/'index.jsonl').open('w') as f:
        for r in rows:f.write(json.dumps(r,ensure_ascii=False,sort_keys=True)+'\n')
    dump(mem/'duplicates.json',dups);dump(mem/'batches.json',bs);dump(mem/'semantic-review-queue.json',tasks);dump(mem/'recipe-queue.json',rq)
    with (mem/'worker-packets.jsonl').open('w') as f:
        for w in workers:f.write(json.dumps(w,ensure_ascii=False,sort_keys=True)+'\n')
    run={'schema':'0xxx0/media-refinery-run/v0.1','run_id':run_id,'created_epoch':int(time.time()),'source':{'root_basename':root.name,'source_mutated':False},'source_snapshot':snap,'config':cfg,'counts':{'files':len(rows),'images':sum(r['kind']=='image' for r in rows),'videos':sum(r['kind']=='video' for r in rows),'byte_objects':len(cnt),'exact_duplicate_groups':len(dups),'reused_records':sum(bool(r.get('reused')) for r in rows),'newly_analyzed':sum(not bool(r.get('reused')) for r in rows),'batches':len(bs),'semantic_review_tasks':len(tasks),'semantic_overlays_loaded':sum(bool(b.get('semantic_overlay')) for b in bs),'recipe_candidates':len(rq)},'appearance_clustering':cs,'generation':{'performed':False,'law':'TRANSLATE/render is a separate bounded operation'},'next':'Review selected batches; rerun to compile C/A/P/M recipes; then TRANSLATE with explicit backend budget/stop.'};dump(mem/'run.json',run)
    if cfg['exports'].get('share',True):share_page(run,bs,share/'index.html')
    print(json.dumps({'run_id':run_id,**run['counts'],'source_mutated':False},indent=2))
if __name__=='__main__':main()
