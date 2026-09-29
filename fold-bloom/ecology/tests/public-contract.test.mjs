import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ecology = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const publicFront = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

const inlineScripts=[...ecology.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(m=>m[1].trim()).filter(Boolean);

test('Ecology edited inline runtime remains syntactically valid', () => {
  assert.ok(inlineScripts.length > 0);
  for (const script of inlineScripts) assert.doesNotThrow(() => new Function(script));
});

test('Ecology is truthfully mute-first and sound is explicit/persistent', () => {
  assert.match(ecology, /soundOn=load\("fb-sound-on"\)===true/);
  assert.match(ecology, /async function setSoundEnabled\(on,/);
  assert.match(ecology, /localStorage\.setItem\("fb-sound-on",JSON\.stringify\(soundOn\)\)/);
  assert.match(ecology, /The field starts mute\./);
  assert.match(ecology, /if\(soundOn\)initAudio\(\{soundcheck:false\}\)/);
  assert.match(ecology, /setSoundEnabled\(true,\{soundcheck:true\}\)/);
  assert.match(ecology, /aria-pressed="false"/);
  assert.match(ecology, /state:\(\)=>\(\{[^}]*soundOn/);
  assert.match(ecology, /temperament,soundOn/);
});

test('Ecology GARDEN is a primary public doorway hosted by LIVE while HEXAGRAM remains deeper', () => {
  assert.match(publicFront, /<a class="cta" href="\.\/live\/\?garden=1">WATCH A GARDEN →<\/a>/);
  const primaryStart = publicFront.indexOf('<div class="useGrid primaryUse">');
  const primaryEnd = publicFront.indexOf('</div>', primaryStart);
  assert.ok(primaryStart >= 0 && primaryEnd > primaryStart);
  const primary = publicFront.slice(primaryStart, primaryEnd);
  assert.match(primary, /href="\.\/live\/\?garden=1"/);
  assert.match(primary, /<span class="verb">GARDEN<\/span>/);
  assert.match(primary, /WATCH GARDEN/);
  assert.doesNotMatch(primary, /play=PUZZLE/);
  assert.match(publicFront, /href="\.\/ecology\/">ECOLOGY<\/a>/);

  const moreUses = publicFront.indexOf('MORE USES');
  const puzzle = publicFront.indexOf('play=PUZZLE', moreUses);
  assert.ok(moreUses >= 0 && puzzle > moreUses);
});
