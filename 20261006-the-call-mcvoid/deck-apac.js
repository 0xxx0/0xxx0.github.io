/* deck-apac.js — THE APAC deck (16 judgment cards: Indonesia / Thailand / Vietnam / Philippines,
 * one cross-market card, three big-tech-in-APAC procedure cards).
 * Schema mirrors deck-crew.js exactly (who/meta/clock/clocklab/text/calls[k,t,right,v]/move/ev/
 * source/face/mode). Every scenario is fictionalized; every `source` cites a real public
 * instrument. Mercy rule: verdicts speak cost/buys grammar only — no card judges the player.
 * Load compatibility: same shape as window.CREW_DECK — the host can concat this deck as-is. */
window.APAC_DECK = [
{
"who": "the incident channel, two hours into a data spill",
"meta": "INCIDENT · ID market · hour 2",
"clock": "3×24 h",
"clocklab": "hours left on the written-notice clock",
"text": "A storage bucket behind the ID-market contact import shipped with the door open. Names and phone numbers walked out. The law runs a hard clock: <span class=\"q\">3×24 hours</span> of written notice to the people affected and to the new <span class=\"q\">PDP authority</span>. The root-cause review will take a week. The clock will not wait for it.",
"calls": [
{"k": "A", "t": "Send a broad notice now, before the facts settle", "right": false, "v": "<b>Costs:</b> a notice that later needs correcting becomes a second incident of its own. <b>Buys:</b> speed — the clock is beaten on day one. Artifact: the sent notice, dated before its facts."},
{"k": "B", "t": "Notify on the clock with what is confirmed — written notice to the authority and the affected people, facts flagged preliminary, one named owner", "right": true, "v": "<b>Costs:</b> a thinner first notice, and a follow-up owed to everyone who reads it. <b>Buys:</b> the statutory clock is met on the record, and nothing has to be unsaid. Artifact: the timestamped notice plus the authority's receipt."},
{"k": "C", "t": "Hold every notice until root cause is complete", "right": false, "v": "<b>Costs:</b> the 3×24 clock passes while the analysis runs. <b>Buys:</b> one complete, correction-free notice, sent when it is provably true. Next step: the finished review, weeks late."}
],
"move": "Breach clocks run on what is known — notify in time, mark it preliminary, correct in writing later.",
"ev": "The notice timestamp against the clock start, and the authority's receipt filed with the incident record.",
"source": "UU No. 27/2022 (UU PDP) Art. 46 (written notice within 3×24 hours to the data subject and the supervisory authority)",
"face": "apac",
"mode": "striker"
},
{
"who": "the regional data lead, moving a warehouse",
"meta": "ARCHITECTURE · ID→SG pipeline · no date",
"clock": "one migration",
"clocklab": "windows before the migration date hardens into roadmap",
"text": "The plan moves ID user records into the regional <span class=\"q\">data warehouse</span> across the border. The law does not ban it — it prices it. A transfer needs an adequate level of protection or binding safeguards, and the fines are quoted against <span class=\"q\">annual revenue</span>. The migration date is already on the roadmap. The safeguards are still on a slide.",
"calls": [
{"k": "A", "t": "Migrate on the roadmap date; retrofit the safeguards afterward", "right": false, "v": "<b>Costs:</b> the first months of data sit outside any documented safeguard. <b>Buys:</b> the roadmap holds and the pipeline unblocks. Artifact: the migration log — with a missing transfer memo as its shadow."},
{"k": "B", "t": "Hold the migration until the transfer is documented — safeguard basis named, clauses signed, transfer memo filed", "right": true, "v": "<b>Costs:</b> the migration slips a quarter and the warehouse waits empty. <b>Buys:</b> the transfer has a defense before it has traffic. Artifact: the signed safeguards and the transfer memo, filed before the first row moves."},
{"k": "C", "t": "Keep everything in-country permanently and fragment the analytics", "right": false, "v": "<b>Costs:</b> every regional report now runs on partial data, forever. <b>Buys:</b> no cross-border question ever comes up. Artifact: the fragmentation note in the architecture decision record."}
],
"move": "A cross-border move is a documented decision, not a pipeline ticket — file the safeguard basis before the first row moves.",
"ev": "The transfer memo and signed clauses, dated before the migration log's first entry.",
"source": "UU No. 27/2022 (UU PDP) Art. 56 (cross-border transfer: adequate protection or binding safeguards); Art. 57 (administrative sanctions, incl. up to 2% of annual revenue)",
"face": "apac",
"mode": "router"
},
{
"who": "a product manager, shipping an anti-fraud check",
"meta": "LAUNCH · ID fraud model · T-9 days",
"clock": "9 days",
"clocklab": "days before launch with no written basis behind it",
"text": "The feature screens ID sign-ups for fraud before any consent screen appears. The team defaults to <span class=\"q\">consent</span> because it is the word everyone knows. The law lists more bases than that — contract, legal obligation, vital interests, public interest, <span class=\"q\">legitimate interest</span>. A safety check has no meaningful way to be refused. The basis still has to be written down.",
"calls": [
{"k": "A", "t": "Bolt a consent screen onto install and treat the tap as the basis", "right": false, "v": "<b>Costs:</b> a consent no user can realistically refuse reads as no consent at all. <b>Buys:</b> launch keeps its date and the copy looks friendly. Artifact: the consent screen and a log schema nobody can explain."},
{"k": "B", "t": "Name the basis in writing before launch — a legitimate-interest record with a balancing test attached", "right": true, "v": "<b>Costs:</b> a week of memo-writing while the model waits. <b>Buys:</b> the processing stands on a basis that fits how the feature actually works. Artifact: the signed basis memo and the balancing test in the launch file."},
{"k": "C", "t": "Launch under contract necessity and argue the point later", "right": false, "v": "<b>Costs:</b> the argument arrives on someone else's schedule, not yours. <b>Buys:</b> nothing moves the launch date. Artifact: the launch ticket with its basis field left empty."}
],
"move": "The basis is chosen before launch and written where the record lives — consent is one basis, not the reflex.",
"ev": "The written basis memo and balancing test, dated before the launch ticket closes.",
"source": "UU No. 27/2022 (UU PDP) Arts. 20–21 (lawful bases incl. legitimate interest; requirements for consent)",
"face": "apac",
"mode": "namefixer"
},
{
"who": "the Bangkok DPO, on a Sunday",
"meta": "INCIDENT · TH vendor leak · Sunday 21:40",
"clock": "72 h",
"clocklab": "hours to notify the PDPC once the breach is known",
"text": "A processor's email system leaked Thai customer records. The vendor is still saying <span class=\"q\">we are still checking</span>. The clock does not run on the vendor's timeline — it runs on when the controller becomes aware. The <span class=\"q\">PDPA</span> wants the <span class=\"q\">PDPC</span> notified without undue delay and, when feasible, within 72 hours. The vendor contract is where the next one gets prevented.",
"calls": [
{"k": "A", "t": "Wait for the vendor's final report before notifying anyone", "right": false, "v": "<b>Costs:</b> the 72-hour window closes under someone else's timeline. <b>Buys:</b> one notification carrying complete vendor facts. Artifact: the vendor's report — dated after the clock expired."},
{"k": "B", "t": "Notify the PDPC within 72 hours on the known facts, and put the notification duty into the vendor contract", "right": true, "v": "<b>Costs:</b> a first notice with open questions still inside it. <b>Buys:</b> the clock is met, and the next leak arrives with a contractual deadline. Artifact: the PDPC notification receipt and the amended processor clause."},
{"k": "C", "t": "Notify only the affected customers and skip the regulator", "right": false, "v": "<b>Costs:</b> the PDPC hears about it from customers first. <b>Buys:</b> the public-facing duty is visibly handled. Artifact: the customer email — with no regulator receipt beside it."}
],
"move": "The breach clock starts at awareness, not at certainty — notify on known facts and fix the vendor terms the same week.",
"ev": "The awareness timestamp, the PDPC receipt inside 72 hours, and the amended processor clause.",
"source": "Thailand PDPA B.E. 2562 (2019) s.37(4) (notify the Office of the PDPC without undue delay, when feasible within 72 hours); s.41 (DPO)",
"face": "apac",
"mode": "router"
},
{
"who": "a platform ops lead, reading a new rulebook",
"meta": "LAUNCH · TH marketplace · T-14 days",
"clock": "14 days",
"clocklab": "days before the service opens to Thai users",
"text": "The feature is a <span class=\"q\">digital platform service</span> under the Royal Decree: users offer things, other users buy them. The Decree asks for notification to <span class=\"q\">ETDA</span>, a coordinator who answers in-country, and terms published where users can read them. The launch plan contains none of these. It contains a date.",
"calls": [
{"k": "A", "t": "File the ETDA notification before the service opens, name the coordinator, publish the terms page", "right": true, "v": "<b>Costs:</b> two weeks of paperwork and one slipped date. <b>Buys:</b> the service opens with its entry obligations already answered. Artifact: the notification number, the named coordinator, and the terms URL inside the launch checklist."},
{"k": "B", "t": "Launch on date and file the notification afterward", "right": false, "v": "<b>Costs:</b> the service goes live while its first regulatory act is out of order. <b>Buys:</b> the launch date and its press cycle hold. Artifact: the filing receipt — stamped after the first users arrived."},
{"k": "C", "t": "Argue the service is not a platform and launch clean", "right": false, "v": "<b>Costs:</b> if the argument loses, the first filing is also late. <b>Buys:</b> no paperwork today and a strong legal read to argue from. Artifact: the memo — one page, untested."}
],
"move": "Platform rules are entry tickets, not paperwork debt — notify before the first user arrives.",
"ev": "The ETDA notification number dated before launch, and the published terms page with its first commit date.",
"source": "Thailand Royal Decree on Digital Platform Services B.E. 2565 (2022) (notification to ETDA before service; coordinator and terms duties)",
"face": "apac",
"mode": "completer"
},
{
"who": "a growth marketer, with a pre-ticked box",
"meta": "GROWTH · TH signup flow · test 14",
"clock": "one signup",
"clocklab": "signups collected on a basis nobody can show",
"text": "The signup flow ships one checkbox, pre-ticked: share my details with <span class=\"q\">partners</span> for offers. The <span class=\"q\">PDPA</span> wants consent that is informed and separately requested per purpose — a pre-ticked box is a setting, not an agreement. The flow converts better with the tick. The consent log records a tap that never happened.",
"calls": [
{"k": "A", "t": "Keep the pre-tick — the conversion lift is real and users can untick it", "right": false, "v": "<b>Costs:</b> every consent in the log becomes contestable at once. <b>Buys:</b> the lift and the roadmap's momentum. Artifact: the consent log — clean rows, weak roots."},
{"k": "B", "t": "Untick it, split consent per purpose, and log the consent version with the flow", "right": true, "v": "<b>Costs:</b> the conversion lift goes away and the test loses. <b>Buys:</b> consents that survive a complaint, and a log that answers questions. Artifact: the consent record — purpose, version, timestamp, unticked default."},
{"k": "C", "t": "Keep the pre-tick but call the basis legitimate interest instead", "right": false, "v": "<b>Costs:</b> an interest-based label over a consent-shaped flow is an argument, not a shield. <b>Buys:</b> the flow stays untouched. Artifact: the basis memo stretched over the old checkbox."}
],
"move": "A pre-ticked box records a default, not a decision — untick it, split the purposes, log the version.",
"ev": "The consent log schema with purpose and version fields, and the unticked default in the shipped build.",
"source": "Thailand PDPA B.E. 2562 (2019) ss.19–21 (lawful basis; consent must be informed and separately requested per purpose)",
"face": "apac",
"mode": "namefixer"
},
{
"who": "a compliance analyst, with a 60-day clock",
"meta": "FILING · VN processing · day 12",
"clock": "60 days",
"clocklab": "days from processing start to the dossier with A05",
"text": "New processing for the VN market started on the 1st. <span class=\"q\">Decree 13</span> wants an impact assessment dossier — the <span class=\"q\">DPIA</span> in the prescribed form — filed with <span class=\"q\">A05</span> within 60 days of processing start. Not an approval. A filing. The team has an internal privacy review that is most of the same content, living on an internal wiki.",
"calls": [
{"k": "A", "t": "Treat the internal review as the dossier — same content, already written", "right": false, "v": "<b>Costs:</b> the filing that does not exist is the only one the regulator can receive. <b>Buys:</b> zero duplicate work. Artifact: the internal review link — invisible from outside."},
{"k": "B", "t": "File the dossier in the prescribed form within the 60 days, keep the receipt, log every amendment", "right": true, "v": "<b>Costs:</b> reformatting work and one afternoon of forms. <b>Buys:</b> a filed record that answers before anyone asks. Artifact: the A05 filing receipt and the amendment log beside it."},
{"k": "C", "t": "Start the 60 days at public launch instead of processing start", "right": false, "v": "<b>Costs:</b> the real deadline lands earlier than the one on the plan. <b>Buys:</b> more drafting time and a calmer quarter. Artifact: the plan's date field — wrong by however long the beta ran."}
],
"move": "Filing obligations count from processing start, and the internal doc is not the filing — file the form, keep the receipt.",
"ev": "The A05 filing receipt dated inside the 60 days, and the amendment log kept with it.",
"source": "Decree 13/2023/ND-CP on personal data protection, Art. 24 (impact assessment dossier to A05 within 60 days of processing start)",
"face": "apac",
"mode": "router"
},
{
"who": "an infra engineer, moving traffic offshore",
"meta": "INFRA · VN edge routing · change 4412",
"clock": "one change",
"clocklab": "change windows before the routing ships",
"text": "The change routes VN user traffic through the regional <span class=\"q\">edge</span> outside the country. <span class=\"q\">Decree 13</span> wants a cross-border transfer dossier filed with <span class=\"q\">A05</span> — post-transfer review, not a permission slip. And the <span class=\"q\">localization rules</span> in the draft round are moving again. The change is small. The obligations it triggers are not.",
"calls": [
{"k": "A", "t": "Ship the routing now and file the dossier once the traffic settles", "right": false, "v": "<b>Costs:</b> transfers run for months before the record exists. <b>Buys:</b> the latency win lands this sprint. Artifact: the change log — data moving ahead of its own paperwork."},
{"k": "B", "t": "Keep all VN traffic in-country until the draft law passes", "right": false, "v": "<b>Costs:</b> the edge plan stalls behind a legislative calendar nobody controls. <b>Buys:</b> zero transfer exposure while the rules move. Artifact: the architecture note pinned to the draft bill's next reading."},
{"k": "C", "t": "File the transfer dossier before the routing ships, keep the confirmation with the runbooks, and put the draft rules on a monthly watch", "right": true, "v": "<b>Costs:</b> the change waits one sprint and the filing work lands on the infra board. <b>Buys:</b> the routing ships with its dossier already filed. Artifact: the A05 confirmation in the runbook folder and the dated draft-rules watch note."}
],
"move": "Cross-border routing is a filing event — dossier first, then the packets flow, and the draft rules get a watcher.",
"ev": "The transfer dossier receipt before the change log entry, and the dated note tracking the draft localization round.",
"source": "Decree 13/2023/ND-CP Arts. 37–39 (cross-border transfer impact assessment dossier to A05, post-transfer review); Decree 53/2022/ND-CP (Cybersecurity Law data localization conditions); draft PDP Law localization provisions (public consultation round)",
"face": "apac",
"mode": "completer"
},
{
"who": "a support agent, holding a deletion ticket",
"meta": "SUPPORT · VN deletion · ticket 88213",
"clock": "one ticket",
"clocklab": "tickets closed before the deletion actually ran",
"text": "A VN user wrote in asking for their account and data to be deleted. <span class=\"q\">Decree 13</span> gives data subject rights — withdrawal of consent, deletion, complaints. The support tool has a <span class=\"q\">resolve</span> button. The deletion runs in a Thursday batch job. The user has already said thanks.",
"calls": [
{"k": "A", "t": "Run or schedule the deletion first, then close the ticket with the deletion log attached and the exceptions named", "right": true, "v": "<b>Costs:</b> the ticket stays open two more days and the queue looks worse. <b>Buys:</b> closure that matches reality. Artifact: the deletion log — scope, timestamp, and any records kept under a legal-obligation exception."},
{"k": "B", "t": "Close the ticket now — the user is satisfied, the deletion runs Thursday", "right": false, "v": "<b>Costs:</b> the record says resolved while the data still sits there. <b>Buys:</b> a clean queue and a happy user today. Artifact: the closed ticket — the batch job still pending beneath it."},
{"k": "C", "t": "Keep the data and send the user the retention policy", "right": false, "v": "<b>Costs:</b> a request answered with a policy instead of an act. <b>Buys:</b> nothing is deleted before its time. Artifact: the policy email beside an unrun deletion."}
],
"move": "A ticket is closed by the artifact, not the mood — run the deletion, keep the log, then resolve.",
"ev": "The deletion batch log entry for ticket 88213, and the closure note naming any retained exceptions.",
"source": "Decree 13/2023/ND-CP, Art. 9 (data subject rights: access, correction, deletion, consent withdrawal, complaint)",
"face": "apac",
"mode": "striker"
},
{
"who": "the PH country counsel, at hour 60",
"meta": "INCIDENT · PH staff records · hour 60",
"clock": "72 h",
"clocklab": "hours left on the NPC and data-subject notice",
"text": "A phishing incident put PH staff records in the wrong hands. <span class=\"q\">RA 10173</span> runs its own clock: notice to the <span class=\"q\">NPC</span> and to the affected data subjects within 72 hours of knowing. Hour 60 on the wall. Comms wants a statement first. The Act wants two notices.",
"calls": [
{"k": "A", "t": "File with the NPC only — the regulator is the one who enforces", "right": false, "v": "<b>Costs:</b> the affected people hear about their own records from someone else. <b>Buys:</b> the regulatory half of the duty is done. Artifact: the NPC receipt — alone on the incident board."},
{"k": "B", "t": "Notify both the NPC and the affected data subjects within the clock — what happened, what data, what to do, and the DPO's contact", "right": true, "v": "<b>Costs:</b> a busy night and a notice written while facts are still moving. <b>Buys:</b> both duties met on time, telling one consistent story twice. Artifact: the NPC receipt and the data-subject notice, timestamped inside 72 hours."},
{"k": "C", "t": "Hold formal notice until the investigation closes and publish a holding statement", "right": false, "v": "<b>Costs:</b> the statutory window closes behind the investigation. <b>Buys:</b> a single, complete public narrative. Artifact: the statement — polished, late."}
],
"move": "Two notices, one clock — the regulator and the people move together or not at all.",
"ev": "Both receipts inside 72 hours of the awareness timestamp, and the DPO contact line inside the notice.",
"source": "RA 10173 (Data Privacy Act of 2012), §39 (notify the National Privacy Commission and affected data subjects within 72 hours); its IRR",
"face": "apac",
"mode": "router"
},
{
"who": "a country ops lead, with a new processing system",
"meta": "LAUNCH · PH system · go-live 14",
"clock": "14 days",
"clocklab": "days to go-live with no registration and no name",
"text": "The PH team is standing up a new <span class=\"q\">data processing system</span> — recruitment records, one country, one tool. The Act wants the system registered and a <span class=\"q\">DPO</span> designated. The plan says register once the system is stable. The Act describes a register of systems that process.",
"calls": [
{"k": "A", "t": "Register after launch, once the system shape is final", "right": false, "v": "<b>Costs:</b> live processing with an empty register entry. <b>Buys:</b> registration that describes the real system, not the guess. Artifact: the register receipt — filed after the first records arrived."},
{"k": "B", "t": "Register the system before processing starts, name the DPO in the record, keep the registration number in the runbook", "right": true, "v": "<b>Costs:</b> two forms and one go-live item that slips a week. <b>Buys:</b> the system goes live in the order the Act reads things. Artifact: the registration number and the DPO designation letter in the launch folder."},
{"k": "C", "t": "Rely on the global entity's registration in another country", "right": false, "v": "<b>Costs:</b> a foreign register entry answers a local question. <b>Buys:</b> no duplicate forms this quarter. Artifact: the global registration — filed somewhere else."}
],
"move": "Register the system that processes, name the person who answers for it — before, not after, the first record lands.",
"ev": "The registration number and DPO designation dated before the go-live ticket.",
"source": "RA 10173 (Data Privacy Act of 2012), §30 (Data Protection Officer); §46 (registration of data processing systems)",
"face": "apac",
"mode": "completer"
},
{
"who": "a partnerships lead, with a co-marketing deal",
"meta": "DEAL · PH partner promo · T-10 days",
"clock": "10 days",
"clocklab": "days before the partner wants the list",
"text": "The promo shares a user list with a <span class=\"q\">telco</span> partner. The list exists. The sharing rules want a <span class=\"q\">data sharing agreement</span> first — purposes, fields, security, retention, and who answers for what. The partner's deadline is in ten days. The folder link is already drafted.",
"calls": [
{"k": "A", "t": "Share now through the managed folder and paper it afterward", "right": false, "v": "<b>Costs:</b> fields crossed a boundary before anyone wrote down which fields. <b>Buys:</b> the promo keeps its date. Artifact: the access log — wider than any agreement."},
{"k": "B", "t": "Delete the names and share the rest as anonymous", "right": false, "v": "<b>Costs:</b> phone numbers with hashed IDs are still personal data to anyone holding the key. <b>Buys:</b> a smaller-looking file and a faster deal. Artifact: the export — renamed columns, same rows."},
{"k": "C", "t": "Sign the agreement first — named fields, limited purpose, dated retention, roles stated — then share through the managed channel", "right": true, "v": "<b>Costs:</b> ten days of drafting and one lawyer's afternoon. <b>Buys:</b> the promo runs on a record that survives being read aloud. Artifact: the signed agreement and the field-level export log behind it."}
],
"move": "Sharing starts when the agreement names the fields — purpose, retention, roles, then the folder link.",
"ev": "The signed data sharing agreement, and the export log listing exactly the fields that crossed.",
"source": "NPC Circular 2020-03 (Data Sharing Agreements); RA 10173 (Data Privacy Act of 2012), §§12–13 (criteria for lawful processing)",
"face": "apac",
"mode": "namefixer"
},
{
"who": "a country policy lead, taking a regulator's call",
"meta": "CALL · informal regulator contact · 16:20",
"clock": "one call",
"clocklab": "minutes in an informal conversation before it becomes a record",
"text": "The officer calls about removal trends and asks, casually, for internal numbers — <span class=\"q\">off the record</span>, just background. The regional rule: regulator contact goes through <span class=\"q\">regional counsel</span>, in writing, on the official channel. The relationship is genuinely good. That is exactly why the answer needs a shape check.",
"calls": [
{"k": "A", "t": "Answer helpfully on the call — the relationship is the asset", "right": false, "v": "<b>Costs:</b> numbers spoken into a phone have no version, no author, no recall. <b>Buys:</b> goodwill today and a reputation as the responsive one. Artifact: the call note — if anyone writes one."},
{"k": "B", "t": "Take the question, commit to nothing, and route the ask to regional counsel for a written answer on the official channel", "right": true, "v": "<b>Costs:</b> the officer gets the answer slower than the one they wanted. <b>Buys:</b> every fact that reaches a regulator arrives dated, sourced, and approved. Artifact: the routed request and the written reply filed to the contact log."},
{"k": "C", "t": "Decline to engage until a formal notice arrives", "right": false, "v": "<b>Costs:</b> a soft ask hardens into a formal one, and the relationship pays for it. <b>Buys:</b> nothing leaves the building unauthorized. Artifact: the refusal note — clean, cold."}
],
"move": "Informal asks get formal paths — take the question, route the answer, keep the record in one channel.",
"ev": "The contact log entry, the routed request to regional counsel, and the written reply's date and version.",
"source": "grounded in public regulator procedure: RA 10173 (NPC powers and procedure, its IRR); UU No. 27/2022 (UU PDP) Art. 7 (supervisory authority examination powers)",
"face": "apac",
"mode": "router"
},
{
"who": "a trust and safety lead, with a takedown batch",
"meta": "TICKET · takedown ground · batch 71",
"clock": "one batch",
"clocklab": "tickets labeled before the ground gets recorded",
"text": "The batch mixes two things. Some items are a <span class=\"q\">legal request</span> from a government. Others the <span class=\"q\">policy</span> removes on its own terms. The ticket labels all of it legal. Where local law requires more than policy, law wins. Where policy is stricter than law, policy still applies — but it does not get to borrow the word law.",
"calls": [
{"k": "A", "t": "Label the whole batch legal — the outcome is the same either way", "right": false, "v": "<b>Costs:</b> the day someone asks which ground removed what, the record answers wrong. <b>Buys:</b> one label, one workflow, done by lunch. Artifact: the batch ticket — uniform labels over mixed grounds."},
{"k": "B", "t": "Record the exact ground per item — legal request or policy enforcement — and follow local law where it demands more", "right": true, "v": "<b>Costs:</b> two labels and two review paths where one felt like enough. <b>Buys:</b> a takedown record that survives being audited. Artifact: the per-item ground field, and the notice text matching each ground."},
{"k": "C", "t": "Apply global policy to everything and cite policy in every notice", "right": false, "v": "<b>Costs:</b> items removed on legal compulsion now look voluntary, and the reverse. <b>Buys:</b> one consistent public story. Artifact: the notice template — one voice, two realities."}
],
"move": "The ground is part of the record — law and policy get separate labels and separate words in the notice.",
"ev": "The per-item ground field, and one notice sample per ground showing the different wording.",
"source": "grounded in platform duties under public instruments: Thailand Royal Decree on Digital Platform Services B.E. 2565 (2022); Decree 53/2022/ND-CP (VN Cybersecurity Law coordination and takedown duties)",
"face": "apac",
"mode": "namefixer"
},
{
"who": "a compliance analyst, asking trust and safety for logs",
"meta": "INTERFACE · removal log request · day 3",
"clock": "one request",
"clocklab": "days before the regulator's question needs its answer",
"text": "A regulator asked how a piece of content was handled. <span class=\"q\">Trust and safety</span> removed it in minutes — the job done right. Compliance needs the <span class=\"q\">removal log</span>: who, which ground, when, what scope. The log lives in the trust and safety tool. The answer is due in three days.",
"calls": [
{"k": "A", "t": "Reconstruct the timeline from the ticket thread and answer", "right": false, "v": "<b>Costs:</b> memory fills gaps the log already holds. <b>Buys:</b> the answer goes out today. Artifact: the reply — sourced to a thread instead of a record."},
{"k": "B", "t": "Pull the preserved removal log before answering — ground, timestamp, actor, scope — and answer from the artifact", "right": true, "v": "<b>Costs:</b> two days of asking nicely and one internal SLA debate. <b>Buys:</b> every sentence in the answer has a row behind it. Artifact: the log export, and the answer mapped line by line to it."},
{"k": "C", "t": "Answer with the policy summary and skip the log", "right": false, "v": "<b>Costs:</b> the summary describes what usually happens, not what happened. <b>Buys:</b> no cross-team request today. Artifact: the summary link — generic where the question was specific."}
],
"move": "Answer regulators from rows, not recollection — pull the log first, map every sentence to a line.",
"ev": "The removal log export, and the answer sheet with each claim mapped to its row.",
"source": "grounded in accountability records practice: RA 10173 (Data Privacy Act of 2012), Principle of Accountability and its IRR; Decree 13/2023/ND-CP Art. 24 (records kept with the impact assessment dossier)",
"face": "apac",
"mode": "namer"
},
{
"who": "the regional incident lead, with four clocks",
"meta": "INCIDENT · four markets · day 1",
"clock": "4 regimes",
"clocklab": "notice clocks running under one global template",
"text": "One spill, four markets. SG wants the <span class=\"q\">PDPC</span> notified within 3 calendar days of assessing a notifiable breach. AU's <span class=\"q\">NDB</span> scheme says as soon as practicable. Korea's <span class=\"q\">PIPA</span> says without delay. China's <span class=\"q\">PIPL</span> says immediately. The global template says within 30 days. Four clocks are already running.",
"calls": [
{"k": "A", "t": "Run the global 30-day template across all four markets", "right": false, "v": "<b>Costs:</b> the tightest regimes' clocks expire inside the template's comfort window. <b>Buys:</b> one process, one owner, one version of the truth. Artifact: the template — its date field contradicted by four statutes."},
{"k": "B", "t": "One incident file, four local notices, each dated to its own regime's clock — the tightest clock sets the internal deadline", "right": true, "v": "<b>Costs:</b> four drafts where one felt like enough, and local counsel on speed dial. <b>Buys:</b> every market sees its own clock honored. Artifact: the incident file with four receipts, each inside its regime's window."},
{"k": "C", "t": "Notify only where a regulator asks", "right": false, "v": "<b>Costs:</b> the asking arrives after the deadline it is asking about. <b>Buys:</b> three markets get no paperwork at all. Artifact: the request — received on each market's clock, not yours."}
],
"move": "One incident, many clocks — the tightest deadline runs the room, and each regime gets its own notice.",
"ev": "The four notification receipts, each timestamped against its own regime's clock.",
"source": "SG PDPA s.26D and PDPC breach notification rules (3 calendar days after assessment); AU Privacy Act 1988 Part IIIC (Notifiable Data Breaches); KR PIPA Art. 34 (breach report and notification); CN PIPL Art. 57 (breach remediation and notice)",
"face": "apac",
"mode": "completer"
}
];
