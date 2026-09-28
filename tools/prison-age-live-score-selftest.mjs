import fs from 'node:fs';
import {makePrisonAgeLiveScore,prisonAgeScoreDefinitions} from '../prison-age/live-score.js';
import {validateReadExperience,readExperienceCueAt} from '../fold-bloom/read-experience.js';

const cases={
 'open-air':'prison-age/stories/03-open-air.md',
 'fandom-court':'prison-age/stories/05-fandom-court.md',
 'last-stall':'prison-age/stories/07-last-stall-extract.md',
 'successful-escape':'prison-age/stories/08-successful-escape.md'
};
for(const [id,path] of Object.entries(cases)){
  const source=fs.readFileSync(path,'utf8'),score=makePrisonAgeLiveScore(id,source,{address:'/'+path,hash:'fixture:'+id});
  const v=validateReadExperience(score,source,{address:'/'+path,hash:'fixture:'+id});
  if(!v.ok)throw Error(id+' invalid '+v.errors.join(' | '));
  if(score.authority!=='PROJECTION_ONLY'||score.owner!=='PRISON_AGE')throw Error(id+' authority');
  if(score.cues.length!==prisonAgeScoreDefinitions(id).length)throw Error(id+' cue count');
  for(const cue of score.cues){
    if(source.slice(cue.start,cue.end)!==cue.quote)throw Error(id+' quote not exact '+cue.id);
    if(readExperienceCueAt(score,cue.start)?.id!==cue.id)throw Error(id+' cue address '+cue.id);
  }
}
const source=fs.readFileSync(cases['successful-escape'],'utf8'),score=makePrisonAgeLiveScore('successful-escape',source,{address:'/'+cases['successful-escape']});
if(!score.cues.some(x=>x.quote==='She melted the archive.'))throw Error('missing exact source anchor');
if(JSON.stringify(score).includes("I'm always behind you"))throw Error('rejected motif leaked into active score');
console.log('PRISON AGE LIVE SCORE PASS ·',Object.keys(cases).length,'sources ·',Object.values(cases).reduce((n,p)=>n+fs.readFileSync(p,'utf8').length,0),'exact chars');
