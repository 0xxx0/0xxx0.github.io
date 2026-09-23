export const PROJECTIONS = Object.freeze(["LINE","FLOWER_KEY","RADIAL","ROOM","GLYPH"]);
export const OFFICES = Object.freeze([
  {id:"SOURCE", label:"SOURCE", prompt:"material / input / object"},
  {id:"FRAME", label:"FRAME", prompt:"context / constraints / relations"},
  {id:"FOCUS", label:"FOCUS", prompt:"current object / working surface"},
  {id:"OPERATE", label:"OPERATE", prompt:"actions / transforms / choices"},
  {id:"WITNESS", label:"WITNESS", prompt:"evidence / preview / delta"},
  {id:"RETURN", label:"RETURN", prompt:"history / provenance / exit"}
]);
export const EXPLICIT_PRIMITIVES = Object.freeze(["CONTENT","AUTHORITY","DEPTH","TIME"]);

const deepClone=x=>JSON.parse(JSON.stringify(x));
export function stableString(x){
  if(Array.isArray(x)) return "["+x.map(stableString).join(",")+"]";
  if(x&&typeof x==="object") return "{"+Object.keys(x).sort().map(k=>JSON.stringify(k)+":"+stableString(x[k])).join(",")+"}";
  return JSON.stringify(x);
}
export function fnv1a(s){
  let h=0x811c9dc5;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)}
  return ("00000000"+(h>>>0).toString(16)).slice(-8);
}
export function identityGlyph(id){
  const h=parseInt(fnv1a(id),16)>>>0;
  const sides=3+(h%6);
  const rotation=((h>>>5)%360);
  const inner=.30+(((h>>>11)%40)/100);
  return {sides,rotation,inner};
}
function node({id,kind,label=id,source="fixture",content=null,authority="view",depth=0,time=null,provenance=[],
               relations=[],office="FOCUS",meta={}}){
  return {id,kind,label,source,content,authority,depth,time,provenance,relations,office,meta};
}
export function makeFixture(){
  return {
    id:"heterogeneous-12",
    version:3,
    source:{id:"fixture://heterogeneous-12",kind:"LOCAL_FIXTURE",hash:"fnv1a:"+fnv1a("heterogeneous-12/v3")},
    nodes:[
      node({id:"token.water",kind:"token",label:"water",content:"water",office:"SOURCE",
        provenance:["fixture://heterogeneous-12#token.water"]}),
      node({id:"paragraph.fold",kind:"paragraph",label:"fold paragraph",
        content:"A projection may suppress content; canonical state must retain it.",office:"FOCUS",
        provenance:["fixture://heterogeneous-12#paragraph.fold"]}),
      node({id:"image.room",kind:"image",label:"room image",content:{src:"fixture://image/room",alt:"six panels folded as room"},office:"WITNESS",
        provenance:["fixture://heterogeneous-12#image.room"]}),
      node({id:"number.aperture",kind:"number",label:"aperture",content:.62,office:"FRAME",
        provenance:["fixture://heterogeneous-12#number.aperture"]}),
      node({id:"boolean.pin",kind:"boolean",label:"pinned",content:true,office:"FRAME",
        provenance:["fixture://heterogeneous-12#boolean.pin"]}),
      node({id:"enum.scale",kind:"enum",label:"scale",content:"SECTION",office:"FRAME",
        meta:{options:["DOC","SECTION","PARA","WORD"]},provenance:["fixture://heterogeneous-12#enum.scale"]}),
      node({id:"free.note",kind:"free_text",label:"working note",content:"editable draft seed",office:"FOCUS",
        provenance:["fixture://heterogeneous-12#free.note"]}),
      node({id:"relation.water-wheel",kind:"relation",label:"water → wheel",content:{from:"token.water",to:"action.safe",type:"feeds"},
        office:"FRAME",relations:["token.water","action.safe"],provenance:["fixture://heterogeneous-12#relation.water-wheel"]}),
      node({id:"action.safe",kind:"action",label:"safe annotate",content:{operator:"ANNOTATE",effect:"session mark only"},
        authority:"preview",office:"OPERATE",provenance:["fixture://heterogeneous-12#action.safe"]}),
      node({id:"timed.pulse",kind:"timed",label:"audio event",content:{event:"beat"},time:{t0:12.5,t1:13.0,clock:"media"},
        office:"WITNESS",provenance:["fixture://heterogeneous-12#timed.pulse"]}),
      node({id:"nested.collection",kind:"nested",label:"nested collection",content:{children:[
        {id:"nested.a",label:"A",children:[{id:"nested.a.1",label:"A.1"}]},
        {id:"nested.b",label:"B"}]},depth:2,office:"SOURCE",provenance:["fixture://heterogeneous-12#nested.collection"]}),
      node({id:"evidence.roundtrip",kind:"evidence",label:"round-trip evidence",
        content:{claim:"projection does not own identity",source:"spikes/001 + spikes/002",status:"ASSERTED"},
        office:"RETURN",provenance:["fixture://heterogeneous-12#evidence.roundtrip"]})
    ]
  };
}

export const RESIDUE_POLICY = Object.freeze({
  LINE:Object.freeze({image:"raster content needs a surface",nested:"hierarchy depth is flattened"}),
  RADIAL:Object.freeze({paragraph:"long content is not legible as an ordinal mark",nested:"hierarchy depth is flattened"}),
  FLOWER_KEY:Object.freeze({image:"panel identity can carry the image address, not the raster itself"}),
  ROOM:Object.freeze({timed:"spatial faces do not supply a clock"}),
  GLYPH:Object.freeze({
    free_text:"identity mark is not editable content",
    action:"recognition must not erase authority",
    evidence:"claim + source cannot collapse to identity alone"
  })
});
export function residueFor(projection,nodeOrKind){
  const kind=typeof nodeOrKind==="string"?nodeOrKind:nodeOrKind.kind;
  return RESIDUE_POLICY[projection]?.[kind]||null;
}
export function residueInventory(fixture=makeFixture()){
  const out=[];
  for(const p of PROJECTIONS){
    for(const n of fixture.nodes){
      const reason=residueFor(p,n);
      if(reason) out.push({projection:p,node:n.id,kind:n.kind,reason});
    }
  }
  return out;
}
export function fixtureFingerprint(fixture){return fnv1a(stableString(fixture))}

function defaultWorkspace(fixture){
  const timed=fixture.nodes.filter(n=>n.time).map(n=>[n.id,n.time.t0]);
  return {
    projection:"LINE",
    focusId:fixture.nodes[0]?.id||null,
    selectedIds:[],
    drafts:{},
    clocks:Object.fromEntries(timed),
    marks:[],
    aperture:.62,
    authorityMode:"PREVIEW",
    activeOperator:"SELECT",
    returnStack:[]
  };
}
function snapshotWithoutStack(w){
  return {
    projection:w.projection,focusId:w.focusId,selectedIds:[...w.selectedIds],
    drafts:deepClone(w.drafts),clocks:deepClone(w.clocks),marks:deepClone(w.marks),
    aperture:w.aperture,authorityMode:w.authorityMode,activeOperator:w.activeOperator
  };
}
function semanticSnapshotWithoutProjection(w){
  const x=snapshotWithoutStack(w);delete x.projection;return x;
}
export class InstrumentState{
  constructor(fixture=makeFixture()){
    this.fixture=deepClone(fixture);
    this._fixtureFingerprint=fixtureFingerprint(this.fixture);
    this.workspace=defaultWorkspace(this.fixture);
  }
  node(id){return this.fixture.nodes.find(n=>n.id===id)||null}
  fixtureFingerprint(){return fixtureFingerprint(this.fixture)}
  workspaceSnapshot(){return snapshotWithoutStack(this.workspace)}
  semanticSnapshot(){return semanticSnapshotWithoutProjection(this.workspace)}
  semanticFingerprint(){return fnv1a(stableString(this.semanticSnapshot()))}
  fullFingerprint(){return fnv1a(stableString(this.workspaceSnapshot()))}
  switchProjection(p){
    if(!PROJECTIONS.includes(p)) throw new Error("unknown projection "+p);
    this.workspace.projection=p;return this.workspaceSnapshot();
  }
  focus(id){
    if(!this.node(id)) throw new Error("unknown node "+id);
    this.workspace.focusId=id;return this.workspaceSnapshot();
  }
  toggleSelection(id){
    if(!this.node(id)) throw new Error("unknown node "+id);
    const s=new Set(this.workspace.selectedIds);s.has(id)?s.delete(id):s.add(id);
    this.workspace.selectedIds=[...s];return this.workspaceSnapshot();
  }
  setDraft(id,text){
    if(!this.node(id)) throw new Error("unknown node "+id);
    this.workspace.drafts[id]=String(text);return this.workspaceSnapshot();
  }
  setClock(id,t){
    const n=this.node(id);if(!n?.time) throw new Error("node has no clock "+id);
    const v=Number(t);if(!Number.isFinite(v))throw new Error("invalid clock");
    this.workspace.clocks[id]=v;return this.workspaceSnapshot();
  }
  setAperture(v){this.workspace.aperture=Math.max(0,Math.min(1,Number(v)||0));return this.workspaceSnapshot()}
  setAuthorityMode(v){
    if(!["VIEW","PREVIEW","COMMIT"].includes(v))throw new Error("invalid authority mode");
    this.workspace.authorityMode=v;return this.workspaceSnapshot();
  }
  setOperator(v){this.workspace.activeOperator=String(v||"SELECT");return this.workspaceSnapshot()}
  annotate(id,text="safe mark"){
    if(!this.node(id))throw new Error("unknown node "+id);
    this.workspace.marks.push({id:"mark."+(this.workspace.marks.length+1),target:id,text:String(text),authority:"session"});
    return this.workspaceSnapshot();
  }
  checkpoint(label="RETURN"){
    this.workspace.returnStack.push({label,state:this.workspaceSnapshot()});
    return this.workspace.returnStack.length;
  }
  doReturn(){
    const frame=this.workspace.returnStack.pop();if(!frame)return null;
    const stack=this.workspace.returnStack;
    this.workspace={...deepClone(frame.state),returnStack:stack};
    return this.workspaceSnapshot();
  }
  reset(){this.workspace=defaultWorkspace(this.fixture);return this.workspaceSnapshot()}
}

export function runInvariantSuite(){
  const I=new InstrumentState();
  const results=[];
  const check=(name,ok,detail)=>results.push({name,pass:!!ok,detail});
  const originalFixture=I.fixtureFingerprint();

  I.focus("paragraph.fold");
  I.toggleSelection("token.water");
  I.toggleSelection("image.room");
  I.setDraft("free.note","draft survives projection switches");
  I.setClock("timed.pulse",42.5);
  I.setAperture(.77);
  I.setAuthorityMode("PREVIEW");
  I.setOperator("ANNOTATE");
  I.annotate("evidence.roundtrip","proof mark");
  const semanticBefore=I.semanticFingerprint();

  for(const p of ["LINE","FLOWER_KEY","RADIAL","ROOM","GLYPH","LINE"]) I.switchProjection(p);
  check("canonical_state_unchanged",I.fixtureFingerprint()===originalFixture,
    I.fixtureFingerprint()+" == "+originalFixture);
  check("projection_cycle_semantics",I.semanticFingerprint()===semanticBefore,
    I.semanticFingerprint()+" == "+semanticBefore);
  check("focus_survival",I.workspace.focusId==="paragraph.fold",I.workspace.focusId);
  check("multi_selection_survival",stableString(I.workspace.selectedIds)===stableString(["token.water","image.room"]),
    I.workspace.selectedIds.join(","));
  check("draft_survival",I.workspace.drafts["free.note"]==="draft survives projection switches",I.workspace.drafts["free.note"]);
  check("clock_survival",I.workspace.clocks["timed.pulse"]===42.5,String(I.workspace.clocks["timed.pulse"]));
  check("authority_survival",I.workspace.authorityMode==="PREVIEW"&&I.node("action.safe").authority==="preview",
    I.workspace.authorityMode+" / "+I.node("action.safe").authority);
  check("provenance_survival",I.node("evidence.roundtrip").provenance[0]==="fixture://heterogeneous-12#evidence.roundtrip",
    I.node("evidence.roundtrip").provenance[0]);

  I.checkpoint("exact return");
  const beforeReturn=I.fullFingerprint();
  I.switchProjection("ROOM");I.focus("action.safe");I.toggleSelection("paragraph.fold");
  I.setDraft("free.note","mutated away from checkpoint");I.setClock("timed.pulse",99.0);I.setAuthorityMode("COMMIT");
  I.doReturn();
  check("exact_return",I.fullFingerprint()===beforeReturn,I.fullFingerprint()+" == "+beforeReturn);

  const residue=residueInventory(I.fixture);
  check("residue_is_explicit",residue.length===9,"declared failures="+residue.length);
  check("irreducible_primitives_explicit",stableString(EXPLICIT_PRIMITIVES)===stableString(["CONTENT","AUTHORITY","DEPTH","TIME"]),
    EXPLICIT_PRIMITIVES.join(" · "));

  return {
    pass:results.every(x=>x.pass),
    passed:results.filter(x=>x.pass).length,
    total:results.length,
    fixtureFingerprint:originalFixture,
    residueCount:residue.length,
    residue,
    results
  };
}
