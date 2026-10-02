(function(g){'use strict';
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function mean(xs){return xs.length?xs.reduce(function(a,b){return a+b},0)/xs.length:null}
function targetValue(e,t){if(!e||!e.state)return NaN;var v=e.state[t];if(v===null||v===undefined||v==='')return NaN;var n=Number(v);return Number.isFinite(n)?n:NaN}
function factorKeys(e){var c=e&&e.context||{},a=[].concat(c.factors||[]);(c.environment||[]).forEach(function(x){a.push('env:'+x)});if(c.posture)a.push('posture:'+c.posture);if(c.place)a.push('place:'+c.place);return Array.from(new Set(a))}
function coverage(n){return n>=12?'HIGH':n>=6?'MED':'LOW'}
function contrasts(events,target,minEach){
 minEach=minEach==null?3:minEach;
 var es=(events||[]).filter(function(e){return Number.isFinite(targetValue(e,target))}),factors=Array.from(new Set(es.flatMap(factorKeys))),rows=[];
 factors.forEach(function(f){
  var yes=es.filter(function(e){return factorKeys(e).includes(f)}),no=es.filter(function(e){return !factorKeys(e).includes(f)});
  if(yes.length<minEach||no.length<minEach)return;
  var ay=mean(yes.map(function(e){return targetValue(e,target)})),an=mean(no.map(function(e){return targetValue(e,target)}));
  rows.push({factor:f,with_n:yes.length,without_n:no.length,with_mean:ay,without_mean:an,diff:ay-an,coverage:coverage(Math.min(yes.length,no.length))});
 });
 rows.sort(function(a,b){return Math.abs(b.diff)-Math.abs(a.diff)});return rows
}
function lagContrasts(events,target,minEach,maxHours){
 minEach=minEach==null?3:minEach;maxHours=maxHours==null?12:maxHours;
 var xs=(events||[]).slice().sort(function(a,b){return String(a.observed_at||'').localeCompare(String(b.observed_at||''))}),pairs=[];
 for(var i=0;i<xs.length-1;i++){var a=xs[i],b=xs[i+1],dt=(new Date(b.observed_at)-new Date(a.observed_at))/36e5;if(dt<0||dt>maxHours)continue;var y=targetValue(b,target);if(!Number.isFinite(y))continue;pairs.push({factors:factorKeys(a),outcome:y})}
 var all=Array.from(new Set(pairs.flatMap(function(p){return p.factors}))),rows=[];
 all.forEach(function(f){var yes=pairs.filter(function(p){return p.factors.includes(f)}).map(function(p){return p.outcome}),no=pairs.filter(function(p){return !p.factors.includes(f)}).map(function(p){return p.outcome});if(yes.length<minEach||no.length<minEach)return;var ay=mean(yes),an=mean(no);rows.push({factor:f,with_n:yes.length,without_n:no.length,with_mean:ay,without_mean:an,diff:ay-an,coverage:coverage(Math.min(yes.length,no.length)),lag_hours:maxHours})});
 rows.sort(function(a,b){return Math.abs(b.diff)-Math.abs(a.diff)});return rows
}
function testDelta(test,afterEvent){
 if(!test||!afterEvent)return null;var after=targetValue(afterEvent,test.target);if(!Number.isFinite(after)||!Number.isFinite(Number(test.baseline_value)))return null;
 return {before:Number(test.baseline_value),after:after,delta:after-Number(test.baseline_value)}
}
function addressKey(a){
 if(!a)return null;return [a.plan_id||'',a.geometry_version||'',a.view||'',a.selection_mode||'',(a.region_ids||[]).slice().sort().join(',')].join('|')
}
var DERIVEDNESS={D0:0,D1:1,D2:2,D3:3,D4:4};
function admitsDerivedness(maxClass,observedClass){
 if(maxClass==null||maxClass==='')return true;
 return Object.prototype.hasOwnProperty.call(DERIVEDNESS,maxClass)&&Object.prototype.hasOwnProperty.call(DERIVEDNESS,observedClass)&&DERIVEDNESS[observedClass]<=DERIVEDNESS[maxClass]
}
function campaignEvidenceGate(campaign,seen){
 var gate=campaign&&campaign.evidence_gate||{},x=seen||{},r=Number(x.returns||0),d=Number(x.days||0),unmet=[];
 if(gate.minimum_returns!=null&&r<Number(gate.minimum_returns))unmet.push({metric:'returns',have:r,need:Number(gate.minimum_returns)});
 if(gate.minimum_days!=null&&d<Number(gate.minimum_days))unmet.push({metric:'days',have:d,need:Number(gate.minimum_days)});
 return {pass:unmet.length===0,unmet:unmet,returns:r,days:d}
}
function campaignBurdenAllows(campaign,usage){
 var b=campaign&&campaign.burden_budget||{},u=usage||{},prompts=Number(u.active_prompts||0),seconds=Number(u.manual_seconds||0),exceeded=[];
 if(b.max_active_prompts_per_day!=null&&prompts>=Number(b.max_active_prompts_per_day))exceeded.push({metric:'active_prompts',have:prompts,limit:Number(b.max_active_prompts_per_day)});
 if(b.max_manual_seconds_per_return!=null&&seconds>Number(b.max_manual_seconds_per_return))exceeded.push({metric:'manual_seconds',have:seconds,limit:Number(b.max_manual_seconds_per_return)});
 return {pass:exceeded.length===0,exceeded:exceeded}
}
var CAMPAIGN_NEXT={
 DRAFT:{OPEN:'CALIBRATING',ABORT:'ABORTED'},
 CALIBRATING:{BEGIN_TEST:'TESTING',RETURN:'RETURNED',ABORT:'ABORTED'},
 TESTING:{RETURN:'RETURNED',ABORT:'ABORTED'},
 RETURNED:{FADE:'FADED',ABORT:'ABORTED'},
 FADED:{},ABORTED:{}
};
function campaignTransition(campaign,action,payload,now){
 if(!campaign||!campaign.state)return{ok:false,reason:'missing_campaign_state',campaign:campaign||null};
 if(action==='BEGIN_TEST'&&campaign.safety_class!=='LOW_RISK_SELF_EXPERIMENT')return{ok:false,reason:'safety_class_blocks_test',from:campaign.state,action:action,campaign:campaign};
 var next=CAMPAIGN_NEXT[campaign.state]&&CAMPAIGN_NEXT[campaign.state][action];
 if(!next)return{ok:false,reason:'illegal_transition',from:campaign.state,action:action,campaign:campaign};
 var c=JSON.parse(JSON.stringify(campaign)),ts=now||new Date().toISOString();
 if(action==='RETURN'){
  var p=payload||{},allowed=['KEEP','DROP','UNKNOWN','ABORT'];
  if(!allowed.includes(p.disposition))return{ok:false,reason:'return_disposition_required',from:campaign.state,action:action,campaign:campaign};
  c.return=p;
  if(p.disposition==='ABORT')next='ABORTED'
 }
 c.state=next;
 if(action==='OPEN'){if(!c.opened_at)c.opened_at=ts;c.aperture='CAMPAIGN'}
 if(action==='FADE'){c.aperture=c.fade_condition&&c.fade_condition.next_aperture||'GLANCE';c.closed_at=ts}
 if(action==='ABORT'||next==='ABORTED')c.closed_at=ts;
 return{ok:true,from:campaign.state,to:next,campaign:c}
}
g.BodyFieldCore={clamp:clamp,mean:mean,targetValue:targetValue,factorKeys:factorKeys,coverage:coverage,contrasts:contrasts,lagContrasts:lagContrasts,testDelta:testDelta,addressKey:addressKey,admitsDerivedness:admitsDerivedness,campaignEvidenceGate:campaignEvidenceGate,campaignBurdenAllows:campaignBurdenAllows,campaignTransition:campaignTransition};
})(typeof window!=='undefined'?window:globalThis);
