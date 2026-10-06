/* decode-coach.js — jargon coach module for the-call v2 · donor: mahshroom 2026-10-06
 * THEME-CONTRACT: window.MODULES += {id:'decode-coach', onMatter(card, el), onEnd(el)}.
 * Matter render → wraps DECODE-deck terms (span.q text included) in tappable marks.
 * Tap → one gloss card: the sense that fits THIS sentence (keyword sense-pick over the
 * surrounding text), the trap/other sense, one action line. Data ported inline from
 * 20261006-decode-mangospree (57 terms / 105 senses). Vanilla: no network, no storage. */
(function () {
'use strict';
/* entry: [term, poly, sense, ...] · sense = "label|keywords,comma,sep|meaning|action" */
var RAW = [
["agent",1,"AI agent / harness|harness,model,tool,autonomous,llm,runs,skill,mcp,assistant,bot,claude,openclaw|A program that does multi-step work on its own \u2014 a very keen intern with no judgment and perfect memory.|You are accountable for what it does. Before any pilot touches real data: ask for the sandbox diagram + audit trail.","agency law|law,power,attorney,contract,represent,client,principal,authority,act on|A person empowered to act for another (the classic legal sense).|Usually what a contract means when it says 'agent'. Read which room the sentence is in.","user-agent|browser,header,http,crawl,request|The technical label a browser gives itself.|Pure noise for you. Skip."],
["retention",1,"data retention|data,policy,delete,message,slack,storage,days,gdpr,pdpa|How long messages/files are kept before deletion.|The one that bites legal teams: if retention deletes chats a hold should have kept, you have a problem. Get the policy in writing.","talent retention|staff,employee,people,team,attrition,keep|Keeping employees from leaving.|Different universe. If a memo mixes both in one paragraph, the memo is confused, not you."],
["training",1,"model training|model,data,dataset,consent,base,weights,generative,ai|Teaching a model on data. The 'training data' in every AI-law memo.|If your org's data was used, PDPA consent basis is the question. Ask which dataset, which basis.","staff training|staff,employee,course,workshop,onboard,learn|Teaching humans.|Different thing entirely. 'Training data' \u2260 'training materials'."],
["token",1,"auth token|api,access,auth,key,oauth,secret,bearer,credential|A digital key a program presents to prove who it is.|Security-critical: tokens are how agents get powers. Ask which powers each token has (least privilege).","LLM token|model,llm,cost,context,window,pricing,per-|A chunk of text the model reads; billing and 'context window' are measured in these.|Explains the cost line on AI bills. 1 token \u2248 \u00be of an English word."],
["model",1,"AI model|ai,llm,claude,gpt,generative,inference,prompt,foundation|The trained system that generates text/answers.|'Model card' and 'model risk' in AI-governance docs mean this.","business/role model|business,operating,role,twin,revenue|The ordinary corporate sense.|Context decides. 'Model governance' in a bank usually = model risk (quant models), NOT AI \u2014 a very common meeting confusion."],
["hallucination",0,"AI fabrication||The model stating something false with total confidence.|Never cite what you didn't check. Every AI output is a draft from a confident stranger."],
["prompt",1,"LLM prompt|llm,model,ai,instruction,agent,system,ask|The instruction text you give a model.|'Prompt injection' = attacker hides instructions in a document the model reads. Real risk for document-heavy legal work.","promptness|payment,invoice,within,days,due|'Prompt payment' \u2014 pay quickly.|Contract language. The old meaning wins in drafting."],
["alignment",1,"model alignment|model,ai,safety,human,values,reward,rlhf|Making an AI system do what humans actually want.|The field the whole AI-safety debate is about.","strategic alignment|strategy,stakeholder,org,goals,business|Everyone pulling the same direction.|Meeting-speak. Neither wrong \u2014 just know which one you're approving.","alignment (legal-ops meeting sense)|meeting,written,objection,sign-off,approval,stakeholder,consensus,migrat,everyone,aligned|'We have alignment' = nobody has objected in writing yet. It is not approval.|Ask 'who is the named approver and where is the sign-off?' \u2014 a name, a date, a link. Verbal alignment has sunk more migrations than any technical failure."],
["inference",1,"model inference|model,runtime,gpu,latency,run,api,cost|Actually running a model to get answers.|'Inference cost' on the AI bill = per-question cost. The recurring bill, not the build.","logical inference|evidence,conclude,reasoning,court,draw|A conclusion drawn from evidence.|The legal sense. A memo using both senses in one paragraph is a memo to push back on."],
["context",1,"context window|window,token,llm,memory,long,input,limit|The maximum text a model can 'see' at once.|Explains why long PDFs get truncated in AI tools. Ask vendors for their window size.","context of the matter|matter,contract,facts,case,circumstances|The surrounding facts of a case/contract.|The everyday sense."],
["embedding",1,"vector embedding|vector,search,rag,retrieval,semantic,index,pinecone|Text converted to numbers so 'similar meaning' can be searched.|The engine under semantic search / RAG. 'Embeddings store' = where your documents' vectors live \u2014 a data-protection question.","embedded (systems/staff)|device,firmware,team,engineer,squad|Built into hardware, or staff sitting inside another team.|Different world entirely."],
["guardrail",1,"AI guardrail|model,ai,safety,output,filter,policy,runtime|Technical controls that stop a model doing/saying prohibited things.|The 2026 compliance story: runtime guardrails instead of post-facto audits. Ask vendors which guardrails are ON by default.","highway guardrail|road,highway,crash|The metal thing on roads.|Not this."],
["sandbox",1,"agent sandbox|agent,docker,isolate,container,code,execution,runner|An isolated box where an agent can run things without touching the real world.|Non-negotiable control: isolated runner + egress allowlist + least-privilege tokens. No sandbox recipe, no real data.","regulatory sandbox|mas,regulator,sandbox,trial,approve,financial,monetary|A regulator letting you trial something under supervision (MAS loves these).|Completely different thing with the same word. Yes, this causes real confusion in APAC meetings."],
["export",1,"export controls|control,chip,compute,china,us,geopolitics,restrict,semiconductor|Government restrictions on selling tech abroad (the AI-cold-war lever).|The reason some models aren't available in some markets. Real constraint on your vendor list.","data export|data,portability,download,transfer,move,csv|Moving data out of a system.|PDPA portability is legislated but not yet in force (2026). Also: 'export' in eDiscovery = the produced bundle."],
["discovery",1,"eDiscovery / Discovery API|ediscovery,ediscover,api,slack,export,legal hold,preserv,litigation hold|In Slack-land: the Enterprise-only export channel for compliance/legal holds.|Plan-tiered. If IT hasn't enabled it, your holds may be decorative. Ask.","litigation discovery|litigation,court,disclosure,discovery process,proceedings|The pre-trial disclosure process.|Same word, adjacent meaning \u2014 Slack's 'Discovery API' is named after this one on purpose.","project discovery phase|project,phase,vendor,sow,scoping,implementation,kickoff,engagement,covered in|The scoping phase of a project or vendor engagement \u2014 where requirements get gathered.|'Covered in the discovery phase' in a vendor deck is a project milestone, NOT litigation disclosure and NOT Slack's Discovery API. Three rooms now: court, Slack admin, project plan."],
["hold",1,"legal hold|legal,litigation,preserv,delet,ediscovery,matter,spoliation|An instruction to preserve everything relevant to a dispute.|Slack's legal hold (Enterprise) excludes Slack Connect messages \u2014 the gap we keep warning about. One written question to IT closes it.","hold (verb)|hold the,please hold,hold off,hold my|Ordinary verb.|Fine. Just don't let a 'hold the deletion' email get read as casual."],
["residency",1,"data residency|data,region,singapore,server,storage,location,gdpr,pdpa,local|Which country's data centres hold your data.|Slack: Business+ and up; Singapore region exists; pre-existing data stays where it was unless Sales migrates it.","tax residency|tax,entity,company,resident,inland|Where a company/person is tax-resident.|Different law, same word."],
["workspace",1,"Slack workspace|slack,channel,workspace,org,enterprise,member|Your Slack org instance (with channels, members, admin).|'Workspace' in a Slack conversation = the instance. Retention/hold policies attach here.","the office|office,desk,hot desk,hybrid,wfh|Physical workplace.|Harmless unless a policy doc mixes both. It happens."],
["channel",1,"Slack channel|slack,channel,intake,matter,topic,#,post|A room in Slack.|Design channels like a case file: #intake, #matter-*, #ops-*. One purpose each.","channel = route to market|sales,distribution,partner,market,go-to|How a product reaches customers.|Meeting-speak. Adjacent word, different universe."],
["thread",1,"Slack thread|slack,thread,reply,replies,channel,message|A reply chain under one Slack message.|House rule that works: detail lives in threads, decisions live in the channel. Keeps scroll sane.","thread of argument|argument,thread of,reasoning,narrative|The logical line of a story/argument.|The classic sense."],
["bridge",1,"matrix/Slack bridge|matrix,irc,xmpp,slack,bridge,connect,federat|Software connecting two chat systems.|If IT says 'we'll bridge it', ask what data crosses and under which retention.","bridge loan|loan,finance,bridge financing,property|Short-term financing.|Finance sense."],
["grid",1,"Slack Enterprise Grid|slack,enterprise,grid,org,multi-workspace,admin,ekey|Slack's top tier: many workspaces under one org admin.|Where EKM, Audit Logs API, Discovery API and legal holds live. If your firm is on Grid, more of the safety kit is available than on Business+.","power grid|power,electricity,energy|The electricity network.|Not this one."],
["enterprise",1,"Enterprise+ (Slack tier)|slack,tier,plan,plus,feature,billing,subscription|A Slack plan tier (above Business+).|Feature gating is the whole game: EKM=Enterprise+ add-on; Audit/Discovery APIs=Enterprise-only; hold=Enterprise-only.","the enterprise (a big company)|the enterprise,large,corporate,fortune,multinational|Big business as a category.|Fine \u2014 just know 'enterprise-only feature' means the tier, not the customer size."],
["memory",1,"agent memory|agent,memory,remember,context,state,session,recall,vault|An agent's persistent notes across sessions.|Ask what an agent remembers, where it's stored, and who can read it. That's a records question in disguise.","memory (human/IT)|memory leak,ram,remember to|Human memory or computer RAM.|Depends on room."],
["skill",1,"agent skill (SKILL.md)|skill,agent,harness,tool,plugin,capability,install|A reusable instruction pack that teaches an agent a workflow.|The real deliverable of any agent project: written, reviewable SOPs. The harness is replaceable; the skills are the IP.","human skill|people,staff,talent,skillset,training,hire|What people can do.|Classic sense."],
["jailbreak",0,"prompt jailbreak||Tricking an AI past its safety rules with crafted input.|Assume motivated parties will try it on any public-facing agent. Red-team before launch, not after."],
["MCP",0,"Model Context Protocol||An open standard for plugging tools/data into AI assistants. Slack shipped its own MCP server (GA Feb 2026).|Scope matters: start any Slack-connected agent at search:read.public only, admin-approved client. Permissions are the product."],
["VPC",0,"Virtual Private Cloud||A private network slice in a cloud provider \u2014 the 'walled garden' where sensitive workloads run.|If agents run in your VPC, ask what can reach the internet (egress allowlist) and what metadata endpoints are blocked."],
["DLP",0,"Data Loss Prevention||Scanning tools that stop sensitive data leaking out of chat/email/files.|Slack: full-org DLP scanning needs Enterprise+ + Discovery API + a partner (Netskope, Nightfall\u2026). Ask which one is deployed."],
["EKM",0,"Enterprise Key Management||You hold the encryption keys for your Slack data (Slack EKM = add-on on Enterprise+, GovSlack included).|Revoke access per org/workspace/channel/time window. If a regulator asks 'who holds the keys', this is the answer that wins."],
["RAG",0,"Retrieval-Augmented Generation||The model answers by first searching your documents, then writing from what it finds.|The most common enterprise AI pattern \u2014 and where data-protection questions concentrate (which documents can it search?)."],
["fine-tuning",1,"model fine-tuning|model,training,dataset,weights,customize,adapt|Further training a model on your own examples.|More liability surface than RAG (you're making a new model artifact). Ask 'fine-tune or retrieval?' \u2014 most 'AI projects' are the second.","fine-tuning (general)|process,product,pitch,polish,detail|Polishing details.|Harmless verb."],
["PDPA",0,"Personal Data Protection Act (Singapore)||Singapore's data-protection law. Breach notification, consent, Do-Not-Call; data portability legislated but not yet in force (2026).|Your home-base statute. The AI-specific guidance sits in PDPC's advisory guidelines on use of personal data in AI (Mar 2024)."],
["AI Act",0,"EU AI Act||The EU's risk-tiered AI law \u2014 the one everyone else's rules are measured against.|Extraterritorial: if your firm serves the EU, it binds. GPAI obligations are phasing in through 2025\u20132027 \u2014 keep a dated-claims sheet."],
["GDPR",0,"General Data Protection Regulation (EU)||EU data-protection law; the template most APAC laws echo.|Automated-decision rules (Art. 22) are the ancestor of Australia's new ADM transparency duties."],
["SME",1,"subject-matter expert|legal,review,content,expert,knowledge,domain|The person who knows the thing.|Every AI workflow needs a named SME reviewing output. That signature is the product.","small/medium enterprise|business,company,startup,size,market,segment|Company-size category.|Policy docs love both. Read the sentence."],
["feature",1,"software feature|product,release,ship,app,platform,update,gating,tier|A capability in a tool.|'Feature gating' = which plan tier unlocks it. Always ask which tier you're actually on.","feature (characteristic)|key features,facial,list of|A characteristic.|Fine."],
["cloud",1,"cloud computing|aws,azure,gcp,server,host,saas,vendor,instance|Someone else's servers running your software.|'Cloud act', 'data residency', 'sovereign cloud' all hang off this. Ask where the data physically sits.","cloud (meteorology)|weather,rain,sky|The sky kind.|Rare, but in small talk, absolutely the sky."],
["hallucinate-v-bluff",0,"the difference||Hallucination = the system believes it. Bluffing = the person knows they're guessing.|When a vendor 'explains' their model's behavior confidently, ask which one they're doing. The honest answer is usually: nobody knows."],
["oversight",1,"human oversight (AI governance)|human,ai,governance,loop,supervision,duty,risk,oversight,control,review|A staffed control: a named human who can intervene in what the model does. A duty in Korea's AI Basic Act and every governance framework.|'Human oversight' is not a vibe \u2014 it needs a named human, a defined intervention point, and a log. Ask who, where, and what happens when they disagree with the model.","an oversight (a miss)|an oversight,mistake,error,omission,apology,missed,regret,unintentional|A mistake \u2014 something that was missed.|When a memo says human oversight fixes oversights, both senses are live in one sentence. One is the control, the other is the failure it is supposed to catch."],
["measure",1,"the Measures (a Chinese regulation)|interim,generative,china,cac,filing,regulation,measures,require,provisions,in force|China's binding rules \u2014 'Interim Measures for Generative AI Services' and friends. Capital-M Measures are law, with pre-launch filing duties.|'The Measures require a filing' = a legal gate before launch, not a plan. China's GenAI filing + security assessment happen BEFORE you ship.","measures (steps taken)|take,security,mitigation,steps,appropriate,additional,prevent|Ordinary actions: 'we will take measures to comply'.|Fine \u2014 but a plan is not a filing. If a China paragraph mixes both, find the sentence with the filing number: that is the deadline."],
["certification",1,"formal certification|iso,certificate,certified,audit,scope,expiry,accredited,27001,attestation|A certificate with a number, scope and expiry, issued by a certification body.|'We are certified' \u2192 certified to WHAT standard, by WHOM, valid until WHEN. Certificate number or it is marketing.","'certified' (vendor-speak)|vendor,aligned,assurance,verify,compliant,platform,solution,governance|Loosely: tested, aligned, or reviewed. In Singapore, AI Verify is explicitly NOT a certification \u2014 it is a voluntary testing toolkit whose reports buyers increasingly ask for.|An AI Verify report is not a certificate. Useful evidence, different artifact. Ask which one they actually mean."],
["filing",1,"model/algorithm filing (China)|china,cac,algorithm,registration,number,launch,display,product,filing,generative|China's pre-launch registration of a GenAI/algorithm service. The filing number must be displayed in the live product.|A launch gate with an in-product display duty \u2014 not paperwork for a drawer. Before any CN ship: filing number obtained AND shown in-product.","court filing|court,litigation,proceedings,submit,tribunal,case|Documents submitted to a court.|Different clock entirely. If one memo mentions both, separate the deadlines before anyone says 'the filing is done'."],
["disclosure",1,"AI transparency disclosure|privacy policy,transparency,automated,decision,adm,app,oaic,notice,label,disclose,user|Telling people \u2014 in a privacy policy or in-product \u2014 that AI is making or supporting decisions. Australia's APP 1.8 disclosure commences 10 Dec 2026; Korea wants advance user notice + output disclosure.|Two regulators, two artifacts, two dates. Map every 'disclosure' to its regulator before treating one as done.","litigation disclosure|discovery,litigation,court,proceedings,documents,privilege,bundle|Handing over documents in a dispute (the old sense \u2014 closely tied to discovery).|Read the room: a 'disclosure' in a dispute file has custodians and dates that would horrify a marketing team."],
["acknowledge",1,"acknowledge = legally agree|terms,service,you acknowledge,agree,policy,click,continue,updated,by using|In terms and conditions, 'you acknowledge X' is assent \u2014 closer to 'you agree' than 'you saw'.|A vendor email saying 'by continuing to use the service you acknowledge\u2026' may be you GIVING UP an argument. Read as a decision, not a receipt.","acknowledge = note it|acknowledge receipt,receipt,noted,thanks,confirm,received,aware|Ordinary: 'I acknowledge your email' = I saw it.|Fine outside contracts. Inside them, assume the stronger meaning."],
["anonymised",1,"true anonymisation|anonym,irreversib,re-identif,no one,cannot,out of scope,aggregate|Data stripped so nobody can identify anyone again \u2014 genuinely out of data-protection law's reach.|A high bar. 'We only train on anonymised data' is not a compliance answer until you know who could re-identify it and how.","pseudonymisation / masking|pseudonym,mask,token,still,identifiable,key|Codes or masks replace names, but re-identification is still possible with a key. Under PDPA and GDPR this is STILL personal data.|If anyone in the chain holds the key, the law applies in full. Ask: can ANYONE re-identify? Yes = personal data."],
["intermediary",1,"data intermediary (PDPA)|pdpa,data,processor,vendor,behalf,processing,dpa,sg,singapore|Singapore's word for an organisation processing personal data on behalf of another \u2014 the GDPR 'processor' by another name. AI vendors processing your data are usually this.|Contracts drafted on EU vocabulary say 'processor'; PDPA says 'intermediary'. Know the translation or you will search the statute for the wrong word.","intermediary (middleman)|broker,middle,agent,between,party,introduc|A go-between in a deal.|Different world. But if a vendor is merely a middleman, the data may be crossing more borders than the sentence admits."],
["execution",1,"execute = run code|code,sandbox,agent,run,arbitrary,runtime,isolate,container|Programs running \u2014 'code execution', the thing sandboxes contain.|An agent's execution powers are a security question: what can it run, where, with whose credentials.","execute = sign a contract|agreement,contract,sign,parties,executed,date,counterpart,enforce|Signing so the contract becomes binding. 'The agreement was executed on\u2026' = signed on.|'Execution risk' in a deal memo is a signing/enforcement risk, not a runtime risk. The signature-block date is the date that matters."],
["production",1,"document production (litigation)|legal,hold,ediscovery,documents,produce,bundle,friday,matter,dispute,privilege|The bundle of documents handed over in a dispute \u2014 the output of discovery review.|In a legal-hold thread, 'production' is a court-facing deliverable with custodians and dates. Miss it and you have a spoliation problem.","production environment (IT)|deploy,live,environment,staging,release,system,server,in production|The live system real users touch.|'In production' means live. A migration note saying 'legal needs production complete by Friday' can mean IT or the court \u2014 confirm which calendar is speaking."],
["privilege",1,"legal privilege|legal advice,attorney,solicitor,counsel,waive,confidential,privileged,litigation|Communications protected from disclosure because a lawyer is in the loop. Waived once disclosed \u2014 gone for good.|Flag privileged material BEFORE any AI tool touches it. Many tools log their inputs. Privilege screen first, tool second.","privileged access (IT)|access,admin,rights,account,iam,permission,root,elevated,credentials|Admin-level access to systems.|Same word, IT universe. 'Privileged account review' is a security hygiene task, not a legal review."],
["framework",1,"soft-law governance framework|governance,mgf,asean,imda,ai verify,voluntary,model,guide,principles,framework|Voluntary guidance \u2014 Singapore's Model AI Governance Framework family, the ASEAN AI guides. No penalties attach. The de-facto baseline buyers ask about.|'The framework requires\u2026' is usually wrong \u2014 soft-law frameworks recommend. Only statutes require. Ask: binding or voluntary?","framework (software / agreement)|agreement,software,architecture,scaffold,framework agreement,tech stack|A software scaffold, or a master agreement with orders under it.|Check which room: a 'framework agreement' is a contract; a 'governance framework' is advice; a tech 'framework' is neither."],
["watermark",1,"AI-content watermark (invisible)|generated,ai,invisible,metadata,label,provenance,gb,45438,korea,msit,synthetic,content|A machine-readable invisible label + metadata proving content is AI-generated. China's GB 45438-2025 and Korea's MSIT guidance both demand it. Removing it is explicitly prohibited in China.|When an AI-law memo says 'watermarked output', it means the invisible label and provenance metadata \u2014 a compliance artifact, not branding. Ask where the metadata lives and what strips it.","visible watermark|logo,visible,copyright,stock,draft,stamp,image|The visible logo or stamp on an image.|Different artifact. A brand watermark on the template does not satisfy a labeling law."],
["breach",1,"data breach (PDPA)|personal data,pdpa,pdpc,notif,incident,leak,unauthorised,unauthorized,security,compromise|Unauthorised access to personal data. Singapore: mandatory breach notification to PDPC and affected individuals for significant harm \u2014 and the clock is short.|Assess fast, notify on the statutory clock. Contract notice periods do NOT pause it. Know your incident owner before the incident.","breach of contract|contract,terms,agreement,clause,notice,party,liable,cure,material|Breaking a contractual promise. The contract usually sets its own notice/cure periods.|A vendor email using 'breach' may be talking contract, not data. Two regulators, two clocks, one word."],
["notice",1,"contractual notice|written,party,address,deemed,deliver,clause,served,give notice,terms|Formal communication under a contract \u2014 address blocks, deemed-delivery rules, time limits.|'We gave notice' in a contract context means a specified form to a specified address. An email to the team usually does not count.","user notice (AI transparency)|user,ai,korea,advance,disclosure,inform,label,generated,transparency|Telling USERS that AI is involved \u2014 Korea's advance user notice + output labeling duties.|Completely different audience: the public, not the counterparty. A sentence can need both. Say which one out loud."],
["impact",1,"high-impact AI (Korea's category)|high-impact,korea,ai basic act,life,safety,fundamental,rights,energy,healthcare,credit,recruitment,education|A legal classifier in Korea's AI Basic Act: AI significantly affecting life, safety or fundamental rights across 10 named areas (energy, water, healthcare, nuclear, crime, recruitment, credit, transport, public services, education).|If your system is in a named area, self-assessment + documentation duties apply before deployment. 'High-impact' here is a compliance trigger, not a compliment.","impact (ordinary sense)|business,esg,revenue,project,customer,team,the impact,positive,make an|Effect or influence \u2014 business impact, project impact.|Meeting-speak. Fine \u2014 just don't let a 'high-impact' sentence hide a legal category inside a compliment."],
["review",1,"document / legal review|document,legal,privilege,matter,reviewed by,sme,expert,counsel,files,production|The formal pass where a named person checks documents \u2014 legal review, privilege review, or the SME review that signs off AI output.|The named signature is the product. 'Review complete' means nothing without: reviewed by WHO, on WHAT date, against WHICH standard.","review (tool/process sense)|code,performance,product,pull request,cycle,quarter,peer,under review|Code review, product review, performance review, or 'under review' = undecided.|Four different meetings wear this word. If a status line says 'pending review', the only useful question is: whose, and by when."],
["migration",0,"the workspace/chat migration|slack,gchat,google chat,export,history,dm,workspace,move,import,channel,onboard|Moving the team's chat from one system to another \u2014 the move everyone is living through.|'The migration will preserve everything' is the sentence to interrogate: on Free/Pro, exports are public channels only; DMs and private channels need an owner application or a higher tier; files come as links. Get the export scope in writing before anyone promises DM history."],
];
var DECK = RAW.map(function (r) { return { t: r[0], poly: !!r[1], s: r.slice(2).map(function (x) {
  var p = x.split('|'); return { d: p[0], k: p[1] ? p[1].split(',') : [], m: p[2], so: p[3] || '' }; }) }; });
var BY = {};
DECK.forEach(function (e) { BY[e.t.toLowerCase()] = e; });

/* ── style, injected once · warm white / black / hard edges / no pills ────────── */
var CSS = [
'.dc-t{cursor:pointer;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px;color:inherit;background:none;border:0;padding:0;font:inherit}',
'.dc-t:hover,.dc-t:focus{text-decoration-thickness:2px}.dc-t:focus-visible{outline:2px solid currentColor;outline-offset:2px}',
'.dc-card{position:fixed;z-index:9999;max-width:320px;background:#fffaf0;color:#111;border:1px solid #111;box-shadow:4px 4px 0 #111;padding:10px 12px 12px;font:13px/1.5 -apple-system,system-ui,sans-serif}',
'.dc-word{font-size:15px;font-weight:700;padding-right:26px}',
'.dc-poly{font-size:10px;font-weight:400;letter-spacing:.08em;border:1px solid #111;padding:0 4px;margin-left:6px;vertical-align:2px}',
'.dc-h{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.75}',
'.dc-sense{font-style:italic;margin:1px 0 2px}',
'.dc-row{margin-top:8px;border-top:1px solid #111;padding-top:7px}',
'.dc-note{font-size:11px;font-style:italic;opacity:.75}',
'.dc-x{position:absolute;top:6px;right:6px;width:20px;height:20px;padding:0;background:#fffaf0;border:1px solid #111;cursor:pointer;font:14px/18px inherit}',
'.dc-x:hover{background:#111;color:#fffaf0}'
].join('\n');
function injectCSS() { if (document.getElementById('dc-style')) return;
  var st = document.createElement('style'); st.id = 'dc-style'; st.textContent = CSS; document.head.appendChild(st); }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

/* ── light sense-picking: keyword score over a window of the surrounding text ── */
function score(s, win) { var n = 0;
  for (var i = 0; i < s.k.length; i++) if (win.indexOf(s.k[i]) >= 0) n += s.k[i].length;
  return n; }
function rank(e, win) { return e.s.map(function (s) { return { s: s, sc: score(s, win) }; })
  .sort(function (a, b) { return b.sc - a.sc; }); }
function gloss(word) { return BY[String(word || '').toLowerCase()] || null; }

/* one alternation over all deck terms, longest first, plural/verb suffixes */
var TERMS = DECK.map(function (e) { return e.t; }).sort(function (a, b) { return b.length - a.length; });
var RE = new RegExp('\\b(' + TERMS.map(function (t) { return t.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'); })
  .join('|') + ')(?:s|es|d|ed|ing)?\\b', 'gi');
function textOffset(root, node) { var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, off = 0;
  while ((n = w.nextNode())) { if (n === node) return off; off += n.nodeValue.length; } return off; }

/* wrap every deck-term match in root's text nodes (span.q contents included) */
function wrap(root) {
  injectCSS();
  var corpus = root.textContent.toLowerCase(), hits = [], n;
  var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  while ((n = w.nextNode())) {
    if (!n.nodeValue.trim() || (n.parentElement && n.parentElement.closest('.dc-t'))) continue;
    RE.lastIndex = 0;
    var m;
    while ((m = RE.exec(n.nodeValue)) !== null) {
      var e = BY[m[1].toLowerCase()];
      if (!e) continue;
      var i = textOffset(root, n) + m.index;
      hits.push({ node: n, start: m.index, len: m[0].length, word: e.t,
        ranked: rank(e, corpus.slice(Math.max(0, i - 220), i + 260)) });
    }
  }
  for (var j = hits.length - 1; j >= 0; j--) {  /* right-to-left keeps offsets valid */
    var h = hits[j], tail = h.node.splitText(h.start), piece = tail.splitText(h.len), p = tail.parentNode;
    var span = document.createElement('span');
    span.className = 'dc-t'; span.tabIndex = 0; span.title = 'tap for gloss';
    span.setAttribute('role', 'button'); span.setAttribute('data-word', h.word);
    span._dc = { word: h.word, ranked: h.ranked };
    p.replaceChild(span, tail); span.appendChild(tail);  /* keep the matched text */
  }
  return hits.length;
}

/* ── the gloss card: meaning in this sentence · trap/other sense · action ────── */
var openCard = null;
function closeGloss() { if (openCard && openCard.parentNode) openCard.parentNode.removeChild(openCard); openCard = null; }
function openGloss(span) {
  closeGloss();
  var d = span._dc;
  if (!d) return;
  var e = BY[d.word.toLowerCase()], top = d.ranked[0], alt = d.ranked[1];
  var h = '<button class="dc-x" aria-label="close">\u00d7</button>'
    + '<div class="dc-word">' + esc(e.t) + (e.poly ? '<span class="dc-poly">' + e.s.length + ' SENSES</span>' : '') + '</div>'
    + '<div class="dc-h">meaning in this sentence</div><div class="dc-sense">' + esc(top.s.d) + '</div><div>' + esc(top.s.m) + '</div>'
    + '<div class="dc-row"><div class="dc-h">trap / other sense</div>';
  if (e.s.length > 1 && alt) {
    h += '<div class="dc-sense">' + esc(alt.s.d) + '</div><div>' + esc(alt.s.m) + '</div>';
    if (top.sc === 0) h += '<div class="dc-note">no signal words landed nearby — both readings are guesses. check which room the sentence is in.</div>';
  } else {
    h += '<div class="dc-note">one sense in the deck — the trap is the room around the word, not the word.</div>';
  }
  h += '</div><div class="dc-row"><div class="dc-h">action</div><div>' + esc(top.s.so) + '</div></div>';
  var c = document.createElement('div');
  c.className = 'dc-card';
  c.setAttribute('role', 'dialog');
  c.setAttribute('aria-label', 'gloss: ' + e.t);
  c.innerHTML = h;
  document.body.appendChild(c);
  var r = span.getBoundingClientRect();
  c.style.left = Math.min(Math.max(8, r.left), Math.max(8, window.innerWidth - c.offsetWidth - 8)) + 'px';
  var y = r.bottom + 6;
  if (y + c.offsetHeight > window.innerHeight - 8) y = Math.max(8, r.top - c.offsetHeight - 6);
  c.style.top = y + 'px';
  openCard = c;
}

/* ── taps + keys ─────────────────────────────────────────────────────────────── */
document.addEventListener('click', function (ev) {
  var t = ev.target;
  if (!t || !t.closest) return;
  var span = t.closest('.dc-t');
  if (span) { openGloss(span); return; }
  if (openCard && t.closest('.dc-card')) { if (t.classList.contains('dc-x')) closeGloss(); return; }
  closeGloss();
});
document.addEventListener('keydown', function (ev) {
  if (ev.key === 'Escape') { closeGloss(); return; }
  var t = ev.target;
  if (t && t.classList && t.classList.contains('dc-t') && (ev.key === 'Enter' || ev.key === ' ')) {
    ev.preventDefault();
    openGloss(t);
  }
});

/* ── module API (THEME-CONTRACT) ─────────────────────────────────────────────── */
function onMatter(card, el) {
  var root = el || (card && card.el);
  if (!root || !root.querySelectorAll) return 0;
  return wrap(root);
}
function onEnd(el) {
  closeGloss();
  if (!el || !el.querySelectorAll) return;
  var marks = el.querySelectorAll('.dc-t');
  for (var i = 0; i < marks.length; i++) {
    var m = marks[i], p = m.parentNode;
    while (m.firstChild) p.insertBefore(m.firstChild, m);
    p.removeChild(m);
    p.normalize();
  }
}
window.DECODE_COACH = { id: 'decode-coach', gloss: gloss, deck: DECK, onMatter: onMatter, onEnd: onEnd };
window.MODULES = window.MODULES || [];
window.MODULES.push({ id: 'decode-coach', onMatter: onMatter, onEnd: onEnd });
})();