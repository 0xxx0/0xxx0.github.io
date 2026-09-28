import {makeReadExperience} from '../fold-bloom/read-experience.js';

export const PRISON_AGE_LIVE_SCORE_SCHEMA='prison-age-live-score/v0.1';

const SCORE=Object.freeze({
  'open-air':Object.freeze([
    {id:'vent-backward',quote:'One afternoon, the vent breathed backward.',presentation:{scene:'VOID',profile:'SOFT'}},
    {id:'door-open',quote:'He opened the door.',presentation:{scene:'TRANCE',profile:'DRIVE'}},
    {id:'toolbox-threshold',quote:'He placed a toolbox across the threshold.',presentation:{scene:'WOOD',profile:'NORMAL'}},
    {id:'environment-disagree',quote:'one opening through which the environment could disagree.',presentation:{scene:'DEEP',profile:'SOFT'}}
  ]),
  'fandom-court':Object.freeze([
    {id:'no-frames',quote:'There were no frames.',presentation:{scene:'VOID',profile:'SOFT'}},
    {id:'wrong-season',quote:'You have rebuilt the wrong missing season.',presentation:{scene:'TRANCE',profile:'DRIVE'}},
    {id:'four-columns',quote:'Ione opened a blank ledger and drew four columns:',presentation:{scene:'WOOD',profile:'NORMAL'}},
    {id:'restore-capacity',quote:'DO NOT RESTORE THE SEASON.\nRESTORE THE CAPACITY TO DISTINGUISH WHAT CHANGED IT.',presentation:{scene:'DEEP',profile:'SOFT'}}
  ]),
  'last-stall':Object.freeze([
    {id:'procedure-person',quote:'Every procedure had succeeded.\n\nThe person had not.',presentation:{scene:'VOID',profile:'SOFT'}},
    {id:'measurement',quote:'"A measurement."',presentation:{scene:'DEEP',profile:'NORMAL'}},
    {id:'plan-except',quote:'"This plan is accurate," PooBaby said, "except for everything that happens."',presentation:{scene:'TRANCE',profile:'DRIVE'}},
    {id:'paper-camera',quote:'PooBaby pressed the blank sheet over the lens.',presentation:{scene:'VOID',profile:'SOFT'}},
    {id:'person-came',quote:'This time a person came anyway.',presentation:{scene:'WOOD',profile:'SOFT'}}
  ]),
  'successful-escape':Object.freeze([
    {id:'open-door',quote:'Season Seven began with an open door.',presentation:{scene:'DEEP',profile:'NORMAL'}},
    {id:'archived-escapes',quote:'The new prison was built from archived escapes.',presentation:{scene:'VOID',profile:'SOFT'}},
    {id:'adaptation-attention',quote:'The prison was adaptive, but adaptation revealed attention.',presentation:{scene:'TRANCE',profile:'DRIVE'}},
    {id:'key-fossil',quote:'A key was only the fossil of an earlier distinction.',presentation:{scene:'WOOD',profile:'NORMAL'}},
    {id:'melted-archive',quote:'She melted the archive.',presentation:{scene:'TRANCE',profile:'DRIVE'}},
    {id:'learns-obstruction',quote:'“It learns the obstruction,” she said.',presentation:{scene:'DEEP',profile:'NORMAL'}}
  ])
});

export function prisonAgeScoreDefinitions(storyId){
  return (SCORE[String(storyId)]||[]).map(x=>JSON.parse(JSON.stringify(x)));
}
export function makePrisonAgeLiveScore(storyId,source,sourceIdentity={}){
  const cues=prisonAgeScoreDefinitions(storyId);
  if(!cues.length)throw Error('PRISON_AGE_SCORE_UNKNOWN_STORY');
  const experience=makeReadExperience({
    owner:'PRISON_AGE',
    source,
    sourceIdentity,
    initial:{scene:'DEEP',profile:'NORMAL',layer:'IMMERSION'},
    cues
  });
  return {
    ...experience,
    prisonAge:{schema:PRISON_AGE_LIVE_SCORE_SCHEMA,storyId:String(storyId),cueCount:cues.length},
    law:'The score is a 2026 projection over exact sourced Prison Age bytes. Exact source phrases trigger reversible LIVE presentation only; they do not add narrative, infer emotion, change cursor/source, or claim historical canon.'
  };
}
