#!/usr/bin/env python3
"""
APERTURE REDACTION — a public-safe projection over a canonical private record.

One canonical object (a local corpus record) + lawful projections:

    LOCAL  = PAGE   the canonical host, complete detail, stays local
    PUBLIC = contracted projection: sensitive spans fall OUTSIDE the public
             aperture and are replaced by shaped markers

The projection is a contraction in the house sense (geometric-interphase
`contract()`): it reduces what is visible while retaining, at each address,
an explicit RESIDUE naming the suppressed facet — so "the fact that a
credential/email/path appeared here" stays findable on the public surface
while the value itself cannot be recovered from the projection.

Marker shape (search-stable; FTS5 tokenizes to [REDACTED, kind]):

    <head8 of original>…<REDACTED:kind>      e.g.  sk-nous-…<REDACTED:token>
    …<REDACTED:kind>                         for classes with no head

Properties (proven by `selftest`, not asserted by prose):
  * deterministic   — same input + same deny-list => same output, no RNG.
  * shape-preserving— a bounded head (8 chars) of tokens/wallets is kept so
                      provider prefixes remain searchable; class markers are
                      searchable ("REDACTED" / kind name in FTS5), and the
                      rest of the record text is untouched.
  * lossy-right-way — no planted secret value survives in the output:
                      exact substring scan = 0 hits; longest surviving
                      contiguous run of any planted value <= head cap (8).
  * idempotent      — redact(redact(x)) == redact(x). Two mechanisms:
                      (a) markers are outside the scan aperture (MARKER_RE
                      guard), (b) every detector's minimum value length
                      exceeds the head cap, so a shaped head cannot re-match.

Resolution is deterministic: leftmost start first; longer span wins at equal
start; lower priority breaks ties. A later-starting candidate that extends
beyond an accepted span and begins no later than that span's value region
SUPERSEDES it (prevents partial coverage, e.g. "token bot<id>:<secret>"
where "token bot<id>" alone would otherwise win).

Vocabulary follows /Projects/0xxx0.github.io/lib/interphase-core.js
(projection / residue / aperture / return) and geometric-interphase
kernel.mjs (contract: "reduce visible allocation; retain an explicit
residue against the same canonical host"). This tool is a standalone
reusable script; it does not import or modify the repo.

Detector coverage: API keys/tokens (OpenAI/Anthropic sk-, GitHub, GitLab,
Slack, Google, AWS, Stripe, npm, PyPI, HF, Groq, Telegram bot, JWT, Bearer/
Basic/Token/Digest auth, and more vendor prefixes), private key blocks,
key=value & JSON secret fields, DB connection strings, URL userinfo, URL
query params, emails, phones, IPv4, home paths, wallets (ETH/BTC), Discord
mentions, and a caller-supplied deny-list. Detection is a bound, not a
promise: it catches the listed classes by shape; the deny-list is the
operator lever for everything else.

CLI:
    redact.py redact [FILE]          stdin/file -> PUBLIC projection (stdout)
    redact.py redact --db DB [...]   SQLite rows -> redacted JSONL
    redact.py check  [FILE|--db ...] scan for unredacted secrets; exit 1 if any
    redact.py selftest               planted-secret leak test + idempotence

Safety: check mode NEVER prints matched values — findings are counts only,
or kind + marker + original length (a shape, not a value). Detected raw
values exist only transiently in memory inside the module (Span.raw) and are
never emitted by the CLI.

Requires: Python 3.9+, stdlib only (re, sqlite3, argparse, hashlib, json).
"""

import argparse
import hashlib
import json
import os
import random
import re
import sqlite3
import sys

VERSION = "aperture-redaction/v0.1"
ELLIPSIS = "\u2026"
HEAD_CHARS = 8                     # by-design head kept per head-bearing class
MAX_RUN_ASSERT = HEAD_CHARS        # leak-test bound: no run longer than 8 chars

# --------------------------------------------------------------------------
# marker + protection
# --------------------------------------------------------------------------

def marker(kind):
    return "%s<REDACTED:%s>" % (ELLIPSIS, kind)

# Anything already shaped like a marker is OUTSIDE the scan aperture.
# This is part of the idempotence guarantee: markers cannot re-match.
MARKER_RE = re.compile(r"\u2026?<REDACTED:[A-Za-z0-9_-]+>")


# --------------------------------------------------------------------------
# detectors
# --------------------------------------------------------------------------
# detector tuple fields:
#   kind          residue class name shown in the marker
#   pattern       compiled regex
#   priority      lower wins when two matches share start AND length
#   head          head chars kept (0 = none)
#   value_group   group number holding the sensitive value (None = whole match)
#   accept        extra predicate on the raw value (None = always accept)

def _has_digit_or_upper(s):
    return any(c.isdigit() or c.isupper() for c in s)

def _secretish(s):
    """Token-ish by shape: contains a digit or an uppercase letter.

    Real vendor keys are base62/hex at minimum; pure-lowercase hyphenated
    English ("sk-learn-pipeline-tutorial-guide") is rejected."""
    return _has_digit_or_upper(s)

def _kvish(s):
    """Plausibly a secret VALUE (not an English phrase): digit, or long."""
    return any(c.isdigit() for c in s) or len(s) >= 24

def _headers_schemeish(s):
    return any(c.isdigit() or c.isupper() for c in s) or len(s) >= 24

# Generic home-directory usernames that do not identify a person.
_GENERIC_USERS = frozenset({
    "root", "ubuntu", "user", "users", "admin", "administrator", "deploy",
    "runner", "pi", "guest", "vagrant", "ec2-user", "node", "me", "you",
    "someone", "name", "username", "local", "test", "default",
})

def _user_accept(name):
    return name.lower() not in _GENERIC_USERS

def _digits(v):
    return sum(1 for c in v if c.isdigit())

def _phone_accept(v):
    return 10 <= _digits(v) <= 15

# --- token prefix families -------------------------------------------------
# Vendor prefixes curated from the house donor
# (void-anchor/hermes-runtime/hermes-agent/agent/redact.py) with thresholds
# raised where natural-language collision matters on a public search surface.
_TOKEN_PREFIXES = (
    r"pplx-[A-Za-z0-9]{16,}"
    r"|fal_[A-Za-z0-9_-]{16,}"
    r"|fc-[A-Za-z0-9]{12,}"
    r"|bb_live_[A-Za-z0-9_-]{16,}"
    r"|gAAAA[A-Za-z0-9_=-]{20,}"
    r"|SG\.[A-Za-z0-9_-]{16,}"
    r"|hf_[A-Za-z0-9]{20,}"
    r"|r8_[A-Za-z0-9]{16,}"
    r"|npm_[A-Za-z0-9]{20,}"
    r"|pypi-[A-Za-z0-9_-]{16,}"
    r"|dop_v1_[A-Za-z0-9]{20,}"
    r"|doo_v1_[A-Za-z0-9]{20,}"
    r"|am_[A-Za-z0-9_-]{16,}"
    r"|tvly-[A-Za-z0-9]{16,}"
    r"|exa_[A-Za-z0-9]{16,}"
    r"|gsk_[A-Za-z0-9]{20,}"
    r"|syt_[A-Za-z0-9]{16,}"
    r"|retaindb_[A-Za-z0-9]{16,}"
    r"|hsk-[A-Za-z0-9]{16,}"
    r"|mem0_[A-Za-z0-9]{16,}"
    r"|brv_[A-Za-z0-9]{16,}"
)

_KV_KEYS = (
    r"api[_-]?key|apikey|secret(?:[_-]?key)?|token|password|passwd|pwd"
    r"|passphrase|access[_-]?token|refresh[_-]?token|auth[_-]?token"
    r"|access[_-]?key|client[_-]?secret|private[_-]?key|credential(?:s)?|bearer"
)

def _build_detectors():
    d = []
    # token: OpenAI/Anthropic-style + ElevenLabs + Stripe. Natural-language
    # collision (hyphenated "sk-learn-..." phrases) is filtered by _secretish.
    d.append(("token", re.compile(
        r"\b(?:sk-[A-Za-z0-9_-]{16,}|sk_[A-Za-z0-9_]{16,}|[sr]k_(?:live|test)_[A-Za-z0-9]{16,})"),
        10, HEAD_CHARS, None, _secretish))
    d.append(("token", re.compile(
        r"\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{16,}"),
        10, HEAD_CHARS, None, None))
    d.append(("token", re.compile(
        r"\bgithub_pat_[A-Za-z0-9_]{20,}"), 10, HEAD_CHARS, None, None))
    d.append(("token", re.compile(
        r"\bglpat-[A-Za-z0-9_-]{16,}"), 10, HEAD_CHARS, None, None))
    d.append(("token", re.compile(
        r"\bxox[baprs]-[A-Za-z0-9-]{10,}"), 10, HEAD_CHARS, None, None))
    d.append(("token", re.compile(
        r"\bAIza[0-9A-Za-z_-]{30,}"), 10, HEAD_CHARS, None, None))
    d.append(("token", re.compile(
        r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b"), 10, HEAD_CHARS, None, None))
    d.append(("token", re.compile(
        r"\b(" + _TOKEN_PREFIXES + r")"), 10, HEAD_CHARS, None, None))
    # Telegram bot token: id+secret contracted to an 8-char head so the kept
    # prefix stays below every detector's minimum (no pass-2 re-match).
    d.append(("token", re.compile(
        r"\b(?:bot)?\d{8,}:[-A-Za-z0-9_]{30,}"), 10, HEAD_CHARS, None, None))
    # JWT (header.payload[.signature]) — header is non-secret, kept as head.
    d.append(("token", re.compile(
        r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_=-]{6,}(?:\.[A-Za-z0-9_=-]{6,})?"),
        10, HEAD_CHARS, None, None))
    # Authorization schemes: Bearer/Basic/Token/Digest <value>
    d.append(("token", re.compile(
        r"(?i)\b(?:bearer|basic|token|digest|apikey)\s+([A-Za-z0-9._~+/=-]{12,})"),
        10, HEAD_CHARS, 1, _headers_schemeish))
    d.append(("token", re.compile(
        r"(?i)\b(authorization[\"']?\s*[:=]\s*)([^\s\"',;]{10,})"),
        12, HEAD_CHARS, 2, _headers_schemeish))
    # private key blocks — whole block is the suppressed facet.
    d.append(("privatekey", re.compile(
        r"-----BEGIN[A-Z ]*PRIVATE KEY-----[\s\S]*?-----END[A-Z ]*PRIVATE KEY-----"),
        15, 0, None, None))
    # key=value / json "key": "value" heuristic.
    d.append(("secret", re.compile(
        r"(?i)(?<![A-Za-z])((?:%s))\b"
        r"(\s*[\"'\u0060]{0,2}\s*[:=]\s*[\"'\u0060]{0,2})"
        r"""([^\s"'`<>…,;:)\}&]{12,})""" % _KV_KEYS),
        20, HEAD_CHARS, 3, _kvish))
    # DB connection strings / URL userinfo: password contracted, user kept.
    # Value class excludes marker chars so a contracted output cannot re-match.
    d.append(("secret", re.compile(
        r"(?i)((?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|rediss|amqp)://[^:\s/@]+:)([^@\s/<…]{3,})(?=@)"),
        25, 0, 2, None))
    d.append(("secret", re.compile(
        r"((?:https?|wss?|ftp)://[^/\s:@]+:)([^@\s/<…]{3,})(?=@)"),
        25, 0, 2, None))
    # URL query params with sensitive names. Min 10 > head cap 8 so shaped
    # heads (8 chars + marker) cannot re-match.
    d.append(("token", re.compile(
        r"(?i)([?&](?:access_token|refresh_token|id_token|token|api_key|apikey"
        r"|client_secret|password|auth|jwt|session|secret|key|code|signature"
        r"|x-amz-signature|sig)=)([^&\s#\"'<>…]{10,})"),
        25, HEAD_CHARS, 2, _headers_schemeish))
    # email
    d.append(("email", re.compile(
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"),
        30, 0, None, None))
    # IPv4 (octets validated)
    _octet = r"(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)"
    d.append(("ipv4", re.compile(
        r"(?<![\d.])(?:%s\.){3}%s(?![\d.])" % (_octet, _octet)),
        35, 0, None, None))
    # phone (10-15 digits; ':' breaks spans so timestamps are not eaten)
    d.append(("phone", re.compile(
        r"(?<![\d.\-])\+?\d[\d \t().\-]{7,}\d(?![\d.\-])"),
        40, 0, None, _phone_accept))
    # home paths: username contracted, rest of path kept (searchable)
    d.append(("user", re.compile(
        r"(?i)(?:/Users/|/home/|[A-Za-z]:\\Users\\)([A-Za-z0-9._-]*[A-Za-z0-9_-])"),
        50, 0, 1, _user_accept))
    # wallets: ETH, BTC bech32, BTC legacy base58
    d.append(("wallet", re.compile(
        r"(?<![0-9A-Za-z])(0x[a-fA-F0-9]{40})(?![0-9A-Za-z])"),
        55, HEAD_CHARS, 1, None))
    d.append(("wallet", re.compile(
        r"\bbc1[023456789acdefghjklmnpqrstuvwxyz]{25,58}\b"),
        55, HEAD_CHARS, None, None))
    d.append(("wallet", re.compile(
        r"\b[13][1-9A-HJ-NP-Za-km-z]{25,34}\b"),
        55, HEAD_CHARS, None, None))
    # discord mention (snowflake id)
    d.append(("discord", re.compile(
        r"(<@!?)(\d{17,20})>"), 60, 0, 2, None))
    return d

_DETECTORS = _build_detectors()


class Span(object):
    """One suppressed facet. `raw` is the ORIGINAL value — internal only,
    never printed by the CLI, used for in-memory leak checking."""
    __slots__ = ("kind", "start", "end", "value_start", "value_end",
                 "priority", "head", "raw")

    def __init__(self, kind, start, end, value_start, value_end, priority, head, raw):
        self.kind = kind
        self.start = start
        self.end = end
        self.value_start = value_start
        self.value_end = value_end
        self.priority = priority
        self.head = head
        self.raw = raw


def _deny_pattern(deny):
    if not deny:
        return None
    # deterministic: longest first, then lexicographic
    words = sorted(set(deny), key=lambda w: (-len(w), w))
    return re.compile("|".join(re.escape(w) for w in words), re.IGNORECASE)


def find_all(text, deny=()):
    """All sensitive spans in `text`, deterministically resolved.

    Sort: leftmost start; longer span wins at equal start; lower priority
    breaks ties. A candidate that overlaps the last accepted span is dropped
    UNLESS it extends beyond it and starts no later than the accepted span's
    value region, in which case it supersedes it (prevents partial coverage).
    Spans inside existing markers are outside the aperture (skipped).
    """
    if not text:
        return []
    protected = [(m.start(), m.end()) for m in MARKER_RE.finditer(text)]
    candidates = []
    deny_re = _deny_pattern(deny)
    if deny_re is not None:
        for m in deny_re.finditer(text):
            s, e = m.span()
            if any(s < pe and e > ps for ps, pe in protected):
                continue
            candidates.append(Span("denied", s, e, s, e, 5, 0, m.group(0)))
    for kind, rx, prio, head, vg, accept in _DETECTORS:
        for m in rx.finditer(text):
            s, e = m.span()
            if any(s < pe and e > ps for ps, pe in protected):
                continue
            if vg is not None:
                vs, ve = m.start(vg), m.end(vg)
            else:
                vs, ve = s, e
            raw = text[vs:ve]
            if accept is not None and not accept(raw):
                continue
            candidates.append(Span(kind, s, e, vs, ve, prio, head, raw))
    if not candidates:
        return []
    candidates.sort(key=lambda sp: (sp.start, -(sp.end - sp.start), sp.priority))
    accepted = []
    for sp in candidates:
        if accepted and sp.start < accepted[-1].end:
            a = accepted[-1]
            if sp.end > a.end and sp.start <= a.value_start:
                accepted[-1] = sp          # supersede: strictly more coverage
            continue
        accepted.append(sp)
    return accepted


def _render(text, spans):
    out = []
    pos = 0
    for sp in spans:
        out.append(text[pos:sp.start])
        prefix = text[sp.start:sp.value_start]
        head = sp.raw[:sp.head] if sp.head else ""
        out.append(prefix + head + marker(sp.kind))
        pos = sp.end
    out.append(text[pos:])
    return "".join(out)


def redact(text, deny=()):
    """Project `text` through the PUBLIC aperture.

    Returns dict: {text, residue: [...], counts: {...}, clean: bool}.
    residue spans carry original coordinates, original length and the
    replacement — never the raw value.
    """
    spans = find_all(text, deny=deny)
    residue = []
    counts = {}
    for sp in spans:
        counts[sp.kind] = counts.get(sp.kind, 0) + 1
        residue.append({
            "kind": sp.kind,
            "start": sp.start,
            "end": sp.end,
            "origLength": sp.end - sp.start,
            "valueLength": sp.value_end - sp.value_start,
            "replacement": (sp.raw[:sp.head] if sp.head else "") + marker(sp.kind),
        })
    return {
        "text": _render(text, spans),
        "residue": residue,
        "counts": counts,
        "clean": len(spans) == 0,
    }


def load_deny(items):
    """items: file paths (one literal per line, '#' comments) or words."""
    out = []
    for it in items or []:
        if os.path.isfile(it):
            with open(it, "r", encoding="utf-8", errors="replace") as fh:
                for line in fh:
                    w = line.strip()
                    if w and not w.startswith("#"):
                        out.append(w)
        else:
            w = it.strip()
            if w:
                out.append(w)
    return out


# --------------------------------------------------------------------------
# SQLite (read-only; never writes to the corpus)
# --------------------------------------------------------------------------

_DEFAULT_COLUMNS = {
    "messages": ["text", "title"],
    "logs": ["message", "raw"],
    "recovery": ["name", "claim", "notes"],
    "sources": ["path"],
}

def _ident(name):
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", name or ""):
        raise SystemExit("invalid identifier: %r" % name)
    return name


def db_connect_ro(path):
    uri = "file:%s?mode=ro" % path
    con = sqlite3.connect(uri, uri=True)
    con.execute("PRAGMA query_only=1")
    return con


def db_columns(con, table):
    cur = con.execute("PRAGMA table_info(%s)" % _ident(table))
    return [r[1] for r in cur.fetchall()]


def iter_db_rows(db, table, columns=None, limit=None, stride=None):
    con = db_connect_ro(os.path.abspath(db))
    table = _ident(table)
    cols = columns or _DEFAULT_COLUMNS.get(table) or ["text"]
    available = set(db_columns(con, table))
    for c in cols:
        _ident(c)
        if c not in available:
            raise SystemExit("column %r not in table %r (have: %s)"
                             % (c, table, ", ".join(sorted(available))))
    sql = "SELECT rowid, %s FROM %s" % (", ".join(cols), table)
    if stride:
        sql += " WHERE (rowid %% %d) = 0" % int(stride)
    if limit:
        sql += " LIMIT %d" % int(limit)
    cur = con.execute(sql)
    try:
        for row in cur:
            yield row[0], cols, list(row[1:])
    finally:
        con.close()


# --------------------------------------------------------------------------
# CLI commands
# --------------------------------------------------------------------------

def _read_input(path):
    if path is None or path == "-":
        return sys.stdin.read()
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        return fh.read()


def cmd_redact(args):
    deny = load_deny(args.deny)
    if args.db:
        out_fh = open(args.out, "w", encoding="utf-8") if args.out else sys.stdout
        n_rows = n_spans = 0
        cls_totals = {}
        try:
            for rid, cols, vals in iter_db_rows(args.db, args.table,
                                                args.columns, args.limit, args.stride):
                rec = {
                    "schema": VERSION,
                    "aperture": "PUBLIC",
                    "returnAddress": "%s#%s/rowid=%d"
                        % (os.path.basename(args.db), args.table, rid),
                    "redacted": {},
                    "residue": {},
                }
                counts = {}
                spans_all = []
                for c, v in zip(cols, vals):
                    if v is None:
                        rec["redacted"][c] = None
                        continue
                    res = redact(str(v), deny=deny)
                    rec["redacted"][c] = res["text"]
                    for k, n in res["counts"].items():
                        counts[k] = counts.get(k, 0) + n
                    if args.residue_spans:
                        for sp in res["residue"]:
                            sp = dict(sp)
                            sp["column"] = c
                            spans_all.append(sp)
                rec["residue"] = {"counts": counts, "totalSpans": sum(counts.values())}
                if args.residue_spans:
                    rec["residue"]["spans"] = spans_all
                out_fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
                n_rows += 1
                n_spans += sum(counts.values())
                for k, n in counts.items():
                    cls_totals[k] = cls_totals.get(k, 0) + n
        finally:
            if args.out:
                out_fh.close()
        sys.stderr.write("redact: %d rows, %d spans contracted %s\n"
                         % (n_rows, n_spans, json.dumps(cls_totals, sort_keys=True)))
        return 0

    text = _read_input(args.input)
    res = redact(text, deny=deny)
    if args.json:
        envelope = {
            "schema": VERSION,
            "aperture": "PUBLIC",
            "text": res["text"],
            "residue": {"counts": res["counts"], "totalSpans": len(res["residue"])},
        }
        payload = json.dumps(envelope, ensure_ascii=False, indent=2)
    else:
        payload = res["text"]
    if args.out:
        with open(args.out, "w", encoding="utf-8") as fh:
            fh.write(payload)
    else:
        sys.stdout.write(payload)
    if not args.quiet:
        sys.stderr.write("redact: %d spans contracted %s\n"
                         % (len(res["residue"]), json.dumps(res["counts"], sort_keys=True)))
    return 0


def _finding_label(sp):
    """Safe finding rendering: kind + marker + original length — no value."""
    return "[%s] marker=%s origLength=%d" % (sp.kind, marker(sp.kind), sp.end - sp.start)


def cmd_check(args):
    deny = load_deny(args.deny)
    grand = 0
    kinds = {}
    if args.db:
        n_rows = n_reported = 0
        for rid, cols, vals in iter_db_rows(args.db, args.table,
                                            args.columns, args.limit, args.stride):
            for c, v in zip(cols, vals):
                if v is None:
                    continue
                spans = find_all(str(v), deny=deny)
                if spans:
                    grand += len(spans)
                    for sp in spans:
                        kinds[sp.kind] = kinds.get(sp.kind, 0) + 1
                    if args.samples > 0 and n_reported < args.samples:
                        n_reported += 1
                        print("  %s#%s/rowid=%d:%s %s"
                              % (os.path.basename(args.db), args.table, rid, c,
                                 "; ".join(_finding_label(sp) for sp in spans[:3])))
            n_rows += 1
        print("check: scanned %d rows" % n_rows)
    else:
        text = _read_input(args.input)
        spans = find_all(text, deny=deny)
        grand = len(spans)
        for sp in spans:
            kinds[sp.kind] = kinds.get(sp.kind, 0) + 1
        if spans and args.samples > 0:
            for sp in spans[:args.samples]:
                print("  %s" % _finding_label(sp))
    if grand:
        print("FINDINGS: %d unredacted candidate(s) %s"
              % (grand, json.dumps(kinds, sort_keys=True)))
        return 1
    print("CLEAN: no unredacted sensitive material detected in scope")
    return 0


# --------------------------------------------------------------------------
# selftest — planted secrets, leak scan, idempotence, shape, negatives
# --------------------------------------------------------------------------

def _token(rng, n, alphabet=None):
    alphabet = alphabet or ("abcdefghijklmnopqrstuvwxyz"
                            "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
    return "".join(rng.choice(alphabet) for _ in range(n))

def _hexish(rng, n):
    return _token(rng, n, "0123456789abcdef")

def _b58(rng, n):
    return _token(rng, n, "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz")

def _bech32(rng, n):
    return _token(rng, n, "qpzry9x8gf2tvdw0s3jn54khce6mua7l")


def _fixture():
    """Deterministic synthetic corpus.

    Returns (lines, plants, negatives); plants are dicts:
    {label, val (the sensitive value; must never survive), kind, head (bool),
     ctx (the exact snippet the value was embedded in)}.
    """
    rng = random.Random(20260928)
    lines, plants = [], []

    def add(val, kind, ctx, head=True):
        lines.extend(ctx.split("\n"))
        plants.append({"label": kind + ":" + val[:12], "val": val,
                       "kind": kind, "head": head, "ctx": ctx})

    # --- tokens (head-preserving) ---
    t = "sk-nous-" + _token(rng, 24)
    add(t, "token", "the deploy used %s against the api" % t)
    t = "sk-proj-" + _token(rng, 28)
    add(t, "token", "export OPENAI_KEY=%s" % t)
    t = "ghp_" + _token(rng, 36)
    add(t, "token", "pushed with %s and it leaked into the log" % t)
    t = "github_pat_" + _token(rng, 22)
    add(t, "token", "remote uses %s" % t)
    t = "glpat-" + _token(rng, 20)
    add(t, "token", "leaked %s in a paste" % t)
    t = "xoxb-" + str(rng.randint(10**10, 10**11 - 1)) + "-" + _token(rng, 18)
    add(t, "token", "slack bot token %s posted it" % t)
    t = "AIza" + _token(rng, 35, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_")
    add(t, "token", "maps key %s is in the repo" % t)
    t = "AKIA" + _token(rng, 16, "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
    add(t, "token", "aws access key id %s appears here" % t)
    t = "sk_live_" + _token(rng, 24, "abcdefghijklmnopqrstuvwxyz0123456789")
    add(t, "token", "stripe secret %s in the config" % t)
    t = "npm_" + _token(rng, 36)
    add(t, "token", "npm publish used %s" % t)
    t = ("eyJ" + _token(rng, 36, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_")
         + "." + _token(rng, 40, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_")
         + "." + _token(rng, 30, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"))
    add(t, "token", "session JWT %s leaked" % t)
    t = _token(rng, 32)
    add(t, "token", "Authorization: Bearer %s" % t)
    t = "sk_" + _hexish(rng, 32)
    add(t, "token", "elevenlabs key %s in the env" % t)
    t = ("bot" + str(rng.randint(10**8, 10**9 - 1)) + ":"
         + _token(rng, 35, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-"))
    add(t.split(":", 1)[1], "token",      # the secret half is the planted value
        "telegram token %s in history" % t, head=False)
    t = "gsk_" + _token(rng, 24)
    add(t, "token", "groq key %s in the env" % t)

    # --- kv-secret (env style, json style) ---
    v = _token(rng, 28)
    add(v, "secret", "api_key=%s" % v)
    v = _token(rng, 22)
    add(v, "secret", '{"password": "%s", "user": "x"}' % v)
    v = _token(rng, 30)
    add(v, "secret", "export OPENAI_API_KEY=%s" % v)

    # --- db connstring / url userinfo / query param ---
    v = _hexish(rng, 16)
    add(v, "secret", "redis://default:%s@cache.internal:6379/0" % v, head=False)
    v = "hunter2" + _hexish(rng, 10)
    add(v, "secret", "https://admin:%s@grafana.example.net/d/abc" % v, head=False)
    v = "qtok_" + _hexish(rng, 12)
    add(v, "token", "https://hooks.example.com/cb?access_token=%s&mode=live" % v)

    # --- emails ---
    for dom in ("example.com", "mail.example.org", "corp.example.net",
                "inbox.example.io", "a.example.dev"):
        v = "quietfalcon%d@%s" % (rng.randint(100, 999), dom)
        add(v, "email", "reach me at %s about it" % v, head=False)

    # --- phones (reserved 555-01xx range) ---
    for num in ("+1 555 010 9999", "+1 (415) 555-2671", "+44 20 7946 0958",
                "555.010.1134"):
        add(num, "phone", "call %s tomorrow" % num, head=False)

    # --- ipv4 (RFC5737 test ranges) ---
    for ip in ("203.0.113.7", "198.51.100.42", "192.0.2.99", "203.0.113.200"):
        add(ip, "ipv4", "connect to %s first" % ip, head=False)

    # --- home paths ---
    u = "quietfalcon7"
    path_ctx = "\n".join([
        "notes live at /Users/%s/Projects/secret-run.md usually" % u,
        "key at /Users/%s/.ssh/id_ed25519 of course" % u,
        "deployed under /home/%s/app/main.py on the box" % u,
        r"config in C:\Users\%s\Documents\notes.txt here" % u,
    ])
    add(u, "user", path_ctx, head=False)

    # --- wallets ---
    v = "0x" + _hexish(rng, 40)
    add(v, "wallet", "sent to %s last week" % v)
    v = "0x" + _hexish(rng, 40).upper()
    add(v, "wallet", "received at %s today" % v)
    v = "bc1q" + _bech32(rng, 38)
    add(v, "wallet", "btc address %s used" % v)
    v = "1" + _b58(rng, 33)
    add(v, "wallet", "legacy wallet %s seen" % v)

    # --- deny-list (caller-supplied; these entries are exercised as fixtures) ---
    for w in ("Project Nightjar", "compound-7", "BAZAAR-ORCHID", "mcv7-sable",
              "quietfalcon7"):
        add(w, "denied", "internal note mentions %s again" % w, head=False)

    # --- private key block ---
    body = _token(rng, 120)
    block = ("-----BEGIN RSA PRIVATE KEY-----\n" + body
             + "\n-----END RSA PRIVATE KEY-----")
    add(body, "privatekey", block, head=False)

    # --- discord mention ---
    v = str(rng.randint(10**17, 10**18 - 1))
    add(v, "discord", "ping <@%s> for details" % v, head=False)

    # --- negatives: must survive unchanged ---
    negatives = [
        "docs mention scikit-learn pipelines here",
        "the sk-learn-pipeline-tutorial-guide article is old",
        "release v2.4.1 shipped to prod",
        "served from /home/ubuntu/app on the vm",
        "value 0xdeadbeef is a magic number",
        "mail user@localhost bounced",
    ]
    lines.extend(negatives)
    return lines, plants, negatives


def _longest_run(val, hay):
    """Longest contiguous substring of `val` present in `hay` (capped scan)."""
    lo = min(len(val), 96)
    for L in range(lo, 0, -1):
        for i in range(0, len(val) - L + 1):
            if val[i:i + L] in hay:
                return L
    return 0


def cmd_selftest(args):
    lines, plants, negatives = _fixture()
    doc = "\n".join(lines) + "\n"
    deny = ["Project Nightjar", "compound-7", "BAZAAR-ORCHID", "mcv7-sable",
            "quietfalcon7"]

    ok = True
    def report(name, passed, detail=""):
        nonlocal ok
        status = "PASS" if passed else "FAIL"
        if not passed:
            ok = False
        print("%s  %s  %s" % (status, name, detail))

    # 0. shape demo (the brief's contract example)
    demo = redact("token sk-nous-VFhq7Nq2mQwLz8RtYb3Xc6Vd0Wg1i and more",
                  deny=deny)["text"]
    report("shape-demo", "sk-nous-\u2026<REDACTED:token>" in demo, demo.strip())

    # 1. detector sanity: every planted value detectable pre-redaction
    found_pre = find_all(doc, deny=deny)
    missing = [p["label"] for p in plants
               if not any(p["val"] in sp.raw or sp.raw in p["val"]
                          for sp in found_pre)]
    report("detect-all-plants", not missing,
           "%d/%d planted values detected pre-redaction"
           % (len(plants) - len(missing), len(plants)))
    if missing:
        print("   undetected:", missing)

    # 2. redact
    out = redact(doc, deny=deny)
    text = out["text"]

    # 3. leak scan: no planted secret survives (exact substring)
    leaked = [p["label"] for p in plants if p["val"] in text]
    report("zero-leak", not leaked,
           "%d synthetic secrets planted, %d found in output"
           % (len(plants), len(leaked)))
    if leaked:
        print("   leaked:", leaked)

    # 4. max-run bound: no planted value may survive contiguously beyond the
    #    head cap (checked against each plant's own redacted context)
    worst = 0
    for p in plants:
        run = _longest_run(p["val"], redact(p["ctx"], deny=deny)["text"])
        if run > worst:
            worst = run
    report("max-run<=head", worst <= MAX_RUN_ASSERT,
           "longest surviving contiguous run of any planted value = %d (cap %d)"
           % (worst, MAX_RUN_ASSERT))

    # 5. shape preservation: head kept for head-bearing classes, marker present
    shape_fail = []
    for p in plants:
        if p["head"]:
            if (p["val"][:HEAD_CHARS] + marker(p["kind"])) not in text:
                shape_fail.append(p["label"])
        else:
            if marker(p["kind"]) not in text:
                shape_fail.append(p["label"])
    report("shape-preserved", not shape_fail,
           "%d/%d markers verified" % (len(plants) - len(shape_fail), len(plants)))
    if shape_fail:
        print("   shape-fail:", shape_fail)

    # 6. negatives untouched
    neg_fail = [n for n in negatives if n not in text]
    report("negatives-preserved", not neg_fail,
           "%d/%d negative controls unchanged"
           % (len(negatives) - len(neg_fail), len(negatives)))
    if neg_fail:
        print("   altered:", neg_fail)

    # 7. idempotence: redact(redact(x)) == redact(x)
    twice = redact(text, deny=deny)["text"]
    report("idempotent", twice == text,
           "redact\u2218redact == redact on full document")

    n_lines = len(text.split("\n"))
    line_bad = sum(1 for ln in text.split("\n")
                   if redact(ln, deny=deny)["text"] != ln)
    report("idempotent-lines", line_bad == 0,
           "%d/%d lines stable" % (n_lines - line_bad, n_lines))

    # 8. post-redaction scan is clean
    post = find_all(text, deny=deny)
    report("check-clean-after", len(post) == 0, "0 findings on redacted output")

    # 9. digest for determinism comparison across runs
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
    print("NOTE  redacted-fixture sha256=%s" % digest)
    print("NOTE  plants=%d leaked=%d max_run=%d" % (len(plants), len(leaked), worst))
    print("SELFTEST %s" % ("PASS" if ok else "FAIL"))
    return 0 if ok else 1


# --------------------------------------------------------------------------
# main
# --------------------------------------------------------------------------

def main(argv=None):
    p = argparse.ArgumentParser(
        prog="redact.py",
        description="APERTURE REDACTION — public-safe projection of a "
                    "canonical private record (see module docstring).")
    p.add_argument("--version", action="version", version=VERSION)
    sub = p.add_subparsers(dest="cmd", required=True)

    def common(sp):
        sp.add_argument("input", nargs="?", default="-",
                        help="input file ('-' or omitted = stdin)")
        sp.add_argument("--deny", action="append", default=[],
                        help="deny-list file path or literal word (repeatable)")
        sp.add_argument("--db", help="read rows from a SQLite DB (read-only)")
        sp.add_argument("--table", default="messages")
        sp.add_argument("--columns", help="comma-separated column list")
        sp.add_argument("--limit", type=int, default=None)
        sp.add_argument("--stride", type=int, default=None,
                        help="sample rows where rowid %% N == 0")

    sp_red = sub.add_parser("redact", help="project input through the PUBLIC aperture")
    common(sp_red)
    sp_red.add_argument("-o", "--out", help="output file (default stdout)")
    sp_red.add_argument("--json", action="store_true",
                        help="file mode: emit JSON envelope with residue")
    sp_red.add_argument("--quiet", action="store_true")
    sp_red.add_argument("--residue-spans", action="store_true",
                        help="DB mode: include per-span residue")
    sp_red.set_defaults(func=cmd_redact)

    sp_chk = sub.add_parser("check", help="scan for unredacted sensitive material")
    common(sp_chk)
    sp_chk.add_argument("--samples", type=int, default=0,
                        help="show up to N finding renderings (kind+marker+length; "
                             "never raw values)")
    sp_chk.set_defaults(func=cmd_check)

    sp_st = sub.add_parser("selftest", help="planted-secret leak test + idempotence")
    sp_st.set_defaults(func=cmd_selftest)

    args = p.parse_args(argv)
    if getattr(args, "columns", None):
        args.columns = [c.strip() for c in args.columns.split(",") if c.strip()]
    else:
        args.columns = None
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())