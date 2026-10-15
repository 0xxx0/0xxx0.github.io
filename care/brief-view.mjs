import { parseShare, openSnapshot, MAX_BYTES } from './share-crypto.mjs';

if (document.documentElement.dataset.careShare === '1') start();

async function start() {
  // No shared case is imported into CARE's editable state or browser storage.
  const host = document.createElement('div'); document.body.replaceChildren(host);
  document.body.style.cssText = 'margin:0;padding:0;background:#f6f4ee;color:#182325';
  document.title = 'CARE · shared brief';
  const root = host.attachShadow({ mode: 'open' });
  const css = document.createElement('style'); css.textContent = `
    :host{display:block;color:#182325;font:17px/1.62 system-ui,-apple-system,"Noto Sans SC",sans-serif;color-scheme:light}
    *{box-sizing:border-box}main{max-width:750px;margin:auto;padding:28px 20px 100px}h1{font-size:clamp(30px,7vw,46px);line-height:1.12;letter-spacing:-.035em;margin:8px 0 14px}h2{font-size:22px;line-height:1.25;margin:0 0 14px}h3{font-size:18px;margin:0 0 6px}p{margin:8px 0 14px}small,.muted{font-size:14px;color:#536165}.ey{font:700 12px/1.5 ui-monospace,monospace;letter-spacing:.13em;color:#225c69}header{border-bottom:2px solid #1a4955;padding-bottom:18px}section{padding:24px 0;border-bottom:1px solid #bdc9c9}.lead{border-left:3px solid #22687b;padding:6px 0 6px 15px;margin:18px 0}.note{border-left:3px solid #936316;padding-left:14px}.row{padding:12px 0;border-top:1px solid #d0d7d5}.row:first-child{border:0}ul,ol{margin:8px 0;padding-left:24px}li{padding:4px 0}a{color:#18566b;text-decoration:underline;text-underline-offset:3px;overflow-wrap:anywhere}a:focus-visible,button:focus-visible,summary:focus-visible{outline:3px solid #28768d;outline-offset:4px}button,summary{font:inherit;cursor:pointer}button{min-height:44px;border:1px solid #2c5963;border-radius:0;background:transparent;color:#183e48;padding:8px 14px}button[aria-pressed=true]{background:#234e5a;color:#fff}.languages{display:flex;gap:6px;margin-top:18px}.actions{position:fixed;bottom:0;left:0;right:0;background:#f6f4eef5;border-top:1px solid #acbdbd;padding:10px 16px max(10px,env(safe-area-inset-bottom));display:flex;justify-content:center;gap:8px}.actions button{flex:1;max-width:300px;background:#234e5a;color:#fff}.stamp{display:block;font:12px/1.5 ui-monospace,monospace;margin-top:8px}details{border-bottom:1px solid #bdc9c9;padding:18px 0}summary{font-weight:650;min-height:40px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:15px/1.6 system-ui,sans-serif;background:#edeee8;padding:14px;border-left:2px solid #a4b8b5}blockquote{margin:12px 0;padding-left:14px;border-left:2px solid #a4b8b5;white-space:pre-wrap}footer{font-size:13px;color:#536165;padding-top:20px}.toast{min-height:24px;font-size:14px;color:#18566b}.source{font-size:14px}.empty{max-width:650px;margin:15vh auto;padding:25px}.options{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}@media(max-width:400px){main{padding-inline:16px}h2{font-size:21px}}@media print{main{padding:0;max-width:none}.actions,.languages,.options,.toast{display:none!important}details{break-inside:avoid}section{padding:15px 0}a{color:#111}h1{font-size:28pt}footer{font-size:10pt}}
  `; root.append(css);
  const status = document.createElement('p'); status.className = 'empty'; status.textContent = 'Opening shared brief… / 正在打开…'; root.append(status);
  try {
    if (!globalThis.crypto?.subtle) throw new Error('Open this link in a current HTTPS browser.');
    const { id } = parseShare(location.hash);
    const response = await fetch(new URL('./sealed/' + id + '.json', import.meta.url), { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error('The snapshot is unavailable. Ask the sender for a current link.');
    const raw = await response.text();
    if (raw.length > MAX_BYTES * 2) throw new Error('Snapshot is too large.');
    const envelope = JSON.parse(raw);
    status.textContent = 'Password required / 请输入密码';
    const form = document.createElement('form'); form.className = 'empty'; form.style.margin = '0 auto';
    const label = document.createElement('label'); label.textContent = 'Family brief password / 家人简报密码'; label.htmlFor = 'brief-password';
    const input = document.createElement('input'); input.id = 'brief-password'; input.type = 'password'; input.required = true; input.minLength = 16; input.maxLength = 256; input.autocomplete = 'off'; input.setAttribute('autocapitalize','none'); input.spellcheck = false; input.style.cssText = 'display:block;width:100%;font:18px system-ui;padding:12px;margin:10px 0 14px;border:1px solid #45656b';
    const button = document.createElement('button'); button.type = 'submit'; button.textContent = 'Unlock / 打开';
    const message = document.createElement('p'); message.setAttribute('role','status'); message.style.fontSize = '15px'; message.textContent = 'The link and password are separate. No medical details are displayed before unlocking. / 链接和密码分开；解锁前不显示医疗资料。';
    form.append(label,input,button,message); root.append(form);
    form.onsubmit = async event => {
      event.preventDefault(); button.disabled = true; button.textContent = 'Opening… / 正在打开…'; message.textContent = '';
      try {
        const packet = await openSnapshot(envelope, id, input.value);
        input.value = ''; form.remove(); status.remove(); render(root, packet, id);
      } catch (_) {
        message.textContent = 'Could not unlock. Check the password or request a fresh link. / 无法解锁，请核对密码或索取新链接。'; input.focus();
      } finally { button.disabled = false; button.textContent = 'Unlock / 打开'; }
    };
  } catch (_) {
    status.textContent = 'This brief could not be opened. Copy the complete link, including everything after #, and request the password separately. / 无法打开。请复制完整链接（包括 # 后的全部内容），并另行索取密码。';
  }
}

function render(root, packet, snapshotId) {
  let language = /^zh/i.test(navigator.language) ? 'zh' : 'en';
  const wording = {
    en: { title:'Family care brief', asof:'Latest family update', dated:'Dated snapshot · not a live hospital feed', reported:'Reported by family', unknown:'Still unknown', summary:'Where things stand', questions:'For the next doctor round', decisions:'Decisions to separate', care:'Care options', timeline:'Timeline & original messages', sources:'Sources & evidence limits', record:'Full record & earlier history', options:'More options', print:'Print / save PDF', download:'Download CARE case', copy:'Copy doctor questions', share:'Share this link', copied:'Copied.', failed:'Copy unavailable. Select the questions below.', privacy:'The medical content is encrypted. Opening it requires both this link and the separate password. Share them only with intended readers. This view does not save the case to browser storage.', note:'Family reports and AI-prepared questions; not a clinician-verified chart or treatment order.', english:'English', chinese:'中文', saved:'This is a fixed snapshot; later updates need a new link.' },
    zh: { title:'家人就医简报', asof:'最新家人消息', dated:'有日期的快照 · 并非医院实时数据', reported:'家人转述', unknown:'仍待确认', summary:'目前情况', questions:'下次查房要问', decisions:'分别考虑的决定', care:'就医选择', timeline:'时间线与原始消息', sources:'来源与证据范围', record:'完整记录与既往病史', options:'更多选项', print:'打印 / 保存 PDF', download:'下载 CARE 记录', copy:'复制问诊清单', share:'分享完整链接', copied:'已复制。', failed:'无法复制，请手动选取下方文字。', privacy:'医疗内容已加密。打开需要此链接和另行提供的密码，请只交给预期读者。本页面不会将病历存入浏览器储存。', note:'家人转述与 AI 整理的问题；不是医生核实的病历或治疗指令。', english:'English', chinese:'中文', saved:'这是固定快照；后续更新需要新链接。' }
  };
  const text = value => typeof value === 'string' ? value : '';
  const local = item => text(item?.[language] || item?.en);
  const el = (tag, value, className) => { const node = document.createElement(tag); if (value != null) node.textContent = value; if(className) node.className = className; return node; };
  const section = (main, title) => { const node=el('section'); node.append(el('h2',title)); main.append(node); return node; };
  const list = (parent, values, ordered=false) => { const node=el(ordered?'ol':'ul'); for(const value of values||[])node.append(el('li',typeof value==='string'?value:local(value)));parent.append(node); };
  const link = (title,url) => { try { const parsed=new URL(url); if(parsed.protocol!=='https:')return el('span',title);const node=el('a',title);node.href=parsed.href;node.target='_blank';node.rel='noopener noreferrer';node.referrerPolicy='no-referrer';return node; } catch { return el('span',title); } };
  function draw() {
    root.querySelector('main')?.remove(); root.querySelector('.actions')?.remove();
    const t=wording[language], data=packet.presentation||{}, main=el('main'), head=el('header');
    head.append(el('div','CARE / FIELD · READ','ey'),el('h1',(packet.case.subject?.label||'CARE')+' · '+t.title),el('small',t.asof+' · '+text(packet.as_of_label)),el('p',t.dated,'muted'));
    const languages=el('div',null,'languages');
    for(const [id,label] of [['en',t.english],['zh',t.chinese]]){const button=el('button',label);button.type='button';button.setAttribute('aria-pressed',String(language===id));button.onclick=()=>{language=id;draw();};languages.append(button);}head.append(languages);main.append(head);
    main.append(el('p',local(data.lead),'lead'));
    const state=section(main,t.summary);list(state,data.status);const unknown=el('div',null,'note');unknown.append(el('h3',t.unknown));list(unknown,data.unknowns);state.append(unknown);
    const questions=section(main,t.questions);list(questions,data.questions,true);
    const toast=el('div','', 'toast');toast.setAttribute('role','status');questions.append(toast);
    const decision=section(main,t.decisions);for(const item of data.decisions||[]){const row=el('div',null,'row');row.append(el('h3',local(item.title)),el('p',local(item.body)));decision.append(row);}
    const care=section(main,t.care);for(const item of data.care||[]){const row=el('div',null,'row');row.append(el('h3',local(item.title)),el('p',local(item.body)));if(item.url)row.append(link(language==='zh'?'机构信息':'Institutional source',item.url));care.append(row);}
    const history=el('details');history.append(el('summary',t.timeline));for(const event of [...packet.case.events].sort((a,b)=>b.at.localeCompare(a.at))){const row=el('div',null,'row');row.append(el('small',text(event.display_at||event.at)+' · '+t.reported),el('p',local(event.summary)||event.raw_note));if(event.raw_note)row.append(el('blockquote',event.raw_note));if(event.interpretation)row.append(el('p',event.interpretation,'muted'));history.append(row);}main.append(history);
    const sources=el('details');sources.append(el('summary',t.sources),el('p',local(data.evidence_note),'muted'));const sourceList=el('ul');for(const source of packet.sources||[]){const item=el('li',null,'source');item.append(link(text(source.title),source.url));sourceList.append(item);}sources.append(sourceList);main.append(sources);
    const record=el('details');record.append(el('summary',t.record),el('pre',text(packet.full_record)));main.append(record);
    const more=el('details');more.append(el('summary',t.options));const options=el('div',null,'options');const print=el('button',t.print);print.onclick=()=>window.print();const download=el('button',t.download);download.onclick=()=>{const blob=new Blob([JSON.stringify(packet.case,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='care-case.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};options.append(print,download);more.append(options,el('p',t.saved,'muted'));main.append(more);
    const footer=el('footer');footer.append(el('p',t.privacy),el('p',t.note),el('span','Snapshot '+snapshotId.slice(0,12),'stamp'));main.append(footer);root.append(main);
    const actions=el('nav',null,'actions');actions.setAttribute('aria-label',language==='zh'?'分享与问诊':'Sharing and consultation');
    const fallback=(value,label)=>{questions.querySelector('textarea')?.remove();const box=el('textarea');box.value=value;box.readOnly=true;box.rows=5;box.setAttribute('aria-label',label);box.style.cssText='width:100%;font:16px/1.5 system-ui;margin-top:12px';questions.append(box);toast.textContent=label;box.focus();box.select();questions.scrollIntoView({behavior:'smooth'});};
    const questionText=()=>(data.questions||[]).map((q,i)=>(i+1)+'. '+local(q)).join('\n');
    const copy=el('button',t.copy);copy.onclick=async()=>{try{await navigator.clipboard.writeText(questionText());toast.textContent=t.copied;}catch{fallback(questionText(),t.failed);}};
    const share=el('button',t.share);share.onclick=async()=>{try{if(navigator.share)await navigator.share({title:'CARE · family brief',url:location.href});else{await navigator.clipboard.writeText(location.href);toast.textContent=t.copied;}}catch(error){if(error.name!=='AbortError')fallback(location.href,language==='zh'?'手动复制完整链接':'Copy the complete link below');}};actions.append(copy,share);root.append(actions);
    document.documentElement.lang=language==='zh'?'zh-Hans':'en';
  }
  draw();
}
