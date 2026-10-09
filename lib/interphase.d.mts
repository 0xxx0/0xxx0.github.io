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
declare const api:{readonly core:typeof core;readonly carrier:typeof carrier;readonly mapping:typeof mapping;readonly constraints:typeof constraints;readonly micro:typeof micro;readonly optics:typeof optics;readonly ring:typeof ring;readonly glyph:typeof glyph;readonly lenses:typeof lenses;readonly history:typeof history;readonly composition:typeof composition;readonly contracts:typeof contracts;readonly audio:typeof audio;readonly extensions:typeof extensions};
export default api;
