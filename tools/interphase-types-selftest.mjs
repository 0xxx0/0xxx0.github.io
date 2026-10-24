import {writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
function packageTypesProof(){
 const consumer=resolve(process.argv[2]),probe=join(consumer,'interphase-types-proof.mts');
 writeFileSync(probe,`import api, {navigation, type NavigationModel, type SourceAttention} from '@0xxx0/interphase';
declare const model: NavigationModel;
const focus: SourceAttention = {char:0,scope:'PARA',view:'walk',wpm:260,query:''};
const exact: number = navigation.focusChar(model, navigation.at(model,0,'PARA'));
const scope: string = navigation.zoomScope(model,exact,focus.scope,1);
const changed: string = api.navigation.patch(model,{start:0,end:1},'x').raw;
const rows = api.workflow.run([{n:3},{n:1}],[{op:'sort',path:'/n'}]);
void [scope,changed,rows,navigation.validateAttention(model,focus)];
`);
 execFileSync(process.execPath,[join(consumer,'node_modules/typescript/bin/tsc'),'--noEmit','--strict','--module','nodenext','--moduleResolution','nodenext','--target','es2022',probe],{stdio:'inherit'});
 console.log('TYPES PASS · installed package · source ranges / attention / zoom / local edit / workflow');
}
packageTypesProof();
