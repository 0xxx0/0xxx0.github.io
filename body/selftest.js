(function(g){'use strict';
var C=g.BodyFieldCore,tests=[],ok=0;
function t(name,fn){var pass=false,err=null;try{pass=!!fn()}catch(e){err=String(e)}tests.push({name:name,pass:pass,error:err});if(pass)ok++}
function e(v,f,env,posture,place){return{state:{itch:v,pain:v,energy:10-v,focus:5,valence:(5-v)/5,activation:5},context:{factors:f||[],environment:env||[],posture:posture||null,place:place||null}}}
function campaign(){return{schema:'0xxx0/body-campaign/v0.1',id:'c1',question:'Does one bounded change help?',state:'DRAFT',aperture:'GLANCE',selected_streams:[],evidence_gate:{description:'enough returns',minimum_returns:3,minimum_days:7},fade_condition:{description:'return to sparse monitoring',next_aperture:'GLANCE'},burden_budget:{max_active_prompts_per_day:1,max_manual_seconds_per_return:15},safety_class:'LOW_RISK_SELF_EXPERIMENT'}}
t('clamp',function(){return C.clamp(12,0,10)===10&&C.clamp(-1,0,10)===0});
t('factor keys typed',function(){var x=C.factorKeys(e(1,['caffeine'],['warm'],'sitting','home'));return x.includes('caffeine')&&x.includes('env:warm')&&x.includes('posture:sitting')&&x.includes('place:home')});
t('missing is not zero',function(){return Number.isNaN(C.targetValue({state:{itch:null}},'itch'))&&Number.isNaN(C.targetValue({state:{}},'itch'))});
t('contrast hidden below 3/3',function(){var xs=[e(8,['x']),e(7,['x']),e(3,[]),e(2,[]),e(4,[])];return C.contrasts(xs,'itch',3).length===0});
t('contrast admitted at 3/3',function(){var xs=[e(8,['x']),e(7,['x']),e(9,['x']),e(3,[]),e(2,[]),e(4,[])],r=C.contrasts(xs,'itch',3)[0];return r&&r.with_n===3&&r.without_n===3&&Math.abs(r.diff-5)<1e-9});
t('coverage low',function(){return C.coverage(3)==='LOW'});
t('coverage medium',function(){return C.coverage(6)==='MED'});
t('coverage high',function(){return C.coverage(12)==='HIGH'});
t('lag contrast admitted at 3/3',function(){var base=Date.parse('2026-09-21T00:00:00Z'),xs=[];for(var i=0;i<7;i++){var a=e(i<3?8:3,i<3?['x']:[]);a.observed_at=new Date(base+i*2*3600000).toISOString();xs.push(a)}var r=C.lagContrasts(xs,'itch',3,12)[0];return r&&r.with_n===3&&r.without_n===3});
t('lag contrast excludes long gaps',function(){var a=e(8,['x']),b=e(2,[]);a.observed_at='2026-09-21T00:00:00Z';b.observed_at='2026-09-22T00:00:00Z';return C.lagContrasts([a,b],'itch',1,12).length===0});
t('test delta',function(){var r=C.testDelta({target:'itch',baseline_value:8},e(5));return r.before===8&&r.after===5&&r.delta===-3});
t('address key stable under region ordering',function(){var a={plan_id:'p',geometry_version:'g',view:'front',selection_mode:'group',region_ids:['b','a']},b={...a,region_ids:['a','b']};return C.addressKey(a)===C.addressKey(b)});
t('address key changes with geometry',function(){return C.addressKey({plan_id:'p',geometry_version:'g1',view:'front',region_ids:['a']})!==C.addressKey({plan_id:'p',geometry_version:'g2',view:'front',region_ids:['a']})});
t('derivedness cap admits lower/equal and rejects higher',function(){return C.admitsDerivedness('D3','D0')&&C.admitsDerivedness('D3','D3')&&!C.admitsDerivedness('D3','D4')});
t('campaign evidence gate blocks insufficient coverage',function(){var r=C.campaignEvidenceGate(campaign(),{returns:2,days:7});return !r.pass&&r.unmet.length===1&&r.unmet[0].metric==='returns'});
t('campaign evidence gate passes declared coverage',function(){return C.campaignEvidenceGate(campaign(),{returns:3,days:7}).pass});
t('campaign burden budget suppresses extra prompt',function(){var r=C.campaignBurdenAllows(campaign(),{active_prompts:1,manual_seconds:4});return !r.pass&&r.exceeded[0].metric==='active_prompts'});
t('campaign opens into bounded aperture',function(){var r=C.campaignTransition(campaign(),'OPEN',null,'2026-10-03T00:00:00Z');return r.ok&&r.to==='CALIBRATING'&&r.campaign.aperture==='CAMPAIGN'&&r.campaign.opened_at==='2026-10-03T00:00:00Z'});
t('campaign rejects illegal fade',function(){var c=campaign(),r=C.campaignTransition(c,'FADE',null,'2026-10-03T00:00:00Z');return !r.ok&&r.reason==='illegal_transition'&&r.campaign===c});
t('campaign return then fade restores sparse aperture',function(){var a=C.campaignTransition(campaign(),'OPEN',null,'2026-10-03T00:00:00Z').campaign,b=C.campaignTransition(a,'RETURN',{disposition:'UNKNOWN',observed_delta:'not enough evidence'},'2026-10-10T00:00:00Z'),d=C.campaignTransition(b.campaign,'FADE',null,'2026-10-10T00:01:00Z');return b.ok&&b.to==='RETURNED'&&d.ok&&d.to==='FADED'&&d.campaign.aperture==='GLANCE'&&d.campaign.closed_at==='2026-10-10T00:01:00Z'});
g.BODY_FIELD_SELFTEST={passed:ok,total:tests.length,tests:tests};
})(typeof window!=='undefined'?window:globalThis);
