#!/usr/bin/env python3
"""check-protected - refuse to let a staging pass touch a protected path.

Written 2026-09-25 after a live Home Assistant VM was found running off a disk inside
the delete pen. A markdown warning is not enforcement; this is.

    python3 check-protected.py <candidate-paths.txt>   # one path per line
    python3 check-protected.py --list

Exit 0 = clear. Exit 1 = a protected path is in the candidate set: DO NOT PROCEED.
Any staging/boxing/deletion pass must call this first and obey the exit code.
"""
import json, os, sys

PEN = os.path.dirname(os.path.abspath(__file__))
LIST = os.path.join(PEN, "_protected.jsonl")


def load():
    out = []
    if os.path.exists(LIST):
        for line in open(LIST):
            line = line.strip()
            if line:
                try:
                    out.append(json.loads(line))
                except Exception:
                    pass
    return out


def main():
    prot = load()
    if not prot:
        print("check-protected: WARNING - no protected list found. Refusing to certificate.")
        return 1
    if len(sys.argv) > 1 and sys.argv[1] == "--list":
        for p in prot:
            print("  [%s] %s (%s bytes)" % (p.get("kind"), p["rel"], p.get("bytes")))
        return 0
    if len(sys.argv) < 2:
        print("usage: check-protected.py <candidate-paths.txt> | --list")
        return 2

    cands = [l.strip() for l in open(sys.argv[1]) if l.strip()]
    hit = []
    for c in cands:
        cp = os.path.realpath(c)
        for p in prot:
            pp = os.path.realpath(p["path"])
            if cp == pp or os.path.basename(cp) == os.path.basename(pp):
                hit.append((c, p))
    if hit:
        print("check-protected: REFUSED - %d protected path(s) in the candidate set:" % len(hit))
        for c, p in hit:
            print("    %s" % c)
            print("      why: %s" % p["why"])
        print("  Remove them from the set. Do not proceed.")
        return 1
    print("check-protected: clear - %d candidates, none protected." % len(cands))
    return 0


if __name__ == "__main__":
    sys.exit(main())
