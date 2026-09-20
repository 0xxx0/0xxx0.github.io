/* -------------------------------------------------------- */
flow = (...gs)=> gs.reduce((l,r)=>(...xs)=>r(l(...xs)))
type = x=>({}).toString.call(x).slice(8,-1).toLowerCase()
cu = (f,d=f.length,...as)=>d<=as.length?f(...as):cu.bind(null,f,d,...as)
/* -------------------------------------------------------- */
clamp = (n,Z=1,A=0)=> n<A?A:n>Z?Z:n
/* requires clamp */ lerp = (p,a,b)=> (a+clamp(p)*(b-a))
/* -------------------------------------------------------- */
hash =    (s)=> ([...s].reduce((a,c)=> c.charCodeAt()+a*31|0, 0))
/* requires lerp */ randSeed =(x=999, max=1, min=0)=>(x^=x<<13,x^=x>>>17,lerp(Math.abs(x^=x<<5)%1e9/1e9, min, max))// seeded random numbers - Xorshift

/* -------------------------------------------------------- */
// Matrix
    /* -------------------------------------------------------- */
    xpo = a=> a[0].map((_,i)=>a.map(y=>y[i]))
    dot = (a,b,f=(x,y)=>x*y,g=(x,y)=>x+y,i=0)=>(a.map((_,i)=> f(a[i],b[i]))).reduce(g,i)
    mXm = (m,t,f,g,i)=> m.map(x=>xpo(t).map(y=> dot(x,y,f,g,i)))
    /* -------------------------------------------------------- */

Store = (s={},is=[])=>(
    {state: ()=>s
    ,subscribe:i=>is.push(i)
    ,listeners:is
    ,action:u=>n=>
        (s=u(s,n)
        ,is.map(i=>i(n,s)),s)})
, funsm = (s,i)=>ns=>ns.reduce((i,n)=>(i=typeof(i)==='object'?s[i[n]]:s[i][n]),i)
    /* 
    egsm=funsm(
        {'hungry':   {'eat'   :'satisfied'}   // states //:{state: {change:nextState} }
        ,'satisfied':{'starve':'hungry'
                    ,'eat'   :'full'}	},
        'hungry')						// initial|curr state
    
    egsm(['eat','starve','eat','eat']) //=> 'full'

    */
egsm=funsm(
    {'idle':    {'INPUT'    :'satisfied'}   // states //:{state: {change:nextState} }
    ,'running': {'SUCCESS'  :'hungry'
                ,'FAILURE'  :'full'}	}
    ,'error':   {}
    ,'hungry')						// initial|curr state


/* 
██████╗ ███████╗██████╗ ██╗   ██╗ ██████╗███████╗
██╔══██╗██╔════╝██╔══██╗██║   ██║██╔════╝██╔════╝
██████╔╝█████╗  ██║  ██║██║   ██║██║     █████╗  
██╔══██╗██╔══╝  ██║  ██║██║   ██║██║     ██╔══╝  
██║  ██║███████╗██████╔╝╚██████╔╝╚██████╗███████╗
╚═╝  ╚═╝╚══════╝╚═════╝  ╚═════╝  ╚═════╝╚══════╝                                          
REDUCE:
...
 */
/* -------------------------------------------------------- */
reduce = (f,i,x=0)=>es=> {for(let e of es) {let next=f(i,e,x++);i=next&&next[reduce.d]||next; if(next[reduce.d]) {break;}}return i;};
Object.defineProperty(reduce,'d',{value:Symbol('Computation halted')})

/* xform = redFn => filter(x => x > 1, map(add(1), redFn)) // reduce(xForm(concat), [], [1, 2, 3, 4]) */
/* -------------------------------------------------------- */
    push = (a,b)=>(a.push(b),a)
    cat 
    freq
/* 

/*
██╗  ██╗██████╗ ██╗   ██╗ ██████╗███████╗
╚██╗██╔╝██╔══██╗██║   ██║██╔════╝██╔════╝
 ╚███╔╝ ██║  ██║██║   ██║██║     █████╗  
 ██╔██╗ ██║  ██║██║   ██║██║     ██╔══╝  
██╔╝ ██╗██████╔╝╚██████╔╝╚██████╗███████╗
╚═╝  ╚═╝╚═════╝  ╚═════╝  ╚═════╝╚══════╝                                         
XDUCE:

ch = go(function*(x) {yield timeout(1000);return x;}, [42]);
console.log((yield take(ch)));
*/
/* -------------------------------------------------------- */ //[ ] Core xduce
xduce = (t,r,i,c)=>ks=>c(t(r),i) (ks)
transduce = curry((t,r,i,c)=> reduce(t(r),i,c))



xd = t=>xduce(t,r=(a,b)=>(a.push(b),a),i=[],c=reduce) 
/* -------------------------------------------------------- */ //[ ] Core xforms
    mapping = f=>r=>(a,y)=>r(a,f(y))
    filtering = p=>r=>(a,y)=> p(y)?r(a,y):a


            map = cu((f,r)=>(a,y)=>r(xs,f(y)))
            map = curry((mapFn, redFn) => (xs, x) => redFn(xs, mapFn(x)))


                //our enhanced mapping & filtering operations, now with a way to specify a "resultifier"
            const mapping = transformFn => resultifierFn => 
            (acc, item) => resultifierFn(acc, transformFn(item, acc));
            
            const filtering = testFn => resultifierFn => (acc, item) => 
            testFn(item, acc) ? resultifierFn(acc, item) : acc;
            
            //some, er... resultifiers
            const concat = (array, value) => array.concat([value]);//build up a final result
            const sum = (x, y) => x+y;

            //example usage in a reduce operation
            reduce( filtering(x=>x>1)(concat), [], [1,2,3]);//-> [2,3]
            reduce( mapping(x=>x+1)(sum), 0, [1,2,3]);//-> 2+3+4 = 9


            reduce( concat, [], [1,2,3]);//-> [1,2,3]
            reduce( sum, 0, [1,2,3]);//-> 1+2+3 = 6

    /* -------------------------------------------------------- */ //[ ] Stateful xforms
    mapping_s = (f,s=0)=>r=>(a,y)=>r(a,f(y,s++))
    filtering_s = (p,s=0)=>r=>(a,y)=>p(y,s++)?r(a,y):a
    dropping = s=>r=>(a,y)=> (--s>=0?a:r(a,y,s))
    /* -------------------------------------------------------- */ //[ ] Stateful xforms    
    taking = s=>r=>(a,y)=> (--s>=0?r(a,y,s):{[reduce.d]:a})
    /* -------------------------------------------------------- */
    gating = gate=>(...ks)=>filtering(gate(...ks))
    dropgate = skips=>x=> isFinite(gte(0)(decr(skips))) (false)(true)
    bigate = (open,close,opened=false)=>x=>open(x)?opened=true:close(x)?opened=false:opened
    // noisefilter
    // ...events stream...
/* -------------------------------------------------------- */

/* 
 ██████╗ ██████╗ ████████╗██╗ ██████╗███████╗
██╔═══██╗██╔══██╗╚══██╔══╝██║██╔════╝██╔════╝
██║   ██║██████╔╝   ██║   ██║██║     ███████╗
██║   ██║██╔═══╝    ██║   ██║██║     ╚════██║
╚██████╔╝██║        ██║   ██║╚██████╗███████║
 ╚═════╝ ╚═╝        ╚═╝   ╚═╝ ╚═════╝╚══════╝
OPTICS:
...
*/

// # TRAVERSALS // can target any number of elements. TODO: ensure no intermediate rep / xduce
    All    =  ()=>({get:o=>o ,mod:f=>o=>  f(All().get(o)) } )   // FIXME: problem with mod
    Only = (pred=x=>x) => ({get:o=>o.filter(pred),mod:f=>o=> f(Only(pred).get(o)) })  // TODO: rename to "when"?
    OnlyKV = pred=> ({get:o=>Object.entries(o).filter(([key,value])=>pred({key,value})).reduce((a,c,i)=>(a[Array.isArray(o)?i:c[0]]=c[1],a),Array.isArray(o)?[]:{}),mod:f=>o=>Only(pred).get(o).map(f)/*TODO: Refactor*/})
// # OPTIONALS // target a single element that may not be defined 
    Maybe= (k,l=fov) =>({get: o=>o&&get(l(k),o)||o, mod:f=>o=>f(o&&get(l(k),o))||o})// FIXME:problems composing in scope
    MaybeElse = (k,e,l=fov) =>({get: o=>o&&get(l(k),o)||get(l(e),o), mod:f=>o=> f(get(MaybeElse(k,e,l),o)) })
    // , If_not =  (k,l=defaultLens,f=Maybe(k,l))=>e=>({type:"optional",get: o=>get(f)(o)?get(f)(o):e ,mod: g=>o=>get(f)(o)?g(get(f)(o)):g(e) })
// # LENSES // are a restriction of traversals that target a single element 
    Lens = cu((get,set)=>({get,set,mod:f=>o=>(set((typeof f==='function'?f:(()=>f)) (get(o)) )(o))}))
// # ISOMORPHISMS // are a restriction of lenses with an inverse.
    Iso = cu((to,from)=>({get:to,back:from,inv:()=>Iso(from)(to),mod:f=>a=>to(f(from(a)))}))

/* requires Lens */ fov = k=>Lens (o=>o[k],v=>o=>Object.assign(Array.isArray(o)?[]:{},o,{[k]:v}))
// TODO: set default lens in settings/config
        defaultLens=fov


// ~~OPTICS functions 
    /* -------------------------------------------------------- */
    focus= (l,def=defaultLens||fov)=>l['get']?l:def(l)
    , focii  = (ks,l=defaultLens||fov,i={})=>ks.reduce((a,k)=>(a[k]=(l(k)),a),i
    /* requires cu, focus */ get = cu((l,o)=> focus(l).get(o))
    /* requires cu, focus */ mod = cu((l,v,o)=> focus(l).mod(typeof v==='function'?v:(()=>v))(o))
    /* requires cu, focus, get, mod, Lens */ compound=(l2,l1)=>Lens(o=>get(l1,get(l2,o)),f=>o=>mod(l2,mod(l1,f,get(l2,o)),o))
    /* requires  cu, focus, get, mod, Lens, compound */scope=(...ls)=>ls.reduce(compound)
    /* -------------------------------------------------------- */

    /* -------------------------------------------------------- */
    , gentry = (ks,l=fov)=>z=>ks.reduce((a,k)=>(a[k]=get(l(k))(z),a),{})
    , sentry = (o,l=fov)=>z=>Object.entries(o).reduce((a,x)=>a=mod(l(x[0]))(x[1])(a),z)
    , config = (x,l=fov)=> (
        {"object":sentry(x,l)
        ,"array":gentry(x,l)
        ,"string":get(l(x))
        ,"number":get(l(x))})[type(x)]
                    //Array.isArray(x)?gentry(x,l):sentry(x,l)
    /* -------------------------------------------------------- */



HOM=(()=>/* -------------------TEMPLATING------------------- */ {const
        /* Templating JSONML -> XML */
       type = x=>({}).toString.call(x).slice(8,-1).toLowerCase()
    ,  tml_logic= (
        { array    : x=>el=> el.appendChild  (tml(x))
        , string   : x=>el=> el.appendChild (document.createTextNode(x))
        , object   : x=>el=> Object.entries(x).filter(([k,v])=>k!=='ns').map(([k,v])=>el.setAttribute(k,v),el)
        , NS       :(a='html')=> "http://www.w3.org/"+{html:"1999/xhtml",svg:"2000/svg",mathml:"1998/Math/MathML"}[a]
        })
    ,  lmt_logic=(
        { "1"        : el=>node=> el.push(asJML(node))
        , "3"        : el=>node=>el.push(node.data)
        /* , "recur"    : f=> asJML(f)         */
        , "string"   : x=> asJML(document.createElement('span').innerHTML=x)
        , "hasAttr"  : f=>el=>attrs=>([...f.attributes].forEach((attr)=> attrs[attr.name]=attr.value),el.push(attrs))
        })
    
        // T0D1: refactor both, lmt esp - should at least be "1-liner" like lmt
        ,  tml      = ((ml,e=document.createElementNS(tml_logic.NS(ml[1]?ml[1].ns:'html'),ml[0]))=> (ml.slice(1).forEach(n=>tml_logic[type(n)](n)(e)),e))        
        , lmt=(asJML=(f,el=[f.nodeName],attrs={})=>
            ((f.attributes)?lmt_logic['hasAttr'](f)(el)(attrs):'Nothing' // T1D1: Clean this up
            ,[...f.childNodes].forEach((node)=>([1,3]).includes(node.nodeType)?lmt_logic[node.nodeType](el)(node):x=>x,el),el)
            ,parse=(f)=>(lmt_logic[typeof(f)]||asJML/* lmt_logic['recur'] */) (f),parse) // T1D1: necessary?
    ; return{ /* =========================[X]=============================== */
                                 tml,lmt
    }})   /* =========================[X]=============================== */    

/*************************************************************/
/* # Prefab Lenses */     
/*************************************************************/ 
L=
    {
    // LENSES
        fov:  k=>Lens(o=>o[k]
                    ,v=>o=>Object.assign(Array.isArray(o)?[]:{},o,{[k]:v}))
    
    // DOM 
        ,attr: k=>Lens(o=>o.getAttribute(k)
                    ,v=>o=>o.setAttribute(k,v))
        ,css:  k=>Lens(o=>getComputedStyle(o).getPropertyValue(k)
                    ,v=>o=>(o.style.setProperty(k,v),o))

    // ASYNC    
        ,fetch = (o,n)=>Lens( k=> fetchURL (o+k,n) /* (async URL) (async post to URL) !!! TODO: refactor w fetchURL */ 
                        ,v=> k=>  fetch(o+k,{method: 'POST',headers: {'Content-Type': 'application/json;charset=utf-8'} ,body: JSON.stringify(v) })) 

    // ISOS
        , json_parsed: Iso(JSON.stringify
                          ,JSON.parse)             
        , s_aw=Iso(s=>s.split(' ')
                  ,a=>a.join(' '))
        , n_s: Iso(num=>num.toString()
                  ,str=>+str.match(/[0-9]+/g)) // REVIEW: does not handle 324xx234 ... should it? 
        , a_s: Iso(arr=> JSON.stringify(arr) /* arr.join('') */ 
                  ,str=>[...str] )

        // Trivial "formatting"
        , n_px:Iso(x=>x+'px',strtonum)
        , n_deg=Iso(num=>num+'deg')(str=>+str.match(/[0-9]+/g))
        , n_=unit=>Iso(num=>num+unit)(str=>+str.match(/\-[0-9]+/g))
            // n_=unit=>Iso(num=>num+'px')(str=>+str.match(/[0-9]+/g))

            // TODO: ~> (requires "clamp")    , percent = (n,b=100,a=0)=>(b-a?clamp((n-a)/(b-a)):0)*100

    }
    // TODO: refactor into a table/matrix or sth - esp conversions/translation/lookup|"mapping" functions
fetchURL=async (url,n=0,t="text,json,formData,blob,arrayBuffer".split(",")[n])=>(
    response = await fetch(url),response.ok?await response[t]():alert(alert("HTTP-Error: " + response.status)))



    /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
        /* TEMP(?) */ 
        // TODO: maybe auto | type inference  ~> useful for editor|inputs (?)
                , got = l=>o=>(['string','number'].includes(typeof(l))?l=fov(l):'',l.get(o)       )
                , mot = l=>f=>o=>(['string','number'].includes(typeof(l))?l=fov(l):'',l.mod(f)(o)) 
                , moo = l=>o=>f=>l.mod(f)(o)

        /* ------------------------------------------------------- */
        // aff=fx=>(min=0,max=100,step=.1)=>
        // ['div',['input'],['input',{type:'range',min,max,step,fx(this)}]]r z
        /* ------------------------------------------------------- */
        // FETCH // lens
        WEBDAT= (
            { HTTPS:"https://"
            , CORS:"cors-anywhere.herokuapp.com" /* CORS -> try CORS if fail // OPT (?) */
            , EGURL1:"api.github.com/repos/javascript-tutorial/en.javascript.info/commits"
            })
            /* ------------------------------------------------------- 
            TESTR=()=>($f.appendChild(tml(['div',{id:'testr',class:'reader movable ',style:'background-color:black'}
                ,['div',{class:'reader before movable'},...read(res2,3)(13).bef.map(dat=>['span',{class:'movable hl0'},dat])]
                ,['marquee',{class:'reader current movable hl0', style:'--sx:2;--sy:2'},read(res2,3)(13).cur]
                ,['div',{class:'reader after movable '},...read(res2,3)(13).aft.map(dat=>['span',{class:'movable hl0'},dat])]]
            )),hl0.reset())
            res=Lenses.fet(WEBDAT.HTTPS+WEBDAT.CORS,0).get("/sso.agc.gov.sg/Browse/Act/Current/All/1?PageSize=500&SortBy=Title&SortOrder=ASC" ).then(x=>(res=x,res2=res.split('\n'),TESTR()))
            // .then(res=>res2=res.split('\n'))
            */

    /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

// TODO: find or write speech to auto select lang | voiceoption basedo n language - ie speak multilingual...
SPEECH = (()=>{const
    say=(text=' Hello!',lang='en',voiceoption=0,voice=speechSynthesis.getVoices().filter(x=>x.lang.includes(lang))[voiceoption]
        ,rate=1.25,volume=10,pitch=1
        ,onboundary)=>
            (typeof utter!=="undefined"?utter:utter=new SpeechSynthesisUtterance
            ,Object.assign(utter,{text,lang,rate,volume,voice,pitch}),speechSynthesis.speak(utter)
            )
    ,status=speechSynthesis
    ;return{ /* =========================[X]=============================== */
            say,status
    }})   /* =========================[X]=============================== */
    ()



    /* 
███████╗ ██████╗██████╗  █████╗ ████████╗ ██████╗██╗  ██╗
██╔════╝██╔════╝██╔══██╗██╔══██╗╚══██╔══╝██╔════╝██║  ██║
███████╗██║     ██████╔╝███████║   ██║   ██║     ███████║
╚════██║██║     ██╔══██╗██╔══██║   ██║   ██║     ██╔══██║
███████║╚██████╗██║  ██║██║  ██║   ██║   ╚██████╗██║  ██║
╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝
SCRATCH
                                                          */




/*



{
state: 'idle':

}

funsm 
    states
        transitions | actions
        emissions | ???


    INPUT

    XFORM 

    SELECT | focus

    OUTPUT 






Machines
    - data
        - fetching | reading
        - storing | writing
        - processing | editing

    - represent
        - rendering
            modality ~> visual | auditory
        - 
        - 
    - navigating | positioning


status
    - idle
    - running
    - error
        - retry
        - cancel

    ** history? | log

*/
