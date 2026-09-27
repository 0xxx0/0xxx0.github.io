export function htmlTailErrors(source,label='HTML'){
  const s=String(source??''),closers=[...s.matchAll(/<\/html\s*>/gi)];
  if(!closers.length)return [];
  const out=[];
  if(closers.length!==1)out.push(`duplicate </html> in ${label}: ${closers.length} closers`);
  const end=(closers[0].index||0)+closers[0][0].length;
  if(s.slice(end).trim())out.push(`non-whitespace bytes after </html> in ${label}`);
  return out;
}
