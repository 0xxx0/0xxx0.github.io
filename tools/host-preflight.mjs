#!/usr/bin/env node
// host-preflight — the executable form of AGENTS.md law #3:
//   "VERIFY THE CLAIM, NOT THE ARTIFACT ... run the thing and look at the effect."
//
// WHY THIS EXISTS
//   `shutil.which('ffprobe')` / `command -v ffmpeg` answer "is the file on PATH?".
//   They do NOT answer "does it load and run?". On 2026-10-01 the fleet shipped a
//   broken ffmpeg: /opt/homebrew/bin/ffmpeg existed, was executable, and passed every
//   presence check, while every invocation aborted in dyld because ffmpeg 8.1.2_1 was
//   linked against libx265.216.dylib and the x265 keg had moved to 4.3 (libx265.217).
//   Media work across all 8 profiles was dead and no surface said so.
//
//   A binary that is present but does not load is the exact class of failure that
//   reads as success. This probe EXECUTES each dependency and reports what happened.
//
// USAGE
//   node tools/host-preflight.mjs            # human table
//   node tools/host-preflight.mjs --json     # machine receipt
//   exit 0 = every dependency loaded; exit 1 = at least one is broken.
//
// ADDING A PROBE: only add a binary the fleet actually shells out to. A probe for a
// tool nobody invokes is residue, not coverage.

import { execFileSync } from "node:child_process";

const json = process.argv.includes("--json");

// `loadFail` catches the real failure mode: the process dies before main().
const LOAD_FAIL = /Library not loaded|dyld|image not found|Symbol not found|cannot open shared object/i;

const PROBES = [
  { name: "node",          bin: "node",          args: ["--version"],        why: "all repo tooling is .mjs" },
  { name: "ffmpeg",        bin: "ffmpeg",        args: ["-version"],         why: "media transcode; broke 2026-10-01" },
  { name: "ffprobe",       bin: "ffprobe",       args: ["-version"],         why: "media-refinery-run.py guard" },
  { name: "lame",          bin: "lame",          args: ["--version"],        why: "mp3 encode (afconvert cannot AAC here)" },
  { name: "afconvert",     bin: "afconvert",     args: ["-h"],               why: "native audio conversion" },
  { name: "say",           bin: "say",           args: ["-v", "?"],          why: "local TTS" },
  { name: "git",           bin: "git",           args: ["--version"],        why: "every delivery" },
  { name: "gh",            bin: "gh",            args: ["--version"],        why: "PR / CI surface" },
  { name: "sqlite3",       bin: "sqlite3",       args: ["--version"],        why: "corpus + state dbs" },
  { name: "jq",            bin: "jq",            args: ["--version"],        why: "control JSON reads" },
  { name: "mosquitto_sub", bin: "mosquitto_sub", args: ["--help"],           why: "device presence" },
  { name: "mosquitto_pub", bin: "mosquitto_pub", args: ["--help"],           why: "device presence" },
];

function probe({ bin, args }) {
  try {
    const out = execFileSync(bin, args, {
      encoding: "utf8", timeout: 10_000, stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, detail: out.split("\n")[0].trim() };
  } catch (err) {
    if (err.code === "ENOENT") return { ok: false, kind: "ABSENT", detail: "not on PATH" };
    const errText = `${err.stderr || ""}${err.stdout || ""}${err.message || ""}`;
    if (LOAD_FAIL.test(errText)) {
      const m = errText.match(/Library not loaded:\s*(\S+)/);
      return { ok: false, kind: "LOAD-FAIL", detail: m ? `missing ${m[1]}` : "died in loader" };
    }
    // Non-zero exit is normal for many CLIs (--help etc). It launched, so it loads.
    if (err.signal) return { ok: false, kind: "SIGNAL", detail: `killed by ${err.signal}` };
    const first = `${err.stdout || ""}${err.stderr || ""}`.split("\n").find((l) => l.trim());
    return { ok: true, detail: (first || `exit ${err.status} (loaded)`).trim() };
  }
}

const results = PROBES.map((p) => ({ ...p, ...probe(p) }));
const broken = results.filter((r) => !r.ok);

if (json) {
  console.log(JSON.stringify({
    tool: "host-preflight",
    host: `${process.platform}-${process.arch}`,
    checked_at: new Date().toISOString(),
    total: results.length,
    ok: results.length - broken.length,
    broken: broken.length,
    results: results.map(({ name, bin, ok, kind, detail, why }) => ({ name, bin, ok, kind, detail, why })),
  }, null, 2));
} else {
  for (const r of results) {
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name.padEnd(14)} ${r.detail}${r.ok ? "" : `   <- ${r.why}`}`);
  }
  console.log(`\n${results.length - broken.length}/${results.length} dependencies load.`);
  if (broken.length) {
    console.log(`\n${broken.length} BROKEN: ${broken.map((b) => b.name).join(", ")}`);
    console.log("A present-but-unloadable binary passes every `which` check. Fix the linkage, not the PATH.");
  }
}

process.exit(broken.length ? 1 : 0);