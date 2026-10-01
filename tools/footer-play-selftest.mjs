#!/usr/bin/env node
// footer-play-selftest — bounded verification for FIELD INDEX 0.8.29.
// The sole PLAY action must live in a footer MORE submenu; the header must carry identity only.
// Static-DOM assertions on the real files. Exit 0 = pass, 1 = fail.
'use strict';
import fs from 'node:fs';

const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
let fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { console.log('  PASS', name); }
  else { console.log('  FAIL', name, detail ? '· ' + detail : ''); fail++; }
};

const index = read('index.html');
const play = read('field-play.html');

// --- inert case: the header no longer carries the game -----------------------
const header = index.slice(index.indexOf('<header>'), index.indexOf('</header>'));
ok('header has no .headerPlay affordance', !header.includes('headerPlay'));
ok('header has no PLAY link', !/field-play\.html/.test(header));
ok('header keeps the FIELD INDEX identity', header.includes('FIELD INDEX'));

// --- activated case: the game is one reveal away in the footer ---------------
const foot = index.slice(index.indexOf('<div class="foot">'), index.indexOf('</div>', index.indexOf('<div class="foot">')) + 6);
ok('footer .foot row present', foot.startsWith('<div class="foot">'));
ok('footer carries a footMenu details submenu', /<details class="footMenu"[^>]*>/.test(foot));
ok('footMenu summary reads MORE', /<summary>MORE<\/summary>/.test(foot));
const menuLinks = foot.match(/<a href="\.\/field-play\.html">PLAY THE FIELD →<\/a>/g) || [];
ok('footMenu exposes exactly one PLAY THE FIELD link', menuLinks.length === 1, 'found ' + menuLinks.length);
ok('footer FOVEA affordance preserved', foot.includes('id="foveaToggle"'));

// --- CSS wiring: header rule removed, footer rule present --------------------
ok('.headerPlay CSS rule deleted', !index.includes('.headerPlay{'));
ok('.footMenu CSS rule present', index.includes('.footMenu{position:relative}'));

// --- boundary: the game page is untouched and still returns to the field -----
ok('field-play.html still links back to FIELD INDEX', play.includes('FIELD INDEX →') || play.includes('FIELD INDEX'));
ok('field-play.html still declares MISSION != AUTHORITY', play.includes('MISSION ≠ AUTHORITY'));

// --- boundary scan: no stray header-region play entry ------------------------
const headerPlayRefs = (index.slice(0, index.indexOf('</header>')).match(/field-play\.html/g) || []).length;
ok('no field-play reference above </header>', headerPlayRefs === 0, 'found ' + headerPlayRefs);

console.log(fail === 0 ? '\nFOOTER-PLAY SELFTEST PASS' : `\nFOOTER-PLAY SELFTEST FAIL (${fail})`);
process.exit(fail === 0 ? 0 : 1);