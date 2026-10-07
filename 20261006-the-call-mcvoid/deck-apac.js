/*
 * deck-apac.js — APAC LEGAL-OPS: ID · TH · VN · PH · SG · HK · TW · KR · JP · AU · ASEAN-wide · Cross-border
 * (the clocks disagree).
 * window.APAC_DECK = Card[] — same shape as FLOOR.
 *
 * Rebuilt from deck-apac.json: 31 SOURCED situations (31 citations), replacing
 * 9 invented archetypes. Real reported situations only — a deck that names real
 * regulators and real dates and then invents the situation is the "fake bullshit"
 * the operator named. Every matter here traces to a published source.
 *
 * MERCY RULE: every verdict is Costs/Buys grammar. Nothing says "wrong".
 * PRIVACY: the employer is never named. Actor is "a large platform", nothing more.
 */
window.APAC_DECK = [
  {
    id:'apac-01',
    who:'country manager, Jakarta',
    meta:'SLACK #apac-legal · Tuesday 09:41',
    clock:'2 days',
    clocklab:'before the app goes dark nationwide',
    text:'Komdigi\'s portal team called our local partner. Our app is on the unregistered PSE list and they say access gets cut off at the deadline — this is exactly what hit Steam, PayPal and Yahoo in July 2022. Our registration is sitting half-finished in OSS because legal wanted an Indonesian entity first. Do we push the registration through as a foreign PSE or hold while we incorporate?',
    market:'Indonesia',
    source:'https://www.theregister.com/offbeat/2022/08/01/indonesia-blocks-paypal-gaming-sites-for-late-paperwork/992727',
    calls:[
    {k:'A', t:'File the PSE registration through OSS today as a foreign business entity — no Indonesian company needed first', v:'<b>Costs:</b> a rushed filing naming the responsible person on the form, and owning whatever that declaration states. <b>Buys:</b> registration is the cure — Komdigi restored each July 2022 platform once it completed registration, so the register entry is what keeps the lights on.', right:true, m:{exposure:5, relationship:1, budget:-3, momentum:3}},
    {k:'B', t:'Hold the filing until the PT PMA is incorporated so the registrant is a local entity', v:'<b>Costs:</b> weeks of incorporation runway while the blocking deadline runs, with reachability at the ministry\'s discretion throughout. <b>Buys:</b> a cleaner corporate structure for later and one less foreign-entity filing to maintain.', right:false, m:{exposure:-5, relationship:0, budget:1, momentum:-4}},
    {k:'C', t:'Send a legal letter arguing the service is not an electronic system used in Indonesia', v:'<b>Costs:</b> a definitional fight against a regulator whose 2022 wave treated blocking as the routine consequence of non-registration. <b>Buys:</b> a position on the record — and a slower path to the same registration the portal already expects.', right:false, m:{exposure:-4, relationship:-2, budget:-2, momentum:-3}}
    ],
    move:'Rule: Indonesia\'s registration duty binds foreign operators whose system is used or offered in the territory — register through OSS before launch, because access blocking is the standing consequence of non-registration and lifts once registration completes.',
    ev:'The Register, 1 Aug 2022: "Indonesia has blocked access to PayPal, Yahoo*!*, plus Epic Games and Steam... The bans were flagged in recent weeks after Indonesia required online businesses to register as Private Scope Electronic System Operators"; Kominfo "lifted the ban on PayPal for five days" so residents could move their money.'
  },
  {
    id:'apac-06',
    who:'regional privacy counsel',
    meta:'EMAIL · PDPC precedent watch · 08:15',
    clock:'72h',
    clocklab:'to report a breach to the PDPC',
    text:'Thailand\'s first PDPA fine is public: a major online retailer with data from over 100,000 customers, fined THB 7 million — no DPO appointed, inadequate security, delayed breach notification, and the leak was later exploited in call-centre scams. We hold about 200,000 Thai customer records, we\'ve never named a Thai DPO, and our breach-reporting runbook says \'within a week of confirmation.\'',
    market:'Thailand',
    source:'https://chambers.com/downloads/gpg/932/029_thailand.pdf',
    calls:[
    {k:'A', t:'Appoint the DPO now and rebuild the runbook around the 72-hour PDPC report', v:'<b>Costs:</b> a named officer with real duties and a runbook that fires before the investigation is complete. <b>Buys:</b> the two failure pillars of the landmark fine removed — no DPO (Section 41) and delayed breach notification (Section 37(4)) are the counts that drew the maximum.', right:true, m:{exposure:4, relationship:1, budget:-4, momentum:2}},
    {k:'B', t:'Keep the week-long runbook and argue \'without undue delay\' leaves room', v:'<b>Costs:</b> the same late-notification finding that anchored the THB 7 million decision, with the exploitation aftermath attached. <b>Buys:</b> a calmer internal process while facts settle.', right:false, m:{exposure:-5, relationship:0, budget:1, momentum:-3}},
    {k:'C', t:'Name a DPO on paper only — an existing regional manager with no local duties', v:'<b>Costs:</b> an appointment that shows up in the file but not in the response, which is the shape enforcement looks at. <b>Buys:</b> the org chart requirement ticked cheaply.', right:false, m:{exposure:-4, relationship:-1, budget:2, momentum:1}}
    ],
    move:'Rule: Thailand\'s enforcement template is set — appoint the DPO where required and report a breach to the PDPC within 72 hours; the country\'s first administrative fine ran THB 7 million against an e-retailer on those very counts.',
    ev:'Chambers Global Practice Guides, Data Protection & Privacy 2025 (Thailand): "On 21 August 2024, the expert committee issued a maximum administrative fine of THB7 million to a major online retail company in Thailand for failing to protect personal data... The company had collected data from over 100,000 customers but did not appoint a data protection officer (DPO) or implement adequate security measures, leading to data leaks to call centre scams."'
  },
  {
    id:'apac-11',
    who:'Hanoi-based IT manager',
    meta:'EMAIL · RE: vendor incident · 09:30',
    clock:'72 hours',
    clocklab:'to notify the Ministry of Public Security',
    text:'Our HR vendor got hit and Vietnamese employees\' data is in the exfiltrated set. We process in Vietnam and the vendor hosts in Singapore. Decree 13 says the controller notifies the Ministry of Public Security within 72 hours of a data breach using the prescribed form, and we still owe the impact-assessment dossier for this processing stream. Nobody in the region has filed with A05 before.',
    market:'Vietnam',
    source:'https://www.pwc.com/vn/en/publications/2023/newsbrief-decree-13-personal-data.pdf',
    calls:[
    {k:'A', t:'File the prescribed breach form with the MPS within 72 hours and open the impact assessment dossier', v:'<b>Costs:</b> a first filing in a prescribed form with A05 watching, plus the remedial dossier work behind it. <b>Buys:</b> the PDPD\'s clock met — notification within 72 hours with the measures taken to minimise the incident\'s consequences, on the form the decree provides.', right:true, m:{exposure:4, relationship:1, budget:-3, momentum:3}},
    {k:'B', t:'Report through the vendor and treat their filing as covering the incident', v:'<b>Costs:</b> the controller\'s notification duty sits with the controller, not the vendor\'s incident queue. <b>Buys:</b> a single reporting channel and no duplicate filing.', right:false, m:{exposure:-4, relationship:-1, budget:2, momentum:-4}},
    {k:'C', t:'Wait until the Singapore host confirms what left their environment', v:'<b>Costs:</b> the 72 hours run from the breach, not from the hosting provider\'s final report. <b>Buys:</b> a fuller description of the data involved when the notice is eventually sent.', right:false, m:{exposure:-5, relationship:0, budget:1, momentum:-3}}
    ],
    move:'Rule: Vietnam\'s Decree 13/2023 puts the controller\'s breach notice to the Ministry of Public Security on a 72-hour clock, using the prescribed form and describing the measures taken to minimise the consequences — and the processing impact assessment is a standing dossier obligation, not an incident afterthought.',
    ev:'PwC Vietnam, Decree 13/2023/ND-CP on Personal Data Protection: "Within 72 hours from a data breach or other violation of the PDPD, the personal data controller and the personal data controller cum processor are obliged to notify the Ministry of Public Security of the incident (including the measures taken to minimise the incident\'s consequences) using the form provided in the PDPD"; "Within 60 days of the date of data processing, organisations are required to prepare a personal data protection impact assessment."'
  },
  {
    id:'apac-15',
    who:'IT director, Manila shared services',
    meta:'EMAIL · RE: payroll file exposure · 16:20',
    clock:'72 hours',
    clocklab:'to notify data subjects and the NPC; full report in 5 days',
    text:'A misconfigured share exposed HR files for about 600 employees — names, government IDs, addresses. We found it this morning. NPC\'s published handling of the DOST incident is our playbook: they went on-site, and the DOST notified within the 72-hour window Circular 16-03 sets. Legal asks whether we can hold notification until the file-access audit finishes next week.',
    market:'Philippines',
    source:'https://privacy.gov.ph/category/press-statement/',
    calls:[
    {k:'A', t:'Notify the affected data subjects and file through the DBNMS within 72 hours; follow with the complete report in five days', v:'<b>Costs:</b> a notification built on preliminary access logs, and the five-day full report behind it. <b>Buys:</b> the Circular 16-03 sequence met in order — and note the rule against delay: with 600 subjects the no-delay carve-out for incidents affecting at least 100 data subjects applies.', right:true, m:{exposure:4, relationship:1, budget:-3, momentum:3}},
    {k:'B', t:'Hold everything until the file-access audit is complete', v:'<b>Costs:</b> the clock runs from knowledge or reasonable belief that a notifiable breach occurred — the audit timeline is your comfort, not the statute\'s. <b>Buys:</b> one notification with the true numbers and no supplements.', right:false, m:{exposure:-5, relationship:0, budget:-1, momentum:-4}},
    {k:'C', t:'Notify the NPC only and tell employees through the next town hall', v:'<b>Costs:</b> the duty runs to the data subjects individually as well as the Commission, and a town hall is not individual notice. <b>Buys:</b> a single controlled communication to the workforce.', right:false, m:{exposure:-4, relationship:-2, budget:1, momentum:-2}}
    ],
    move:'Rule: In the Philippines, notification to the NPC and affected data subjects runs 72 hours from knowledge or reasonable belief of a notifiable breach, the complete report follows within five days — and notification cannot be delayed where the breach involves at least one hundred data subjects.',
    ev:'NPC press statement (DOST breach): "Under NPC Circular 16-03, it is mandatory for the DOST to notify the affected data subjects and the NPC within 72 hours upon knowledge of or a reasonable belief that a personal data breach has occurred"; DLA Piper (Philippines): "The full report of the personal data breach must be submitted within five (5) days from notification"; "There can be no delay in the notification if the breach involves at least one hundred (100) data subjects."'
  },
  {
    id:'apac-19',
    who:'vendor risk manager',
    meta:'EMAIL · RE: PDPC decision on our POS vendor · 15:26',
    clock:'30 days',
    clocklab:'for the vendor to pay the financial penalty',
    text:'Our POS/CRM vendor just published a PDPC decision against it: two incidents in 2024, exfiltration of files affecting 698,112 individuals, breach of the section 24 Protection Obligation, a $17,500 financial penalty, and directions to implement security measures within 90 days. They went through the Expedited Decision Procedure — meaning they admitted the facts outright. Our customer data sits on their servers too.',
    market:'Singapore',
    source:'https://www.pdpc.gov.sg/-/media/files/pdpc/pdf-files/commissions-decisions/gd_singapore-data-hub-pte-ltd_07042025.pdf',
    calls:[
    {k:'A', t:'Use the decision to bind the vendor contractually to the same security direction and verify within 90 days', v:'<b>Costs:</b> negotiation leverage spent on audit rights and a remediation schedule rather than a discount. <b>Buys:</b> the regulator\'s own findings as your specification — section 24 expects IT security beyond basic access control where a provider holds or controls a high volume of personal data.', right:true, m:{exposure:4, relationship:1, budget:-4, momentum:1}},
    {k:'B', t:'Accept the penalty as the vendor\'s problem and renew on standard terms', v:'<b>Costs:</b> your data sits inside the same network the Commission found insufficient — the decision names the failure, not just the vendor. <b>Buys:</b> no procurement friction and a fast renewal.', right:false, m:{exposure:-5, relationship:0, budget:3, momentum:2}},
    {k:'C', t:'Terminate immediately and migrate to a new provider', v:'<b>Costs:</b> a migration during remediation season, and the new provider\'s controls untested by any comparable incident. <b>Buys:</b> distance from a named enforcement record.', right:false, m:{exposure:2, relationship:-1, budget:-5, momentum:-2}}
    ],
    move:'Rule: Singapore\'s section 24 Protection Obligation expects security arrangements beyond basic access control for organisations that hold or control a high volume of personal data — and a decision obtained under the Expedited Decision Procedure is an admission of the facts, usable as the specification for your own vendor terms.',
    ev:'PDPC Decision DP-2406-C2514: incidents on 28 April and 14 June 2024 "led to exfiltration of files within its servers affecting 698,112 individuals"; "As a provider of POS and CRM software solutions, the Organisation was expected to implement IT security arrangements beyond basic access control to secure its network from external threats"; financial penalty of $17,500 with directions to implement measures "within 90 days from the date of this decision."'
  },
  {
    id:'apac-27',
    who:'incident response lead',
    meta:'SLACK #kr-legal · 06:33 KST',
    clock:'72 hours',
    clocklab:'from awareness to PIPC + data subjects',
    text:'Forensics confirms unauthorised access to the Korean user database \u2014 around 12,000 records including names, phone numbers and KakaoTalk IDs. The PIPA amendment changed the game: breach now includes "forgery, alteration, or damage", not just loss/theft/disclosure, and the 2023 amendment introduced a \u201cpossibility notification\u201d \u2014 if you suspect a breach may have occurred, you must notify potentially affected data subjects without delay. The GC wants to wait until we know for sure.',
    market:'Korea',
    source:'https://chambers.com/articles/pipa-amendment-passes-national-assembly-plenary-session',
    calls:[
    {k:'A', t:'Notify data subjects of the possibility immediately, file the PIPC report within 72 hours, and supplement as facts firm up', v:'<b>Costs:</b> an early message that may later be revised, and board discomfort with notifying before certainty. <b>Buys:</b> the amended PIPA\'s two clocks met \u2014 suspicion triggers the data-subject notice, confirmation triggers the PIPC report, and both run from awareness not from finished investigation.', right:true, m:{exposure:4, relationship:1, budget:-3, momentum:3}},
    {k:'B', t:'Wait for certainty, then send one complete notification', v:'<b>Costs:</b> the suspicion clock runs independently of the confirmation clock; waiting for certainty misses the \u201cpossibility\u201d duty and leaves the 72-hour PIPC window at risk. <b>Buys:</b> one clean message with no revisions.', right:false, m:{exposure:-5, relationship:0, budget:1, momentum:-4}},
    {k:'C', t:'Notify the PIPC only and hold the data-subject message until confirmed', v:'<b>Costs:</b> the amended PIPA requires affected data subjects be notified of possibility \u2014 PIPC-only leaves half the duty unmet and the subjects uninformed. <b>Buys:</b> regulator contact maintained and public exposure deferred.', right:false, m:{exposure:-3, relationship:-1, budget:1, momentum:-1}}
    ],
    move:'Rule: Korea\'s amended PIPA (2023) runs two breach clocks \u2014 notify affected data subjects without delay when a breach is suspected, and report to PIPC within 72 hours when confirmed; the scope now covers forgery, alteration and damage, not just loss/theft/disclosure.',
    ev:'Chambers, PIPA Amendment: the amendment "expands the concept of data breach" to include "forgery, alteration, or damage"; "where a data handler becomes aware of the possibility of a data breach... the data handler is now required to notify, without delay, all potentially affected data subjects of such possibility"; DLA Piper: "a report obligation" to PIPC within 72 hours.'
  },
  {
    id:'apac-29',
    who:'Japan privacy officer',
    meta:'EMAIL · RE: APPI enforcement rules · 14:55 JST',
    clock:'April 2024',
    clocklab:'enforcement rules expanded',
    text:'The amended APPI Enforcement Rules took effect in April 2024. The PPC now requires reporting and notification for a broader range of incidents \u2014 including cases where personal data is "likely to have been leaked" even if not confirmed, and where the volume or sensitivity crosses new thresholds. Our incident-response runbook still says "confirm first, report second."',
    market:'Japan',
    source:'https://www.nishimura.com/en/knowledge/newsletters/data_protection_240305',
    calls:[
    {k:'A', t:'Update the runbook to the new thresholds: report when leakage is likely, not only when confirmed, and name the new sensitivity/volume triggers', v:'<b>Costs:</b> runbook rewrite, training, and a higher reporting volume as the threshold drops from certainty to likelihood. <b>Buys:</b> the amended rules met on their own terms \u2014 the PPC\'s expanded scope is now the legal baseline, not best practice.', right:true, m:{exposure:4, relationship:1, budget:-4, momentum:2}},
    {k:'B', t:'Keep the confirm-first rule and accept the risk of late reporting if the PPC disagrees with our likelihood assessment', v:'<b>Costs:</b> the PPC\'s expanded rules deliberately capture likely leaks; a confirm-first stance reads as non-compliance if the regulator assesses likelihood differently. <b>Buys:</b> lower reporting volume and fewer false positives.', right:false, m:{exposure:-4, relationship:0, budget:2, momentum:-3}},
    {k:'C', t:'Report everything and let the PPC sort out what counts', v:'<b>Costs:</b> regulator fatigue and a reputation for crying wolf; the rules name specific thresholds, not a universal duty. <b>Buys:</b> zero risk of a missed report.', right:false, m:{exposure:-5, relationship:-1, budget:2, momentum:-3}}
    ],
    move:'Rule: Japan\'s amended APPI Enforcement Rules (April 2024) expanded breach reporting to include cases where personal data is likely to have been leaked, with new sensitivity and volume thresholds \u2014 the duty runs on likelihood, not confirmation.',
    ev:'Nishimura & Asahi, Data Protection Newsletter: "The Amended Enforcement Rules expand the scope of data breach incidents that must be reported to the PPC and notified to the affected data subjects"; Monolith Law: "the revised Japanese Personal Information Protection Act Enforcement Regulations will come into effect... the amendment expands the scope of obligations to report... in the event of a data breach."'
  },
  {
    id:'apac-30',
    who:'Australia CISO',
    meta:'EMAIL · RE: OAIC determination · 09:12 AEDT',
    clock:'as soon as practicable',
    clocklab:'assessment then notification',
    text:'The OAIC just published the Australian Clinical Labs determination: 223,000 individuals, cyberattack on acquired Medlab servers, $5.8 million in civil penalties. The court found ACL failed to assess whether there were reasonable grounds to believe an eligible data breach had occurred, and then failed to notify the Commissioner as soon as practicable. Our runbook has no timeline for the assessment phase.',
    market:'Australia',
    source:'https://www.oaic.gov.au/about-the-OAIC/our-regulatory-approach/guide-to-privacy-regulatory-action/chapter-11-data-breach-incidents',
    calls:[
    {k:'A', t:'Add a bounded assessment timeline to the runbook (e.g., 48-72 hours) and define the trigger for moving to notification', v:'<b>Costs:</b> a tighter front-end process and potential false positives if assessments run fast. <b>Buys:</b> the ACL court accepted 2-3 days for notification was practicable once grounds were believed; an explicit assessment window prevents the gap that produced the penalty.', right:true, m:{exposure:4, relationship:1, budget:-3, momentum:3}},
    {k:'B', t:'Notify the Commissioner immediately on any suspected breach and assess in parallel', v:'<b>Costs:</b> premature notifications create regulatory noise and may trigger Commissioner oversight before the facts are stable. <b>Buys:</b> no risk of a late notification finding.', right:false, m:{exposure:-3, relationship:-1, budget:-2, momentum:1}},
    {k:'C', t:'Wait for forensic certainty before either assessment or notification', v:'<b>Costs:</b> the NDB scheme requires assessment of suspected eligible breaches and notification as soon as practicable; waiting for certainty reproduces the ACL failure pattern. <b>Buys:</b> one complete, accurate story.', right:false, m:{exposure:-5, relationship:0, budget:1, momentum:-4}}
    ],
    move:'Rule: Australia\'s NDB scheme requires a reasonable and expeditious assessment of suspected eligible data breaches, followed by Commissioner notification and individual notification as soon as practicable \u2014 the ACL court accepted 2-3 days was practicable once reasonable grounds were believed.',
    ev:'OAIC Guide to Privacy Regulatory Action: "carry out an assessment of a suspected eligible data breach"; FCA, Australian Information Commissioner v Australian Clinical Labs Limited (No 2) [2025] FCA 1224: "it was practicable for it to have prepared a statement... within two to three days of it becoming aware on 16 June 2022 of reasonable grounds to believe that there had been an eligible data breach."'
  },
  {
    id:'apac-02',
    who:'security incident commander',
    meta:'EMAIL · RE: confirmed API leak · 03:12',
    clock:'72h',
    clocklab:'to send the written notice (3x24 jam)',
    text:'Forensics says a legacy partner API leaked names, NIK numbers and phone numbers for around 40,000 Indonesian users on Tuesday night. We\'ve known since last night. Jakarta counsel says UU PDP applies because the data subjects are in Indonesia even though the systems sit in Singapore. The board wants to wait for full scope before anyone is told.',
    market:'Indonesia',
    source:'https://www.dlapiperdataprotection.com/index.html?t=enforcement&c=ID',
    calls:[
    {k:'A', t:'Send the written notice to the data subjects and the authority within 3x24 hours, with scope flagged as provisional', v:'<b>Costs:</b> an early notice that must be supplemented as the numbers firm up, and board nerves about telling people before the investigation lands. <b>Buys:</b> the Pasal 46 clock is met with exactly what the statute asks for — the data described, when and how the breach happened, and the mitigation so far.', right:true, m:{exposure:4, relationship:1, budget:-3, momentum:3}},
    {k:'B', t:'Wait for forensic scope and send one complete notification when it\'s ready', v:'<b>Costs:</b> the statutory clock keeps running against a finished-investigation timeline, and late notice sits on the sanctions list in Pasal 57. <b>Buys:</b> one accurate number, no supplements, and a quieter first message.', right:false, m:{exposure:-5, relationship:0, budget:1, momentum:-4}},
    {k:'C', t:'Notify the authority only and hold the user notices until the news cycle cools', v:'<b>Costs:</b> the duty to the data subjects runs in parallel with the duty to the agency — holding one side leaves half the notification unmade. <b>Buys:</b> control of the public sequence, for now, at the price of an incomplete statutory response.', right:false, m:{exposure:-3, relationship:-2, budget:1, momentum:-2}}
    ],
    move:'Rule: Indonesia\'s breach clock is 3x24 hours in writing to both the data subject and the PDP authority — the notice carries the facts as known plus mitigation efforts; a completed investigation is not the trigger.',
    ev:'DLA Piper Data Protection Laws of the World (Indonesia, Enforcement): "the personal data controller must deliver a written notification within 72 hours"; the notification "must at least include: a description of the personal data that was breached; when and how the personal data was breached; and the efforts undertaken by the personal data controller to mitigate the effects of the data breach".'
  },
  {
    id:'apac-03',
    who:'trust & safety lead',
    meta:'SLACK #takedown-desk · 21:47',
    clock:'4 hours',
    clocklab:'for \'urgent\' items; 24h for the rest of the order',
    text:'Komdigi sent a takedown order through the PSE portal: a livestream clip flagged as gambling promotion, marked urgent, plus forty other items in the same batch that aren\'t flagged urgent. Ops wants to process the whole batch in one queue tomorrow morning because splitting it means a second on-call shift tonight.',
    market:'Indonesia',
    source:'https://magist.io/regulations/indonesia-pse-registration',
    calls:[
    {k:'A', t:'Pull the urgent item now and clear it within four hours; run the remaining forty on the 24-hour clock', v:'<b>Costs:</b> a night shift and a split queue with two timelines to track. <b>Buys:</b> both statutory windows honoured — urgent content is gone as soon as possible and no later than 4 hours after the warning, while the batch keeps its 1x24.', right:true, m:{exposure:4, relationship:2, budget:-4, momentum:2}},
    {k:'B', t:'Run the entire batch in one queue tomorrow morning', v:'<b>Costs:</b> the urgent item sails past its 4-hour window while the regulator watches the clock it set. <b>Buys:</b> one clean operational pass and no overtime.', right:false, m:{exposure:-5, relationship:-1, budget:2, momentum:-3}},
    {k:'C', t:'Take everything down immediately, urgent or not', v:'<b>Costs:</b> forty items removed ahead of their deadline, including material that may not have needed removal at all. <b>Buys:</b> zero deadline risk on the order and a single decisive sweep.', right:false, m:{exposure:-2, relationship:-1, budget:3, momentum:4}}
    ],
    move:'Rule: An Indonesian takedown order runs on two clocks — urgent prohibited content goes as soon as possible and no later than 4 hours after the warning; everything else in the order gets 1x24 hours from receipt.',
    ev:'Magist, Indonesia PSE Registration: "a PSE Lingkup Privat ordered to take down prohibited content must complete the takedown no later than 1x24 (twenty-four) hours after the takedown order is received" and "for urgent prohibited content, the PSE Lingkup Privat must take down the content as soon as possible without delay, no later than 4 hours after the warning is received".'
  },
  {
    id:'apac-04',
    who:'marketplace compliance PM',
    meta:'EMAIL · foreign seller onboarding · 11:20',
    clock:'6 months',
    clocklab:'for new sellers to complete licensing (18 for existing)',
    text:'A Vietnam-based seller wants onto the Indonesia storefront with English listings and no legalised licence — just a Shopee-style registration form and a promise to sort paperwork later. Our onboarding tool shows most SKUs under the USD 100 FOB floor. Commerce wants the seller live before the Ramadan campaign; the platform rulebook keeps saying \'the platform must reject the registration\' when the documents aren\'t there.',
    market:'Indonesia',
    source:'https://www.dfdl.com/insights/legal-and-tax-updates/indonesia-ecommerce-regulation-permendag-19-2026/',
    calls:[
    {k:'A', t:'Reject the registration and send the seller the Article 6 disclosure package checklist', v:'<b>Costs:</b> a lost seller and a campaign SKU gap. <b>Buys:</b> compliance with a rule that leaves the platform no discretion — legalised business licence, product-standard proof, Bahasa Indonesia descriptions and country of shipment, or the platform must reject.', right:true, m:{exposure:4, relationship:-2, budget:2, momentum:-1}},
    {k:'B', t:'Let the seller onboard now and collect documents after the campaign', v:'<b>Costs:</b> every unreformed listing is a platform-side violation, and the regulation\'s stance on waiving the documentation is that there is nothing to waive. <b>Buys:</b> campaign coverage and goodwill with the seller.', right:false, m:{exposure:-6, relationship:3, budget:2, momentum:3}},
    {k:'C', t:'Reprice everything above USD 100 FOB to clear the floor', v:'<b>Costs:</b> the floor is per unit and the exemption list is narrow — repricing changes the commercial deal, not the documentation gap. <b>Buys:</b> a cleaner price architecture if the licences eventually arrive.', right:false, m:{exposure:-3, relationship:1, budget:-2, momentum:1}}
    ],
    move:'Rule: Under Permendag 19/2026 the platform is the gatekeeper — foreign sellers bring legalised licences, product-standard verification, Bahasa Indonesia descriptions and country of shipment, and where the package is missing the platform must reject the registration; the USD 100 FOB per-unit floor stands.',
    ev:'DFDL, Indonesia Ecommerce Regulation: "Foreign sellers must provide a legalised business licence, proof of product standard compliance, a bank account number, Bahasa Indonesia product descriptions, and the country of shipment. If these requirements are not met, the platform must reject the registration" and "the FOB USD 100-per-unit floor remains in place under Article 23(1)-(2)".'
  },
  {
    id:'apac-05',
    who:'global platform ops director',
    meta:'EMAIL · RE: Komdigi registration contact · 16:05',
    clock:'before launch',
    clocklab:'registration must precede the first Indonesian user',
    text:'Our Singapore GM wants to be listed as the PSE contact for Indonesia to keep everything in one place. The OSS form has a field that looks like it wants someone in Indonesia, and the vendor we hired offered to put their own staff name in. Which of those actually satisfies the ministerial regulation?',
    market:'Indonesia',
    source:'https://mamsolutions.net/insights/pse-registration-in-indonesia/',
    calls:[
    {k:'A', t:'Name at least one contact person who lives in Indonesia and keep them current on the registration', v:'<b>Costs:</b> a named local individual whose phone now sits on the regulator\'s call sheet, and upkeep whenever that person changes. <b>Buys:</b> the Article 25(1) requirement met on its own terms — a named person resident in Indonesia to receive official requests for access to the system or its data.', right:true, m:{exposure:4, relationship:1, budget:-3, momentum:2}},
    {k:'B', t:'List the Singapore GM as the single global contact', v:'<b>Costs:</b> a contact field that reads as non-resident, inviting a compliance question before service even starts. <b>Buys:</b> one inbox and one owner for every jurisdiction at once.', right:false, m:{exposure:-4, relationship:1, budget:1, momentum:2}},
    {k:'C', t:'Put the vendor\'s staff member in the field as a nominee contact', v:'<b>Costs:</b> official requests route to someone whose job is your vendor\'s admin, not your incident response. <b>Buys:</b> a filled field today with no internal headcount attached.', right:false, m:{exposure:-5, relationship:0, budget:2, momentum:2}}
    ],
    move:'Rule: A registered Indonesian PSE appoints at least one contact person resident in Indonesia — a named person, not a legal representative, a foreign executive, or a stand-in — to receive official requests for system or data access.',
    ev:'MAM Solutions, PSE Registration in Indonesia: "A registered operator appoints at least one contact person who lives in Indonesia, to receive official requests for access to the system or its data (Permenkominfo 5/2020, Article 25(1)). It is a named contact, not a local company, a legal representative or a nominee, and it applies on both routes."'
  },
  {
    id:'apac-07',
    who:'Thai country counsel',
    meta:'LINE · urgent · 22:10',
    clock:'72 hours',
    clocklab:'to investigate and report to the PDPC',
    text:'A dark-web post is advertising what looks like our customer table. The PDPC has already published preliminary details on its official channels and summoned us to explain — before we filed anything with them. The summons itself is public. Our breach notification isn\'t drafted, and the monitoring unit they call Eagle Eye apparently found the listing before we did.',
    market:'Thailand',
    source:'https://practiceguides.chambers.com/practice-guides/data-protection-privacy-2026/thailand/trends-and-developments',
    calls:[
    {k:'A', t:'Treat the summons as the clock — investigate and report within 72 hours, filing the breach notification alongside it', v:'<b>Costs:</b> answering on the regulator\'s timeline with facts still moving, under a spotlight the PDPC\'s own channels created. <b>Buys:</b> one coherent record in both the inquiry and the notification — the January 2025 precedent had the organisation reporting within 72 hours of the dark-web listing.', right:true, m:{exposure:4, relationship:2, budget:-3, momentum:3}},
    {k:'B', t:'Answer the summons politely but wait for the internal investigation to close before reporting', v:'<b>Costs:</b> a second deadline crossing the first, and a narrative the PDPC has already started telling publicly. <b>Buys:</b> a complete internal story before anything goes on the record.', right:false, m:{exposure:-5, relationship:-2, budget:-1, momentum:-4}},
    {k:'C', t:'Deny the dark-web sample is ours until forensics can authenticate it', v:'<b>Costs:</b> a public denial tested against a regulator that monitors dark-web locations and social platforms for exactly these signals. <b>Buys:</b> a strong first stance if the sample turns out to be a decoy.', right:false, m:{exposure:-6, relationship:-3, budget:-1, momentum:2}}
    ],
    move:'Rule: Where a breach surfaces through dark-web disclosures or social media before it surfaces in your own logs, the PDPC opens the inquiry itself and can summon the organisation to explain before any formal notification exists — Eagle Eye monitors search engines, online sources and dark-web locations.',
    ev:'Chambers Data Protection & Privacy 2026 (Thailand, Trends and Developments): "Where a data breach is reported or detected through dark web disclosures or public discussions on social media, the PDPC may initiate inquiries and summon the organisation to provide explanations and information, even before a formal notification is submitted"; "In January 2025, PDPC action... followed a post advertising data for sale on the dark web, with the organisation instructed to investigate and report within 72 hours."'
  },
  {
    id:'apac-08',
    who:'procurement lead, Bangkok',
    meta:'EMAIL · RE: document destruction vendor · 14:32',
    clock:'after the fact',
    clocklab:'the fine lands once the investigation closes',
    text:'The hospital client says our document-destruction subcontractor left archived patient files in an insecure store. The PDPC\'s published orders fined the hospital THB 1.2 million and the destruction contractor THB 16,940 — sensitive data breach, failure to control the document destruction process. Product wants to know whether the vendor\'s tiny fine means our contract side is basically covered.',
    market:'Thailand',
    source:'https://assets.kpmg.com/content/dam/kpmg/th/pdf/2025/10/kpmg-risk-insights-executive-talk-no-4-2025.pdf',
    calls:[
    {k:'A', t:'Read the fine split as the risk map — audit the destruction chain and put controller-side controls into the DPA', v:'<b>Costs:</b> an audit of every handoff between vendor, subcontractor and disposal site, and contract language that has to survive the next incident. <b>Buys:</b> the lesson of the split — the controller carried THB 1.2 million for a failure its contractor caused with THB 16,940 on the contractor\'s side.', right:true, m:{exposure:4, relationship:1, budget:-5, momentum:1}},
    {k:'B', t:'Point to the vendor\'s low fine and cap our exposure at the contract\'s liability clause', v:'<b>Costs:</b> the cap governs recovery from the vendor, not the regulator\'s assessment of who controlled the data. <b>Buys:</b> a defensible commercial position with the vendor itself.', right:false, m:{exposure:-4, relationship:0, budget:3, momentum:2}},
    {k:'C', t:'Move to a new destruction vendor and close the file', v:'<b>Costs:</b> the same uncontrolled chain rebuilt with a new name, and the hospital\'s findings still attached to our process. <b>Buys:</b> distance from the vendor whose name appeared in the order.', right:false, m:{exposure:-2, relationship:-1, budget:-3, momentum:2}}
    ],
    move:'Rule: In Thailand\'s enforcement wave the controller wears the large fine for a processor\'s failure — the private hospital was fined THB 1.2 million for a sensitive-data breach and failure to control the document destruction process while its destruction contractor drew THB 16,940 — so the destruction chain is a controller-side control problem.',
    ev:'KPMG Thailand, PDPA meets AI (2025): "Private hospital (Data controller) Fined THB 1.2M — Sensitive data breach, Failed to control document destruction process"; "Document destruction contractor (Data processor) Fined THB 16,940 — Insecure storage, No data breach report".'
  },
  {
    id:'apac-09',
    who:'APAC content ops manager',
    meta:'SLACK #content-ops · 19:03',
    clock:'24 hours',
    clocklab:'for national-security-flagged content',
    text:'An MDES notice came through the local entity: a user post flagged as harmful to national security has to come off the platform within 24 hours. The team points out there\'s also a court route where MDES petitions a court and the NBTC instructs us, so they want to sit tight until a court order lands — this notice arrived straight from the ministry.',
    market:'Thailand',
    source:'https://freedomhouse.org/country/thailand/freedom-net/2024',
    calls:[
    {k:'A', t:'Remove the flagged content inside the 24-hour window and log the order, notice and removal', v:'<b>Costs:</b> content suppressed on an administrative order with no judicial finding attached, and a precedent for the next notice. <b>Buys:</b> the safe harbour of timely compliance — Section 15 penalises failure to comply, not compliance itself.', right:true, m:{exposure:4, relationship:1, budget:-3, momentum:3}},
    {k:'B', t:'Wait for a court order before touching the content', v:'<b>Costs:</b> a THB 200,000 fine plus THB 5,000 a day accruing until the order is met. <b>Buys:</b> judicial process between the ministry and the content, if it ever arrives in time.', right:false, m:{exposure:-6, relationship:-1, budget:-5, momentum:-4}},
    {k:'C', t:'Geo-restrict the post in Thailand but leave it up globally', v:'<b>Costs:</b> a half-measure where the order says remove, and the daily fine is measured against compliance with the order itself. <b>Buys:</b> the content preserved for users outside the jurisdiction.', right:false, m:{exposure:-3, relationship:-1, budget:-3, momentum:-1}}
    ],
    move:'Rule: Under Section 15 of the Computer Crime Act, failing to comply with a takedown order costs THB 200,000 plus THB 5,000 a day until compliance — and since the 2022 decree the MDES can order removals without court authorisation, with the window for national-security content cut from 11 days to 24 hours.',
    ev:'Freedom House, Freedom on the Net 2024 (Thailand): "Failing to comply with an order is punishable with a fine of 200,000 baht ($5,700) and an additional daily fine of 5,000 baht ($142) until the order is complied with"; "The 2022 decree also granted the MDES authority to issue removal orders to service providers, without court authorization or judicial oversight... It further narrowed the window to remove national security–related content from 11 days to 24 hours."'
  },
  {
    id:'apac-10',
    who:'product counsel, biometrics',
    meta:'EMAIL · RE: iris pilot in Thailand · 07:55',
    clock:'immediate',
    clocklab:'order to suspend and destroy collected data',
    text:'Our growth team wants to launch an iris-scan-onboarding pilot in Thailand with a token incentive, modeled on the Worldcoin rollout. Then the November 2025 headlines: Thai authorities ordered that operator to suspend iris scanning and delete the iris and personal data already collected — around 1.2 million users\' worth — citing PDPA breaches and unlawful consent. Marketing says our consent screen is better than theirs.',
    market:'Thailand',
    source:'https://chambers.com/downloads/gpg/1129/031_thailand.pdf',
    calls:[
    {k:'A', t:'Shelve the token-incentivised iris collection until the consent model is tested against the regulator\'s position', v:'<b>Costs:</b> a delayed launch and a growth experiment that may never ship in this form. <b>Buys:</b> distance from the outcome Thailand has already ordered once — suspension of the service and destruction of the biometrics collected.', right:true, m:{exposure:5, relationship:-1, budget:-2, momentum:-4}},
    {k:'B', t:'Launch with a stronger consent screen and a local DPO in place', v:'<b>Costs:</b> the enforcement question was about consent quality and biometric risk, not consent paperwork — a better screen is still the same collection. <b>Buys:</b> first-mover presence in the market while the regulatory picture settles.', right:false, m:{exposure:-6, relationship:1, budget:2, momentum:4}},
    {k:'C', t:'Run the pilot on employees only to keep it internal', v:'<b>Costs:</b> employee data is personal data under the PDPA, so the same biometric risk moves onto the workforce you owe the duty of care to. <b>Buys:</b> a contained test population while the consent model is rebuilt.', right:false, m:{exposure:-5, relationship:-2, budget:1, momentum:3}}
    ],
    move:'Rule: Thailand treats incentivised biometric collection as high-risk processing — in November 2025 the order was to suspend iris scanning and destroy the iris and personal data already collected, so consent architecture is reviewed before collection, not after.',
    ev:'Chambers Global Practice Guides, Data Protection & Privacy 2026 (Thailand): "On 24 November 2025, Thai authorities stated that the PDPC ordered relevant service providers/entities to suspend iris scanning and delete/destroy iris and personal data already collected" — reported as affecting approximately 1.2 million users in Thailand, citing PDPA breaches and concerns around unlawful consent.'
  },
  {
    id:'apac-12',
    who:'global infrastructure lead',
    meta:'EMAIL · RE: A05 letter · 10:02',
    clock:'12 months',
    clocklab:'from the MPS order to store data and open a branch',
    text:'A05 sent a formal request — they say our service was used to commit violations and our answer to their coordination request was inadequate. Decree 53 says that combination triggers local storage and a branch or representative office within 12 months of the Minister of Public Security\'s decision, data kept at least 24 months. Our Vietnam country team argues we\'re not \'doing business in Vietnam\' because we have no entity there.',
    market:'Vietnam',
    source:'https://www.trade.gov/market-intelligence/vietnam-cybersecurity-data-localization-requirements',
    calls:[
    {k:'A', t:'Accept the trigger and plan the 12-month build — local storage plus a branch or representative office', v:'<b>Costs:</b> an in-country storage footprint and a maintained local office for as long as the service runs in Vietnam. <b>Buys:</b> the decree is written for exactly your posture — foreign enterprises providing listed online services cross-border are captured without any local entity, and the 12-month clock is the runway the rule grants.', right:true, m:{exposure:4, relationship:1, budget:-6, momentum:2}},
    {k:'B', t:'Argue no local presence means no obligations and contest the order', v:'<b>Costs:</b> the trigger is the failed coordination request, not your corporate structure — contesting it leaves the same order standing with less goodwill behind the response. <b>Buys:</b> a litigated definition of \'doing business in Vietnam\' if the argument holds.', right:false, m:{exposure:-4, relationship:-1, budget:-2, momentum:-3}},
    {k:'C', t:'Withdraw the service from Vietnam before the 12 months run', v:'<b>Costs:</b> market exit, users abandoned mid-stream, and the order\'s obligations still measured from the decision date. <b>Buys:</b> no localization build and no local office to maintain.', right:false, m:{exposure:2, relationship:-3, budget:-6, momentum:-5}}
    ],
    move:'Rule: Decree 53\'s localization duty reaches foreign online-service providers with no Vietnamese entity: where A05 requests coordination over violations and the provider fails to comply or obstructs, the Minister\'s decision starts a 12-month clock to store the specified data in Vietnam and establish a branch or representative office, with data retained at least 24 months.',
    ev:'trade.gov, Vietnam: Cybersecurity Data Localization Requirements: "a foreign enterprise providing this type of services... into Vietnam on a cross-border basis are required to store the data of service users in Vietnam if it receives a formal request for data retention from the Ministry of Public Security" where services "have been used to violate the Vietnam\'s cybersecurity law" and the enterprise "has failed to comply, or inadequately complied with the request by... (A05)... to cooperate"; "complete the data storage in Vietnam and... establish a branch or representative office in Vietnam within 12 months"; "retained for a minimum period of 24 months."'
  },
  {
    id:'apac-13',
    who:'VP legal, APAC',
    meta:'EMAIL · URGENT · user data request · 18:40',
    clock:'June 2',
    clocklab:'deadline for telcos to report blocking measures',
    text:'MPS wants user data from our messaging service for what they describe as criminal investigations. The team\'s instinct is to refuse outright and say we answer legal requests \'on time\' — but look at what happened to Telegram in May 2025: the telecoms department ordered providers to prevent the app\'s operations in Vietnam and report back by June 2, and a ministry official said the reason was the failure to share user data during investigations. Telegram said it was \'surprised.\'',
    market:'Vietnam',
    source:'https://www.reuters.com/sustainability/society-equity/vietnam-acts-block-messaging-app-telegram-government-document-seen-by-reuters-2025-05-23/',
    calls:[
    {k:'A', t:'Assess the request against Vietnamese law with local counsel and answer it on the record before the telcos act', v:'<b>Costs:</b> an answer that narrows user privacy and files a precedent for the next request. <b>Buys:</b> the service keeps operating in the market and the response history shows the cooperation whose absence gets platforms blocked.', right:true, m:{exposure:-2, relationship:3, budget:-1, momentum:3}},
    {k:'B', t:'Refuse the request and stand on our global privacy policy', v:'<b>Costs:</b> the Telegram sequence shows where non-cooperation lands — an order to telcos to prevent the service\'s operations, with a compliance report due to the ministry. <b>Buys:</b> a clean global privacy posture and a user base that hears about it worldwide.', right:false, m:{exposure:3, relationship:-3, budget:-1, momentum:-5}},
    {k:'C', t:'Go quiet and wait to see whether the order is actually enforced', v:'<b>Costs:</b> silence reads as non-cooperation, and the enforcement tool is a telco-level block you don\'t control. <b>Buys:</b> time and information about what the authorities do next.', right:false, m:{exposure:1, relationship:-4, budget:1, momentum:-3}}
    ],
    move:'Rule: Vietnam treats non-cooperation on user data as grounds for platform-level blocking — in May 2025 telecoms were ordered to prevent Telegram\'s operations in Vietnam and report back by June 2 after the platform declined to share user data in criminal investigations, under the Law on Telecommunications and Decree 147\'s cooperation duties.',
    ev:'Reuters, 23 May 2025: "Vietnam\'s Ministry of Information and Communications has mandated that telecommunications providers restrict access to the messaging platform Telegram due to its lack of cooperation in addressing purported criminal activities by its users"; a ministry official said "the decision stemmed from Telegram\'s inability to provide user data to the government upon request during criminal investigations"; Telegram: "Telegram is surprised by those statements."'
  },
  {
    id:'apac-14',
    who:'regional data governance lead',
    meta:'EMAIL · RE: CBTIA backlog · 12:15',
    clock:'60 days',
    clocklab:'from transfer start to file the CBTIA with the MPS',
    text:'Vietnam\'s PDPL took effect on 1 January 2026 and we\'ve been moving HR and customer data to the Singapore hub for years. Every alert says the same thing: each transferor prepares a Cross-Border Transfer Impact Assessment and submits a copy to the MPS within 60 days from the date of transfer, and cross-border violations now carry up to 5% of last year\'s revenue. Finance asked what our theoretical exposure number is.',
    market:'Vietnam',
    source:'https://www.bakermckenzie.com/-/media/files/insight/publications/alerts/10/decoding_vietnam_s_pdp_law_20767.pdf',
    calls:[
    {k:'A', t:'Prepare CBTIA dossiers for every live transfer stream and file copies to the MPS inside the 60-day window', v:'<b>Costs:</b> dossier work across every stream — description of reasons, purposes, data categories — filed with the security ministry. <b>Buys:</b> the assessment record the law makes mandatory, filed on the clock the law sets, with the 5%-of-revenue exposure answered by compliance instead of arithmetic.', right:true, m:{exposure:4, relationship:1, budget:-5, momentum:2}},
    {k:'B', t:'File nothing yet and wait for the sanction decree to settle the practice', v:'<b>Costs:</b> transfers continue without the dossier the statute already requires, and each one is now inside the enforcement period. <b>Buys:</b> avoiding filing work that the forthcoming decree may reshape.', right:false, m:{exposure:-6, relationship:0, budget:3, momentum:3}},
    {k:'C', t:'Consolidate everything into one hub transfer and file a single umbrella assessment', v:'<b>Costs:</b> the duty attaches to each transferor and each transfer, so one umbrella covers one stream at most. <b>Buys:</b> a simpler filing inventory if the consolidation itself is real.', right:false, m:{exposure:-3, relationship:-1, budget:2, momentum:1}}
    ],
    move:'Rule: Vietnam\'s PDPL (Law 91/2025/QH15, effective 1 January 2026) requires a Cross-Border Transfer Impact Assessment with a copy filed to the MPS within 60 days from the date of transfer, and administrative fines for cross-border transfer violations reach 5% of the organisation\'s preceding-year revenue.',
    ev:'Baker McKenzie, Decoding Vietnam\'s PDP Law: "All data transferors are required to prepare a Cross-Border Transfer Impact Assessment (CBTIA) and submit a copy of the same to the MPS within 60 days from the date of transfer"; "administrative fines are capped at VND 3 billion or 5% prior-year revenue for violation concerning cross-border data transfers. For illegal sale and purchase of personal data, the fine may reach 10 times the illegal gains."'
  },
  {
    id:'apac-16',
    who:'external affairs manager',
    meta:'EMAIL · RE: NPC summons · 08:00',
    clock:'tomorrow 09:00',
    clocklab:'hearing after the Order to Appear',
    text:'The NPC moved fast on us: a Notice to Explain about the ransomware is in the inbox, an Order to Appear for tomorrow\'s hearing, and a Notice of Onsite Investigation set for Friday. They want the complete report within two days and a public notice to affected people now. Our ED wants to say publicly that the main database was intact and leave it there — \'primary database intact\' is technically true and sounds like nothing happened.',
    market:'Philippines',
    source:'https://privacy.gov.ph/press-statement-on-alleged-philhealth-data-breach/',
    calls:[
    {k:'A', t:'Work the three notices in sequence and keep the public line identical to what you file with the Commission', v:'<b>Costs:</b> three days of regulator-facing work while the incident still moves, and a public notice that admits real exposure. <b>Buys:</b> the record the NPC asked for on its timeline — and the consistency its investigators read side by side.', right:true, m:{exposure:4, relationship:2, budget:-4, momentum:3}},
    {k:'B', t:'Lead the public statement with the intact database and handle the hearing from there', v:'<b>Costs:</b> a minimising line tested against the Commission\'s own onsite inspection and the leaked set it is already analysing. <b>Buys:</b> calmer public sentiment while the investigation runs.', right:false, m:{exposure:-5, relationship:-3, budget:1, momentum:-1}},
    {k:'C', t:'Ask for a postponement of the hearing and onsite visit until the internal review concludes', v:'<b>Costs:</b> the Commission set the sequence deliberately after a sua sponte-triggering incident; a postponement request lands as friction at the worst moment. <b>Buys:</b> a better-prepared witness table if it is granted.', right:false, m:{exposure:-3, relationship:-4, budget:-1, momentum:-3}}
    ],
    move:'Rule: When the NPC\'s Complaints and Investigation Division moves on a major breach the sequence is Notice to Explain, Order to Appear, Notice of Onsite Investigation — and what you tell the public sits in the same file as what you tell the Commission, so the public notice is written to survive the onsite visit.',
    ev:'NPC, Press Statement on Alleged PhilHealth Data Breach: "We have issued a Notice to Explain to PhilHealth... we have issued an Order to Appear, compelling PhilHealth\'s presence at a hearing scheduled for tomorrow... This will be followed by a Notice of Onsite Investigation on the 28th of September 2023"; "In strict adherence to NPC Circular No. 2016-03, we expect PhilHealth to provide a complete report within the next two days."'
  },
  {
    id:'apac-17',
    who:'marketplace seller-ops lead',
    meta:'EMAIL · DTI takedown order · 11:44',
    clock:'48 hours',
    clocklab:'to be heard before the takedown stands',
    text:'DTI\'s E-Commerce Bureau issued a takedown order against one of our seller\'s listings and copied us as the platform owner. The seller insists the goods are legal; the order says illegal goods or services. The Internet Transactions Act says the entity gets an opportunity to be heard within 48 hours of issuance, the order runs 30 days unless a court extends it — and payments is asking whether to keep processing the seller\'s money while we sort it out.',
    market:'Philippines',
    source:'https://www.pna.gov.ph/articles/1252762',
    calls:[
    {k:'A', t:'Take the listing down on service of the order and put the 48-hour hearing window to work on the seller\'s evidence', v:'<b>Costs:</b> a compliant seller dark for up to 30 days while the hearing runs, and a merchant relationship to repair. <b>Buys:</b> the platform-side position protected — DTI can hold platforms solidarily liable with sellers for violations they fail to act on, so acting first is the cheap end of the exposure.', right:true, m:{exposure:4, relationship:-1, budget:-3, momentum:1}},
    {k:'B', t:'Keep the listing up and use the 48-hour hearing to prove the goods are legal first', v:'<b>Costs:</b> the order is effective on issuance; the hearing is an opportunity to be heard, not a stay. <b>Buys:</b> uninterrupted sales for the seller while the record is made.', right:false, m:{exposure:-5, relationship:2, budget:3, momentum:3}},
    {k:'C', t:'Cut the seller\'s payment processing immediately and hold their funds indefinitely', v:'<b>Costs:</b> the order can direct payment gateways to act, but your own indefinite freeze goes past the order\'s terms and creates a merchant dispute of its own. <b>Buys:</b> maximum distance from the transaction under scrutiny.', right:false, m:{exposure:-2, relationship:-4, budget:-2, momentum:-1}}
    ],
    move:'Rule: A DTI takedown order under the Internet Transactions Act runs 30 days unless extended or made permanent by a judicial order, the entity heard within 48 hours of issuance — and a platform that fails to act on illicit activity can be held solidarily liable with the seller, so compliance is not a bargaining chip.',
    ev:'Philippine News Agency, DTI begins full enforcement of e-commerce law: "the act now empowers the agency to issue takedown orders against online listings for illegal goods or services. Digital platforms can also be held solidarily liable with sellers for violations if they fail to act on illicit activities on their sites"; RA 11967: "The violating entity shall be given an opportunity to be heard within forty-eight (48) hours from the issuance of a takedown order... The order shall remain in effect for a maximum period of thirty (30) days unless otherwise extended or made permanent by a judicial order."'
  },
  {
    id:'apac-18',
    who:'breach response lead',
    meta:'EMAIL · RE: DBNMS full report · 09:05',
    clock:'20 days',
    clocklab:'the extension the Evaluating Officer can grant',
    text:'The 72-hour notification is filed, but the complete breach report is due in five days and forensics needs three weeks. Someone on the team read NPC Circular 2024-01 and thinks we can just ask for more time and pause the clock. The same circular talks about the Case Management Division assigning an Evaluating Officer who resolves extension requests.',
    market:'Philippines',
    source:'https://www.globalcompliancenews.com/2024/03/06/https-insightplus-bakermckenzie-com-bm-data-technology-philippines-national-privacy-commission-amends-certain-provisions-of-its-rules-of-procedure_02212024/',
    calls:[
    {k:'A', t:'Keep the five-day full report moving and put the extension request to the Evaluating Officer with a scoped, dated plan', v:'<b>Costs:</b> a documented request with your reasons on the record, granted for a defined period rather than a soft pause. <b>Buys:</b> exactly what the circular provides — preliminary extension requests granted for 20 calendar days from the date of the request, resolved by the officer assigned to your notification.', right:true, m:{exposure:4, relationship:2, budget:-2, momentum:2}},
    {k:'B', t:'Treat the request as pausing the clock and send the report when forensics concludes', v:'<b>Costs:</b> the extension is a grant, not a suspension — filing late without one is the breach-management failure the NPC\'s evaluation reports look for. <b>Buys:</b> a complete report in one pass.', right:false, m:{exposure:-5, relationship:-1, budget:1, momentum:-4}},
    {k:'C', t:'File an empty full report now to stay inside five days', v:'<b>Costs:</b> a report without scope, cause and mitigation reads as non-cooperation dressed as compliance, and the Evaluating Officer\'s report can recommend a possible DPA violation. <b>Buys:</b> the docket timestamp.', right:false, m:{exposure:-4, relationship:-3, budget:1, momentum:2}}
    ],
    move:'Rule: Under NPC Circular 2024-01 the Case Management Division\'s Evaluating Officer resolves preliminary extension requests — extensions to notify or to file the full breach report run 20 calendar days from the request — and the request is granted or refused, not a self-service pause on any deadline.',
    ev:'Global Compliance News (Baker McKenzie), on NPC Circular 2024-01: "the CMD shall be the initial recipient of data breach notifications and shall immediately assign an Evaluating Officer to review the data breach notification... The preliminary requests for extensions granted by the CMD shall be for a period of 20 calendar days counted from the date of the request"; the evaluation report "may contain a recommendation for: (1) a possible violation of the DPA arising from the breach matter."'
  },
  {
    id:'apac-20',
    who:'customer experience lead',
    meta:'EMAIL · RE: SG refund backlog · 13:12',
    clock:'3 days',
    clocklab:'before a CASE officer responds to a complainant',
    text:'Undelivered orders and refund delays are stacking up on the Singapore storefront. CASE\'s 2024 media release says they took 4,641 e-commerce complaints — a record — and that they work with Shopee and Lazada on a dispute framework with around 90% resolution. We\'re not one of those platforms. Finance wants to hold refunds until quarter close; three complainants have already mentioned CASE and the Small Claims Tribunals.',
    market:'Singapore',
    source:'https://www.case.org.sg/wp-content/uploads/2025/02/Media-Release-CASE-sees-prepayment-losses-more-than-quadruple-in-2024-entertainment-related-complaints-nearly-triple.pdf',
    calls:[
    {k:'A', t:'Clear the refund backlog now and stand up a redress channel CASE can route complaints into', v:'<b>Costs:</b> refunds before the quarter closes and staff time on a complaints channel that answers for real. <b>Buys:</b> the exit ramp CASE\'s own numbers reward — complainants who get refunds don\'t escalate to mediation or the Tribunals, and CASE officers respond within three working days.', right:true, m:{exposure:3, relationship:3, budget:-5, momentum:2}},
    {k:'B', t:'Hold refunds to quarter close and handle complainants one by one', v:'<b>Costs:</b> each held refund is a complaint with legs — CASE escalates stalled disputes to mediation and then the Small Claims Tribunals, where settlements bind in court. <b>Buys:</b> clean quarter-end cash position.', right:false, m:{exposure:-5, relationship:-3, budget:4, momentum:-2}},
    {k:'C', t:'Publish a policy stating refunds follow investigation and refer all complaints to it', v:'<b>Costs:</b> a policy without a working channel is the pattern behind the record complaint year — non-delivery and delayed refunds topped CASE\'s categories. <b>Buys:</b> a consistent public line and lower handling costs per complaint.', right:false, m:{exposure:-4, relationship:-4, budget:2, momentum:-3}}
    ],
    move:'Rule: Singapore\'s consumer front door is CASE and the Small Claims Tribunals — CASE officers respond within three working days and escalate deadlocked disputes to mediation and the Tribunals, so a live redress channel with real refunds is the cheapest exit from a complaint.',
    ev:'CASE media release, Feb 2025: "In 2024, CASE received 4,641 e-commerce complaints, a 25 per cent increase from 3,711 complaints in 2023. This represents the highest number of e-commerce complaints since CASE first started tracking e-commerce complaints in 2020"; "CASE has worked with the two biggest e-commerce platforms in Singapore, Shopee and Lazada... Complaints involving these platforms have a high resolution rate of around 90 per cent."'
  },
  {
    id:'apac-21',
    who:'Hong Kong office GM',
    meta:'EMAIL · RE: PCPD investigation report · 10:50',
    clock:'per notice',
    clocklab:'to comply with the Enforcement Notice',
    text:'The Oxfam Hong Kong report is circulating in our board pack as a \'what not to look like\' exhibit: outdated firewalls with critical vulnerabilities, ineffective detection measures, prolonged retention of personal data. The PCPD served an Enforcement Notice over DPP 4(1) and DPP 2(2). Our own HK infrastructure team admits our firewall refresh slipped two budget cycles and our retention schedule is a wiki page nobody enforces.',
    market:'Hong Kong',
    source:'https://www.pcpd.org.hk/english/news_events/media_statements/press_20260203.html',
    calls:[
    {k:'A', t:'Treat the Oxfam findings as a self-audit checklist — firewall currency, detection, retention enforcement — and schedule the work with dates', v:'<b>Costs:</b> capital spend on the firewall refresh and real enforcement of the retention schedule, i.e. deletions that happen. <b>Buys:</b> the exact deficiency list behind a served Enforcement Notice retired before any incident tests it — and no notice to comply with under a statutory clock.', right:true, m:{exposure:4, relationship:1, budget:-6, momentum:2}},
    {k:'B', t:'Wait for the PCPD to open a compliance check and respond then', v:'<b>Costs:</b> the Commission initiated 435 compliance checks in 2025 alone — the check finds the deficiency list already written, now attached to your name. <b>Buys:</b> deferred spend and no disruption this quarter.', right:false, m:{exposure:-5, relationship:0, budget:4, momentum:-2}},
    {k:'C', t:'Buy new detection tooling and leave the retention schedule as-is', v:'<b>Costs:</b> Oxfam drew findings on all three fronts — prolonged retention was a separate contravention of DPP 2(2), not a footnote to security. <b>Buys:</b> the most visible deficiency — detection — addressed fast.', right:false, m:{exposure:-2, relationship:0, budget:-3, momentum:3}}
    ],
    move:'Rule: Hong Kong\'s PCPD answers security failures with Enforcement Notices, and retention is its own duty — Oxfam Hong Kong\'s incident turned on outdated firewalls, ineffective detection and prolonged retention (DPP 4(1) and DPP 2(2)) — while failure to implement an Enforcement Notice is itself an offence, a HK$50,000 fine and up to two years\' imprisonment.',
    ev:'PCPD media statement, 3 Feb 2026: the Privacy Commissioner found the organisations "had not taken all practicable steps to ensure that the personal data involved were protected against unauthorised or accidental access... thereby contravening DPP 4(1)"; "Oxfam Hong Kong had not taken all practicable steps to ensure that the personal data involved were not kept longer than was necessary... contravening DPP 2(2)"; LCQ2, Jan 2025: failure to implement an enforcement notice "will constitute an offence, and the maximum penalty is a fine of $50,000 and imprisonment for two years."'
  },
  {
    id:'apac-22',
    who:'Taiwan country manager',
    meta:'EMAIL · RE: fitness chain fine · 09:12',
    clock:'immediate',
    clocklab:'notice duty runs from the breach itself',
    text:'A Taiwan fitness chain and its chairman were each fined TWD 1.4 million in June 2024 — TWD 1.2 million for security failures that led to the breach, and TWD 0.2 million for not notifying affected data subjects. Each. The chairman personally. Our Taiwan runbook has no notification step, and our legal representative just asked what sits on his name if this happens to us.',
    market:'Taiwan',
    source:'https://practiceguides.chambers.com/practice-guides/data-protection-privacy-2026/taiwan',
    calls:[
    {k:'A', t:'Add the notification step to the runbook and brief the legal representative on where personal exposure attaches', v:'<b>Costs:</b> runbook work and an uncomfortable conversation about who stands where. <b>Buys:</b> both counts in the WorldGym pattern addressed — the security measures and the notice to affected data subjects — before a chairman\'s name becomes a second respondent.', right:true, m:{exposure:4, relationship:2, budget:-4, momentum:2}},
    {k:'B', t:'Treat corporate insurance as the answer and leave the runbook alone', v:'<b>Costs:</b> the penalty was imposed on the legal representative as an individual alongside the company — a policy written for the entity doesn\'t stand where the authority names the person. <b>Buys:</b> financial backstop for the corporate fine.', right:false, m:{exposure:-4, relationship:-1, budget:3, momentum:1}},
    {k:'C', t:'Notify only the supervisory authority and skip individual notices', v:'<b>Costs:</b> the TWD 0.2 million count was exactly the failure to notify affected data subjects — it is a separate line item, not an extension of the security fine. <b>Buys:</b> a quieter response and fewer outbound messages.', right:false, m:{exposure:-5, relationship:-1, budget:2, momentum:-2}}
    ],
    move:'Rule: Taiwan\'s PDPA enforcement names the legal representative alongside the company — WorldGym and its chairman were each fined TWD 1.4 million in June 2024, split between the security failure (TWD 1.2 million) and failure to notify affected data subjects (TWD 0.2 million).',
    ev:'Chambers Data Protection & Privacy 2026 (Taiwan): "On 19 June 2024, a chain fitness company, WorldGym, and its legal representative – ie, the Chairman of the company, were each fined TWD1.4 million by the authority for: failing to implement appropriate security measures, which led to a personal data breach (TWD1.2 million); and failing to notify the affected data subjects after the data breach (TWD0.2 million)."'
  },
  {
    id:'apac-23',
    who:'group privacy office',
    meta:'EMAIL · RE: intra-ASEAN transfer paperwork · 17:22',
    clock:'contract cycle',
    clocklab:'before the next intra-group renewal',
    text:'We move personal data between Singapore, Jakarta, Bangkok and Manila and the transfer paperwork is a patchwork — some entities run EU SCCs, some run nothing. The ASEAN MCCs have two modules (controller-to-controller, controller-to-processor) and there\'s a Joint Guide mapping them against the EU SCCs. Bangkok counsel warns that pasting the MCCs in does not automatically satisfy every local regime.',
    market:'ASEAN-wide',
    source:'https://asean.org/wp-content/uploads/3-ASEAN-Model-Contractual-Clauses-for-Cross-Border-Data-Flows_Final.pdf',
    calls:[
    {k:'A', t:'Paper each transfer with the matching MCC module and add the local-law annexes per jurisdiction', v:'<b>Costs:</b> module selection per relationship and amendment work where local law demands more than the baseline clauses. <b>Buys:</b> a transfer record built on the region\'s own model clauses, aligned to the ASEAN Framework principles, with the per-jurisdiction gaps closed by annex instead of discovered by regulator.', right:true, m:{exposure:4, relationship:1, budget:-5, momentum:1}},
    {k:'B', t:'Roll the EU SCCs across every transfer since they\'re the strictest standard', v:'<b>Costs:</b> the SCCs are built for GDPR transfers and carry obligations that don\'t map onto ASEAN regimes; the Joint Guide exists because mapping is a real exercise. <b>Buys:</b> one contract family globally and a familiar review path.', right:false, m:{exposure:-4, relationship:1, budget:3, momentum:3}},
    {k:'C', t:'Rely on consent from each data subject for every transfer', v:'<b>Costs:</b> consent is one basis among several and revocable — an intra-group data flow hung on it collapses whenever a subject withdraws. <b>Buys:</b> no contract machinery to maintain.', right:false, m:{exposure:-6, relationship:0, budget:2, momentum:2}}
    ],
    move:'Rule: The ASEAN MCCs are a voluntary contractual base with two modules — controller-to-controller and controller-to-processor — and applying them does not by itself ensure compliance across the region; jurisdictions may require amendments or additions on top.',
    ev:'ASEAN Model Contractual Clauses for Cross Border Data Flows: "The MCCs are contractual terms and conditions that may be included in the binding legal agreements between parties transferring personal data to each other across borders"; "The ASEAN MCCs provide two modules, as a first step, for use in two common transfer scenarios"; Hogan Lovells on the MCCs: "the application of the MCCs does not ensure compliance with all data protection regulations across the ASEAN region, and that amendments or additions may be required to address specific requirements that apply in certain ASEAN jurisdictions."'
  },
  {
    id:'apac-24',
    who:'US litigation team',
    meta:'EMAIL · RE: custodian collection in APAC · 20:15',
    clock:'month end',
    clocklab:'US production date against local review time',
    text:'The MDL wants the Singapore and Jakarta custodians\' mailboxes exported to the US review platform by month end. Local counsel says the Asian privacy laws and transfer restrictions mean a straight export may not fly, and the e-discovery trade press is blunt about it: discovery practitioners may be well advised to conduct an initial document review in-country prior to exporting any data. The US team calls that \'two reviews for one case.\'',
    market:'Cross-border APAC',
    source:'https://inhouselegaltech.com/ediscovery/e-discovery-in-asia-playing-the-long-game-navigate-local-regulations-and-foreign-obligations-in-a-patchwork-region/',
    calls:[
    {k:'A', t:'Collect and first-review in country, then export only the narrowed, responsive set', v:'<b>Costs:</b> two-phase review logistics and local counsel time built into the discovery budget. <b>Buys:</b> a defensible transfer — Asia has no overarching privacy framework, so each country\'s rules are navigated on their terms and the export carries only what is necessary.', right:true, m:{exposure:4, relationship:1, budget:-5, momentum:-1}},
    {k:'B', t:'Export full mailboxes now and argue the US discovery obligation overrides local law if challenged', v:'<b>Costs:</b> local privacy restrictions run against the export from day one, and courts weighing competing obligations expect the conflict surfaced early, not after production. <b>Buys:</b> one review, one platform, and the US timeline intact.', right:false, m:{exposure:-6, relationship:-1, budget:3, momentum:4}},
    {k:'C', t:'Ship everything to the US under a confidentiality order and let the review team filter', v:'<b>Costs:</b> a confidentiality order binds the parties; it does not authorise the transfer against the data protection regime the transfer violates. <b>Buys:</b> judicial cover for the production once it\'s made.', right:false, m:{exposure:-5, relationship:-1, budget:2, momentum:3}}
    ],
    move:'Rule: APAC has no single discovery framework — the patchwork of local privacy laws and transfer restrictions means the defensible path is an initial in-country review followed by a narrowed, necessary-only export, with the conflict surfaced early rather than after production.',
    ev:'In-House Tech, E-Discovery in Asia: "unlike the EU, Asia does not have an overarching data protection and privacy framework, so each country must be considered separately in patchwork fashion"; "The practical impact of these laws is that discovery practitioners may well be advised to conduct an initial document review in-country prior to exporting any data."'
  },
  {
    id:'apac-25',
    who:'group DPO',
    meta:'EMAIL · RE: incident call 1 recap · 23:40',
    clock:'first 24 hours',
    clocklab:'before the per-jurisdiction clocks diverge',
    text:'One incident, one customer table, and this morning\'s call already has three clocks on the whiteboard: Singapore, Thailand, Hong Kong. The US GC wants to \'notify everyone just to be safe.\' The cross-border incident-response panel write-up warns that a global programme built around a GDPR-style 72-hour standard can still fall short locally, and that notifying to be safe creates its own legal and reputational risk. Nobody has named the local counsel contacts yet.',
    market:'Cross-border APAC',
    source:'https://www.mishcon.com/news/cross-border-data-incident-response-what-we-learned-so-you-dont-have-to',
    calls:[
    {k:'A', t:'Map the jurisdictions against their own thresholds, name one clock owner and local counsel contacts, and adapt one consistent narrative per regulator', v:'<b>Costs:</b> hours of setup work while the incident is hot, and a decision record showing what was known and what was uncertain. <b>Buys:</b> the approach the panel puts first — the decisions that matter are made in advance, notifications match local thresholds, and the messaging doesn\'t diverge under pressure.', right:true, m:{exposure:4, relationship:2, budget:-4, momentum:2}},
    {k:'B', t:'Notify every regulator in the region immediately, on the safest possible assumptions', v:'<b>Costs:</b> premature notifications create legal, commercial and reputational risk of their own, and each filing fixes a version of the facts. <b>Buys:</b> no missed clock anywhere and a posture of maximum transparency.', right:false, m:{exposure:-4, relationship:1, budget:-4, momentum:3}},
    {k:'C', t:'Notify only the lead regulator where the incident was detected and let the others follow', v:'<b>Costs:</b> where no main-establishment concept applies, notification runs per country — the single filing leaves the other clocks unmet. <b>Buys:</b> one clean story and one regulator relationship managed.', right:false, m:{exposure:-3, relationship:-1, budget:2, momentum:1}}
    ],
    move:'Rule: Even within a small cluster of Asian markets the notification regimes diverge — thresholds, timelines and content differ — so the response is designed in advance: local counsel contacts per jurisdiction, one consistent global narrative adapted per regulator, and a realistic chain of command for imperfect information.',
    ev:'Mishcon Reiser, Cross-border data incident response: "A global programme built around a GDPR-style 72-hour notification standard can still fall short of local requirements"; the panel guidance is "to draft every regulatory notification as if it could be read by a journalist or a claimant\'s lawyer, and to prepare a single, consistent global communications script in advance so that internal and external messaging does not diverge under pressure."'
  },
  {
    id:'apac-26',
    who:'disputes counsel',
    meta:'EMAIL · RE: exhibit packet for Jakarta court · 14:48',
    clock:'filing date',
    clocklab:'set by the court\'s evidence schedule',
    text:'We need to file a foreign-signed agreement and its notarial certificate in the Jakarta matter. Our London office had the documents \'certified translated\' locally and wants to send those straight to Indonesian counsel. Jakarta counsel says the order of operations matters: apostille first, then translate the entire packet — certificates, seals, attachments — through a registered penerjemah tersumpah, because a foreign certified translation is not automatically the same instrument.',
    market:'Indonesia',
    source:'https://certof.com/resources/legal/indonesia-civil-lawsuit-foreign-public-documents-apostille-translation-order/',
    calls:[
    {k:'A', t:'Apostille the packet in the origin country first, then translate the complete authenticated packet through a registered sworn translator', v:'<b>Costs:</b> rework of the London translation and a second certification chain before anything reaches the court. <b>Buys:</b> an admissible sequence — authentication establishes the document\'s origin, the sworn translation renders the whole packet for the judge, and local counsel reviews the court-facing set before filing.', right:true, m:{exposure:4, relationship:1, budget:-5, momentum:-1}},
    {k:'B', t:'Send the London certified translations and let the judge test them if challenged', v:'<b>Costs:</b> a foreign certified translation is not automatically equivalent to a terjemahan tersumpah, and certification supports translation reliability without establishing the source document\'s authenticity. <b>Buys:</b> no duplicate translation spend.', right:false, m:{exposure:-4, relationship:-1, budget:3, momentum:3}},
    {k:'C', t:'Translate only the agreement body and attach the certificate untranslated', v:'<b>Costs:</b> the working scope covers the document, the apostille or legalisation certificate, seals and referenced attachments — a partial packet invites an evidence objection at the worst point. <b>Buys:</b> lower translation volume and faster turnaround.', right:false, m:{exposure:-3, relationship:-2, budget:2, momentum:4}}
    ],
    move:'Rule: For Indonesian court use, authenticate first and translate second \u2014 apostille or legalise the packet in the origin country, then render the complete packet (certificates, seals and attachments) into Bahasa Indonesia through a registered penerjemah tersumpah, with local counsel checking the court-facing set before filing.',
    ev:'Certof, Foreign Documents in Indonesian Civil Lawsuits: "Apostille usually comes before translation... complete the apostille or residual legalization process first, then translate the document, certificate, seals, annotations, and attachments as one packet"; "A foreign \'certified translation\' is not automatically the same as a translation signed and sealed by an AHU-appointed Penerjemah Tersumpah. Certification supports translation reliability; it does not establish the source document\'s authenticity, relevance, or legal effect."'
  },
  {
    id:'apac-28',
    who:'Korea country counsel',
    meta:'EMAIL · RE: Golfzon penalty · 10:17',
    clock:'immediate',
    clocklab:'penalty calculation basis changed',
    text:'The PIPC just imposed a KRW 7.5 billion administrative penalty on Golfzon for a data breach \u2014 the largest on a domestic company to date. The penalty basis changed from "revenue related to the violation" to total entity revenue. Our Korean entity\'s revenue is roughly KRW 80 billion; the new cap is 10% of revenue or KRW 5 billion. The board wants to know if this is a blip or the new floor.',
    market:'Korea',
    source:'https://law.asia/doing-business-in-korea-data-privacy-compliance/',
    calls:[
    {k:'A', t:'Treat KRW 7.5 billion as the new reference point and budget for proportionate security investment', v:'<b>Costs:</b> real capital spend on controls and legal review of revenue attribution. <b>Buys:</b> the penalty is not a one-off \u2014 KakaoPay (KRW 5.9bn) and Apple Distribution International (KRW 2.4bn) followed in 2025, and the basis is now total revenue, making every entity\'s full turnover the denominator.', right:true, m:{exposure:4, relationship:1, budget:-6, momentum:1}},
    {k:'B', t:'Wait for the Enforcement Decree clarifications on revenue exclusion before acting', v:'<b>Costs:</b> the decree may refine exclusion rules, but the Golfzon and KakaoPay penalties are already live and the revenue basis is settled. <b>Buys:</b> a more precise calculation once guidance arrives.', right:false, m:{exposure:-4, relationship:0, budget:2, momentum:-3}},
    {k:'C', t:'Spin the data-processing function into a lower-revenue entity to reduce exposure', v:'<b>Costs:</b> revenue attribution follows economic reality under Korean administrative law; artificial separation is precisely the kind of structure regulators examine first. <b>Buys:</b> a lower theoretical cap if the structure survives review.', right:false, m:{exposure:-5, relationship:-1, budget:-2, momentum:-1}}
    ],
    move:'Rule: Korea\'s amended PIPA calculates administrative penalties on total entity revenue (up to 10% or KRW 5 billion), not revenue related to the violation \u2014 the Golfzon (KRW 7.5bn) and KakaoPay (KRW 5.9bn) penalties are the new baseline, not outliers.',
    ev:'Asia Business Law Journal, Doing Business in Korea: "the basis for calculating administrative penalties was revised from \u2018revenue related to the violation\u2019 to \u2018total revenue of the entity\u2019"; "the PIPC imposed a KRW7.5 billion administrative penalty on Golfzon on 8 May 2024"; "In January 2025, the PIPC imposed... administrative penalties of KRW5.9 billion on KakaoPay and KRW2.4 billion... on Apple Distribution International Limited."'
  },
  {
    id:'apac-31',
    who:'Australia regulatory counsel',
    meta:'EMAIL · RE: OAIC annual report · 16:30 AEDT',
    clock:'ongoing',
    clocklab:'enforcement posture',
    text:'The OAIC 2024-25 annual report is out: Meta paid a $50 million enforceable undertaking after a data breach, and the ACL $5.8 million penalty is the first civil penalty ordered under the Privacy Act. The Commissioner finalised 1,155 NDB notifications with 86% closed within 60 days. The board reads this as "Australia is now enforcing" and wants to know our exposure.',
    market:'Australia',
    source:'https://www.oaic.gov.au/news/media-centre/annual-report-highlights-oaics-work-on-privacy-and-information-access-rights-and-strengthened-regulatory-approach',
    calls:[
    {k:'A', t:'Commission a gap analysis against APP 11.1 (security) and the NDB scheme, with dates and owners, and model penalty exposure on revenue', v:'<b>Costs:</b> external counsel time and internal resource on a full review. <b>Buys:</b> the OAIC\'s posture is now post-undertaking and post-penalty; a proactive gap analysis is the only defensible board answer after Meta and ACL.', right:true, m:{exposure:4, relationship:1, budget:-5, momentum:2}},
    {k:'B', t:'Wait for the Privacy Act review legislation to settle before investing in compliance rework', v:'<b>Costs:</b> the current Act already produced a $50M undertaking and a $5.8M penalty; waiting for reform leaves today\'s exposure unaddressed. <b>Buys:</b> compliance spend aligned to the final rule set, not the interim one.', right:false, m:{exposure:-5, relationship:0, budget:3, momentum:-4}},
    {k:'C', t:'Buy cyber insurance and treat regulatory action as a cost of doing business', v:'<b>Costs:</b> enforceable undertakings carry operational conditions and public reputational damage; insurance does not cover the undertaking\'s behavioural mandates or the board\'s time. <b>Buys:</b> financial backstop for the penalty line.', right:false, m:{exposure:-3, relationship:0, budget:-3, momentum:-2}}
    ],
    move:'Rule: Australia\'s OAIC has moved from guidance to enforcement \u2014 the Meta $50 million enforceable undertaking and ACL $5.8 million civil penalty are the new baseline; NDB notifications are being finalised in 60 days and the Commissioner can direct notification, investigate on own initiative, and seek civil penalties for serious or repeated interferences.',
    ev:'OAIC Annual Report 2024-25: "a $50 million payment program as part of an enforceable undertaking received from Meta Platforms, Inc."; "Australian Clinical Labs (ACL) paying $5.8 million in civil penalties... the first civil penalties ordered under the Privacy Act"; "Finalised 1,155 notifications under the NDB scheme, with 86% of notifications finalised within 60 days."'
  }
];
