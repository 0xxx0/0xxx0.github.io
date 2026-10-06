# Extant-projects scout — best-in-class per lane (2026-10-03)

Purpose: ground the omnitools build in what already exists and is excellent (house law: RECOVER BEFORE INVENTING).
Method: web research over READMEs, docs, and comparative reviews; our own tools read from
`foundry/omnitools/` for honest comparison. Not exhaustive — selective, judged.

---

## Lane 1 — repo / git-history secret + PII scanning

Evaluated: TruffleHog, Gitleaks, detect-secrets, Nosey Parker, ripsecrets, git-secrets, GitGuardian, Microsoft Presidio, scrubadub.

| Project | Why it is (or isn't) the best | URL |
|---|---|---|
| **TruffleHog** (trufflesecurity) | Verification-first: 800+ detectors that call the issuing provider API read-only to tell you whether the credential is *live* (~26k stars). A verified finding = "rotate today"; unverified = triage later. Best-in-class for history sweeps. AGPL/commercial. | https://github.com/trufflesecurity/trufflehog |
| **Gitleaks** | Speed + workflow: single Go binary, 150+ rules, ~4-5x faster than TruffleHog (full history ~9s vs ~41s in one 2026 comparison), TOML rule packs with per-rule allowlists (paths, regexes, stopwords) and entropy thresholds, SARIF output. Natural pre-commit/PR gate. MIT. | https://github.com/gitleaks/gitleaks |
| **detect-secrets** (Yelp) | The **baseline** mechanism: scan once, commit `.secrets.baseline`, and thereafter block only *new* findings. Lets a dirty repo stop bleeding without a history purge. Apache-2. | https://github.com/Yelp/detect-secrets |
| **Nosey Parker** (Praetorian) | Best full-history architecture: enumerates git **blobs** (unique content) and scans each once, not per-commit diffs; persistent SQLite *datastore* with dedup findings (rule + blob + byte offsets); v0.14 added a graph algorithm over the inverted commit graph to reconstruct first-seen commit + filename for every blob at <20% overhead. 150+ rules, JSONL output. | https://github.com/praetorian-inc/noseyparker |
| **Microsoft Presidio** | Best PII (as opposed to secret) engine: pluggable *recognizer registry*, context-word enhancers, **checksum validators** (Luhn for cards, IBAN), confidence scoring, separate anonymizer operators (replace/mask/hash/pseudonymize). MIT, ~8.8k stars, active through 2026. | https://github.com/microsoft/presidio |
| ripsecrets / git-secrets / GitGuardian | ripsecrets: fast minimal grep-style (33/60 in one benchmark). git-secrets: legacy AWS-era, effectively superseded. GitGuardian: best SaaS monitoring, paywalled. | https://github.com/sirwart/ripsecrets |

**Honest read vs our `pii-scan.mjs`:** ours (17 detectors incl. PII: email/phone/handle/real-name,
tree + `git log -p --all` history, Shannon entropy sweep, `--redact/--json/--fail-on`, zero-dep offline)
already matches Gitleaks' *shape* and covers PII none of the secret scanners do, at zero install friction.
We are beaten on four mechanisms: (1) live verification (TruffleHog), (2) baseline/acknowledged-findings
file (detect-secrets), (3) blob-level dedup — `git log -p` re-reads unchanged content per commit and is
O(commits x file) where Nosey Parker is O(unique blobs), (4) checksum validators + context scoring
(Presidio) to kill false positives. We also have no allowlist file and no SARIF.

## Lane 2 — offline single-file / zero-dependency browser tools

Evaluated: chicogong/html-tools, drakeaxelrod/single-html-file-apps, PowerHTML, clockless-org/html-anything, CyberChef, it-tools, QingYunA/agent-html.

| Project | Judgement | URL |
|---|---|---|
| **chicogong/html-tools** | Best-in-class of the "pure frontend tool collection" genre: 1088+ tools, every one single-file, zero build, offline-capable PWA, privacy-first/no-tracking, MIT, 443 commits, versioned releases (v2.2.0, Aug 2026), i18n layer, PRs carry tests and accessibility fixes. 145 stars but the engineering discipline is the reference, not the star count. | https://github.com/chicogong/html-tools |
| **CyberChef** (GCHQ) | Not single-file, but the gold standard for browser data-munging UX: the **recipe model** — every op composable, a whole pipeline serializes to JSON/URL and is shareable/replayable. Worth stealing into `reshaper.html` / `html-munge.mjs`. | https://github.com/gchq/CyberChef |
| PowerHTML / html-anything / agent-html | Demo-toy grade for our purposes; interesting packaging ideas (editor = one .html, output = one .html) but no quality bar. | https://github.com/clockless-org/html-anything |
| single-html-file-apps | Curated collection but trivial apps (games, wishlists). Not a quality reference. | https://github.com/drakeaxelrod/single-html-file-apps |

**What separates excellent from toy in this genre:** works from `file://` (forces no modules/fetch/CDN),
pure deterministic transform of pasted input, keyboard-first, explicit import/export of state,
shareable state as URL hash (CyberChef recipe trick), stated no-network posture, and — at collection
scale — a strict per-tool template + index/launcher + versioned releases. Our six tools already satisfy
the single-file/offline/zero-dep core and have an `index.html` + `release.json`; the missing quality
markers are shareable-state URLs, per-tool test fixtures, and (for html-munge) a recipe/preview pipeline.

## Lane 3 — multilingual aligned reading overlays + text micro-suites

Evaluated: Yomitan, Yomichan, Zhongwen, ZhongLens, Migaku, Readlang, Lute, LWT, FLTR, lingtrain-aligner, make-parallel-text, Bitextor, TextPAIR, open-tamil, ThamizhiMorph, ThamizhiLIP, TamilNLP, Intl.Segmenter (web platform).

| Project / mechanism | Judgement | URL |
|---|---|---|
| **Yomitan** | Best popup-reading architecture that exists. Declarative per-language `LanguageDescriptor`: `textPreprocessors`, `languageTransforms` (deinflection rule tables with POS/condition gating), `readingNormalizer`, `isTextLookupWorthy`; importable dictionaries for 30+ languages incl. Chinese/Korean; shift-hover popup; Anki export. | https://github.com/yomidevs/yomitan |
| **Intl.Segmenter** (web platform, Baseline 2024) | The decisive zero-dependency mechanism for trilingual text: ICU dictionary-based **word segmentation for Chinese** (no whitespace between words), grapheme/word/sentence granularity for Tamil and English, all offline in every current browser engine. Any whitespace-splitting overlay fails on Chinese; this fixes it with zero bytes shipped. | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl.Segmenter |
| **Zhongwen** | Decade-proven hover popup on CC-CEDICT: no-click lookup, tone-colored pinyin, simplified/traditional + Cantonese readings. The interaction model to match (and the zh dictionary source to reuse). | https://github.com/cschiller/zhongwen |
| **Lute v3** (LuteOrg) | Best self-hosted reading *workflow* (670 stars, MIT): **parent terms** linking surface forms ("hablo") to lemmas ("hablar"), per-word familiarity status colors, multi-word terms, 40+ languages, Anki export, full local data control. | https://github.com/LuteOrg/lute-v3 |
| lingtrain-aligner | Best library for *building* aligned corpora from raw texts: sentence-embedding matching + explicit conflict resolution when 1 sentence maps to N (the hard case), TMX output. | https://github.com/averkij/lingtrain-aligner |
| make-parallel-text | Semantic sentence alignment of two translations → 1/2/3-column HTML reader. Closest small tool to our `re-reader.html` ambition. | https://github.com/sowcow/make-parallel-text |
| TextPAIR (ARTFL) | Best sequence aligner for intertextual reuse at corpus scale (Go core, shingle indexing) — relevant if we ever align large corpora, not for a reading overlay. | https://github.com/ARTFL-Project/text-pair |
| **Tamil stack:** open-tamil (letter decomposition `get_letters`, stemmer, transliteration, legacy-encoding→Unicode auto-detect), ThamizhiMorph (FST morphological parser/ generator, Apache-2.0, peer-reviewed), ThamizhiLIP (POS + morph + dependency, Stanza/foma) | Tamil is agglutinative: you cannot align it well without suffix stripping. The FST/transform approach mirrors Yomitan's deinflection tables. No extant tool does Tamil+Chinese+English tri-script overlay out of the box — composing Intl.Segmenter + CC-CEDICT-style lookup + Tamil suffix-transform tables is genuinely novel territory, not recovery. | https://github.com/Ezhil-Language-Foundation/open-tamil · https://github.com/sarves/thamizhi-morph |

**Honest read vs `re-reader.html`:** ours has the trilingual *display* idea; the best extant projects beat
it on (1) word-boundary correctness (Intl.Segmenter for zh — ours almost certainly whitespace-splits and
therefore mis-segments Chinese), (2) lemma→surface linking (Lute parent terms; Yomitan transforms for
Tamil suffixes), (3) hover-vs-click interaction (Zhongwen), (4) alignment provenance (which sentence in
L1 maps to which in L2 — lingtrain's n:m conflict handling).

## Lane 4 — personal-OSINT / self-recon / data-munging

Evaluated: WhatsMyName, Sherlock, Maigret, holehe, social-analyzer, GHunt, qsv, xsv, miller, csvkit, csvtk, xan, duckdb, pup, htmlq, xidel, jq.

| Project | Judgement | URL |
|---|---|---|
| **WhatsMyName** (WebBreacher) | Best-in-class dataset and the right posture. Single curated JSON (`wmn-data.json`) of 700+ sites where each entry carries the exact **detection string** that positively confirms an account exists — that is why it has fewer false positives than status-code checking (Sherlock's known weakness). CC BY-SA 4.0; other tools build on it; free browser tool at whatsmyname.app; ships an explicit OSINT-ethics page ("a match is a lead, not proof"; GDPR/CCPA apply to public data once stored). | https://github.com/webbreacher/whatsmyname |
| **Sherlock** | Fast first pass (400+ sites, MIT, CSV/Excel output); weakness: HTTP status-code checks → false positives. | https://github.com/sherlock-project/sherlock |
| **Maigret** | Deepest sweep (~6000 sites, MIT): recursively follows discovered handles/IDs into new searches, category/country filters, HTML/PDF reports. Slow, some stale checks. | https://github.com/soxoj/maigret |
| holehe | Email→registered-services check (mailineers), passive-only. Complements username sweeps for self-recon. | https://github.com/megadose/holehe |
| **qsv** | Best data-munging CLI: 80+ composable commands (search/join/validate/frequency/stats), multithreaded, embedded Luau DSL, CSV/JSONL/Parquet/Excel; actively maintained successor to archived xsv. | https://github.com/dathere/qsv |
| miller / csvkit / duckdb | miller: awk-like `put`/`filter` DSL across CSV/TSV/JSONL. csvkit: SQL-over-CSV (`csvsql`). duckdb: when the file is bigger than RAM. All maintained. | https://github.com/johnkerl/miller · https://github.com/wireservice/csvkit |
| **pup / htmlq / xidel** | The web-scraping-to-data pipeline: `curl | pup 'sel json{}' | jq ...` (pup emits JSON nodes ready for jq; htmlq is the Rust CSS-selector equivalent; xidel adds XPath/XQuery + `--follow` spidering + JSON output). This is the pipeline shape `html-munge.mjs` should speak. | https://github.com/ericchiang/pup · https://github.com/mgdm/htmlq |

**Legal/reputational posture (the best projects model it):** dual-use by definition. GDPR/CCPA can reach
publicly sourced personal data once you store/organize/share it; US FCRA restricts employment/credit/
tenancy uses; platform ToS layer on top. WhatsMyName's ethics page is the pattern to copy: purpose
limitation, "lead not proof", no login-wall bypass, notes on uncertainty, delete when purpose ends.

## Lane 5 — agent-native tool design (what agents call, compose, verify)

Evaluated: Anthropic "Writing effective tools for agents" (2025-09), "Actions with Receipts" (arXiv 2610.00327), "Schema-Gated Agentic AI" (arXiv 2603.06394), "Architectures for Building Agentic AI" (arXiv 2512.09458), MCP tool-schema design guidance (wati.io), Mastra agent-guide.

Current best thinking, condensed:

- **Anthropic (canonical practice guide):** design tools *for agents*, not as reused APIs. One clear
  distinct purpose per tool; namespaced boundaries; return *meaningful context* (what the result means,
  not just raw data); token-efficient responses; prompt-engineer the tool description (it is the agent's
  docs). Crucially: prototype → build an **evaluation harness** → let the agent iterate on its own tools
  against the eval. https://www.anthropic.com/engineering/writing-tools-for-agents
- **Actions with Receipts (arXiv 2610.00327):** every claim-bearing action emits an *integrity receipt* —
  schema version, policy id, claim string, emission anchor (byte offsets), ordered evidence references
  (hashes, quotes), execution digest — reconstructible by a deterministic verifier; integrity plane kept
  separate from the semantic/support plane so structural validity never masquerades as correctness.
  https://arxiv.org/pdf/2610.00327
- **Schema-gated orchestration (arXiv 2603.06394):** nothing executes unless the complete action
  validates against a machine-checkable schema at the boundary; clarification-before-execution; gating
  escalates from tool-level to composed-workflow-level. https://arxiv.org/html/2603.06394v1
- **Agentic architectures survey (arXiv 2512.09458):** typed schemas as contracts (reject on mismatch,
  structured errors back to the caller); **idempotency tokens** on side-effectful tools; validators before
  actuators; capability-scoped least privilege; "why-stopped" codes; deterministic observability with
  input hashes + tool versions so runs are replayable. https://arxiv.org/html/2512.09458v1
- **MCP schema checklist:** the schema is simultaneously validation *and* the agent's prompt — use enums
  and bounds for safety-sensitive fields, `additionalProperties: false`, document side effects and
  reversibility in the description; "a valid schema is not authorization".
  https://www.wati.io/en/blog/mcp-tool-schema-design/

**Honest read vs our tools:** `pii-scan.mjs --json --fail-on` is already agent-shaped (machine-readable
output + exit codes). Missing per current best practice: deterministic output ordering + stable finding
IDs (for diffable/testable output), an emit-receipt line (tool version, detector-pack version, scanned
tree hash, byte offsets per finding), and a tiny eval fixture set so each tool can be regression-tested.

---

## Projects evaluated (counted from the tables above)

TruffleHog, Gitleaks, detect-secrets, Nosey Parker, ripsecrets, git-secrets, GitGuardian, Presidio,
scrubadub, html-tools, single-html-file-apps, PowerHTML, html-anything, CyberChef, it-tools, agent-html,
Yomitan, Yomichan, Zhongwen, ZhongLens, Migaku, Readlang, Lute, LWT, FLTR, lingtrain-aligner,
make-parallel-text, Bitextor, TextPAIR, open-tamil, ThamizhiMorph, ThamizhiLIP, TamilNLP, Intl.Segmenter,
WhatsMyName, Sherlock, Maigret, holehe, social-analyzer, GHunt, qsv, xsv, miller, csvkit, csvtk, xan,
duckdb, pup, htmlq, xidel, jq = 51
