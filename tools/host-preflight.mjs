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
import fs from "node:fs";
import path from "node:path";

const json = process.argv.includes("--json");

// `loadFail` catches the real failure mode: the process dies before main().
// Deliberately narrow. A bare "dyld" or "cannot open shared object" appears in
// ordinary help and error text; requiring the full loader signature keeps a
// working tool that merely MENTIONS one from being reported as broken.
const LOAD_FAIL = /Library not loaded:|dyld\[\d+\]|image not found|cannot open shared object file|Symbol not found:/i;

// Resolve a name on PATH ourselves. execFileSync reports ENOENT both when the
// binary is absent AND when the file exists but its interpreter does not, and
// those are different faults. This tells them apart without a subprocess.
function whichBin(bin) {
  if (bin.includes("/")) return fs.existsSync(bin) ? bin : null;
  for (const dir of (process.env.PATH || "").split(":")) {
    if (!dir) continue;
    const p = path.join(dir, bin);
    try { fs.accessSync(p, fs.constants.X_OK); return p; } catch { /* keep looking */ }
  }
  return null;
}

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
    const stderr = typeof err.stderr === "string" ? err.stderr : "";
    const stdout = typeof err.stdout === "string" ? err.stdout : "";
    const firstErr = stderr.split("\n").find((l) => l.trim())?.trim() || "";

    // Killed by a signal: never a healthy run. A genuinely unloadable Mach-O
    // lands here — dyld writes to stderr and the process aborts with SIGABRT.
    if (err.signal) {
      const m = stderr.match(/Library not loaded:\s*(\S+)/);
      if (m) return { ok: false, kind: "LOAD-FAIL", detail: `missing ${m[1]}` };
      return { ok: false, kind: "SIGNAL", detail: `killed by ${err.signal}${firstErr ? `: ${firstErr}` : ""}` };
    }

    // macOS refuses to execute a binary whose code signature was invalidated
    // (e.g. a modified Mach-O) with EBADEXEC, which node surfaces as a numeric
    // "Unknown system error". It is still an execution failure, not a healthy run.
    if (typeof err.code === "string" && /Unknown system error/i.test(err.code)) {
      return { ok: false, kind: "EXEC-FAIL", detail: `the OS refused to execute it (${err.code})` };
    }

    // ENOENT is ambiguous: absent from PATH, OR present with a missing interpreter.
    if (err.code === "ENOENT") {
      return whichBin(bin) === null
        ? { ok: false, kind: "ABSENT", detail: "not on PATH" }
        : { ok: false, kind: "BAD-INTERPRETER", detail: "on PATH, but its interpreter could not be found" };
    }

    // The file is present and executable but the OS refused to execute it.
    if (err.code === "ENOEXEC" || /Exec format error/i.test(stderr)) {
      return { ok: false, kind: "EXEC-FAIL", detail: "present and executable, but the OS refused to execute it" };
    }

    // Test stderr ONLY. err.message embeds the command line, and a tool's own
    // --help text can quote loader phrases — testing it would false-FAIL a
    // working binary. dyld and ld.so write their diagnostics to stderr.
    if (LOAD_FAIL.test(stderr)) {
      const m = stderr.match(/Library not loaded:\s*(\S+)/);
      return { ok: false, kind: "LOAD-FAIL", detail: m ? `missing ${m[1]}` : (firstErr || "died in loader") };
    }

    // It launched and produced an exit status: non-zero is normal for CLIs whose
    // probe arg is --help. A null status here means it never got that far.
    if (typeof err.status === "number") {
      const first = (stdout + stderr).split("\n").find((l) => l.trim())?.trim();
      return { ok: true, detail: err.status === 0 ? (first || "launched (no output)") : `exit ${err.status} (loaded)` };
    }
    return { ok: false, kind: "UNKNOWN", detail: firstErr || "launched, but produced no exit status" };
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