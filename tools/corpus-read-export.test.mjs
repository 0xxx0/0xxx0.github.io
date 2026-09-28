#!/usr/bin/env node
'use strict';
/**
 * CORPUS READ EXPORT — unit proofs (synthetic rows only; no corpus.db, no network).
 *
 * The point of this file: prove the EXPORTER'S OUTPUT is lawful input for the
 * EXISTING read-course machinery. It feeds a synthetic export through
 * fold-bloom/read-course.js exactly the way FOLD//BLOOM LIVE does, so a drift
 * in either side fails here before it can reach the browser route.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildReadDocument, cleanText, labelFor, readableTime, normalizeRole, DEFAULT_DB} from './corpus-read-export.mjs';
import {makeReadRidePacket, makeReadCourse, validateReadCourse, stepReadCourse, readCourseWitness} from '../fold-bloom/read-course.js';

const CONVOS = [{
  cid: 'synthetic-alpha',
  title: 'SYNTHETIC ALPHA',
  gen: 'synthetic-gen',
  span: '2026-01-01 → 2026-01-01',
  messages: [
    {author: 'user', mtime: '2026-01-01T10:00:00Z', text: 'Alpha opening sentence. Alpha second sentence.\n\nAlpha third paragraph follows.'},
    {author: 'assistant', mtime: '2026-01-01T10:01:00Z', text: 'Reply one. Reply two.'}
  ]
}];
const docOf = (convos = CONVOS, opts = {}) => buildReadDocument(convos, {label: 'CORPUS READ · test', stamp: '2026-01-01T00:00:00Z', maxChars: 0, roles: ['user', 'assistant'], ...opts});

test('document shape: heading ladder, speaker labels, no CR bytes', () => {
  const doc = docOf();
  assert.ok(doc.startsWith('# CORPUS READ · test\n'));
  assert.ok(doc.includes('\n## SYNTHETIC ALPHA\n'));
  assert.ok(doc.includes('`cid synthetic-alpha` · gen synthetic-gen · 2 messages'));
  assert.ok(doc.includes('### #1 · YOU · 2026-01-01 10:00'));
  assert.ok(doc.includes('### #2 · GPT · 2026-01-01 10:01'));
  assert.ok(doc.endsWith('\n'));
  assert.ok(!doc.includes('\r'));
});

test('read-course maps the export to all three grains, addresses are read://', () => {
  const doc = docOf();
  const packet = makeReadRidePacket({
    source: doc,
    label: 'export.md',
    sourceIdentity: {kind: 'LOCAL_FILE', authority: 'LOCAL_FILE'},
    returnAddress: '/fold-bloom/live/', from: '/fold-bloom/live/'
  });
  const headings = doc.split('\n').filter(line => /^#{1,6}\s/.test(line)).length;
  for (const grain of ['SENTENCE', 'PARAGRAPH', 'SECTION']) {
    const course = makeReadCourse(packet, {grain});
    assert.equal(validateReadCourse(course), true, grain + ' course validates');
    assert.ok(course.points.length > 0);
    assert.ok(course.points.every(p => String(p.address).startsWith('read://')), grain + ' addresses');
  }
  const section = makeReadCourse(packet, {grain: 'SECTION'});
  assert.equal(section.points.length, headings, 'SECTION count equals the file heading count');
  const labels = section.points.map(p => String(p.label || ''));
  assert.ok(labels[0].includes('CORPUS READ'), 'first section is the export header');
  assert.ok(labels.some(l => /#1 · YOU/.test(l)), 'a section is labelled by its speaker turn');
  assert.ok(labels.some(l => /#2 · GPT/.test(l)));
  const sentences = makeReadCourse(packet, {grain: 'SENTENCE'});
  const paragraphs = makeReadCourse(packet, {grain: 'PARAGRAPH'});
  assert.ok(sentences.points.length >= paragraphs.points.length, 'sentence grain is at least as fine as paragraph grain');
});

test('STEP through the export moves one addressed section at a time', () => {
  const doc = docOf();
  const packet = makeReadRidePacket({source: doc, label: 'export.md', sourceIdentity: {hash: 'sha256:' + 'a'.repeat(64)}, returnAddress: '/fold-bloom/live/', from: '/fold-bloom/live/'});
  const course = makeReadCourse(packet, {grain: 'SECTION'});
  const first = readCourseWitness(course, 0);
  const next = stepReadCourse(course, 0, 1);
  assert.notEqual(next.address, first.address);
  assert.ok(String(next.address).startsWith('read://'));
  assert.ok(String(next.point.label || '').includes('SYNTHETIC ALPHA'), 'stepping reaches the conversation section');
});

test('cleanText: newline normalisation, control strip, visible truncation marker', () => {
  assert.equal(cleanText('a\r\nb\rc'), 'a\nb\nc');
  assert.equal(cleanText('keep\u0001this'), 'keepthis');
  const long = 'x'.repeat(50);
  assert.ok(!cleanText(long, 0).includes('truncated'), 'no marker when maxChars=0');
  const cut = cleanText(long, 20);
  assert.ok(cut.includes('[… truncated at 20 of 50 chars …]'));
  assert.ok(cleanText('a\n\n\n\n\n\nb').split('\n').length <= 4, 'runs of blank lines collapse');
});

test('labels and roles are explicit; junk is refused', () => {
  assert.equal(labelFor('user'), 'YOU');
  assert.equal(labelFor('assistant'), 'GPT');
  assert.equal(labelFor('tool'), 'TOOL');
  assert.equal(labelFor('other'), 'OTHER');
  assert.equal(readableTime('2026-01-01T10:00:00Z'), '2026-01-01 10:00');
  assert.equal(readableTime('57411-08-1T00:00'), '(undated)');
  assert.equal(readableTime(''), '(undated)');
  assert.equal(normalizeRole('gpt'), 'assistant');
  assert.equal(normalizeRole('human'), 'user');
  assert.throws(() => normalizeRole('wizard'), /unknown role/);
});

test('empty export is refused, not written', () => {
  assert.throws(() => buildReadDocument([], {}), /EMPTY_EXPORT/);
  assert.throws(() => buildReadDocument([{cid: 'x', title: 'x', messages: []}], {}), /EMPTY_EXPORT/);
});

test('default db path is the sovereign-node corpus and overridable', () => {
  assert.ok(DEFAULT_DB.endsWith('corpus.db'));
  assert.ok(DEFAULT_DB.includes('sovereign-node'));
});