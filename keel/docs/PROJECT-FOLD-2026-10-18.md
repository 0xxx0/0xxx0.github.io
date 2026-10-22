# PROJECT FOLD — 2026-10-18 (staged moves only; nothing deleted)
Staging: `~/void-anchor/quarantine/project-fold-2026-10-18/` — per group MANIFEST.md + FILEHASHES.tsv (sha256/file) + REVERT.sh; `REVERT-ALL.sh` restores all four to exact original paths.

| utility class | members | keeper | non-keepers moved | bytes |
|---|---|---|---|---|
| bothealer observability stack | ~/bothealer-observability; ~/hermes-workspace | ~/hermes-workspace (git, superset 55 files) | quarantine/g1-…/tree/ (9 files: 7 identical, bridge copy 3 lines newer in shell, 1 unique wiki file) | 52,953 |
| AXIS path shadow | ~/AXIS; ~/void-anchor/AXIS | ~/void-anchor/AXIS (git, 60,906 files) | quarantine/g2-…/tree/AXIS (5 files, ALL unique — zero name overlap with canonical) | 38,106 |
| hermes-agent clone (NousResearch) | ~/void-anchor/hermes-runtime/hermes-agent; ~/.hermes/hermes-agent | ~/.hermes/hermes-agent (2026-10-07, live) | quarantine/g3-…/hermes-agent (clone @1e01b25e7, 0 unpushed commits, 16 dirty entries carried intact) | 1,526,816,768 |
| css3d floorplan test | ~/test/css3d-floorplan.test.js; ~/src/css3d | ~/src/css3d (holds css3d-floorplan.js) | moved INTO keeper, add-only, hash-verified | 2,780 |

CANDIDATE — not moved, one-line why:
- 25+ linked worktrees of the live site repo (~/wt-*, ~/.hermes/worktrees/*, ~/Projects/0xxx0-care-wt, AXIS/work/*/wt): every branch holds unique unpushed commits — not manifest-reversible.
- ~/Claw3D vs ~/.hermes/hermes-office: identical HEAD 06e2cbd but different remotes and branch sets, 2.0 GB, possible hermes consumer.
- ~/bothealer-infra: same utility family but 0 byte-identical files vs keeper — separate work, not a duplicate.
- ~/ops-hub vs ~/void-anchor/ops-hub: same name, ZERO shared files — different utilities; near-miss, left alone.
- ~/hermes-clean, ~/hermes-sandbox, ~/void-anchor/hermes-workspace: name cluster only, disjoint content; the void-anchor one is LIVE (vite dev running) — untouched.
- ~/Downloads/void-sovereign vs ~/sovereign-node: no same-named files — separate, left in Downloads staging.
Empty strays left in place: ~/Downloads/housebus (0 B), ~/workspace, ~/test (now empty).
Notes: g1 tree carries a file literally named '\n/Users/mcvoid/bothealer-observability/prometheus.yml\n' (botched redirect, 213 B) — preserved; hermes-runtime was never tracked in void-anchor's git (ls-files = 0), so the only git delta is a new untracked `quarantine/`. No commits made.
