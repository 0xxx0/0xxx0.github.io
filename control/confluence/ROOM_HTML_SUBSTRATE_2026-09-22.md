# ROOM 0.3 — HTML substrate correction

Date: 2026-09-22  
Status: CANDIDATE

## Correction

The 0.2 SPACE SCALE canvas made composition executable, but it also reintroduced a hidden second model: the visible nodes were projections of a JavaScript graph. That increased interaction cost and weakened the old "homoiconic interface language" aspiration.

Strictly, HTML + JavaScript is **not homoiconic** in the Lisp sense: the interpreter/program language and the represented program are not the same language/data structure.

0.3 therefore makes the narrower and more useful claim:

> **DOM-as-program / structurally reflexive:** the same nested HTML structure the human reads is the structure the tiny runtime interprets.

## Current law

- DOM nesting = composition.
- `<details>` = native fold/unfold / abstraction visibility.
- `id` = stable local address.
- visible `<a rel="next" href="#...">` = seam + executable next edge.
- `data-op` = minimal operator declaration.
- SOURCE = exact live `#program.outerHTML`.
- RETURN = that exact markup + execution trace.
- No separate canvas graph is authoritative.

## Preserved

- `/foundry/room/space-scale-0.2.html` — typed BLOCK ⇄ ROOM canvas experiment.
- `/foundry/room/room-0.1.html` — six-face spatial relation probe.
- `space-core.js` remains a donor/tested kernel, not current UI authority.

## Why this is closer to FURNISHER / INTERPHASE

The old product material wanted an exposed programming language derived from visible connections, a multidimensional breadboard, composable parts, and inspectable transformations. A plain document whose visible links and nesting are also the executable structure fits that requirement better than a custom visual editor whose real program lives elsewhere.

The browser itself supplies most of the interaction grammar:
open, close, link, anchor, form, source, history.

Reintroduce custom geometry only when a specific projection proves useful.

## Pass condition

Someone encountering the page cold should be able to:

1. read the transformation top-to-bottom;
2. close FURNISHER COMPILER and understand that it is now one abstract block;
3. reopen it and see the implementation;
4. follow a visible seam;
5. press RUN and identify the path RUN followed;
6. open SOURCE and recognize the same structure;
7. obtain RETURN without learning a graph-editor interaction language.

If that still needs explanation, reduce again.
