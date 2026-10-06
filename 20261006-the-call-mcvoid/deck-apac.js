/*
 * deck-apac.js — FOUR MARKETS: ID · TH · VN · PH (the clocks disagree).
 * window.APAC_DECK = Card[] — same shape as FLOOR: who, meta, clock, clocklab,
 * text, calls[3, exactly one right], move, ev.
 * MERCY RULE: every verdict is Costs/Buys grammar. Nothing here says "wrong".
 * PRIVACY: every matter is invented. The actor is "a large platform" and nothing
 * more — no employer, no tools, no tickets, no real incidents. Statutory clocks are
 * current-law snapshots with named instruments, not advice.
 */
window.APAC_DECK = [
{
 who:"the incident bridge · four markets at once",
 meta:"SYNTHETIC INCIDENT · scope unknown · 06:12",
 clock:"72h / 3×24h / now",
 clocklab:"but whose clock",
 text:"One security incident, user data in Indonesia, Thailand, Vietnam and the Philippines. Forensics is still finding the edges. Someone posts: \"Shall we hold notifications until the scope is <span class=\"q\">confirmed</span>?\"",
 calls:[
  {k:"A",t:"Hold. One clean filing beats four partial ones.",right:false,v:"<b>Costs:</b> every market's clock runs from <b>awareness</b>, not from your forensics timeline. TH is 72h to the PDPC · PH is 72h to the NPC <b>and</b> the data subjects · ID is 3×24h. Waiting for certainty is how the filing becomes a late filing."},
  {k:"B",t:"Start each local clock from today's awareness, file the confirmed shape, supplement as scope firms up.",right:true,v:"<b>Buys:</b> you treat <b>awareness</b> as the trigger it actually is, and you trade one perfect filing for four timely ones. Note the PH wrinkle in writing: concealment of a sensitive-PI breach there is not just a filing problem."},
  {k:"C",t:"File one global notice and cc everyone.",right:false,v:"<b>Costs:</b> instruments do not cc. Four regulators, four forms, four triggers — a global notice that does not land with the named authority on its own clock is an internal memo."}],
 move:"Rule: a breach clock starts at awareness, not at confirmation. Count each market separately — TH 72h · PH 72h · ID 3×24h — and let scope updates ride as supplements.",
 ev:"Evidence: the written awareness timestamp, per-market instrument names (TH PDPA · PH NPC Circular 16-03 · ID UU 27/2022 + GR 33/2026 · VN PDP Law 91/2025/QH15), and the filing log per authority.",
 source:"DLA Piper PDPC clarification 2025-02; privacy.gov.ph/breach-reporting; DFDL on GR 33/2026; EY VN PDP alert"
},
{
 who:"product · the logs-in-region thread",
 meta:"PLATFORM SERVICES · launch review · 14:20",
 clock:"Q1",
 clocklab:"launch window",
 text:"\"Regulators want activity logs <span class=\"q\">in-country</span> — right? So we localize storage everywhere in APAC and stand up entities where needed. Legal can green-light the plan?\"",
 calls:[
  {k:"A",t:"Yes — localize everything, everywhere. Safe default.",right:false,v:"<b>Costs:</b> three different instruments ask for three different things. VN tiers localization by data type and trigger (Decree 333/2026 keeping Decree 53/2022's frame) · TH wants a notification to ETDA with a local contact point · ID wants PSE registration. Building an entity per market answers questions nobody asked."},
  {k:"B",t:"Split it: what does each instrument actually require — storage, presence, or a named contact? Then build only that.",right:true,v:"<b>Buys:</b> you convert one vague word into three dated obligations. Storage ≠ presence ≠ notification. \"We don't localize anywhere\" and \"we localize everything\" each answer a question VN is not asking."},
  {k:"C",t:"Ship global and document the rationale.",right:false,v:"<b>Costs:</b> fine for the markets that only want a contact point — fatal where localization is tiered by data type. The rationale document will be read back at you later."}],
 move:"Rule: \"in-country\" is never one requirement. Name the instrument and what it demands — storage (VN tiers) · presence/notification (TH Royal Decree B.E. 2565, ETDA) · registration (ID PSE) — then build only that. Neither \"nowhere\" nor \"everywhere\" is what VN asks.",
 ev:"Evidence: a three-column table — market · instrument · what it actually asks for — with dated obligations and one named owner per line.",
 source:"EY VN Legal Alert 2026-09 (Decree 333/2026/ND-CP); ETDA Royal Decree B.E. 2565 translation; GR 71/2019 (ID)"
},
{
 who:"the escalation channel · 24h clock",
 meta:"AUTHORITY REQUEST · written · 16:44",
 clock:"24h",
 clocklab:"to act",
 text:"A government content-removal request lands: 24 hours, legal basis cited in one vague clause, item list attached. Content policy says removal is defensible. Someone says: \"Let's just <span class=\"q\">remove</span> the lot and log it after.\"",
 calls:[
  {k:"A",t:"Remove everything in the thread, log it, done inside the clock.",right:false,v:"<b>Costs:</b> blanket removal beyond the specified items is scope you invented. The record of what was actually asked for — versus what went — becomes the story."},
  {k:"B",t:"Remove only the specified items, inside the clock, and log the scope line by line. Escalate the vague basis in parallel.",right:true,v:"<b>Buys:</b> you meet the statutory window (VN Decree 147/2024: 24h from a written or electronic authority request — 48h for user complaints) while keeping the one artifact that matters: the exact scope."},
  {k:"C",t:"Escalate to counsel first and act after they reply.",right:false,v:"<b>Costs:</b> the clock does not pause for a legal review. VN's 24h runs from the request, not from your comfort. Escalation is parallel, never sequential."}],
 move:"Rule: act inside the window on the specified scope only; the escalation runs alongside. Every takedown is two artifacts — what was asked, what was done.",
 ev:"Evidence: the request as received, the item-level action log, and the escalation note naming the clause you want narrowed.",
 source:"Decree 147/2024/ND-CP (VN) content-removal windows; GR 5/2020 (ID) priority-category clocks; TH Royal Decree transparency duties"
},
{
 who:"the age-assurance design review",
 meta:"TEEN SAFETY · same week as PP Tunas · 11:00",
 clock:"before",
 clocklab:"ship",
 text:"Child-protection rules take effect the same week as the feature review. The regulator expects <span class=\"q\">age assurance</span>. The privacy lead says every age signal is itself personal data. \"So which is it — gate everyone or infer?\"",
 calls:[
  {k:"A",t:"Hard age gate at signup. Verify everyone. Cleanest.",right:false,v:"<b>Costs:</b> ID's PP 17/2025 wants effective verification where a minimum age is claimed — but every document or signal you collect to prove it becomes new personal data under the PDP Law. Collecting more to comply creates a second compliance problem."},
  {k:"B",t:"Risk-based: verify hard where the service is 18/21+, infer and restrict features elsewhere, and document why.",right:true,v:"<b>Buys:</b> matches the instrument's own shape — PP 17/2025 is risk-based, not gate-everything. You collect the minimum, restrict by feature, and keep the assessment that explains the line."},
  {k:"C",t:"Minor mode on by default for everyone, no signals collected.",right:false,v:"<b>Costs:</b> a defensible design — but it does not discharge verification duties where a minimum age is claimed, and TH/PH consent rules still need a lawful basis for whatever you do collect."}],
 move:"Rule: age assurance is a risk ladder, not a gate. Verify where the law claims a minimum age; infer and restrict elsewhere; whatever you collect becomes personal data — so collect the minimum and write down why.",
 ev:"Evidence: the risk assessment mapping features to age tiers, the data-minimisation note, and instrument names (ID PP 17/2025 · TH PDPA child consent · PH DPA RA 10173 consent rules for minors).",
 source:"Baker McKenzie / globalcompliancenews on PP 17/2025 (PP Tunas) 2025-05; CCIA comments 2026-01; privacy.gov.ph consent rules"
},
{
 who:"analytics · one global pipeline",
 meta:"DATA PLATFORM · transfer review · 10:15",
 clock:"before",
 clocklab:"the pipeline ships",
 text:"\"We can do one global <span class=\"q\">transfer</span> impact assessment and cite it everywhere, right? Vietnam's new PDP law and Indonesia's GR are both just GDPR-style paperwork.\"",
 calls:[
  {k:"A",t:"One global assessment, cited everywhere. Efficient.",right:false,v:"<b>Costs:</b> VN PDP Law 91/2025/QH15 wants transfer dossiers per its own shape (Art. 38 live since 2026-01-01); ID Law 27/2022's transfer duties are detailed by GR 33/2026, effective 2027-01-16. \"GDPR-style\" is a resemblance, not a passport."},
  {k:"B",t:"Per-jurisdiction transfer files, built off one shared evidence pack.",right:true,v:"<b>Buys:</b> one evidence base, four legal conclusions. The dossier that survives review is the one written to the instrument that asked."},
  {k:"C",t:"Keep transfers in-region until every assessment lands.",right:false,v:"<b>Costs:</b> it trades a paperwork problem for an infrastructure one, and in-region processing still faces its own localization and consent questions. Usually the most expensive \"safe\" option."}],
 move:"Rule: one evidence pack, one file per border. A shared template is a donor; the assessment that counts is the one written to the instrument that asked for it.",
 ev:"Evidence: per-market transfer dossiers referencing one evidence pack, each naming its instrument (VN PDP Law 91/2025/QH15 Art. 38 · ID UU 27/2022 + GR 33/2026) and its date.",
 source:"Baker McKenzie 'Decoding Vietnam's PDP Law'; DFDL on GR 33/2026 (promulgated 2026-07-16, effective 2027-01-16)"
},
{
 who:"the helpdesk · one request, four markets",
 meta:"DATA SUBJECT REQUEST · routed to you · 13:07",
 clock:"3×24h / now",
 clocklab:"four clocks",
 text:"One access request touches data from all four markets. Four response clocks, four different answers to \"who is the <span class=\"q\">controller</span> here\". The helpdesk asks: \"Who answers, in whose name?\"",
 calls:[
  {k:"A",t:"One regional response, signed by whoever is easiest to route to.",right:false,v:"<b>Costs:</b> the named controller differs by market — the same product can be controller in one country and processor in another. Answering in a name that is not the controller's is a filing problem before it is a courtesy problem."},
  {k:"B",t:"Route to the DPO: identify the controller per market, run each local clock, one coordinated response per authority.",right:true,v:"<b>Buys:</b> clocks get managed (ID's rights-request window is 3×24h — a different animal from TH and PH's regimes) while the answers stay in the right name. Coordination is a front-end; the filings stay local."},
  {k:"C",t:"Four separate local responses, no coordination.",right:false,v:"<b>Costs:</b> four answers to one person can contradict each other, and every contradiction is producible. Coordinate the facts, localise the form."}],
 move:"Rule: one requester, many controllers. The DPO owns the map; each market answers in its own name and on its own clock; the facts are coordinated, never the identity.",
 ev:"Evidence: the controller map per market, the per-authority response log with dates, and the instrument names (PH DPA RA 10173 · ID UU 27/2022 · TH PDPA · VN PDP Law 91/2025/QH15).",
 source:"privacy.gov.ph registration rules (Circular 2022-04); Chambers Data Protection 2026 (ID/TH); DFDL ID alerts"
},
{
 who:"the ranking model · launch checklist",
 meta:"AUTOMATED DECISIONS · gate review · 17:30",
 clock:"pre-launch",
 clocklab:"filing gate",
 text:"The personalization team calls it \"just ranking\". Legal calls it <span class=\"q\">automated decision-making</span>. One regulator wants the system registered before launch; two others want impact assessments and user-facing explanations. \"What ships with the feature?\"",
 calls:[
  {k:"A",t:"Ship the feature, register afterwards if asked.",right:false,v:"<b>Costs:</b> PH NPC Circular 2022-04 wants ADM/profiling notified at registration time — <b>before launch, not after</b>. Missing the pre-launch step is a filing problem you cannot fix with a good explanation."},
  {k:"B",t:"Hold the PH launch until registration is filed; everywhere else ship with the impact assessment and the user-facing explanation attached.",right:true,v:"<b>Buys:</b> each regulator gets what its instrument asks — PH gets its pre-launch notice, VN and TH get assessment and transparency. One feature, three artifacts, zero surprises."},
  {k:"C",t:"Pause launch in all four markets until every filing lands.",right:false,v:"<b>Costs:</b> the heavy answer — and it usually trains teams to stop telling legal things. Per-market gating exists precisely so the launch does not need to be global-or-nothing."}],
 move:"Rule: know which regulators want the paper BEFORE the switch flips. PH registers ADM pre-launch; VN/TH want assessments and explanations. Gate per market — never global-or-nothing.",
 ev:"Evidence: the PH registration filing and date, the VN/TH impact-assessment dossiers, and the user-facing explanation text shipped with the feature.",
 source:"NPC Circular 2022-04 (PH) ADM/profiling notification; Chambers 2026 (TH/VN); Baker McKenzie VN PDP alert"
},
{
 who:"trust & safety · the scam listings",
 meta:"E-COMMERCE SURFACE · three markets · 09:40",
 clock:"statutory",
 clocklab:"redress window",
 text:"Scam listings pull consumer complaints in three markets. The consumer-protection regime wants merchant takedowns and redress now; the litigation lead says <span class=\"q\">preserve</span> everything first. \"Sequence it how?\"",
 calls:[
  {k:"A",t:"Refund and take down first. Consumers first, questions later.",right:false,v:"<b>Costs:</b> under PH's RA 12009 + the DTI/DOJ/DICT joint order, platform duties include redress — but acting first and preserving later can eat the evidence the same platform will be asked for."},
  {k:"B",t:"Preserve the listings and evidence first, then act inside the statutory window.",right:true,v:"<b>Buys:</b> preservation and redress are not opposites — they are sequence. PH RA 12009 / JAO 24-03 duties land either way; the evidence is what makes the takedown defensible."},
  {k:"C",t:"Route it all to trust & safety and wait for a regulator notice.",right:false,v:"<b>Costs:</b> ID's GR 5/2020 and TH's Royal Decree duties run on complaint handling and information requests — waiting for a notice is how the notice becomes an enforcement question."}],
 move:"Rule: preserve, then act, inside the window. Consumer redress and evidence preservation are a sequence, not a trade-off — PH RA 12009/JAO 24-03 · ID GR 5/2020 · TH Royal Decree B.E. 2565.",
 ev:"Evidence: the preserved listing snapshots with hashes and timestamps, the takedown log, and the redress record per complaint.",
 source:"ecommerce.dti.gov.ph JAO 24-03 (PH RA 12009); GR 5/2020 (ID); ETDA Royal Decree B.E. 2565 complaint duties"
},
{
 who:"four inboxes · one questionnaire sweep",
 meta:"REGULATOR RFIs · same week · 08:00",
 clock:"four deadlines",
 clocklab:"one team",
 text:"Four regulator questionnaires land in one week. Different deadlines, different forms. One asks for enforcement metrics the legal team will never hand over. \"Who drafts, who signs, and what gets <span class=\"q\">redacted</span>?\"",
 calls:[
  {k:"A",t:"Acknowledge all four, negotiate scope first, respond later.",right:false,v:"<b>Costs:</b> acknowledgement stops no clock. TH's ETDA can request platform information annually under the Royal Decree; VN's authority-request duties under Decree 147/2024 run from receipt. Negotiation is parallel work, never a pause button."},
  {k:"B",t:"One regional response team drafts; local counsel signs each market's filing; redactions are decided per-instrument against what the authority can actually compel.",right:true,v:"<b>Buys:</b> one consistent fact base, four properly-signed filings, and a redaction decision that is a legal position (\"this is not within the instrument's scope\") instead of a silent omission."},
  {k:"C",t:"Market-by-market from local counsel, no shared draft.",right:false,v:"<b>Costs:</b> four fact bases, four versions of the truth, and the first cross-regulator comparison finds the gaps. Draft together; sign locally."}],
 move:"Rule: draft once as a fact base, sign locally, and make every redaction a stated legal position — never a silent gap. The clock runs from receipt, even while you negotiate.",
 ev:"Evidence: the shared fact base, per-market signed filings with dates, and the redaction log pairing each omission with the scope argument that supports it.",
 source:"ETDA Royal Decree B.E. 2565 information-request powers; Decree 147/2024 (VN) authority-request duties; GR 33/2026 (ID) sanctions framework; NPC compulsory powers RA 10173 (PH)"
}
];
