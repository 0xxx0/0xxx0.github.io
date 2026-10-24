export type JSONValue = null | boolean | number | string | JSONValue[] | {[key:string]:JSONValue};
export interface Source {schema:string;id:string;kind:string;title:string;thesis:string;state:'SOURCE'|'HOLD'|'RETURN';provenance:{[key:string]:JSONValue};[key:string]:JSONValue}
export interface Verdict {ok:boolean;errors:readonly {path:string;message:string}[]}
export interface Plugin {protocol:'interphase-extension/v1';id:string;version:string;requires?:Readonly<Record<string,string>>;types?:Readonly<Record<string,(value:JSONValue)=>boolean|Verdict>>;laws?:Readonly<Record<string,(value:JSONValue)=>boolean|Verdict>>;operators?:Readonly<Record<string,(value:JSONValue,args:JSONValue)=>JSONValue>>}
export interface Catalog {protocol:'interphase-extension/v1';plugins:readonly {id:string;version:string}[];types:NonNullable<Plugin['types']>;laws:NonNullable<Plugin['laws']>;operators:NonNullable<Plugin['operators']>}
export const extensions: {
 readonly protocol:'interphase-extension/v1';readonly native:Plugin;
 define(plugin:Plugin):Readonly<Plugin>;
 loadModule(specifier:string,importer?:(specifier:string)=>Promise<{default:Plugin}>):Promise<Readonly<Plugin>>;
 compose(...plugins:(Plugin|readonly Plugin[])[]):Readonly<Catalog>;
 fromJSON(packet:JSONValue):Readonly<Plugin>;
 check(catalog:Catalog,name:string,value:JSONValue):Verdict;
 inspect(catalog:Catalog,value:JSONValue):Readonly<Record<string,Verdict>>;
 propose(catalog:Catalog,name:string,value:JSONValue,args?:JSONValue):JSONValue;
};
export interface Lens {get(source:Source):JSONValue;put(source:Source,view:JSONValue):Source;project(source:Source,view?:JSONValue):JSONValue}
export const lenses: {createGenesisObject(overrides?:Partial<Pick<Source,'title'|'thesis'|'state'>>):Source;semantic(source:Source):Pick<Source,'title'|'thesis'|'state'>;applySemantic(source:Source,patch:Partial<Pick<Source,'title'|'thesis'|'state'>>):Source;COMPACT:Lens;FIELD:Lens;[key:string]:unknown};
export interface HistoryNode {id:string;parents:string[];op:string;snapshot:Source;patch:JSONValue;meta:JSONValue}
export interface History {object_id:string;head():string;source():Source;snapshot(id:string):Source;nodes():HistoryNode[];commit(patch:Partial<Pick<Source,'title'|'thesis'|'state'>>,meta?:JSONValue):unknown;returnTo(id:string,meta?:JSONValue):unknown;checkout(id:string):unknown;serialize():JSONValue;makeReturnToken(id:string,anchor?:JSONValue):JSONValue;resolveReturn(token:JSONValue):unknown}
export const history:{createHistory(source:Source):History;restoreHistory(packet:JSONValue):History;stable(value:JSONValue):string;fingerprint(value:JSONValue):string;objectFromRoute(route:{href:string;[key:string]:JSONValue}):Source;[key:string]:unknown};
export const ring:{TAU:number;polar(cx:number,cy:number,r:number,a:number):[number,number];clamp(v:number,min:number,max:number):number;[key:string]:unknown};
// The native namespaces keep their APIs. Unknown members require narrowing;
// this declaration does not pretend the whole historical library is typed.
export const core:Readonly<Record<string,unknown>>;
export const carrier:Readonly<Record<string,unknown>>;
export const mapping:Readonly<Record<string,unknown>>;
export const constraints:Readonly<Record<string,unknown>>;
export const micro:Readonly<Record<string,unknown>>;
export const optics:Readonly<Record<string,unknown>>;
export const glyph:Readonly<Record<string,unknown>>;
export const composition:Readonly<Record<string,unknown>>;
export const contracts:Readonly<Record<string,unknown>>;
export const audio:Readonly<Record<string,unknown>>;
export type WorkPointer = string | readonly string[];
export type WorkStep = {op:'at';path:WorkPointer} | {op:'where';path?:WorkPointer;test?:'contains'|'equals'|'not'|'exists'|'gt'|'lt';value?:JSONValue} | {op:'pick';fields:readonly WorkPointer[]} | {op:'sort';path?:WorkPointer;desc?:boolean} | {op:'take';count:number} | {op:'unique';path?:WorkPointer};
export interface WorkResult {value:JSONValue;refs:string[][];columns:Record<string,string[]>|null;trace:{index:number;step:WorkStep;before:{type:string;count:number};after:{type:string;count:number};loss:string;refs:string[][];value:JSONValue}[];losses:string[]}
export const workflow:{readonly VERSION:'interphase-work/v0.1';readonly LIMITS:{bytes:number;steps:number;rows:number};readonly PRESETS:Readonly<Record<'heads'|'routes'|'read',readonly WorkStep[]>>;path(value?:WorkPointer):string[];pointer(path:readonly string[]):string;type(value:JSONValue):string;count(value:JSONValue):number;run(input:JSONValue,steps?:readonly WorkStep[]):WorkResult;sourceObject(raw:string,label?:string,address?:string):Promise<Source>;sourceData(source:Source):JSONValue;receipt(source:Source,steps:readonly WorkStep[],result:WorkResult,focus?:JSONValue,view?:string):Promise<JSONValue>};

export interface NavigationRange {start:number;end:number;path?:string;key?:string;type?:string;value?:unknown;text?:string;contentStart?:number;depth?:number;parent?:string}
export interface NavigationLevel {id:string;label:string;units:NavigationRange[]}
export interface NavigationModel {readonly raw:string;readonly kind:'TEXT'|'JSON';readonly levels:NavigationLevel[];readonly nodes:NavigationRange[];readonly words:NavigationRange[];readonly sections:NavigationRange[]}
export interface NativeSourceAnalysis {raw:string;kind:'TEXT'|'JSON';scales:NavigationLevel[];nodes?:NavigationRange[];sections?:NavigationRange[]}
export interface SourceAttention {char:number;scope:string;view:'plain'|'walk';wpm:number;query:string}
export interface SourceRelation {hash:string;type:'supports'|'contrasts'|'questions'|'explains';authority:'INTERPRETATION_ONLY';from:NavigationRange&{scope:string;quote:string};to:NavigationRange&{scope:string;quote:string}}
export const navigation:{
 readonly MAX_BYTES:2000000;readonly RELATIONS:readonly SourceRelation['type'][];
 compile(raw:string,analysis:NativeSourceAnalysis,jsonAnalysis?:NativeSourceAnalysis|null,spans?:NavigationRange[]):NavigationModel;
 clamp(n:number,a:number,b:number):number;level(model:NavigationModel,id:string):NavigationLevel;containing(units:NavigationRange[],char:number):NavigationRange|null;
 at(model:NavigationModel,char:number,scope:string):NavigationRange|null;
 focusChar(model:NavigationModel,unit:NavigationRange|null):number;zoomScope(model:NavigationModel,char:number,scope:string,direction:number):string;
 exactSpan(model:NavigationModel,span:NavigationRange):boolean;charIn(model:NavigationModel,span:NavigationRange,fraction:number):number;
 ordered(model:NavigationModel,scope:string,query?:string):NavigationRange[];
 neighbors(model:NavigationModel,char:number,scope:string,query?:string):{current:NavigationRange|null;units:NavigationRange[];index:number;before:NavigationRange|null;after:NavigationRange|null;total:number};
 describe(model:NavigationModel,unit:NavigationRange|null):{title:string;body:string;hidden:number;value?:unknown};
 patch(model:NavigationModel,span:NavigationRange,replacement:string):{raw:string;changed:boolean;span:NavigationRange};
 relation(model:NavigationModel,hash:string,from:NavigationRange&{scope?:string},to:NavigationRange&{scope?:string},type:SourceRelation['type']):SourceRelation;
 validRelation(model:NavigationModel,hash:string,link:SourceRelation):boolean;
 relationDoors(model:NavigationModel,hash:string,links:SourceRelation[],char:number):(SourceRelation&{destination:NavigationRange&{scope:string;quote:string};direction:string})[];
 validateAttention(model:NavigationModel,attention:SourceAttention):SourceAttention;
};

declare const api:{readonly core:typeof core;readonly carrier:typeof carrier;readonly mapping:typeof mapping;readonly constraints:typeof constraints;readonly micro:typeof micro;readonly optics:typeof optics;readonly ring:typeof ring;readonly glyph:typeof glyph;readonly lenses:typeof lenses;readonly history:typeof history;readonly composition:typeof composition;readonly contracts:typeof contracts;readonly audio:typeof audio;readonly extensions:typeof extensions;readonly workflow:typeof workflow;readonly navigation:typeof navigation};
export default api;
