#!/usr/bin/env python3
"""Assemble Painting / Path: instrument + THE HAND layer.

usage: build-hand.py <instrument.html> <fragment.html> <out.html>
Inserts the fragment once, immediately before </body>. Refuses if a hand layer is already
present in either side. Deterministic, no network, no dependencies.
"""
import pathlib
import sys

if len(sys.argv) != 4:
    sys.exit(__doc__)

src_p, frag_p, out_p = (pathlib.Path(a) for a in sys.argv[1:4])
src = src_p.read_text(encoding='utf-8')
frag = frag_p.read_text(encoding='utf-8')

if 'id="handCanvas"' in src:
    sys.exit('refusing: source already carries a hand layer')
if 'id="handCanvas"' not in frag:
    sys.exit('refusing: fragment does not define #handCanvas')
if '</body>' not in src:
    sys.exit('refusing: no </body> marker in the instrument')

out = src.replace('</body>', '\n' + frag + '\n</body>', 1)
out_p.write_text(out, encoding='utf-8')
print(f'wrote {out_p} ({len(out)} B, +{len(out) - len(src)} B)')
