# STEAL LIST 2026-10-18 — interfaces for absorbing beyond words (art / harness / sound / agent-interphase)
Every link verified live today: 200 + real content (curl, or content-fetch where Cloudflare returns curl-403: everynoise.com, openai.com, observablehq.com). **[WK] = buildable in ~1 week on static web stack (HTML/JS/canvas/WebAudio, no backend); [WK*] = same but needs a client-side model (e.g. Sketch-RNN TF.js port) — budget the integration.**

## ART-INFO (generative art → knowledge interfaces)
- **Paint With Music** (Google Arts & Culture Lab × Magenta) — https://magenta.withgoogle.com/paint-with-music — MECHANISM: brush-stroke velocity/position → DDSP neural-instrument performance, live as you paint. STEAL: paint the fleet's activity stream; gesture → synthesized sound + glyph canvas. [WK]
- **Sketch-RNN Demo** (David Ha, Jonas Jongejan, Ian Johnson; Magenta) — https://experiments.withgoogle.com/sketch-rnn-demo — MECHANISM: you draw half a shape, RNN co-draws the completion, uncertainty as visible wobble. STEAL: "partial input → model completion" as the core human+agent drawing loop. [WK*]
- **Magenta demos hub / RealTime 2** — https://magenta.withgoogle.com/demos — MECHANISM: open neural-synthesis engine, build your own AI instrument on a laptop. STEAL: every agent stream (runs, spends, moods) becomes a playable instrument. [WK*]
- **Ink & Switch — Programmable Ink lab notes** — https://www.inkandswitch.com/ink/notes/ — MECHANISM: living public research notes on notebooks/computational materials; essays at https://www.inkandswitch.com/essay/. STEAL: publish research as revisable lab notes, not frozen reports; notes-as-material.
- **Bret Victor — Media for Thinking the Unthinkable** — https://worrydream.com/MediaForThinkingTheUnthinkable/ — MECHANISM: media as representation that lets you *see* a system's behavior, not read about it. STEAL: build the representation (sim/overview) before the prose.
- **Bret Victor — The Humane Representation of Thought** — https://dynamicland.org/archive/2014/The_Humane_Representation_of_Thought — MECHANISM: redesigns reading/writing/speaking around dynamic external representations. STEAL: the design brief for the whole interphase.
- **Bret Victor — Tangle** — https://worrydream.com/Tangle/ — MECHANISM: reactive documents — drag a number, the surrounding sentence rewrites itself. STEAL: make briefs' numbers/params draggable; text recomputes. [WK]
- **Robin Sloan — the lab** — https://www.robinsloan.com/lab/ — MECHANISM: writer running tiny live web/AI experiments in public, publishing them as pages. STEAL: ship interphase as small weird living pages, weekly.
- **Nadia Asparouhova** — https://nadia.xyz/ — MECHANISM: zero-to-one frameworks for how ideas/attention/people actually work. STEAL: framing vocabulary for "ideas as manipulable objects" in the UI.
- **Toby Shorin** — https://tobyshorin.com/ — MECHANISM: culture/social-form research; "Jobs To Be Done" enumerates 29 'idea receptacles' (containers that hold a thought so the brain can let go). STEAL: receptacle types (card, sonification, sketch, sim) as first-class UI objects. https://subpixel.space/entries/jobs-to-be-done/

## OMNITOOL-HARNESS (one surface over many capabilities)
- **Sublime Text command palette** — https://www.sublimetext.com/ — MECHANISM: every capability is a nameable command reachable from one fuzzy-search box. STEAL: the palette is the OS: agents, tools, views = commands.
- **Raycast** — https://www.raycast.com/ — MECHANISM: launcher became an extensible action surface; community plugins = capability registry. STEAL: fleet ops as palette-registered actions w/ per-action params.
- **Obsidian (plugin architecture)** — https://docs.obsidian.md/Extending+Obsidian — MECHANISM: everything is a plugin over a local markdown vault the user owns. STEAL: local-file vault core, agents as plugins, zero lock-in. [WK*]
- **Warp** — https://www.warp.dev/ — MECHANISM: terminal output becomes addressable blocks; input is a structured editor with AI inline. STEAL: agent output as blocks you can pin/feed/steer from.
- **Linear** — https://linear.app/ — MECHANISM: keyboard-first, opinionated ledger; speed + strict states (triage→done). STEAL: the task-queue skin for a multi-agent fleet.
- **Cursor (composer)** — https://cursor.com/ — MECHANISM: multi-file work arrives as a reviewable diff set, accept/reject per hunk. STEAL: every agent deliverable = diff-artifact you gate, not chat text.
- **Arc** — https://arc.net/ — MECHANISM: browser as OS — spaces, pinned surfaces, content as first-class object. STEAL: pinned "instrument" tabs beside the work surface.

## ABSORB-BEYOND-WORDS (sound / spatial / playable knowledge)
- **TwoTone** (Datavized × Google News Initiative, open source) — https://twotone.io/ — MECHANISM: pick a dataset, map columns to pitch/tempo/timbre, hear the shape; 100% in-browser. STEAL: sonify ledger/agent telemetry on a static page. [WK]
- **The Sonification Handbook** (Hermann, Hunt, Neuhoff — open access) — https://sonification.de/handbook/ — MECHANISM: research-backed taxonomy of mapping data→sound. STEAL: steal proven mappings (pitch=urgency, roughness=conflict) instead of inventing them.
- **Every Noise at Once** (Glenn McDonald) — https://www.everynoise.com/ — MECHANISM: 6,291 genres as a clickable 2D field; every point makes a sound; axes = organic↔mechanical, diffuse↔spiky. STEAL: give any corpus (papers, agents, sources) a navigable field you can *hear*. [WK]
- **Nicky Case — Loopy** — https://ncase.me/loopy/ — MECHANISM: draw nodes/edges, the loop simulates itself; understanding from manipulation. STEAL: agent+info flows as editable self-running loop diagrams. [WK]
- **Explorable Explanations hub / Parable of the Polygons** — https://explorabl.es/ · https://ncase.me/polygons/ — MECHANISM: playable posts — a claim you can poke until it's obvious. STEAL: every summary the fleet writes should be playable, at least slidable.
- **Serendipity Engine** (imec-SMIT-VUB research project) — https://www.serendipityengine.be/ — MECHANISM: designs recommender systems to *maximize serendipity* deliberately. STEAL: make surprise a tunable dial on the discovery radar.
- **Are.na** — https://www.are.na/ — MECHANISM: blocks+channels, no feed, no algorithm; connect-by-attention. STEAL: quiet channel-based collecting surface for agent findings.
- **Heptabase** — https://heptabase.com/ — MECHANISM: cards on an infinite spatial board; knowledge by layout, not list. STEAL: spatial proximity as the index of relatedness. cf. tldraw below.

## AGENT-INTERPHASE (human + agents + tools + artifacts, one surface)
- **Claude Artifacts** — https://claude.com/features/artifacts — MECHANISM: conversation beside a live, editable, shareable artifact — objects of discussion that persist and can be steered by highlight or chat. STEAL: chat is a lens on shared state, not the product.
- **OpenAI Canvas** — https://openai.com/index/introducing-canvas/ — MECHANISM: side-by-side workspace; inline suggestion comments with one-click Apply; read/cope toggles. STEAL: highlight-to-steer affordances on agent output.
- **PMX Canvas** (github.com/pskoett/pmx-canvas) — https://github.com/pskoett/pmx-canvas — MECHANISM: humans+agents share one spatial canvas; *pins = agent context*, approval gates, steering messages, bounded event timeline. STEAL: the closest existing spec to a fleet interphase: pin-to-context + pending/approved states.
- **tldraw** — https://tldraw.dev/ — MECHANISM: infinite canvas as programmable SDK (persistable, scriptable shapes). STEAL: fastest base layer for a [WK] fleet canvas.
- **Observable** — https://observablehq.com/ — MECHANISM: "computational, collaborative, agentic document" — cells drafted by agent, taken over by hand, forever live. STEAL: the doc is the dashboard is the agent's desk.
- **Latent Space** — https://www.latent.space/ — MECHANISM: primary source reporting on how labs actually build agent harnesses. STEAL: harness patterns mined from founder/builder interviews.
- **Devin** — https://devin.ai/ · **v0** — https://v0.dev/ — MECHANISM: agent-first surfaces (plan pane + live preview; text→app) — the two shipped shapes of "agent works where you watch".

## TOP 5 — STEAL FIRST
1. **Paint With Music (DDSP) + Magenta demos** — the discovery that triggered this. Week-build: canvas + stroke-velocity/features → WebAudio synth + visual glyphs over agent activity. [WK]
2. **PMX Canvas spec** (pins→context, approvals, timeline) over **tldraw** — the actual fleet harness shape: one board, agents write, human pins/steers/gates. [WK for a slice]
3. **Tangle + explorable pattern** (Loopy/Polygons) — turn the fleet's briefs into reactive playable docs. Easiest, highest leverage. [WK]
4. **Every Noise at Once + TwoTone + Sonification Handbook** — give the corpus a 2D field you can hear; proven mappings, all client-side. [WK]
5. **Claude Artifacts / Cursor composer split** — chat-left, artifact-right, diff-gated accept/reject = the interphase grammar everyone already knows; adopt it, don't reinvent. [WK]
