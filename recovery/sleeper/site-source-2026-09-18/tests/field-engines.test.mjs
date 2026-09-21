import assert from "node:assert/strict";
import test from "node:test";

import { seedFromSource } from "../app/lib/seed.ts";
import { createFieldPack, parseFieldPack } from "../app/lab/pack.ts";
import { applyJueLaw, evaluateJueCommission, jueCommission, jueReturn, makeJueState, replayJue, undoJue } from "../app/lab/jue/engine.ts";
import { makeRsvpPlan, rsvpResult } from "../app/lab/rsvp/engine.ts";
import { analyseRhythm, readRhythmGuide } from "../app/lab/rsvp/audio-analysis.ts";
import { initialKiteState, kiteBand, kiteForecast, kiteReturn, makeKiteCourse, stepKite } from "../app/lab/kite/engine.ts";
import {
  DEFAULT_IMAGE_METRICS,
  counterProjection,
  makeBountyChallenge,
  makeCountertraceChallenge,
  makeGrammarChallenge,
  makeProofChallenge,
  makeScaleChallenge,
  makeScrollChallenge,
  makeSwitchyardChallenge,
  makeWindowChallenge,
  replayBounty,
  replayGrammar,
  replayProof,
  replayScroll,
  replayScale,
  replaySwitchyard,
  replayWindow,
  windowComposite,
} from "../app/lab/instrument/engine.ts";
import { GATE_DEFINITIONS, compileWorldLaw, makeReturnArtifact, makeUtilityPrompt, makeWorldQuery, parseReturnArtifactWorld, parseWorldQuery } from "../app/one-return/world-law.ts";
import { buildCityLayout, distancesFrom } from "../app/one-return/city-layout.ts";
import { advanceMeasureProof, evaluateToolGate, resilienceContact, truthProofProgress } from "../app/one-return/protocol.ts";

test("source seeds normalize Unicode and spacing deterministically", () => {
  assert.equal(seedFromSource("  cafe\u0301   returns "), seedFromSource("café returns"));
  assert.notEqual(seedFromSource("café returns"), seedFromSource("café departs"));
});

test("Field Pack round-trips and rejects source/seed drift", () => {
  const pack = createFieldPack("jue", "未始来时末已示空", { reading: 1 }, [{ tick: 0, action: "show", target: "t0" }]);
  const parsed = parseFieldPack(JSON.stringify(pack));
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.deepEqual(parsed.pack, pack);

  const drifted = { ...pack, seed: pack.seed + 1 };
  const rejected = parseFieldPack(JSON.stringify(drifted));
  assert.equal(rejected.ok, false);

  assert.equal(parseFieldPack(JSON.stringify(createFieldPack("scale", "image pixels become law", { metrics: [] }))).ok, true);
  assert.equal(parseFieldPack(JSON.stringify({ ...pack, field: "unknown" })).ok, false);
});

test("JUE trace replays to the same causal return", () => {
  let state = makeJueState("one two three four");
  state = applyJueLaw(state, "mo", "t0");
  state = applyJueLaw(state, "show", "t2");
  state = applyJueLaw(state, "time", "t1");
  state = applyJueLaw(state, "void", "t3");
  const replayed = replayJue(state.source, state.trace);
  assert.deepEqual(jueReturn(replayed), jueReturn(state));
  assert.equal(jueReturn(state).sourceLedger.length, 4);
  assert.equal(jueReturn(state).transfer.schema, "sleeper.transfer");
  assert.deepEqual(undoJue(state).trace, state.trace.slice(0, -1));
});

test("JUE commissions conceal operators but remain satisfiable inside six moves", () => {
  for (let index = 0; index < 80; index += 1) {
    const source = `origin evidence boundary cadence return ${index}`;
    const commission = jueCommission(source);
    let state = makeJueState(source);
    for (const condition of commission) {
      if (condition.id === "origin") state = applyJueLaw(state, "shi", condition.targetId);
      if (condition.id === "evidence") state = applyJueLaw(state, "show", condition.targetId);
      if (condition.id === "edge") state = applyJueLaw(state, "mo", condition.targetId);
      if (condition.id === "fixed") state = applyJueLaw(state, "yi", condition.targetId);
      if (condition.id === "gap") state = applyJueLaw(state, "void", condition.targetId);
      if (condition.id === "cadence") state = applyJueLaw(state, "time", condition.targetId);
      if (condition.id === "retrieved") {
        const deferred = state.tokens.find((token) => token.id !== commission[0].targetId && token.id !== commission[1].targetId) ?? state.tokens.at(-1);
        state = applyJueLaw(state, "wei", deferred.id);
        state = applyJueLaw(state, "lai", state.tokens[0].id);
      }
    }
    assert.ok(state.used.length <= 6);
    assert.equal(evaluateJueCommission(state, commission).every((condition) => condition.satisfied), true, source);
  }
  assert.equal(jueCommission("独").some((condition) => condition.id === "retrieved"), false);
});

test("RSVP plan and score are deterministic and explain additions", () => {
  const source = "Small signals return; enormous patterns repeat.";
  const first = makeRsvpPlan(source, 260);
  const second = makeRsvpPlan(source, 260);
  assert.deepEqual(first, second);
  assert.ok(first.tokens.length > 2);
  const wrong = first.tokens.find((token) => !token.target);
  const score = rsvpResult(first, wrong ? [{ tick: 10, action: "mark", target: wrong.id }] : []);
  assert.equal(score.additions, wrong ? 1 : 0);
  assert.equal(score.transfer.schema, "sleeper.transfer");
});

test("RSVP projects a supplied rhythm deterministically and keeps every token in a valid lane", () => {
  const guide = {
    durationMs: 18_000,
    bpm: 120,
    confidence: 0.9,
    pulses: Array.from({ length: 73 }, (_, index) => ({ atMs: index * 250, energy: (index % 4 + 1) / 4 })),
  };
  const source = "A forward phrase enters rhythm, crosses five lanes, and returns as evidence.";
  const plan = makeRsvpPlan(source, 250, guide);
  assert.equal(plan.rhythm.mode, "audio");
  assert.deepEqual(plan, makeRsvpPlan(source, 250, guide));
  assert.equal(plan.tokens.every((token) => token.lane >= 0 && token.lane < 5), true);
  assert.equal(plan.tokens.some((token) => guide.pulses.some((pulse) => pulse.atMs === token.impactMs)), true);
});

test("local rhythm analysis recovers a simple 120 BPM click field", () => {
  const sampleRate = 2_000;
  const samples = new Float32Array(sampleRate * 8);
  for (let beat = 0; beat < 16; beat += 1) {
    const start = Math.floor(beat * 0.5 * sampleRate);
    for (let cursor = start; cursor < start + 24; cursor += 1) samples[cursor] = 1;
  }
  const guide = analyseRhythm(samples, sampleRate);
  assert.ok(guide.bpm >= 110 && guide.bpm <= 130, `estimated ${guide.bpm} BPM`);
  assert.ok(guide.pulses.length >= 20);
  assert.ok(guide.confidence > 0.1);
});

test("Kite weather is deterministic and every measure returns evidence", () => {
  const source = "some replies take wind";
  const course = makeKiteCourse(source);
  assert.deepEqual(course, makeKiteCourse(source));
  let state = initialKiteState();
  let guard = 0;
  while (!state.complete && guard < 10_000) {
    const reel = state.tension < 0.5;
    state = stepKite(course, state, reel, 32);
    guard += 1;
  }
  assert.equal(state.complete, true);
  assert.equal(state.marks.length, course.measures.length);
  const result = kiteReturn(course, state);
  assert.equal(result.carried + result.weathered, course.measures.length);
  assert.equal(result.transfer.schema, "sleeper.transfer");
});

test("Kite forecasts moving bands and weathered residue changes later pressure", () => {
  const course = makeKiteCourse("weather remembers every unfinished answer");
  const initial = initialKiteState();
  const firstBand = kiteBand(course, initial);
  const movedBand = kiteBand(course, { ...initial, elapsedMs: 1_200 });
  assert.notDeepEqual(firstBand, movedBand);
  assert.deepEqual(kiteForecast(course, initial), kiteForecast(course, initial));

  const nearEnd = { ...initial, elapsedMs: course.measures[0].durationMs - 1, stableMs: 0, tension: 0 };
  const weathered = stepKite(course, nearEnd, false, 32);
  assert.equal(weathered.marks[0].state, "weathered");
  assert.ok(weathered.residue > 0);
  const cleanTwin = { ...weathered, residue: 0 };
  assert.ok(kiteBand(course, weathered).width < kiteBand(course, cleanTwin).width);
  assert.ok(stepKite(course, initial, false, 10_000).elapsedMs <= 48);
});

test("all nine compact Lab studies reproduce from source and their generated witnesses solve", () => {
  for (let sample = 0; sample < 120; sample += 1) {
    const source = `portable evidence returns ${sample}`;

    const proof = makeProofChallenge(source);
    assert.deepEqual(proof, makeProofChallenge(source));
    const proofState = replayProof(proof, proof.witness.map((operation, tick) => ({ tick, action: operation })));
    assert.equal(proofState.value, proof.target);

    const window = makeWindowChallenge(source);
    assert.deepEqual(window, makeWindowChallenge(source));
    assert.equal(windowComposite(window.layers, window.witness), window.target);
    const windowTrace = window.witness.flatMap((turns, layer) => Array.from({ length: turns }, (_, step) => ({ tick: layer * 4 + step, action: "rotate", target: `layer-${layer}` })));
    assert.equal(replayWindow(window, windowTrace).composite, window.target);

    const bounty = makeBountyChallenge(source);
    const bountyState = replayBounty(bounty, bounty.witness.map((index, tick) => ({ tick, action: "toggle", target: `item-${index}` })));
    assert.equal(bountyState.sum, bounty.target);
    assert.ok(bountyState.selected.length <= 4);

    const counter = makeCountertraceChallenge(source);
    assert.deepEqual(counterProjection(counter, counter.witness), counter.target);
    assert.notDeepEqual(counter.target, counter.base);

    const scroll = makeScrollChallenge(source);
    const scrollState = replayScroll(scroll, scroll.witness.map((row, tick) => ({ tick, action: "move", value: row })));
    assert.equal(scrollState.successful, true);

    const grammar = makeGrammarChallenge(source);
    const grammarTrace = grammar.target.map((glyph, tick) => ({ tick, action: "choose", target: `slot-${tick}`, value: grammar.mapping[glyph] }));
    assert.equal(replayGrammar(grammar, grammarTrace).choices.every((choice) => choice >= 0), true);

    const scale = makeScaleChallenge(source, DEFAULT_IMAGE_METRICS);
    assert.equal(scale.rounds.every((round) => round.candidates.includes(round.correct)), true);
  }
});

test("Switchyard always offers a zero-residue route across a broad seed sweep", () => {
  const routeChoices = Array.from({ length: 3 ** 8 }, (_, encoded) => {
    const route = [];
    let value = encoded;
    for (let turn = 0; turn < 8; turn += 1) { route.push(value % 3); value = Math.floor(value / 3); }
    return route;
  });
  for (let sample = 0; sample < 80; sample += 1) {
    const challenge = makeSwitchyardChallenge(`capacity and recovery ${sample}`);
    const solved = routeChoices.some((route) => replaySwitchyard(challenge, route.map((office, tick) => ({ tick, action: "route", value: office }))).residue === 0);
    assert.equal(solved, true, `switchyard seed ${sample}`);
  }
});

test("ONE RETURN compiles all three inputs into a reproducible, legible world law", () => {
  const first = compileWorldLaw("A small question returns", "four-verbs", "kite");
  const same = compileWorldLaw("  a SMALL   question returns ", "four-verbs", "kite");
  assert.equal(first.seed, same.seed);
  assert.equal(first.key, same.key);
  assert.equal(first.loops, same.loops);
  assert.deepEqual(first.wallAlphabet, same.wallAlphabet);
  assert.deepEqual(first.gateOrder, same.gateOrder);
  assert.equal(first.cellTokens.length, 8);
  assert.equal(first.gateOrder.length, 8);
  assert.ok(first.facts.some((fact) => fact.includes(first.key)));
  assert.ok(first.facts.some((fact) => fact.includes("KITE")));
  assert.notEqual(first.seed, compileWorldLaw(first.source, "doors", "kite").seed);
  assert.notEqual(first.seed, compileWorldLaw(first.source, "four-verbs", "urchin").seed);
});

test("Eighth-position verse cell preserves eight distinct structural positions", () => {
  const law = compileWorldLaw("positions remain inspectable", "eighth-position", "slothcake");
  assert.deepEqual(law.cellTokens, Array.from("未始来时末已示空"));
});

test("Nine-Gate model contains eight enacted checks plus the origin return", () => {
  assert.deepEqual(GATE_DEFINITIONS.map((gate) => gate.name), [
    "PROVENANCE", "TRUTH", "COMPRESSION", "RETRIEVAL", "OPERATION", "MEASURE", "TRANSFER", "RESILIENCE",
  ]);
  assert.equal(new Set(GATE_DEFINITIONS.map((gate) => gate.method)).size >= 6, true);
});

test("Tool Gates require their physical effect and Transfer requires prior proof", () => {
  const law = compileWorldLaw("transfer must preserve cause", "four-verbs", "kite");
  const primary = { conch: "PROVENANCE", keris: "OPERATION", w8: "RETRIEVAL", spiral: "COMPRESSION" }[law.transferTool];

  assert.deepEqual(evaluateToolGate(law, [], primary, law.transferTool, false), { status: "none" });
  assert.equal(evaluateToolGate(law, [], primary, law.transferTool, true).status, "open");
  assert.equal(evaluateToolGate(law, [], "TRANSFER", law.transferTool, true).status, "blocked");
  assert.deepEqual(evaluateToolGate(law, [], "TRANSFER", law.transferTool === "conch" ? "keris" : "conch", true), { status: "none" });

  const proof = {
    gate: primary,
    token: "CAUSE",
    method: law.transferTool,
    step: 1,
    elapsedMs: 500,
    note: "primary operator proved",
  };
  assert.equal(evaluateToolGate(law, [proof], "TRANSFER", law.transferTool, false).status, "open");
});

test("Truth, Measure, and Resilience protocols expose deterministic thresholds", () => {
  assert.equal(truthProofProgress(1, false, 2_000, 1_000, 1_000), 1);
  assert.equal(truthProofProgress(1.5, false, 2_000, 1_000, 1_000), 0);
  assert.equal(truthProofProgress(1, true, 2_000, 1_000, 1_000), 0);

  const held = advanceMeasureProof(700, 2, 1.5, 2.5, 1_000, 300);
  assert.deepEqual(held, { held: true, milliseconds: 1_000, progress: 1 });
  const released = advanceMeasureProof(700, 3, 1.5, 2.5, 1_000, 400);
  assert.deepEqual(released, { held: false, milliseconds: 400, progress: 0.4 });

  assert.equal(resilienceContact(false, 0.4), "relocate");
  assert.equal(resilienceContact(true, 0.4), "open");
  assert.equal(resilienceContact(true, 0.8), "none");
});

test("Return Artifact retains provenance, proof order, measures, and a portable operator", () => {
  const law = compileWorldLaw("one signal crosses two contexts", "doors", "urchin");
  const proofs = law.gateOrder.map((gate, index) => ({
    gate,
    token: law.cellTokens[index],
    method: GATE_DEFINITIONS.find((definition) => definition.name === gate).method,
    step: index * 3,
    elapsedMs: index * 900,
    note: `proof-${index}`,
  }));
  const artifact = makeReturnArtifact(law, proofs, { conch: 2, keris: 6, w8: 1, spiral: 1 }, ["U", "R", "D"], 29, 12_345);
  assert.equal(artifact.schema, "sleeper.one-return");
  assert.equal(artifact.version, 2);
  assert.equal(artifact.dominantOperator, "keris");
  assert.equal(artifact.proofs.length, 8);
  assert.equal(artifact.cell.provenance, law.cell.provenance);
  assert.equal(artifact.cell.witness, law.cellTokens.join(" · "));
  assert.equal(artifact.pathSignature, "URD");
  assert.deepEqual(artifact.measures, { steps: 29, elapsedMs: 12_345 });
  assert.match(makeUtilityPrompt(artifact, "calm"), /No further task is required/);
  assert.match(makeUtilityPrompt(artifact, "home"), /one action small enough/);
  assert.match(makeUtilityPrompt(artifact, "oracle"), /What evidence would change/);
  assert.match(makeUtilityPrompt(artifact, "together"), new RegExp(artifact.worldKey));

  const imported = parseReturnArtifactWorld(JSON.stringify(artifact));
  assert.equal(imported.ok, true);
  if (imported.ok) {
    assert.deepEqual(imported.input, {
      source: law.source,
      cellId: law.cell.id,
      figureId: law.figure.id,
      worldKey: law.key,
    });
  }
  assert.equal(parseReturnArtifactWorld(JSON.stringify({ ...artifact, worldKey: "DRIFTED" })).ok, false);

  const linked = parseWorldQuery(makeWorldQuery(law));
  assert.equal(linked.ok, true);
  if (linked.ok) assert.equal(linked.input.worldKey, law.key);
  const driftedQuery = new URLSearchParams(makeWorldQuery(law));
  driftedQuery.set("world", "DRIFTED");
  assert.equal(parseWorldQuery(driftedQuery.toString()).ok, false);
});

test("360 generated cities reproduce and retain completable Gate geometry", () => {
  const transferTools = new Set();
  for (let sample = 0; sample < 20; sample += 1) {
    for (const cell of ["doors", "one-return", "four-verbs", "eighth-position", "wind", "question"]) {
      for (const figure of ["urchin", "slothcake", "kite"]) {
        const source = `layout witness ${sample} ${cell} ${figure}`;
        const layout = buildCityLayout(source, cell, figure);
        transferTools.add(layout.law.transferTool);
        assert.deepEqual(layout, buildCityLayout(source, cell, figure));
        assert.equal(new Set(layout.gates.map((gate) => `${gate.x},${gate.y}`)).size, 8);
        assert.equal(new Set(layout.gates.map((gate) => `${gate.alternate.x},${gate.alternate.y}`)).size, 8);
        const reachable = distancesFrom(layout.grid, 1, 1);
        for (const gate of layout.gates) {
          assert.ok(reachable[Math.floor(gate.y)][Math.floor(gate.x)] >= 0, `${gate.name} must be reachable`);
          assert.ok(reachable[Math.floor(gate.alternate.y)][Math.floor(gate.alternate.x)] >= 0, `${gate.name} alternate must be reachable`);
        }

        const operation = layout.gates.find((gate) => gate.name === "OPERATION");
        const hasKerisOpportunity = layout.grid.some((row, y) => row.some((cellValue, x) => {
          if (cellValue !== 0 || Math.hypot(x + 0.5 - operation.x, y + 0.5 - operation.y) > 2.25) return false;
          return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
            const target = layout.grid[y + dy]?.[x + dx];
            return target > 0 && target < 9;
          });
        }));
        assert.equal(hasKerisOpportunity, true, "OPERATION must have an interior wall that can be cut nearby");
      }
    }
  }
  assert.deepEqual([...transferTools].sort(), ["conch", "keris", "spiral", "w8"]);
});


test("Scale Walk accepts genuinely tied pixels without accepting an absent region", () => {
  const metrics = Array.from({ length: 9 }, () => ({ brightness: .5, edges: 0 }));
  const challenge = makeScaleChallenge("a blank painting", metrics);
  const trace = challenge.rounds.map((round, tick) => ({ tick, action: "enter", value: round.candidates[2] }));
  assert.equal(replayScale(challenge, trace).score, 5);
  trace[0].value = 99;
  assert.equal(replayScale(challenge, trace).score, 4);
});

test("Field Pack rejects image metrics that would crash its renderer", () => {
  const pack = createFieldPack("scale", "image", { imageMetrics: Array(9).fill(null) });
  assert.equal(parseFieldPack(JSON.stringify(pack)).ok, false);
  pack.payload = [];
  assert.equal(parseFieldPack(JSON.stringify(pack)).ok, false);
});


test("RSVP measured rhythm survives a Field Pack round trip without audio", () => {
  const guide = { durationMs: 4000, bpm: 120, confidence: .8, pulses: Array.from({ length: 8 }, (_, i) => ({ atMs: i * 500, energy: .5 })) };
  const source = "return a measured rhythm; preserve the forward course";
  const original = makeRsvpPlan(source, 240, guide);
  const parsed = parseFieldPack(JSON.stringify(createFieldPack("rsvp", source, { rhythmGuide: guide })));
  assert.equal(parsed.ok, true);
  assert.deepEqual(makeRsvpPlan(source, 240, readRhythmGuide(parsed.pack.payload.rhythmGuide)), original);
  assert.equal(readRhythmGuide({ ...guide, pulses: [null] }), undefined);
});
