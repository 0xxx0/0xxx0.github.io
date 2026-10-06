/* deck-onboarding.js — THE FIRST 90
 *
 * Material: real onboarding failure reports, collected from public threads and quoted
 * with the thread they came from. Not archetypes, not invented. The cards are what people
 * actually said happened to them.
 *
 * Sources (2026-10-06):
 *   r/jobs qzptyj          "What's the best or worst onboarding experience you had?"
 *   r/auscorp 1qc4rbs      "What was your worst onboarding experience at a new company?"
 *   r/usajobs 17expr3      "Worst onboarding ever."
 *   r/cscareerquestions ssggwk "What's the worst onboarding experience you've ever had?"
 *   r/jobs 1re2oq8         "What's the worst job onboarding you've ever experienced?"
 *   Glitter AI, "Employee Training & Onboarding 2026" — the 88% figure
 *
 * THE LAW THAT MAKES THIS AN INSTRUMENT AND NOT A QUESTIONNAIRE (from the same threads):
 * CliftonStrengths fails because the employer holds the result. "If your employer has
 * access to the results, my motivation was to look like a valuable promotable employee,
 * not self-knowledge." And: "My employer was very upset that I came back as a strategic
 * thinker. They wanted a code monkey." A profile that can be used against you is not a
 * profile — it is a performance review wearing a friendly hat.
 *
 * So: this deck's output is YOURS. It is local-only, it is not exportable to anyone with
 * authority over you, and the page says so where you can see it. That is the difference
 * between an instrument and an instrument of power.
 *
 * MODE: unset on all cards. These are authored from sourced INCIDENTS, not from
 * behavioural observations of the player — so they cannot vote on the player's type.
 * Your type comes from HOW YOU PLAY, not from what the cards contain (Beyond Asking,
 * Lu et al. 2026: infer from behaviour, don't ask).
 */
window.ONBOARDING_DECK = [
{
 who: 'your new manager · your first standup',
 meta: 'STANDUP · day 3 · 9 people, one screen',
 clock: '3 days in', clocklab: 'before the mistake becomes yours',
 text: 'You shipped what you were asked to ship. Your manager <b>reviewed it and approved it</b>. Now, in front of the team, he says the output was wrong and that you should have flagged the risk. Nobody says otherwise. The person who trained you for one day is looking at the floor. Afterwards he tells you he has <span class="q">high expectations</span>.',
 calls: [
  {k:'A', t:'Take it on the chin in public, then message him privately: "You approved this before it shipped. Can we agree how we\'re flagging risk next time?"',
   right:true,
   v:'<b>Costs:</b> you carry a public correction you did not earn, for one more hour. <b>Buys:</b> the record is set in writing, in private, where he can act on it without losing face — and the pattern has a name before it has three examples.'},
  {k:'B', t:'Correct him in the standup: "You reviewed and approved this."',
   v:'<b>Costs:</b> in week one, in front of nine people, being right is the more expensive position — and it will be remembered as attitude, not accuracy. <b>Buys:</b> the truth is on the record, immediately, and everyone saw who approved it.'},
  {k:'C', t:'Assume he\'s right and work harder to catch things he missed',
   v:'<b>Costs:</b> you have now accepted responsibility for a review step that is his, and it will be given to you permanently. <b>Buys:</b> no conflict at all.'}],
 move: 'Rule: when someone reassigns you the risk they owned, name it once, in writing, privately. Then let it go. The naming is the whole work.',
 ev: 'A manager who blames you for work he approved is not training you. He is rehearsing a story he may need later.',
 source: 'reddit.com/r/jobs/comments/qzptyj/ — "he just throws me under the bus when there\'s a mistake in the work I did and HE REVIEWED AND APPROVED"',
 mode: null
},
{
 who: 'the calendar · your first month, empty',
 meta: 'TICKETS · 3 open · laptop 6 weeks out',
 clock: '6 weeks', clocklab: 'until you have a machine',
 text: 'You were hired in April. It is now week three and you cannot log in. Nobody has given you anything to do. Your manager is "onboarding" you, which currently means a standing invite you are usually the only one on. The phrase in your head is <span class="q">I have nothing to do</span>, and it is not restful.',
 calls: [
  {k:'A', t:'Write a weekly note: what I tried, what blocked me, what I need — and send it to my manager and skip-level every Friday',
   right:true,
   v:'<b>Costs:</b> it feels like making a fuss about being idle, and it is a little humiliating to write. <b>Buys:</b> after six weeks you have dated proof that the block was theirs, not yours — which is the difference between "slow start" and "not a fit" at the review.'},
  {k:'B', t:'Use the time to read everything I can find and come up to speed quietly',
   v:'<b>Costs:</b> invisible work counts as no work at the ninety-day mark, and reading without a machine teaches you the org chart, not the job. <b>Buys:</b> you look calm and self-starting.'},
  {k:'C', t:'Ask every few days whether there is anything yet',
   v:'<b>Costs:</b> "anything yet?" asked repeatedly becomes the thing people remember about you. <b>Buys:</b> you are visibly trying.'}],
 move: 'Rule: idle time is not free time when someone else holds the record of your output. Make your own record, weekly, in writing, dated.',
 ev: '"Nothing makes me doubt a new job more than sitting and doing nothing." Doubt is the correct response. The question is who is accountable for it.',
 source: 'reddit.com/r/usajobs/comments/17expr3/ — "It\'s been 3 weeks now, and I haven\'t done anything. I cant even use my computer"',
 mode: null
},
{
 who: 'your director · 17:00, your first day',
 meta: 'IN PERSON · you met him 4 hours ago',
 clock: '17 hours', clocklab: 'to the 10AM deadline',
 text: 'Onboarding ran until 3PM. At 5PM, on the way out, the director asks you to prepare a report and submit it by 10AM tomorrow. You have no data, no access, no template and no context. He is already talking about something else when he says it. It is described as <span class="q">a good way to hit the ground running</span>.',
 calls: [
  {k:'A', t:'Say: "Happy to. I don\'t have access to anything yet — can you point me at the source data and a prior version of this report, and I\'ll have it to you by 10."',
   right:true,
   v:'<b>Costs:</b> on day one, to a director, saying "I can\'t yet" out loud. <b>Buys:</b> the deadline acquires an owner and an input. Either you get what you need, or the request is revealed as uninformed — and either way you are the person who asked the right question, not the one who produced an empty report.'},
  {k:'B', t:'Stay late and produce something from whatever you can find',
   v:'<b>Costs:</b> 7PM on day one, and a report built from nothing that he will read as the standard you work to. <b>Buys:</b> you proved you deliver under pressure, and you will be given more of exactly this.'},
  {k:'C', t:'Ask a colleague what he actually wants and reverse-engineer it',
   v:'<b>Costs:</b> you never find out what he wanted, and the colleague now owns your deadline with you. <b>Buys:</b> speed, and a chance to learn the house style.'}],
 move: 'Rule: an impossible request on day one is a test of whether you can say what you need. Answer the request AND the missing input, in one reply.',
 ev: '"Hit the ground running" is the phrase used to describe being given responsibility without resources. Note who says it.',
 source: 'reddit.com/r/auscorp/comments/1qc4rbs/ — "he asked me to prepare a report and submit it by 10 AM the next day... I didn\'t have any solid information to work with"',
 mode: null
},
{
 who: 'the org chart · updated again',
 meta: 'REORG · third manager in 18 months',
 clock: '6 months', clocklab: 'per manager, on average, here',
 text: 'Every six months a new manager arrives, announces they are now overseeing you, and you may see them once more before an interchangeable figure delivers the same message. Your last three priorities came from three people who no longer work here. You have been told the team is <span class="q">going through a transition</span> since you arrived.',
 calls: [
  {k:'A', t:'Stop waiting for a manager to define the work. Write down what you think the job is, send it to whoever is currently above you, and ask them to correct it',
   right:true,
   v:'<b>Costs:</b> you are doing your manager\'s job of scoping your own role, unpaid and unthanked. <b>Buys:</b> when manager four arrives, you hand them a document instead of receiving an announcement. Your continuity stops depending on theirs.'},
  {k:'B', t:'Keep your head down and do what the latest one asks',
   v:'<b>Costs:</b> each reorg resets your visible output to zero, and after eighteen months you have been dutiful to four different theories of your job. <b>Buys:</b> you are never the difficult one.'},
  {k:'C', t:'Transfer to a team with a stable manager',
   v:'<b>Costs:</b> the reorg is company-wide; stability is not available, only different reporting lines. <b>Buys:</b> a change, which sometimes works.'}],
 move: 'Rule: when management is transient, the only stable description of your job is one you wrote. Keep it current, keep it addressed, keep it dated.',
 ev: 'An interchangeable manager is not a person, it is a slot. The work either has continuity or it does not.',
 source: 'reddit.com/r/auscorp/comments/1qc4rbs/ — "Every six months, a new manager would come in... we might see them once more before yet another interchangeable figure would show up"',
 mode: null
},
{
 who: 'your teammate · a question you asked twice',
 meta: 'SLACK · you are 3 weeks in · DMs open',
 clock: '3 weeks', clocklab: 'before you stop asking',
 text: 'You are assembling the job out of fragments. You have been <span class="q">strategically bothering colleagues</span> because nothing is written down. One of them has started replying slowly. Another told you that <span class="q">everyone figures this out eventually</span>. There is a manual; it references software retired before you joined.',
 calls: [
  {k:'A', t:'Write down every answer I get, publish it somewhere the team can find it, and tell them I\'m doing it',
   right:true,
   v:'<b>Costs:</b> you are doing unpaid documentation work that should have existed before you arrived, and some of it will already be out of date. <b>Buys:</b> the questions stop being your questions and become the team\'s onboarding — and you become the person who made the next one\'s first month shorter.'},
  {k:'B', t:'Keep asking but spread it across more people so I don\'t wear anyone out',
   v:'<b>Costs:</b> you have optimised the load, not the problem; the knowledge still lives in heads and still leaves when they do. <b>Buys:</b> your relationships survive your first month.'},
  {k:'C', t:'Stop asking and figure the rest out myself',
   v:'<b>Costs:</b> the cost of not asking compounds silently and surfaces as a mistake at exactly the worst moment. <b>Buys:</b> you stop being a tax on the team.'}],
 move: 'Rule: undocumented knowledge is a debt the team owes itself. If you are the one paying it down, write it down and say so — that converts resentment into credit.',
 ev: '"Play obsessed detective and piece things together while strategically bothering colleagues" is not onboarding. It is archaeology, and you are the unpaid digger.',
 source: 'reddit.com/r/cscareerquestions + r/jobs — "never had real onboarding or a mentor... had to play obsessed detective"',
 mode: null
},
{
 who: 'your team · 20 people, week one',
 meta: 'INHERITED · no system access · the hire-er has left',
 clock: '1 week', clocklab: 'before they find out you can\'t help them',
 text: 'You have been handed a team of twenty. You have no system access. The person who brought you in left before you started. Nobody is sure what your remit is, including you. Twenty people are waiting to be led by someone who currently cannot see any of their work.',
 calls: [
  {k:'A', t:'Tell the team the truth on day two: "I can\'t see anything yet, here is what I\'m doing to get access, here is what I need from you in the meantime"',
   right:true,
   v:'<b>Costs:</b> you spend your first week visibly not knowing, in front of the people you are meant to lead. <b>Buys:</b> twenty people stop waiting and start helping — and they learn you say true things early, which is worth more than competence at week one.'},
  {k:'B', t:'Project confidence while I get up to speed behind the scenes',
   v:'<b>Costs:</b> they will find out within a fortnight, and it will land as deception rather than inexperience. <b>Buys:</b> authority is not lost in the first impression.'},
  {k:'C', t:'Escalate hard to whoever is now above me and refuse the remit until I have access',
   v:'<b>Costs:</b> the team is leaderless for as long as the escalation runs, and you are the reason on the ticket. <b>Buys:</b> you start with real tools and a clean scope.'}],
 move: 'Rule: leading through ignorance requires disclosure on a schedule. Say the gap early, say what closes it, and give people something to do while it does.',
 ev: 'Being handed a team and no access is the single most common complaint in the corpus. Nobody reports surviving it by faking.',
 source: 'reddit.com/r/auscorp/comments/1qc4rbs/ — "Taking charge of a team of 20 without any system access during the first week... the individual who brought me on board left the company before I even began"',
 mode: null
},
{
 who: 'IT · ticket 40213, week 6 of "in progress"',
 meta: 'TICKET · no owner · auto-reply only',
 clock: '6 weeks', clocklab: 'into a 12-month contract',
 text: 'The state will not give you a laptop because it is <span class="q">reserved for permanent employees</span>. You are on a twelve-month contract doing the same work. You were prohibited from using your own device. HR says it is IT. IT says it is HR. Each request needs a formal ticket, and each ticket needs a different form.',
 calls: [
  {k:'A', t:'Send one message to both teams at once, with the ticket number, the business impact in one sentence, and a date by which I need an answer',
   right:true,
   v:'<b>Costs:</b> you become the person who cc\'s managers, which is a reputation you will carry. <b>Buys:</b> a decision instead of a queue position. The gap between "permanent" and "contractor" is policy, and policy is written by someone who can be asked.'},
  {k:'B', t:'Keep following the correct process and wait',
   v:'<b>Costs:</b> the process is the thing that is broken; following it harder will not change its outcome, and week six becomes week ten. <b>Buys:</b> you are never the one who went around it.'},
  {k:'C', t:'Use my own device and deal with the consequences later',
   v:'<b>Costs:</b> on a government contract that is a real breach, and it is discoverable later. <b>Buys:</b> you can do your job tomorrow.'}],
 move: 'Rule: when two teams each say the other owns it, that is not a queue — it is an unresolved decision. Address both, name the impact, give a date.',
 ev: '"Reserved for permanent employees" is a rule someone wrote. Rules that block work have owners.',
 source: 'reddit.com/r/auscorp/comments/1qc4rbs/ — "The state government refused to provide me with a laptop, claiming that it was reserved for permanent employees, even though I was on a 12-month contract"',
 mode: null
},
{
 who: 'the week-one reading list',
 meta: 'TWO BINDERS · ~200 pages · no system access',
 clock: '5 hours', clocklab: 'before you are expected to handle tickets',
 text: 'Your manager hands you two thick binders and tells you to read them for five hours so you can handle tickets after lunch. He declines your request to shadow him. You have no system access yet. A significant portion of the material references software that has been out of use for years.',
 calls: [
  {k:'A', t:'Read for the hour, then go back: "I can\'t action any of this without access. What are the three things you actually need me handling today?"',
   right:true,
   v:'<b>Costs:</b> you look like you are pushing back on training, and you may be told to just read. <b>Buys:</b> you convert five hours of filler into one scoped task and a request for access — and you find out quickly whether this is a process or an improvisation.'},
  {k:'B', t:'Read all five hours as instructed, then ask about the parts that don\'t make sense',
   v:'<b>Costs:</b> five hours of outdated material is five hours you will never get back, and your questions will be about software nobody uses. <b>Buys:</b> you did exactly what you were told, on the record.'},
  {k:'C', t:'Skim it and start handling tickets by guesswork',
   v:'<b>Costs:</b> your first tickets are the ones people remember, and guesswork in front of customers is expensive. <b>Buys:</b> you look like you hit the ground running.'}],
 move: 'Rule: training material that describes a system you cannot access is not training. Ask for the system and the three real tasks; decline the rest politely.',
 ev: '"Honestly, it was hard to determine if this was a proper onboarding process or if they were just improvising." It was the second one.',
 source: 'reddit.com/r/jobs/comments/1re2oq8/ — "two thick binders, each nearly a hundred pages long... I didn\'t even have access to the system yet"',
 mode: null
}
];
