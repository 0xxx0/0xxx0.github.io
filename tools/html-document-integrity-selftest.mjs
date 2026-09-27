#!/usr/bin/env node
import {htmlTailErrors} from './html-document-integrity.mjs';
const fail=[],need=(ok,msg)=>{if(!ok)fail.push(msg)};
need(htmlTailErrors('<!doctype html><html><body>x</body></html>','good').length===0,'valid document rejected');
need(htmlTailErrors('<div>fragment</div>','fragment').length===0,'fragment without closer rejected');
need(htmlTailErrors('<html></html> garbage','trailing').some(x=>x.includes('after </html>')),'trailing bytes not detected');
need(htmlTailErrors('<html></html><html></html>','duplicate').some(x=>x.includes('duplicate')),'duplicate closer not detected');
if(fail.length){console.error('HTML DOCUMENT INTEGRITY FAIL · '+fail.join(' · '));process.exit(1)}
console.log('HTML DOCUMENT INTEGRITY PASS · registered static documents cannot hide duplicate/trailing source after </html>');
