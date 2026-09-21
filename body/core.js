(function(g){'use strict';
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function mean(xs){return xs.length?xs.reduce(function(a,b){return a+b},0)/xs.length:null}
function targetValue(e,t){if(!e||!e.state)return NaN;if(t==='valence'||t==='activation')return Number(e.state[t]);return Number(e.state[t])}
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
function testDelta(test,afterEvent){
 if(!test||!afterEvent)return null;var after=targetValue(afterEvent,test.target);if(!Number.isFinite(after)||!Number.isFinite(Number(test.baseline_value)))return null;
 return {before:Number(test.baseline_value),after:after,delta:after-Number(test.baseline_value)}
}
function addressKey(a){
 if(!a)return null;return [a.plan_id||'',a.geometry_version||'',a.view||'',a.selection_mode||'',(a.region_ids||[]).slice().sort().join(',')].join('|')
}
g.BodyFieldCore={clamp:clamp,mean:mean,targetValue:targetValue,factorKeys:factorKeys,coverage:coverage,contrasts:contrasts,testDelta:testDelta,addressKey:addressKey};
})(typeof window!=='undefined'?window:globalThis);
