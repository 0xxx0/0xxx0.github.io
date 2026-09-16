'use strict';

(() => {
  const VERSION = '1.0.0-living-field-exp';
  const ECO_N = 54;
  const ECO_COLORS = ['#77d7ff', '#ffd56b', '#ff8da1'];

  let returning = false;
  let returnStart = 0;
  let returnMoves = [];
  let returnTimer = 0;
  let ecologyRaf = 0;
  let lastStepAt = 0;

  let ecoGrid = new Uint8Array(ECO_N * ECO_N);
  let ecoNext = new Uint8Array(ECO_N * ECO_N);
  let ecoImage = null;

  const ecoCanvas = document.createElement('canvas');
  const ecoCtx = ecoCanvas.getContext('2d');
  ecoCanvas.id = 'livingCanvas';
  ecoCanvas.width = ECO_N;
  ecoCanvas.height = ECO_N;

  const overlay = document.createElement('canvas');
  const overlayCtx = overlay.getContext('2d');
  overlay.id = 'livingOverlay';
  overlay.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(overlay, document.querySelector('.hud'));

  let living = {
    family: 'CYCLIC-3',
    seed: ((Date.now() >>> 0) ^ 0x9e3779b9) >>> 0,
    rng: 1,
    generation: 0,
    frontier: 0,
    pop: [1 / 3, 1 / 3, 1 / 3],
    dominant: 0,
    flash: [0, 0, 0],
    mobilityBias: 0,
    pressureBias: 0,
  };

  function injectUi() {
    const style = document.createElement('style');
    style.textContent = `
      #livingOverlay {
        position: fixed;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
      }
      .hud { z-index: 2; }
      .lifehud {
        position: absolute;
        left: 50%;
        bottom: max(50px, calc(env(safe-area-inset-bottom) + 42px));
        transform: translateX(-50%);
        font-size: 8px;
        letter-spacing: .11em;
        color: #6f899b;
        white-space: nowrap;
      }
      .specimen {
        margin-top: 9px;
        padding: 8px 9px;
        border: 1px solid #233c4b;
        background: #07131b;
        color: #9bb8c8;
        font: 700 9px/1.4 ui-monospace;
        letter-spacing: .08em;
      }
      body.returning .scoreline .op {
        color: #eaf7ff;
        border-color: #6f899b;
        transform: none;
      }
      body.returning .scoreline {
        filter: drop-shadow(0 0 10px rgba(180,220,240,.18));
      }
      .toast {
        top: 76%;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: .12em;
      }
    `;
    document.head.appendChild(style);

    const brand = document.querySelector('.brand');
    if (brand) brand.innerHTML = '<b>FOLD//BLOOM</b> · LIVING FIELD';

    const foot = document.querySelector('.foot');
    if (foot) {
      foot.textContent = 'LEFT · MATTER / MOBILITY × RIGHT · HARMONY / PRESSURE';
      const lifeHud = document.createElement('div');
      lifeHud.id = 'lifeHud';
      lifeHud.className = 'lifehud';
      lifeHud.textContent = 'CYCLIC-3 · MOBILITY · PRESSURE';
      foot.parentNode.insertBefore(lifeHud, foot);
    }

    const introEy = document.querySelector('#intro .ey');
    const introCopy = document.querySelector('#intro .copy');
    if (introEy) introEy.textContent = 'TWO DIAL · LIVING AUDIOVISUAL FIELD';
    if (introCopy) {
      introCopy.textContent =
        'Three populations chase one another in a cyclic ecology. LEFT changes mobility; RIGHT changes competition. Their relative distance still makes BLOOM / FOLD / SPLIT / RETURN. The same events become image, rhythm and harmony.';
    }

    const helpCopy = document.querySelector('#help .copy');
    if (helpCopy) {
      helpCopy.innerHTML =
        '<b>BLOOM</b> seeds possibility · <b>FOLD</b> reflects structure · <b>SPLIT</b> phase-displaces the ecology · <b>RETURN</b> resolves and listens.<br><br>' +
        'LEFT continuously changes ecological mobility. RIGHT changes competition pressure. Their relative distance makes the operator: SAME → BLOOM · NEAR → FOLD · FAR → RETURN · OPPOSITE → SPLIT. ' +
        'The colored fronts and the three musical voices are two readings of the same CYCLIC-3 state. Complete the four-operator score and RETURN briefly quiets the bed, replays your exact four placements, then reveals the next phrase.';
    }

    const worldLabel = [...document.querySelectorAll('.section .k')].find(
      element => element.textContent.trim() === 'SOUND WORLD'
    );
    if (worldLabel) worldLabel.textContent = 'ACOUSTIC LENS';

    const surfaceSection = [...document.querySelectorAll('.section')].find(section =>
      section.querySelector('.k')?.textContent.trim().includes('SURFACE')
    );
    if (surfaceSection) {
      const livingSection = document.createElement('div');
      livingSection.className = 'section';
      livingSection.innerHTML = `
        <div class='k'>LIVING SUBSTRATE</div>
        <div class='tiny' style='font-size:10px;line-height:1.65'>
          <b style='color:#77d7ff'>CYCLIC-3</b> · three populations continuously invade one another.
          LEFT = mobility / mixing. RIGHT = competition pressure.
          Population balance, frontier activity and dominance drive three musical voices.
        </div>
        <div class='specimen' id='specimenReadout'>A 33 · B 33 · C 34 · FRONTIER 0</div>
      `;
      surfaceSection.parentNode.insertBefore(livingSection, surfaceSection);
    }

    const buildInfo = document.querySelector('#buildInfo');
    if (buildInfo) {
      buildInfo.textContent =
        `BUILD ${VERSION} · experimental branch · CYCLIC-3 · audiovisual causality · RETURN listening aperture`;
    }
  }

  function resizeOverlay() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    overlay.width = Math.floor(window.innerWidth * dpr);
    overlay.height = Math.floor(window.innerHeight * dpr);
    overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function lifeRand() {
    let x = living.rng >>> 0 || 1;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    living.rng = x >>> 0;
    return living.rng / 4294967296;
  }

  function lifeParams() {
    return {
      mobility: clamp(0.025 + (rawL / 6) * 0.22 + living.mobilityBias, 0.01, 0.32),
      pressure: clamp(0.28 + (rawR / 6) * 0.68 + living.pressureBias, 0.12, 0.98),
    };
  }

  function seedLiving(seed = living.seed) {
    living.seed = seed >>> 0 || 1;
    living.rng = (living.seed ^ 0xa511e9b3) >>> 0;
    living.generation = 0;
    living.frontier = 0;
    living.flash = [0, 0, 0];

    for (let y = 0; y < ECO_N; y += 1) {
      for (let x = 0; x < ECO_N; x += 1) {
        const angle = Math.atan2(y - ECO_N / 2, x - ECO_N / 2);
        const radius = Math.hypot(x - ECO_N / 2, y - ECO_N / 2);
        const wave = Math.sin(angle * 3 + radius * 0.42) + Math.sin(radius * 0.18 + angle * 2);
        const noise = Math.floor(lifeRand() * 3);
        ecoGrid[y * ECO_N + x] = wrap(Math.floor((wave + 2.4) * 1.15) + noise, 3);
      }
    }

    updateLivingStats();
  }

  function updateLivingStats() {
    const counts = [0, 0, 0];
    let frontier = 0;

    for (let y = 0; y < ECO_N; y += 1) {
      for (let x = 0; x < ECO_N; x += 1) {
        const index = y * ECO_N + x;
        const species = ecoGrid[index];
        counts[species] += 1;

        if (
          ecoGrid[y * ECO_N + wrap(x + 1, ECO_N)] !== species ||
          ecoGrid[wrap(y + 1, ECO_N) * ECO_N + x] !== species
        ) {
          frontier += 1;
        }
      }
    }

    const total = ecoGrid.length;
    living.pop = counts.map(value => value / total);
    living.frontier = frontier / total;
    living.dominant = counts.indexOf(Math.max(...counts));

    const readout = document.querySelector('#specimenReadout');
    if (readout) {
      readout.textContent =
        `A ${Math.round(living.pop[0] * 100)} · ` +
        `B ${Math.round(living.pop[1] * 100)} · ` +
        `C ${Math.round(living.pop[2] * 100)} · ` +
        `FRONTIER ${Math.round(living.frontier * 100)}`;
    }
  }

  function lifeNeighbor(x, y, dx, dy) {
    return ecoGrid[wrap(y + dy, ECO_N) * ECO_N + wrap(x + dx, ECO_N)];
  }

  function livingStep() {
    const { mobility, pressure } = lifeParams();
    const directions = [
      [-1, -1],
      [0, -1],
      [1, -1],
      [-1, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ];
    let changed = 0;

    for (let y = 0; y < ECO_N; y += 1) {
      for (let x = 0; x < ECO_N; x += 1) {
        const index = y * ECO_N + x;
        const species = ecoGrid[index];
        const predator = wrap(species + 2, 3);
        let predatorCount = 0;

        for (const [dx, dy] of directions) {
          if (lifeNeighbor(x, y, dx, dy) === predator) predatorCount += 1;
        }

        let nextSpecies = species;

        if (predatorCount && lifeRand() < pressure * (0.18 + predatorCount * 0.115)) {
          nextSpecies = predator;
        }

        if (lifeRand() < mobility) {
          const [dx, dy] = directions[Math.floor(lifeRand() * directions.length)];
          if (lifeRand() < 0.58) nextSpecies = lifeNeighbor(x, y, dx, dy);
        }

        ecoNext[index] = nextSpecies;
        if (nextSpecies !== species) changed += 1;
      }
    }

    [ecoGrid, ecoNext] = [ecoNext, ecoGrid];
    living.generation += 1;
    living.frontier = living.frontier * 0.82 + (changed / ecoGrid.length) * 0.18;

    if (living.generation % 4 === 0) updateLivingStats();
  }

  function livingVerb(verb, power = 1) {
    if (verb === 'BLOOM') {
      for (let seed = 0; seed < 3 * power; seed += 1) {
        const cx = Math.floor(lifeRand() * ECO_N);
        const cy = Math.floor(lifeRand() * ECO_N);
        const species = seed % 3;

        for (let dy = -2; dy <= 2; dy += 1) {
          for (let dx = -2; dx <= 2; dx += 1) {
            if (dx * dx + dy * dy < 7) {
              ecoGrid[wrap(cy + dy, ECO_N) * ECO_N + wrap(cx + dx, ECO_N)] = species;
            }
          }
        }
      }
    } else if (verb === 'FOLD') {
      const horizontal = R % 2 === 1;

      for (let y = 0; y < ECO_N; y += 1) {
        for (let x = 0; x < Math.floor(ECO_N / 2); x += 1) {
          if (lifeRand() < 0.34 + 0.12 * power) {
            const source = y * ECO_N + x;
            const target = horizontal
              ? (ECO_N - 1 - y) * ECO_N + x
              : y * ECO_N + (ECO_N - 1 - x);
            ecoGrid[target] = ecoGrid[source];
          }
        }
      }
    } else if (verb === 'SPLIT') {
      const shift = 1 + power;

      for (let y = 0; y < ECO_N; y += 1) {
        if (y % 2 === 0) continue;
        const row = ecoGrid.slice(y * ECO_N, (y + 1) * ECO_N);

        for (let x = 0; x < ECO_N; x += 1) {
          ecoGrid[y * ECO_N + x] = wrap(
            row[wrap(x - shift, ECO_N)] + (x % 7 === 0 ? 1 : 0),
            3
          );
        }
      }
    } else if (verb === 'RETURN') {
      splitCharge = 0;

      for (let y = 0; y < ECO_N; y += 1) {
        for (let x = 0; x < ECO_N; x += 1) {
          if (lifeRand() >= 0.26 + 0.07 * power) continue;

          const counts = [0, 0, 0];
          const species = ecoGrid[y * ECO_N + x];
          counts[species] += 2;
          counts[lifeNeighbor(x, y, 1, 0)] += 1;
          counts[lifeNeighbor(x, y, -1, 0)] += 1;
          counts[lifeNeighbor(x, y, 0, 1)] += 1;
          counts[lifeNeighbor(x, y, 0, -1)] += 1;
          ecoGrid[y * ECO_N + x] = counts.indexOf(Math.max(...counts));
        }
      }
    }

    updateLivingStats();
  }

  function livingMusicStep(step, when) {
    const acousticWorld = world();
    const activity = clamp(living.frontier * 4, 0, 1);

    for (let species = 0; species < 3; species += 1) {
      const population = living.pop[species];
      const period = species === living.dominant ? 4 : 8;
      const phase = [0, 2, 5][species];

      if ((step + phase) % period !== 0 || population <= 0.08) continue;

      living.flash[species] = 1;
      const degree = wrap(
        species * 2 + Math.round(R / 2) + Math.round(population * 2),
        6
      );
      const note =
        acousticWorld.root +
        acousticWorld.scale[degree] +
        (species === 2 ? 12 : 0);

      tone(
        note,
        when,
        0.12 + 0.16 * population,
        0.006 + 0.012 * population + 0.007 * activity,
        [acousticWorld.bass, acousticWorld.body, acousticWorld.lead][species],
        acousticWorld.cut * (0.72 + 0.35 * activity)
      );
    }
  }

  function drawEcology() {
    if (!ecoImage) ecoImage = ecoCtx.createImageData(ECO_N, ECO_N);
    const pixels = ecoImage.data;

    for (let index = 0; index < ecoGrid.length; index += 1) {
      const species = ecoGrid[index];
      const rgb =
        species === 0
          ? [119, 215, 255]
          : species === 1
            ? [255, 213, 107]
            : [255, 141, 161];
      const flash = 1 + living.flash[species] * 0.35;

      pixels[index * 4] = Math.min(255, rgb[0] * flash);
      pixels[index * 4 + 1] = Math.min(255, rgb[1] * flash);
      pixels[index * 4 + 2] = Math.min(255, rgb[2] * flash);
      pixels[index * 4 + 3] = 255;
    }

    ecoCtx.putImageData(ecoImage, 0, 0);
  }

  function returnGhost() {
    if (!returning || !returnMoves.length) return null;

    const beatMs = 60000 / currentBpm();
    const elapsed = (performance.now() - returnStart) / beatMs;
    const index = Math.min(
      returnMoves.length - 1,
      Math.max(0, Math.floor(elapsed * 2))
    );

    return returnMoves[index];
  }

  function drawLivingOverlay() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    overlayCtx.clearRect(0, 0, width, height);

    for (let species = 0; species < 3; species += 1) {
      living.flash[species] *= 0.91;
    }

    drawEcology();

    const size = Math.min(width * 0.94, height * 0.68);
    const x = (width - size) / 2;
    const y = height * 0.2;

    overlayCtx.save();
    overlayCtx.globalCompositeOperation = 'screen';
    overlayCtx.globalAlpha =
      prefs.surface === 'QUIET' ? 0.12 : prefs.surface === 'TRACE' ? 0.32 : 0.22;
    overlayCtx.imageSmoothingEnabled = true;
    overlayCtx.drawImage(ecoCanvas, x, y, size, size);
    overlayCtx.restore();

    const dialCenters = centers();
    overlayCtx.save();
    overlayCtx.globalCompositeOperation = 'destination-out';

    for (const dialCenter of dialCenters) {
      overlayCtx.beginPath();
      overlayCtx.arc(
        dialCenter.x,
        dialCenter.y,
        dialCenter.r * 0.98,
        0,
        Math.PI * 2
      );
      overlayCtx.fill();
    }

    overlayCtx.restore();

    const cx = width / 2;
    const cy = height * 0.55;
    const ringRadius = Math.min(width, height) * 0.28;
    let start = -Math.PI / 2;

    overlayCtx.save();

    for (let species = 0; species < 3; species += 1) {
      const angle = Math.PI * 2 * living.pop[species];
      overlayCtx.strokeStyle = ECO_COLORS[species];
      overlayCtx.globalAlpha = 0.72;
      overlayCtx.lineWidth = 2 + living.flash[species] * 3;
      overlayCtx.beginPath();
      overlayCtx.arc(cx, cy, ringRadius, start, start + angle);
      overlayCtx.stroke();
      start += angle;
    }

    const ghost = returnGhost();
    if (ghost) {
      overlayCtx.strokeStyle = colors(ghost.v);
      overlayCtx.globalAlpha = 0.9;
      overlayCtx.lineWidth = 2;

      for (const [dialCenter, sector] of [
        [dialCenters[0], ghost.l],
        [dialCenters[1], ghost.r],
      ]) {
        const angle = -Math.PI / 2 + (sector * Math.PI * 2) / 6;
        const gx = dialCenter.x + Math.cos(angle) * dialCenter.r * 0.7;
        const gy = dialCenter.y + Math.sin(angle) * dialCenter.r * 0.7;
        overlayCtx.beginPath();
        overlayCtx.arc(gx, gy, 10 + 4 * Math.sin(t * 5), 0, Math.PI * 2);
        overlayCtx.stroke();
      }
    }

    overlayCtx.restore();
  }

  function ecologyFrame(now) {
    if (run && now - lastStepAt > 72) {
      livingStep();
      if (lifeParams().mobility > 0.18) livingStep();
      lastStepAt = now;
    }

    drawLivingOverlay();
    ecologyRaf = requestAnimationFrame(ecologyFrame);
  }

  function packLivingGrid() {
    let packed = '';

    for (let index = 0; index < ecoGrid.length; index += 4) {
      let byte = 0;

      for (let offset = 0; offset < 4; offset += 1) {
        byte |= ((ecoGrid[index + offset] || 0) & 3) << (offset * 2);
      }

      packed += String.fromCharCode(byte);
    }

    return btoa(packed);
  }

  function unpackLivingGrid(code) {
    try {
      const packed = atob(code);
      const restored = new Uint8Array(ECO_N * ECO_N);

      for (let index = 0; index < packed.length; index += 1) {
        const byte = packed.charCodeAt(index);

        for (let offset = 0; offset < 4; offset += 1) {
          const target = index * 4 + offset;
          if (target < restored.length) {
            restored[target] = (byte >> (offset * 2)) & 3;
          }
        }
      }

      ecoGrid = restored;
      ecoNext = new Uint8Array(ECO_N * ECO_N);
      updateLivingStats();
      return true;
    } catch (error) {
      return false;
    }
  }

  function livingSnapshot() {
    return {
      family: living.family,
      seed: living.seed,
      generation: living.generation,
      mobilityBias: living.mobilityBias,
      pressureBias: living.pressureBias,
      grid: packLivingGrid(),
    };
  }

  function restoreLiving(snapshot) {
    if (!snapshot) {
      seedLiving((rngState ^ 0x9e3779b9) >>> 0);
      return;
    }

    living = {
      ...living,
      ...snapshot,
      rng: ((snapshot.seed || 1) ^ 0xa511e9b3) >>> 0,
      flash: [0, 0, 0],
      pop: [1 / 3, 1 / 3, 1 / 3],
      frontier: 0,
      dominant: 0,
    };

    if (!snapshot.grid || !unpackLivingGrid(snapshot.grid)) {
      seedLiving(snapshot.seed || living.seed);
    }
  }

  function returnPitch(move) {
    const acousticWorld = world();
    const degree = wrap(move.l * 2 + move.r, 6);
    const octave =
      (move.l + move.r >= 6 ? 12 : 0) + (move.v === 'RETURN' ? 0 : 12);

    return acousticWorld.root + acousticWorld.scale[degree] + octave;
  }

  function beginReturnCeremony(moves) {
    clearTimeout(returnTimer);
    splitCharge = 0;
    returning = true;
    returnMoves = moves.map(move => ({ ...move }));
    returnStart = performance.now();
    document.body.classList.add('returning');
    renderScore();
    hud();

    const beat = 60 / currentBpm();
    const startTime = audio?.currentTime || 0;

    if (master && audio) {
      master.gain.setTargetAtTime(
        prefs.volume * OUT_GAIN * 0.3,
        audio.currentTime,
        0.06
      );
    }

    if (audio && soundOn) {
      returnMoves.forEach((move, index) => {
        const when = startTime + 0.1 + index * (beat / 2);
        const pan = (move.r - 2.5) / 3.1;
        pluck(returnPitch(move), when, 0.62 + 0.08 * move.power, pan);

        if (index === returnMoves.length - 1) {
          tone(
            world().root + 12,
            when + 0.04,
            beat * 0.72,
            0.026,
            world().body,
            world().cut
          );
        }
      });
    }

    returnTimer = setTimeout(
      () => {
        returning = false;
        returnMoves = [];
        document.body.classList.remove('returning');

        if (master && audio) {
          master.gain.setTargetAtTime(
            prefs.volume * OUT_GAIN,
            audio.currentTime,
            0.18
          );
        }

        beginPhrase();
        hud();
        saveLocal();
      },
      Math.max(900, beat * 2000)
    );
  }

  const baseRenderScore = renderScore;
  renderScore = function renderLivingScore() {
    const scoreElement = document.querySelector('#scoreLine');
    if (!scoreElement || !returning) {
      baseRenderScore();
      return;
    }

    scoreElement.innerHTML =
      phrasePlan
        .map(
          verb =>
            `<span class='op done' title='${verb}'>${VG[verb]}</span>`
        )
        .join('') +
      `<span class='phraseNo'>PHRASE ${String(phraseCount).padStart(2, '0')} · RETURN</span>`;
  };

  completePhrase = function completeLivingPhrase() {
    phraseCount += 1;
    const moves = currentPhraseMoves.map(move => ({ ...move }));

    phraseHistory.push({
      n: phraseCount,
      sig: moves.map(move => move.v[0]).join(''),
      moves,
    });
    phraseHistory = phraseHistory.slice(-12);

    const signature = moves.map(move => VG[move.v]).join('');
    lastPhraseSig = signature;
    emit('phrase_return', {
      n: phraseCount,
      sig: signature,
      moves: moves.map(move => ({
        l: move.l,
        r: move.r,
        v: move.v,
        power: move.power,
      })),
    });

    phrasePos = phrasePlan.length;
    document.querySelector('#lawStrip').textContent =
      `PHRASE RETURN ${String(phraseCount).padStart(2, '0')} // ${signature}`;
    beginReturnCeremony(moves);
  };

  const baseCommit = commit;
  commit = function commitLivingField() {
    if (returning) return;

    const verb = rel();
    const power = consequence().power;
    baseCommit();
    livingVerb(verb, power);

    if (verb === 'RETURN') {
      splitCharge = 0;
      hud();
    }
  };

  const baseMusicStep = musicStep;
  musicStep = function musicLivingStep(step, when) {
    baseMusicStep(step, when);
    livingMusicStep(step, when);
  };

  const baseHud = hud;
  hud = function hudLivingField() {
    baseHud();

    const { mobility, pressure } = lifeParams();
    const lifeHud = document.querySelector('#lifeHud');

    if (lifeHud) {
      lifeHud.textContent =
        `CYCLIC-3 · MOB ${mobility.toFixed(2)} · ` +
        `PRESS ${pressure.toFixed(2)} · ` +
        `FRONT ${Math.round(living.frontier * 100)}`;
    }

    const future = document.querySelector('#future');
    if (future && returning) {
      future.textContent = `RETURN LISTEN · ${form.state} · ${prefs.world}`;
    }
  };

  const baseMinimalSnapshot = minimalSnapshot;
  minimalSnapshot = function livingMinimalSnapshot() {
    const snapshot = baseMinimalSnapshot();
    snapshot.app = VERSION;
    snapshot.schema = 3;
    snapshot.living = livingSnapshot();
    return snapshot;
  };

  const baseRestore = restore;
  restore = function restoreLivingField(snapshot) {
    const restored = baseRestore(snapshot);
    if (restored) restoreLiving(snapshot?.living);
    return restored;
  };

  const baseNewField = newField;
  newField = function newLivingField() {
    baseNewField();
    living.seed = (rngState ^ 0x9e3779b9) >>> 0;
    seedLiving(living.seed);
    saveLocal();
  };

  const baseDemoStep = demoStep;
  demoStep = function demoLivingStep() {
    if (returning) {
      demo.timer = setTimeout(demoStep, 250);
      return;
    }

    baseDemoStep();
  };

  const existingState = (() => {
    try {
      return JSON.parse(localStorage.getItem(STORE) || 'null');
    } catch (error) {
      return null;
    }
  })();

  seedLiving(living.seed);

  if (location.hash.startsWith('#s=')) {
    try {
      const sharedState = b64dec(location.hash.slice(3));
      restoreLiving(sharedState.living);
    } catch (error) {
      restoreLiving(existingState?.living);
    }
  } else {
    restoreLiving(existingState?.living);
  }

  injectUi();
  resizeOverlay();
  window.addEventListener('resize', resizeOverlay);
  cancelAnimationFrame(ecologyRaf);
  ecologyRaf = requestAnimationFrame(ecologyFrame);
  hud();

  window.FoldBloomLiving = {
    version: VERSION,
    state: () => ({
      params: lifeParams(),
      pop: [...living.pop],
      frontier: living.frontier,
      generation: living.generation,
      returning,
    }),
    step: (count = 1) => {
      for (let index = 0; index < count; index += 1) livingStep();
      updateLivingStats();
      return window.FoldBloomLiving.state();
    },
  };
})();
