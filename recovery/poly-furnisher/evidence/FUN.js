
diff=(a, b)=> {
let aKeys = keys(a).sort(), bKeys = keys(b).sort(),
    delta = {}, inserts = {}, subs = {}, dels = [], recs = {},
    aI = 0, bI = 0;
  while(aKeys[aI] || bKeys[bI]) {
    let aKey = aKeys[aI], bKey = bKeys[bI], aVal = a[aKey], bVal = b[bKey];
    if (aKey == bKey) {
      if (Object(aVal) === aVal && Object(bVal) === bVal) {
        let rDelta = diff(aVal, bVal);
        if(keys(rDelta)[0]) recs[aKey] = rDelta }
      else if (aVal !== bVal) {subs[aKey] = bVal; }
      aI++; bI++; } else if (aKey > bKey || !aKey) {
      inserts[bKey] = bVal; bI++; } else {
      dels.push(aKey); aI++; } }

[dels,inserts,subs,recs].filter(keys)
return {d:dels,i:inserts,s:subs,r:recs}
}
/*    if (dels[0]) delta.d = dels;
    if (keys(inserts)[0]) delta.i = inserts;
    if (keys(subs)[0]) delta.s = subs;
    if (keys(recs)[0]) delta.r = recs;
    return delta }
    */
// TODO: Handle strings directly ~>  'dog'.replace(/./g, (c, i) => i == 0? 'f': c)
// TODO: immutability or use to update dom n shit? ~> clone = obj => Object.assign({}, obj);

  patch=(obj, delta)=> {let op, key, val, longKey, objKeys = keys(obj).sort();
// TODO: Refactor ~> map, 1-liner...
    for (op in delta) {
        for (key in delta[op]) {
          val = delta[op][key]
          ; op == 'i' ? obj[key] = val 
          : op == 's' ? obj[key] = val 
          : op == 'd' ? delete obj[val]
          : patch(obj[key], val) } 
    } return obj }







/* # PRELUDE */
type = x=>({}).toString.call(x).slice(8,-1).toLowerCase()
	dup=o=>Object.assign(({array:[],object:{}})[type(o)],o)


flow = (...fs)=> fs.reduce ((l,r)=> (...xs)=> r(l(...xs)))
wolf = (...fs)=> fs.reverse().reduce ((l,r)=> (...xs)=> r(l(...xs)))


/* # RECURSION SCHEMES */
fold=(f,a,xs)=>!xs.length?a:fold(f,f(a,xs[0]),xs.slice(1))
	foldr = (f,m,i=0)=>([x, ...xs])=>typeof(x)!=='undefined'? foldr(f,f(m,x,i++),i++)(xs):m
para = (f,a,xs)=>!xs.length?a:para(f,f(a,xs[0],xs),xs.slice(1))
unfold=(f,i,a=[],next=f(i))=>next?unfold(f,next[1],[...a,next[0]]):a
// unfold(x=>x<26?[String.fromCharCode(x+65),x+1]:'',0)
// unfold(x=>)
// range=unfold(i,c)



sindex=(ks)=>(f=x=>x,s=[],way=[])=> map((x,i,o)=>ist.array(x)
	?f([[concat(size(o))(s)],[concat(i)(way)],sindex(x)(f,concat(size(o))(s),concat(i)(way))],x)
	:f([[concat(size(o))(s)],[concat(i)(way)]],x)) (ks)


/* # TRANSDUCERS */
// CONTEXT INDEPENDENT
// X 			seqs into parallel channel observables ...?
// transduce     ?   ?   ?   ?  ?
// map 			...free
// filter 		...free
// mapcat		...free
// ...

// Accumulators
	// TODO: make Iterator i.e. lazy|pull. xducers can pull or push
//  (a,b)=> (a.push(b),a)
//  (a,b)=>a.concat([b]) ----> slower than push
// (a,b)=>a+b

// e.g. for ES Set use (acc, elem) => acc.add(elem) as combiner and () => new Set() as your getInitial arguments).



//GROUP ~>
	// (a,v)=>(TEST(v)?a.result.push(v):a.fails.push(v),a),{result:[],fails:[]})

foldr = (f,m,i=0)=>([x, ...xs])=>typeof(x)!=='undefined'? foldr(f,f(m,x,i++),i++)(xs):m


// init - Return a valid initial value for the accumulator (usually, just call the next step()).
// step - Apply the transform, e.g., for map(f): step(accumulator, f(current)).
// result - If a transducer is called without a new value, it should handle its completion step (usually step(a), unless the transducer is stateful).

// xduce=    (t,r=(a,b)=>a.concat([b]),i=[])=>x=> foldr(t(r),i)(x)
xduce=    (t,r=(a,b)=>(a.push(b),a),i=[])=>x=> foldr(t(r),i)(x)

//paramorphic mapper and filterer - in case + dedup 
//TODO: test|research if any performance cost?
// mapping    =f=>r=>(a,y,s)=> r(a,f(y,s,a))         //=> actually flatmap, what's map then
mapping    =f=>r=>(a=r(),y,s)=> r(a,f(y,s,a))    //=> Early Termination: default a=r() 

filtering = p=>r=>(a,y,s)=> p(y,a,s)?r(a,y):a








// ??????					  			  
fxx = (f=[x=>x],p=f=>f.length>1)=>xs=>
		xs.reduce((a,x)=>a.concat([
// ??????
	p(f,x)?fxx(f.slice(1),p) (f[0](x)) :f[0](x) ]),[])
// ??????
			ing = (f,p=f=>f.length>1)=>r=>(a,y,s)=> r(f[0](y),p(f)?ing(f.slice(1),p)(r)(a,y,s):f[0](y))
			ing = (f=[x=>x],p=f=>f.length>1)=>r=>(a,y,s)=>
					r(a , p(f,y)? ing (f.slice(1),p)(r)(f[0](y))
												  :f[0](y))


reslice  =(s,t=(gte(0)))=>r=>(a,y,s=0)=> t(--s)?r(a,y,s):a

// ,['gating',     "gate=>(...keys)=>filtering(gate(...keys))"]
// ,['shovel',  '(hole,thing)=> (push(thing)(hole), hole)']
// ,['dropgate',   "skips=> x=> ifte( gte(0)( decr(skips) ) )(false)(true)"]
// ,['twogate',    "(open,close,opened=false)=>x=>open(x)?opened=true:close(x)?opened=false:opened"]












countReducer = (a,c) => (c?a+1:a)

4️⃣ = (
    [🤷, 💁, 🙋, 🙍]
    .reduce(countReducer, 0)
)
partitionReducer = (getPartitionName) => (paritions,value) => 
({...partitions[getPartitionName(value)]: {...partitions[getPartitionName(value)] value} })

bunchPartitionReducer = (partitionReducer(value => (value.isBunch ? 'multiple': 'single')))
initialState = {single: [], multiple: [], }

([🍇, 🍈, 🍒, 🍋].reduce(bunchPartitionReducer, initialState, ) )




////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

 view = (lens, store) => lens.view(store);
 set = (lens, value, store) => lens.set(value, store);

 lensProp = prop => ({
  view: store => store[prop],
  set: (value, store) => ({
    ...store,
    [prop]: value
  })
});

fooStore = {
  a: 'foo',
  b: 'bar'
};
 aLens = lensProp('a');
 bLens = lensProp('b');
// Destructure the `a` and `b` props from the lens using
// the `view()` function.
 a = view(aLens, fooStore);
 b = view(bLens, fooStore);
console.log(a, b); // 'foo' 'bar'
// Set a value into our store using the `aLens`:
 bazStore = set(aLens, 'baz', fooStore);
// View the newly set value.
console.log( view(aLens, bazStore) ); // 'baz'


lensProps = [
  'foo',
  'bar',
  1
];
lenses = lensProps.map(lensProp);
truth = compose(...lenses);
obj = {foo: {bar: [false, true] } };
console.log(
  view(truth, obj)
);


// flow = (...fs)=> fs.reduce ((l,r)=> (...xs)=> r(l(...xs)))
pipe = (fn,...fns) => (...args) => fns.reduce( (acc, f) => f(acc), fn(...args));
compose = (...fns) => pipe(...fns.reverse());




//simple auto currying 
//(does NOT separately handle f.length == args.length or f.length < args.length cases)
curry = (f, ...args) => (f.length <= args.length) ? f(...args) : (...more) => curry(f, ...args, ...more);

mapWith = curry((f, xs) => xs.map(f));

pipe = (fn,...fns) => (...args) => fns.reduce( (acc, f) => f(acc), fn(...args));
compose = (...fns) => pipe(...fns.reverse());


//simple auto currying (does NOT separately handle f.length == args.length or f.length < args.length cases)
curry = (f, ...args) => (f.length <= args.length) ? f(...args) : (...more) => curry(f, ...args, ...more);

mapWith = curry((f, xs) => xs.map(f));

assoc = key => val => obj => { obj[key] = val; return obj; };

arrayLens = curry((index, f, xs) => f(xs[index]).map(replacement => update(index, replacement, xs)); );
objectLens = curry((key, f, xs) => mapWith(replacement => assoc(key, replacement, xs), f(xs[key]) ); );







////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

Lens Laws
There are Lenses laws and they are easy to understand. I will try to explain them in a simpler way, please note, that you can find some useful literature about it at the end of the article.

1.(set after get) If I update with what I receive, the object does not change. (Identity)

expect(nameLens.set(user)(nameLens.get(user))).toEqual(user);
If this law is met, we should see that the set and get must focus on the same part of the object

2. (get after set) If I update and then receive, I should receive what I have updated.

expect(nameLens.get(nameLens.set(user)("newName"))).toEqual("newName");
The first thing that will be executed is the set of our lens, which will return a new user with a new name. If we make the get of that new user, we should receive the new name.

3. (set after set) If I update twice, I get the updated object for the last time.

expect(nameLens.set(nameLens.set(user)("newName"))("theNewName")).toEqual(nameLens.set(user)("theNewName"));
Look at the order, it executes first the internal, the user’s set with “newName”. With that object that returns to me, I change it again but this time to “theNewName”. The last one is what we obtain, the expect reflects it.




























/* # OPTICS 

## Lens Laws
The lens laws are algebraic axioms which ensure that the lens is well behaved.
view(lens, set(lens, a, store)) ≡ a — If you set a value into the store, and immediately view the value through the lens, you get the value that was set.
set(lens, b, set(lens, a, store)) ≡ set(lens, b, store) — If you set a lens value to a and then immediately set the lens value to b, it's the same as if you'd just set the value to b.
set(lens, view(lens, store), store) ≡ store — If you get the lens value from the store, and then immediately set that value back into the store, the value is unchanged.
*/

flow = (...fs)=> fs.reduce ((l,r)=> (...xs)=> r(l(...xs)))

get = l=>o=>l.get(o)
set = l=>v=>o=>(l.set(v)(o),o)
over = l=>f=>o=>(set(l)(f(get(l)(o)))(o),o)



				// // A function which takes a prop, and returns naive
				// // lens accessors for that prop.
				// const lensProp = prop => ({
				//   view: store => store[prop],
				//   // This is very naive, because it only works for objects:
				//   set: (value, store) => ({
				//     ...store,
				//     [prop]: value
				//   })
				// });


compose = (lens1, lens2) => ({
    get: (whole) => lens1.get(lens2.get(whole)),
    set: (whole) => (part) => lens2.set(whole)(lens1.set(lens2.get(whole))(part))
})



	/* ## OPTICS.LENSES */
fov = k=> ({get:o=>o[k],set:v=>o=>o[k]=v}) // TOOD: non-mutating version??
										// 	dup=o=>Object.assign(({array:[],object:{}})[type(o)],o)
										// fov2 = k=> ({get:o=>o[k],set:v=>o=> (o=dup(o)||o,o[k]=v) })

folk = (k,lens)=>({get:o=>getComputedStyle(o).getPropertyValue(k),set:v=>o=>o.style.setProperty(k,v)})

	/* ## OPTICS.UTILITY */
focii = (ks,lens=fov,ctx={})=>ks.reduce((a,k)=>(a[k]=(lens(k)),a),ctx)
getpath = (xs,lens=fov)=>o=> flow(...xs.map(x=>get(lens(x))))(o)
setpath = (xs,lens=fov)=>v=>o=> (set(lens(xs.slice(-1)))(v)(xs.length>1?getpath(slice(0,-1)(xs))(o):o),o)

release=(ctx={})=>f=>xs=>keys.reduce((a,x)=>(a[key]=(lens(key)),a),ctx)


// ['tat',"el=>key=> logic.tat[type(key)](key)(el)"],
// ['tat',"({string:a=>el=> el.getAttribute(a),object:a=>el=> (map(e=>(el.setAttribute(e[0],(e[1]))))(entries(a)),el)})",logic],




publicNames = Object.getOwnPropertyNames(window)
eventNames  = Object.getOwnPropertyNames(window).filter(startsWith('SVG')).map(s=>s.match(/SVG([^\W]*)Element?|./),$1)[1])




['HTML','SVG'].reduce((a,c)=>(
	a[c.toLowerCase()]=
	(HTMLorSVG=>
	xduce(wolf(refilter(s=>s.startsWith(HTMLorSVG))
			,remap(s=>s.match(RegExp(`${HTMLorSVG}([^\W]*)Element?|.`),$1)[1])
			,refilter(Boolean)
			,remap(toLowerCase())
			,refilter(x=>HTMLorSVG==='SVG'?!'title0style0script0image'.split(0).includes(x):x))
		 ,(a,b)=>a.concat([b]) )(PublicNames)) (c),a),{})

[['svg',tmp.svgels],['html',tmp.htmlels]].filter(x=>x[1].includes()) [0][0]

tmp.htmlels=Object.getOwnPropertyNames(window).filter(x=>x.startsWith('HTML')).map(x=>x.match(/HTML([^\W]*)Element?|./,$1)[1]).filter(Boolean)
tmp.svgels=Object.getOwnPropertyNames(window).filter(x=>x.startsWith('SVG')).map(x=>x.match(/SVG([^\W]*)Element?|./,$1)[1]).filter(x=>Boolean(x)).filter(x=>!["Title", "Style", "Script", "Image"].includes(x))




Object.getOwnPropertyNames(window).filter(startsWith('SVG')) .map(s=>s.match(/SVG([^\W]*)Element?|./)[1]).filter(Boolean).filter(!"title0style0script0image".split(0).includes)




/* # TEMPLATING */


type = x=>({}).toString.call(x).slice(8,-1).toLowerCase()

// isString = x => typeof x === 'string'
// const isArray = Array.isArray
arrayPush = Array.prototype.push
// isObject = x => typeof x === 'object' && !isArray(x)

clean = (arr, n) => (n && arrayPush.apply(arr, isString(n[0]) ? [n] : n), arr )

child = (n, cb) =>
  n != null ? (isArray(n) ? n.reduce(clean, []).map(cb) : [n + '']) : []

const h = (x, y, z) => {
  const transform = node =>
  isString(node)
    ? node
    : isObject(node[1])
      ? {
          [x]: node[0],
          [y]: node[1],
          [z]: child(node[2], transform),
        }
      : transform([node[0], {}, node[1]])
  return transform
}
var el = domvm.defineElement,
    tx = domvm.defineText,
    cm = domvm.defineComment,
    sv = domvm.defineSvgElement,
    vw = domvm.defineView,
    iv = domvm.injectView,
    ie = domvm.injectElement,
    cv = domvm.createView;












NS = [['svg',DEFS.svgels],['html',DEFS.htmlels]].filter(x=>x[1].includes()) [0][0]

tml=(ml,el=createElementNS(
		("http://www.w3.org/"+ml[0].startsWith('SVG')?'2000/svg':'1999/xhtml')
		,ml[0])
	)=>(
		forEach (node=>logic.tml[type(node)](node)(el))
		(ml.slice(1)),
		el)






logic.tml = 
	({NS:type=>("http://www.w3.org/"+{html:"1999/xhtml",svg:"2000/svg"}[type])
	,array: x=>el=> appendChild(tml(x))(el) 
	,string: x=>el=> appendChild(createTextNode(x))(el) 
	,object: x=>el=> tat(el)(x)})






lmt=(()=> {asJML=(frag)=> {let el = [frag.nodeName], attrs = {};if (frag.attributes) {[...frag.attributes].forEach((attr)=> attrs[attr.name]=attr.value); el.push(attrs)};[...frag.childNodes].forEach((node)=>includes(node.nodeType)([1,3])?logic.lmt[node.nodeType](el)(node):x=>x) ;return el };parse=(frag)=> ist.string(frag)?logic.lmt['string'](frag):logic.lmt['recur'](frag);return parse })()
lmt.logic=({'1': el=>node=> el.push(asJML(node)), '3': el=>node=>el.push(node.data), string: x=> asJML(document.createElement('span').innerHTML=x), recur: frag=> asJML(frag)})









/* # STATE STORE */
$ = (s={},is=[])=>(
	{state: ()=>s
	,trigger: i=>is.push(i) 
	,triggers: is
	,change: u=>n=>
		(s=u(s,n)			// new state=transform(state,event)
		,is.map(i=>i(s)),s)	// set off each trigger on new state
	})

restore = $=>p=>$.change((s,n)=> set(focus(p))(n)(s))
restorepath = $=>ps=> $.change((s,n)=>setpath(ps)(n)(s))

/* ------------------------------------------------------------------ 
$o.react(x=>console.log(x))
------------------------------------------------------------------ */
funsm = ({s,i})=>ns=>(map(n=>i=s[i][n])(ns),i)














// https://stackoverflow.com/questions/54719548/tail-call-optimization-implementation-in-javascript-engines
// trampoline ~> tco?






// https://jrsinclair.com/articles/2019/functional-js-traversing-trees-with-recursive-reduce/

hasChildren(node) {
    return (typeof node === 'object')
        && (typeof node.children !== 'undefined')
        && (node.children.length > 0);
}

const Tree = {
    reduce: curry(function reduce(reducerFn, init, node) {
        const acc = reducerFn(init, node);
        if (!hasChildren(node)) {
            return acc;
        }
        return node.children.reduce(Tree.reduce(reducerFn), acc);
    }),
}
////
function sumLinks(total, item) {return total + ((item.type === 'link') ? 1 : 0); }
console.log(Tree.reduce(sumLinks, 0, menu));
/////
function flattenToArray(arr, {children, ...data}) {return arr.concat([{...data}]); }
console.log(Tree.reduce(flattenToArray, [], menu));
//////////////

const Tree = {
    reduce: curry(function reduce(reducerFn, init, node) {
        const acc = reducerFn(init, node);
        if (!hasChildren(node)) {
            return acc;
        }   
        return node.children.reduce(Tree.reduce(reducerFn), acc);
    }),
    map: curry(function map(mapFn, node) {
        const newNode = mapFn(node);
        if (hasChildren(node)) {
            return newNode;
        }
        newNode.children = node.children.map(Tree.map(mapFn));
        return newNode;
    }),
};


function addChildCount(node) {
  const countstr = (hasChildren(node)) ? ` (${node.children.length})` : '';
  return {
    ...node,
    text: node.text + countstr,
  }
}

console.log(Tree.map(addChildCount, menu));

const prependHost = curry(function prependHost(host, node) {
  if (node.type !== 'link') { return node; }
  return {
    ...node,
    href: node.href.replace(/^\//, host),
  }
});

console.log(Tree.map(prependHost('http://example.com/'), menu));


hasChildren(node) {
    return (typeof node === 'object')
        && (typeof node.childNodes !== 'undefined')
        && (node.childNodes.length > 0);
}
 DOMTree = {
    reduce: curry(function reduce(reducerFn, init, node) {
        console.log({node});
        const acc = reducerFn(init, node);
        if (!hasChildren(node)) { return acc; }
        const children = node.childNodes;
        return [...children].reduce((a, x) => Tree.reduce(reducerFn, a, x), acc);
    }),
    map: curry(function map(fn, node) {
        node = fn(node);
        if (!hasChildren(node)) {
            return node;
        }
        [...node.children].forEach(Tree.map(fn));
        return node;
    }),
};

function isLink(node) {return (node.tagName === 'A'); }
function sumLinks(total, item) {return total + isLink(item) ? 1 : 0); }
console.log(DOMTree.reduce(sumLinks, 0, nav));

function addChildCount(node) {
    if (!isLink(node)) { return node; }
    const list       = node.parentNode.querySelector('ul');
    const childCount = (list) ? list.children.length : 0;
    if (childCount > 0) {
        node.innerHTML += ` (${childCount})`;
    }
    return node;
}

DOMTree.map(addChildCount, nav);

console.log(document.querySelectorAll('a').length);

function addChildCount(node) {
    if (!isLink(node)) { return node; }
    const list       = node.parentNode.querySelector('ul');
    const childCount = (list) ? list.children.length : 0;
    if (childCount > 0) {
        node.innerHTML += ` (${childCount})`;
    }
    return node;
}

[...nav.querySelectorAll(a)].forEach(addChildCount);




 appendTextNode(arr, node) {
    return (node.nodeName === '#text') ? arr.concat([node]) : arr;
}

console.log(DOMTree.reduce(appendTextNode, [], nav));
////////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////
// FIGURE OUT LAZY ITERABLES FOR STREAMS ETC
// https://jlongster.com/Transducers.js-Round-2-with-Benchmarks	
// Lazily transform an iterable
function* nums() {
  var i = 1;
  while(true) {
    yield i++;
  }
}

var iter = seq(nums(), compose(map(x => x * 2),
                               filter(x => x > 4));



///////////////////////////////////////////////////////////////////
const xduce = (
  xform,
  combine = (acc, elem) => (acc.push(elem), acc), 
  getInitial = () => [] /// get initial as a function
) => inputArr => inputArr.reduce(xform(combine), getInitial()); 
/////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////


































// https://github.com/trekhleb/javascript-algorithms/tree/master/src/algorithms/string/levenshtein-distance

levdistMatrix = (s)=>(t)=> {let x=[];[...s].map((u,i)=>w=w.map((v,j)=>p=j--?Math.min(p,v,w[j]-(u==t[j]))+1:i+1,x.push(w)),w=[...[,...t].keys()])|x.push(w);return x}  //dist is bottom right/last cell
lev1 = (s)=>(t)=> [...s].map((u,i)=>w=w.map((v,j)=>p=j--?Math.min(p,v,w[j]-(u==t[j]))+1:i+1),w=[...[,...t].keys()])|p  //dist is bottom
lev2 = (s)=>(t)=> [...s].map((u,i)=>w=w.map((v,j)=>p=j--?(Math.min(p,v,w[j]-(u==t[j]))+1,console.log('move'+u)):(i+1)),w=[...[,...t].keys()])|p  //dist is bottom


groupBy = (arr, fn)=> arr.map(typeof fn === 'function' ? fn : val => val[fn]).reduce((acc, val, i) => (acc[val] = (acc[val] || []).concat(arr[i]),acc), {})
// NGRAM_ARR ~> groupBy(splitWords(testText),(x,i,o)=>o[i-1])
// $SKIPGRAM = k=>groupBy(splitWords(testText),(x,i,o)=>o[(i-k)])
//LODASH~>reduce({ 'a': 1, 'b': 2, 'c': 1 }, (a,c,key)=> ((a[c]||(a[vc]=[])).push(key),a),{})

/* (k=>groupBy(splitWords(TESTTEXT1),(x,i,o)=>o[(i-k)]))(2)  !!! 2-SKIPGRAM on TESTTEXT1 - uncanny
A: ["is"]
a: (5) ["that", "is", "that", "is", "that"]
closes: ["a"]
futures: [""]
gate: ["a"]
gates: ["gate"]
is: (3) ["path", "key", "lock"]
key: (2) ["a", "closes"]
keys: ["futures"]
lock: (2) ["a", "paths"]
locks: ["lock"]
opens: ["a"]
path: ["opens"]
paths: ["keys"]
that: (3) ["locks", "gates", "to"]
to: (2) ["to", "blocks"]
undefined: (2) ["A", "key"]
*/








