// TYPES
U={} //disjoint union types
    type=(x)=>({}).toString.call(x).slice(8,-1).toLowerCase()
    ist='object,array,string,number,map,set,_'.split(',')

// MISC: LANGUAGE: SYNTAX MOD
    // kraken
        // with rule that if name exists
        // skip, modname or typecheck?
        // string.splice, ...

// COMPOSITION
//||||||||||||||||||| P R E L U D E |||||||||||||||||||||||\\
flow = (...gs)=> gs.reduce((l,r)=>(...xs)=>r(l(...xs)))
wolf = (...gs)=> gs.reduce((r,l)=>(...xs)=>r(l(...xs)))
// pipe = (...fns) => x => fns.reduce((v, f) => f(v), x)
type=(x)=>({}).toString.call(x).slice(8,-1).toLowerCase()
ist=['map',]

size_logic=({array:x=> x.length ,string: x=> new Blob([x.replace(/./gu,'.')]).size ,object: x=> x.size||x.length||Object.keys(x).length }), size=x=>size_logic[type(x)](x)
