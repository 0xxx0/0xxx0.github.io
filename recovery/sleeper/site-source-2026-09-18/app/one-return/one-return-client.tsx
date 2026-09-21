"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clamp } from "../lib/seed";
import { buildCityLayout, type CityGate, type CityPoint } from "./city-layout";
import { advanceMeasureProof, evaluateToolGate, resilienceContact, truthProofProgress } from "./protocol";
import {
  FIGURES,
  VERSE_CELLS,
  compileWorldLaw,
  gateDefinition,
  gateInstruction,
  makeWorldQuery,
  makeReturnArtifact,
  makeUtilityPrompt,
  parseReturnArtifactWorld,
  parseWorldQuery,
  type FigureId,
  type GateName,
  type GateProof,
  type OperatorCounts,
  type ReturnArtifact,
  type ToolName,
  type UtilityMode,
  type VerseCellId,
  type WorldLaw,
} from "./world-law";

type Phase = "intro" | "cut" | "playing" | "returning" | "complete";
type Projection = "city" | "disc";

type Gate = CityGate;
type Point = CityPoint;
type Anchor = Point & { direction: number };

type GameState = {
  law: WorldLaw;
  size: number;
  grid: number[][];
  player: Point & { direction: number };
  start: Point;
  gates: Gate[];
  gateCount: number;
  returnOpen: boolean;
  keys: Set<string>;
  path: Point[];
  signature: string[];
  lastPathPoint: Point;
  steps: number;
  startedAt: number;
  lastHudAt: number;
  anchor: Anchor | null;
  pulseUntil: number;
  paintingLeakUntil: number;
  flashUntil: number;
  kerisReadyAt: number;
  projection: Projection;
  source: string;
  sourceChars: readonly string[];
  proofs: GateProof[];
  operatorCounts: OperatorCounts;
  lastMovedAt: number;
  measureMs: number;
  retrievalArmed: boolean;
  retrievalDeparted: boolean;
  finished: boolean;
};

const DENSITY = " .·,:;i1tfLCG08@";
const REDUCED_DENSITY = "  ·:+#@";
const DEFAULT_SOURCE = "ALL MAPS ARE WRONG. SOME BECOME DOORS.";

function normalAngle(angle: number) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function makeGame(source: string, cellId: VerseCellId, figureId: FigureId): GameState {
  const layout = buildCityLayout(source, cellId, figureId);
  const now = performance.now();
  return {
    ...layout,
    player: { ...layout.start, direction: 0 },
    gateCount: 0,
    returnOpen: false,
    keys: new Set(),
    path: [{ ...layout.start }],
    signature: [],
    lastPathPoint: { ...layout.start },
    steps: 0,
    startedAt: now,
    lastHudAt: 0,
    anchor: null,
    pulseUntil: 0,
    paintingLeakUntil: 0,
    flashUntil: 0,
    kerisReadyAt: 0,
    projection: "city",
    source: layout.law.source,
    proofs: [],
    operatorCounts: { conch: 0, keris: 0, w8: 0, spiral: 0 },
    lastMovedAt: now,
    measureMs: 0,
    retrievalArmed: false,
    retrievalDeparted: false,
    finished: false,
  };
}

function isOpen(game: GameState, x: number, y: number) {
  const radius = 0.19;
  return [[x - radius, y - radius], [x + radius, y - radius], [x - radius, y + radius], [x + radius, y + radius]].every(([px, py]) => {
    return game.grid[Math.floor(py)]?.[Math.floor(px)] === 0;
  });
}

function castRay(game: GameState, angle: number, maxDistance = 40) {
  const rayX = Math.cos(angle);
  const rayY = Math.sin(angle);
  let mapX = Math.floor(game.player.x);
  let mapY = Math.floor(game.player.y);
  const deltaX = Math.abs(1 / (Math.abs(rayX) < 0.00001 ? 0.00001 : rayX));
  const deltaY = Math.abs(1 / (Math.abs(rayY) < 0.00001 ? 0.00001 : rayY));
  const stepX = rayX < 0 ? -1 : 1;
  const stepY = rayY < 0 ? -1 : 1;
  let sideX = rayX < 0 ? (game.player.x - mapX) * deltaX : (mapX + 1 - game.player.x) * deltaX;
  let sideY = rayY < 0 ? (game.player.y - mapY) * deltaY : (mapY + 1 - game.player.y) * deltaY;
  let side = 0;
  let cell = 9;
  for (let iteration = 0; iteration < 80; iteration += 1) {
    if (sideX < sideY) {
      sideX += deltaX;
      mapX += stepX;
      side = 0;
    } else {
      sideY += deltaY;
      mapY += stepY;
      side = 1;
    }
    if (mapX < 0 || mapY < 0 || mapX >= game.size || mapY >= game.size) break;
    cell = game.grid[mapY][mapX];
    if (cell > 0) break;
  }
  const distance = side === 0 ? sideX - deltaX : sideY - deltaY;
  const wallPoint = side === 0 ? game.player.y + distance * rayY : game.player.x + distance * rayX;
  return {
    distance: Math.min(Math.abs(distance), maxDistance),
    side, cell, mapX, mapY,
    texture: wallPoint - Math.floor(wallPoint),
  };
}

function lineOfSight(game: GameState, x: number, y: number) {
  const dx = x - game.player.x;
  const dy = y - game.player.y;
  const distance = Math.hypot(dx, dy);
  return castRay(game, Math.atan2(dy, dx), distance + 1).distance >= distance - 0.28;
}

function nearestUnopenedGate(game: GameState, maximum = Number.POSITIVE_INFINITY) {
  let nearest: { gate: Gate; distance: number } | null = null;
  for (const gate of game.gates) {
    if (gate.collected) continue;
    const distance = Math.hypot(game.player.x - gate.x, game.player.y - gate.y);
    if (distance <= maximum && (!nearest || distance < nearest.distance)) nearest = { gate, distance };
  }
  return nearest;
}

function renderCity(canvas: HTMLCanvasElement, game: GameState, now: number) {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  if (canvas.width !== Math.floor(width * ratio) || canvas.height !== Math.floor(height * ratio)) {
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
  }
  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  if (game.projection === "disc") {
    renderDisc(context, width, height, game, now);
    return;
  }

  const leaking = game.paintingLeakUntil > now;
  context.fillStyle = leaking ? "rgba(5, 7, 7, .76)" : "rgba(5, 7, 7, .945)";
  context.fillRect(0, 0, width, height);
  const columns = clamp(Math.floor(width / (width < 720 ? 6.7 : 8.2)), 72, 148);
  const rows = clamp(Math.floor(height / (width < 720 ? 11.8 : 13.1)), 38, 76);
  const cellWidth = width / columns;
  const cellHeight = height / rows;
  const fieldOfView = Math.PI / 2.9;
  const layers = Array.from({ length: 6 }, () => Array.from({ length: rows }, () => Array(columns).fill(" ")));
  const collected = new Set(game.gates.filter((gate) => gate.collected).map((gate) => gate.name));
  const palette = collected.has("COMPRESSION") && game.gateCount < 6 ? REDUCED_DENSITY : DENSITY;
  const moving = game.keys.has("w") || game.keys.has("s") || game.keys.has("arrowup") || game.keys.has("arrowdown");
  const bob = moving ? Math.sin(now * 0.011) * cellHeight * 0.16 : 0;

  for (let column = 0; column < columns; column += 1) {
    const camera = column / columns - 0.5;
    const rayAngle = game.player.direction + camera * fieldOfView;
    const hit = castRay(game, rayAngle);
    const correctedDistance = Math.max(0.08, hit.distance * Math.cos(rayAngle - game.player.direction));
    const wallHeight = Math.min(rows * 2.1, (rows * 0.88) / correctedDistance);
    const top = Math.floor(rows / 2 - wallHeight / 2 + bob / cellHeight);
    const bottom = Math.ceil(rows / 2 + wallHeight / 2 + bob / cellHeight);
    const baseShade = clamp(Math.floor(5.7 - correctedDistance * 0.42 - hit.side * 0.7), 0, 5);
    for (let row = 0; row < rows; row += 1) {
      let glyph = " ";
      let shade = 0;
      if (row >= top && row <= bottom) {
        const vertical = (row - top) / Math.max(1, bottom - top);
        const grain = Math.sin((hit.texture * 21 + vertical * 13 + hit.mapX * 1.7 + hit.mapY) * 2.3);
        const brightness = clamp(baseShade + grain * 0.8 - Math.abs(vertical - 0.5) * 0.8, 0, 5);
        shade = Math.floor(brightness);
        const densityIndex = clamp(Math.floor((brightness / 5) * (palette.length - 1) + Math.abs(grain) * 2), 1, palette.length - 1);
        const textHash = Math.abs((hit.mapX * 31 + hit.mapY * 17 + row * 7 + column) % 29);
        if (textHash === 0 || (collected.has("PROVENANCE") && textHash % 11 === 0)) glyph = game.sourceChars[(hit.mapX * 5 + hit.mapY * 3 + row) % game.sourceChars.length];
        else if (hit.cell === 2 && textHash % 7 === 0) glyph = "│";
        else if (hit.cell === 3 && textHash % 9 === 0) glyph = "─";
        else glyph = palette[densityIndex];
      } else if (row > bottom) {
        const floorDepth = (row - rows / 2) / (rows / 2);
        shade = clamp(Math.floor((1 - floorDepth) * 3.2), 0, 3);
        const pattern = (row * 11 + column * 7 + Math.floor(now / 340)) % 31;
        glyph = pattern === 0 ? "/" : pattern < 4 ? "·" : pattern === 8 ? "_" : " ";
      } else {
        const skyPattern = (row * 37 + column * 13 + game.gateCount * 5) % 233;
        if (skyPattern === 0) { shade = 2; glyph = "·"; }
        if (game.gateCount > 0 && skyPattern === 19) {
          const token = game.law.cellTokens[(column + row) % game.law.cellTokens.length];
          shade = 2;
          glyph = Array.from(token)[(column + row) % Math.max(1, Array.from(token).length)] ?? "·";
        }
      }
      layers[shade][row][column] = glyph;
    }
  }

  const shades = [
    "rgba(214,207,185,.10)", "rgba(214,207,185,.23)", "rgba(222,215,193,.38)",
    "rgba(230,222,199,.56)", "rgba(238,230,207,.76)", "rgba(248,239,214,.96)",
  ];
  context.textBaseline = "top";
  context.font = `${cellHeight * 1.04}px "Courier New", monospace`;
  const scaleX = cellWidth / Math.max(1, context.measureText("M").width);
  for (let shade = 0; shade < layers.length; shade += 1) {
    context.fillStyle = shades[shade];
    context.save();
    context.scale(scaleX, 1);
    for (let row = 0; row < rows; row += 1) context.fillText(layers[shade][row].join(""), 0, row * cellHeight);
    context.restore();
  }

  drawGateSprites(context, width, height, game, now, fieldOfView);
  if (collected.has("TRUTH")) {
    context.font = `${Math.max(11, width * 0.013)}px "Courier New", monospace`;
    context.fillStyle = "rgba(227,219,194,.58)";
    for (let index = 0; index < 7; index += 1) {
      const x = ((now * (0.014 + index * 0.0017) + index * 173) % (width + 80)) - 40;
      const y = height * (0.22 + 0.58 * Math.abs(Math.sin(index * 4.1 + now * 0.00031)));
      context.fillText(index % 2 ? "\u201d" : "\u201c", x, y);
    }
  }
  if (game.pulseUntil > now) {
    const progress = 1 - (game.pulseUntil - now) / game.law.figure.conchMs;
    context.strokeStyle = `rgba(123,190,201,${0.48 * (1 - progress)})`;
    context.lineWidth = 1;
    for (let ring = 0; ring < 3; ring += 1) {
      context.beginPath();
      context.arc(width / 2, height / 2, ((progress + ring / 3) % 1) * Math.max(width, height), 0, Math.PI * 2);
      context.stroke();
    }
  }
  context.strokeStyle = "rgba(238,217,167,.65)";
  context.beginPath();
  context.moveTo(width / 2 - 7, height / 2); context.lineTo(width / 2 + 7, height / 2);
  context.moveTo(width / 2, height / 2 - 7); context.lineTo(width / 2, height / 2 + 7);
  context.stroke();
  if (game.flashUntil > now) {
    context.fillStyle = `rgba(239,213,148,${clamp((game.flashUntil - now) / 500, 0, 1) * 0.28})`;
    context.fillRect(0, 0, width, height);
  }
}

function drawGateSprites(context: CanvasRenderingContext2D, width: number, height: number, game: GameState, now: number, fieldOfView: number) {
  for (const gate of game.gates) {
    if (gate.collected) continue;
    const dx = gate.x - game.player.x;
    const dy = gate.y - game.player.y;
    const distance = Math.hypot(dx, dy);
    const angle = normalAngle(Math.atan2(dy, dx) - game.player.direction);
    const throughWalls = game.pulseUntil > now;
    if (Math.abs(angle) > fieldOfView * 0.65 && !throughWalls) continue;
    const visible = lineOfSight(game, gate.x, gate.y);
    if (!visible && !throughWalls) continue;
    const screenX = width / 2 + (angle / (fieldOfView / 2)) * (width / 2);
    if (screenX < -50 || screenX > width + 50) continue;
    const size = clamp((height * 0.34) / Math.max(distance, 0.45), 14, height * 0.28);
    const screenY = height / 2 + Math.sin(now * 0.002 + gate.x) * 5;
    context.save();
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.shadowColor = gate.color;
    context.shadowBlur = visible ? 22 : 6;
    context.fillStyle = gate.color;
    context.globalAlpha = visible ? 1 : clamp(1 - distance / 22, 0.18, 0.68);
    context.font = `${size}px "Courier New", monospace`;
    context.fillText(gate.glyph, screenX, screenY);
    if (distance < 3.2 || throughWalls) {
      context.shadowBlur = 0;
      context.font = `${clamp(size * 0.17, 8, 12)}px "Courier New", monospace`;
      context.fillText(gate.name, screenX, screenY + size * 0.72);
      context.globalAlpha *= 0.72;
      context.font = `${clamp(size * 0.14, 8, 11)}px Georgia, serif`;
      context.fillText(gate.token, screenX, screenY + size * 0.94);
    }
    context.restore();
  }
  if (game.returnOpen) {
    const dx = game.start.x - game.player.x;
    const dy = game.start.y - game.player.y;
    const distance = Math.hypot(dx, dy);
    const angle = normalAngle(Math.atan2(dy, dx) - game.player.direction);
    if (Math.abs(angle) < fieldOfView * 0.65 || game.pulseUntil > now) {
      const screenX = width / 2 + (angle / (fieldOfView / 2)) * (width / 2);
      const size = clamp((height * 0.44) / Math.max(distance, 0.45), 18, height * 0.34);
      context.save();
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.shadowColor = "#f0c66f";
      context.shadowBlur = 30;
      context.fillStyle = "#f3d78f";
      context.font = `${size}px serif`;
      context.fillText("回", screenX, height / 2);
      context.restore();
    }
  }
}

function renderDisc(context: CanvasRenderingContext2D, width: number, height: number, game: GameState, now: number) {
  context.fillStyle = "rgba(7,8,8,.965)";
  context.fillRect(0, 0, width, height);
  const centerX = width / 2;
  const centerY = height / 2;
  const scale = Math.min(width, height) / (game.size * 1.52);
  const center = (game.size - 1) / 2;
  const twist = 0.095 + Math.sin(now * 0.00037) * 0.008;
  const project = (point: Point) => {
    const dx = point.x - center;
    const dy = point.y - center;
    const radius = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) + radius * twist;
    return { x: centerX + Math.cos(angle) * radius * scale, y: centerY + Math.sin(angle) * radius * scale * 0.72 };
  };
  context.strokeStyle = "rgba(218,205,172,.13)";
  context.lineWidth = 1;
  for (let ring = 2; ring < game.size / 2; ring += 2) {
    context.beginPath();
    context.ellipse(centerX, centerY, ring * scale, ring * scale * 0.72, 0, 0, Math.PI * 2);
    context.stroke();
  }
  context.font = `${clamp(scale * 0.82, 5, 10)}px "Courier New", monospace`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  for (let y = 1; y < game.size - 1; y += 1) {
    for (let x = 1; x < game.size - 1; x += 1) {
      if (game.grid[y][x] !== 0) continue;
      const point = project({ x: x + 0.5, y: y + 0.5 });
      const sourceIndex = Math.abs((x * 17 + y * 31) % game.sourceChars.length);
      context.fillStyle = "rgba(220,211,187,.34)";
      context.fillText((x + y) % 11 === 0 ? game.sourceChars[sourceIndex] : "·", point.x, point.y);
    }
  }
  if (game.path.length > 1) {
    context.beginPath();
    game.path.forEach((point, index) => {
      const projected = project(point);
      if (index === 0) context.moveTo(projected.x, projected.y); else context.lineTo(projected.x, projected.y);
    });
    context.strokeStyle = "rgba(224,143,84,.58)";
    context.lineWidth = 1.2;
    context.stroke();
  }
  for (const gate of game.gates) {
    const point = project(gate);
    context.fillStyle = gate.collected ? "rgba(222,214,191,.22)" : gate.color;
    context.shadowColor = gate.color;
    context.shadowBlur = gate.collected ? 0 : 10;
    context.font = `${gate.collected ? 11 : 17}px "Courier New", monospace`;
    context.fillText(gate.collected ? "·" : gate.glyph, point.x, point.y);
  }
  context.shadowBlur = 0;
  const player = project(game.player);
  context.fillStyle = "#f1d487";
  context.shadowColor = "#f1d487";
  context.shadowBlur = 18;
  context.beginPath(); context.arc(player.x, player.y, 4.5, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0;
  if (game.anchor) {
    const anchor = project(game.anchor);
    context.strokeStyle = "rgba(125,188,198,.85)";
    context.strokeRect(anchor.x - 5, anchor.y - 5, 10, 10);
  }
  context.textAlign = "left";
  context.fillStyle = "rgba(229,220,195,.7)";
  context.font = "10px \"Courier New\", monospace";
  context.fillText("RECTILINEAR STATE / RADIAL PROJECTION", 20, 22);
  context.fillStyle = "rgba(229,220,195,.38)";
  context.fillText("THE MAP HAS NOT MOVED. YOUR READING HAS.", 20, 39);
}

function elapsedLabel(milliseconds: number) {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<GameState | null>(null);
  const frameRef = useRef<number | null>(null);
  const dragRef = useRef({ active: false, x: 0 });
  const audioRef = useRef<AudioContext | null>(null);
  const cutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revelationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [cellId, setCellId] = useState<VerseCellId>("doors");
  const [figureId, setFigureId] = useState<FigureId>("urchin");
  const [gateCount, setGateCount] = useState(0);
  const [foundGates, setFoundGates] = useState<GateName[]>([]);
  const [proofs, setProofs] = useState<GateProof[]>([]);
  const [projection, setProjection] = useState<Projection>("city");
  const [elapsed, setElapsed] = useState(0);
  const [steps, setSteps] = useState(0);
  const [muted, setMuted] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [mechanismOpen, setMechanismOpen] = useState(false);
  const [log, setLog] = useState(["FIELD MANUAL ONLINE.", "THE FIRST DOOR IS WAITING."]);
  const [revelation, setRevelation] = useState<Gate | null>(null);
  const [activeTool, setActiveTool] = useState<ToolName | null>(null);
  const [nearGate, setNearGate] = useState<{ name: GateName; token: string; instruction: string; progress: number; distance: number } | null>(null);
  const [returnArtifact, setReturnArtifact] = useState<ReturnArtifact | null>(null);
  const [bestReturn, setBestReturn] = useState<string | null>(null);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnSignature, setReturnSignature] = useState("");
  const [copyState, setCopyState] = useState("");
  const [utilityMode, setUtilityMode] = useState<UtilityMode | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importState, setImportState] = useState("");
  const worldLaw = useMemo(() => compileWorldLaw(source, cellId, figureId), [source, cellId, figureId]);

  const addLog = useCallback((line: string) => setLog((current) => [line, ...current].slice(0, 4)), []);

  const makeTone = useCallback((kind: "gate" | "conch" | "keris" | "w8" | "spiral" | "return", accent = "") => {
    if (muted || typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const audio = audioRef.current ?? new AudioContextClass();
    audioRef.current = audio;
    if (audio.state === "suspended") void audio.resume();
    const now = audio.currentTime;
    const law = gameRef.current?.law ?? worldLaw;
    const tokenValue = Array.from(accent).reduce((sum, character) => sum + (character.codePointAt(0) ?? 0), 0);
    const transpose = 2 ** ((((law.seed + tokenValue) % 9) - 4) / 12);
    const frequencies = { gate: [196, 294, 441], conch: [132, 396], keris: [880, 164], w8: [72, 48], spiral: [174, 261, 522], return: [147, 220, 330, 440] }[kind];
    frequencies.forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = kind === "keris" ? "sawtooth" : law.figure.id === "slothcake" || kind === "w8" ? "sine" : law.figure.id === "kite" ? "triangle" : "square";
      oscillator.frequency.setValueAtTime(frequency * transpose, now + index * 0.075);
      if (kind === "conch") oscillator.frequency.exponentialRampToValueAtTime(frequency * transpose * 2.2, now + 0.7);
      gain.gain.setValueAtTime(0.0001, now + index * 0.075);
      gain.gain.exponentialRampToValueAtTime(kind === "w8" ? 0.12 : 0.065, now + index * 0.075 + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.075 + (kind === "conch" ? 0.8 : 0.38));
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.start(now + index * 0.075); oscillator.stop(now + index * 0.075 + (kind === "conch" ? 0.82 : 0.42));
    });
  }, [muted, worldLaw]);

  const openGate = useCallback((gate: Gate, method: GateProof["method"], note: string) => {
    const game = gameRef.current;
    if (!game || gate.collected || game.finished) return false;
    const now = performance.now();
    gate.collected = true;
    gate.progress = 1;
    game.gateCount += 1;
    const proof: GateProof = {
      gate: gate.name,
      token: gate.token,
      method,
      step: game.steps,
      elapsedMs: Math.max(0, Math.round(now - game.startedAt)),
      note,
    };
    game.proofs.push(proof);
    setGateCount(game.gateCount);
    setFoundGates((current) => [...current, gate.name]);
    setProofs([...game.proofs]);
    setRevelation({ ...gate });
    setNearGate(null);
    addLog(`${gate.name} / ${gate.token}: ${gate.line}`);
    makeTone("gate", gate.token);
    game.paintingLeakUntil = now + (gate.name === "TRANSFER" ? 1500 : 620);
    game.flashUntil = now + 520;
    if (game.gateCount === game.gates.length) {
      game.returnOpen = true;
      setReturnOpen(true);
      window.setTimeout(() => addLog("EIGHT PROOFS HELD. RETURN TO THE FIRST MARK."), 620);
    }
    if (revelationTimerRef.current) clearTimeout(revelationTimerRef.current);
    revelationTimerRef.current = setTimeout(() => setRevelation(null), gate.name === "TRANSFER" ? 1850 : 1150);
    return true;
  }, [addLog, makeTone]);

  const showTool = useCallback((tool: ToolName) => {
    setActiveTool(tool);
    window.setTimeout(() => setActiveTool(null), 650);
  }, []);

  const activateTool = useCallback((tool: ToolName) => {
    const game = gameRef.current;
    if (!game || phase !== "playing") return;
    const now = performance.now();
    game.lastMovedAt = now;
    showTool(tool);
    const attemptNearbyGate = (primaryEffectSatisfied: boolean) => {
      const nearby = nearestUnopenedGate(game, 2.25);
      if (!nearby) return;
      const decision = evaluateToolGate(game.law, game.proofs, nearby.gate.name, tool, primaryEffectSatisfied);
      if (decision.status === "open") openGate(nearby.gate, tool, decision.note);
      else if (decision.status === "blocked") addLog(decision.line);
    };
    if (tool === "conch") {
      game.operatorCounts.conch += 1;
      game.pulseUntil = now + game.law.figure.conchMs; game.paintingLeakUntil = now + 500;
      addLog("CONCH: ALL SIGNALS ANSWER AT ONCE."); makeTone("conch");
      attemptNearbyGate(true);
    } else if (tool === "keris") {
      if (now < game.kerisReadyAt) { addLog("KERIS: EDGE REFORMING."); return; }
      const targetX = Math.floor(game.player.x + Math.cos(game.player.direction) * 0.9);
      const targetY = Math.floor(game.player.y + Math.sin(game.player.direction) * 0.9);
      const target = game.grid[targetY]?.[targetX];
      if (target && target < 9) {
        game.operatorCounts.keris += 1;
        game.grid[targetY][targetX] = 0; game.kerisReadyAt = now + game.law.figure.kerisCooldownMs; game.flashUntil = now + 430;
        addLog("KERIS CUT: ADJACENCY REVISED."); makeTone("keris");
        attemptNearbyGate(true);
      } else addLog("KERIS FOUND NOTHING WORTH CUTTING.");
    } else if (tool === "w8") {
      game.operatorCounts.w8 += 1;
      let retrievalCompleted = false;
      if (!game.anchor) {
        game.anchor = { x: game.player.x, y: game.player.y, direction: game.player.direction };
        const retrieval = game.gates.find((gate) => gate.name === "RETRIEVAL" && !gate.collected);
        game.retrievalArmed = Boolean(retrieval && Math.hypot(game.player.x - retrieval.x, game.player.y - retrieval.y) <= 1.45);
        game.retrievalDeparted = false;
        addLog("W8: THIS COORDINATE WILL HOLD.");
      } else {
        const completedRetrieval = game.retrievalArmed && game.retrievalDeparted;
        retrievalCompleted = completedRetrieval;
        game.player.x = game.anchor.x; game.player.y = game.anchor.y; game.player.direction = game.anchor.direction;
        game.anchor = null; game.flashUntil = now + 600;
        addLog("W8: WEIGHT RETURNED TO ITS MARK.");
        game.retrievalArmed = false;
        game.retrievalDeparted = false;
      }
      attemptNearbyGate(retrievalCompleted);
      makeTone("w8");
    } else {
      game.operatorCounts.spiral += 1;
      game.projection = game.projection === "city" ? "disc" : "city";
      setProjection(game.projection); game.flashUntil = now + 500;
      addLog(game.projection === "disc" ? "SPIRAL: SAME CITY. DIFFERENT READING." : "SPIRAL: DEPTH RESTORED WITH DIFFERENCE.");
      makeTone("spiral");
      attemptNearbyGate(true);
    }
  }, [addLog, makeTone, openGate, phase, showTool]);

  const finishGame = useCallback(() => {
    const game = gameRef.current;
    if (!game || game.finished) return;
    game.finished = true;
    const duration = performance.now() - game.startedAt;
    const artifact = makeReturnArtifact(game.law, game.proofs, game.operatorCounts, game.signature, game.steps, duration);
    setReturnArtifact(artifact);
    setReturnSignature(artifact.pathSignature.slice(-18));
    setElapsed(duration); setSteps(game.steps); setPhase("returning"); makeTone("return");
    try {
      const bestKey = `sleeper-best:${game.law.key}`;
      const previous = Number(window.localStorage.getItem(bestKey));
      if (!previous || duration < previous) {
        window.localStorage.setItem(bestKey, String(Math.floor(duration)));
        setBestReturn(elapsedLabel(duration));
      } else setBestReturn(elapsedLabel(previous));
    } catch { setBestReturn(null); }
    finishTimerRef.current = setTimeout(() => setPhase("complete"), 1900);
  }, [makeTone]);

  const startGame = useCallback(() => {
    const game = makeGame(source, cellId, figureId);
    gameRef.current = game;
    setGateCount(0); setFoundGates([]); setProofs([]); setSteps(0); setElapsed(0); setProjection("city"); setReturnArtifact(null); setReturnOpen(false); setReturnSignature(""); setNearGate(null); setCopyState(""); setUtilityMode(null);
    setLog([
      "Q / 1: SOUND CONCH TO FIND THE FIRST SIGNAL.",
      "PROXIMITY REVEALS EACH GATE PROTOCOL.",
      `${game.law.figure.label} / ${game.law.cell.label}.`,
    ]); setPhase("cut"); makeTone("keris");
    if (cutTimerRef.current) clearTimeout(cutTimerRef.current);
    cutTimerRef.current = setTimeout(() => { game.startedAt = performance.now(); setPhase("playing"); }, 1650);
  }, [cellId, figureId, makeTone, source]);

  const resetGame = useCallback(() => {
    setPhase("intro"); setGateCount(0); setFoundGates([]); setProofs([]); setProjection("city"); setRevelation(null); setReturnOpen(false); setReturnSignature(""); setNearGate(null); setReturnArtifact(null); setCopyState(""); setUtilityMode(null); gameRef.current = null;
  }, []);

  const copyArtifact = useCallback(async () => {
    if (!returnArtifact) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(returnArtifact, null, 2));
      setCopyState("WITNESS COPIED");
    } catch {
      setCopyState("COPY UNAVAILABLE — LEDGER REMAINS VISIBLE");
    }
  }, [returnArtifact]);

  const copyUtility = useCallback(async () => {
    if (!returnArtifact || !utilityMode) return;
    try {
      await navigator.clipboard.writeText(makeUtilityPrompt(returnArtifact, utilityMode));
      setCopyState(`${utilityMode.toUpperCase()} PROMPT COPIED`);
    } catch {
      setCopyState("COPY UNAVAILABLE — PROMPT REMAINS VISIBLE");
    }
  }, [returnArtifact, utilityMode]);

  const loadWitness = useCallback(() => {
    const parsed = parseReturnArtifactWorld(importText);
    if (!parsed.ok) {
      setImportState(parsed.error);
      return;
    }
    setSource(parsed.input.source);
    setCellId(parsed.input.cellId);
    setFigureId(parsed.input.figureId);
    setImportOpen(false);
    setImportText("");
    setImportState(`WORLD ${parsed.input.worldKey} RESTORED FROM WITNESS.`);
  }, [importText]);

  const copyWorldLink = useCallback(async () => {
    if (!returnArtifact) return;
    const law = compileWorldLaw(returnArtifact.source, returnArtifact.cell.id, returnArtifact.figure);
    const url = new URL("/", window.location.origin);
    url.search = makeWorldQuery(law);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopyState("REPRODUCIBLE WORLD LINK COPIED");
    } catch {
      setCopyState("COPY UNAVAILABLE — WITNESS JSON REMAINS PORTABLE");
    }
  }, [returnArtifact]);

  useEffect(() => () => {
    if (cutTimerRef.current) clearTimeout(cutTimerRef.current);
    if (revelationTimerRef.current) clearTimeout(revelationTimerRef.current);
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    if (audioRef.current) void audioRef.current.close();
  }, []);

  useEffect(() => {
    if (!helpOpen && !mechanismOpen) return;
    const game = gameRef.current;
    if (game) {
      game.keys.clear();
      game.lastMovedAt = performance.now();
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setHelpOpen(false);
      setMechanismOpen(false);
      if (gameRef.current) gameRef.current.lastMovedAt = performance.now();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [helpOpen, mechanismOpen]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.location.search) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("source") && !params.has("cell") && !params.has("figure") && !params.has("world")) return;
    const timer = window.setTimeout(() => {
      const parsed = parseWorldQuery(window.location.search);
      if (!parsed.ok) {
        setImportState(parsed.error.replace("WITNESS", "LINK"));
        return;
      }
      setSource(parsed.input.source);
      setCellId(parsed.input.cellId);
      setFigureId(parsed.input.figureId);
      setImportState(`WORLD ${parsed.input.worldKey} RESTORED FROM LINK.`);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (phase !== "playing" || helpOpen || mechanismOpen) return;
    let last = performance.now();
    const animate = (now: number) => {
      const game = gameRef.current;
      const canvas = canvasRef.current;
      if (!game || !canvas || game.finished) return;
      const delta = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      let forward = 0, strafe = 0, turn = 0;
      if (game.keys.has("w") || game.keys.has("arrowup")) forward += 1;
      if (game.keys.has("s") || game.keys.has("arrowdown")) forward -= 1;
      if (game.keys.has("a")) strafe -= 1;
      if (game.keys.has("d")) strafe += 1;
      if (game.keys.has("arrowleft")) turn -= 1;
      if (game.keys.has("arrowright")) turn += 1;
      const isActing = Boolean(forward || strafe || turn);
      if (isActing) game.lastMovedAt = now;
      game.player.direction = normalAngle(game.player.direction + turn * 1.85 * delta);
      if (forward || strafe) {
        const length = Math.hypot(forward, strafe) || 1;
        const dx = ((Math.cos(game.player.direction) * forward + Math.cos(game.player.direction + Math.PI / 2) * strafe) / length) * game.law.figure.movementSpeed * delta;
        const dy = ((Math.sin(game.player.direction) * forward + Math.sin(game.player.direction + Math.PI / 2) * strafe) / length) * game.law.figure.movementSpeed * delta;
        if (isOpen(game, game.player.x + dx, game.player.y)) game.player.x += dx;
        if (isOpen(game, game.player.x, game.player.y + dy)) game.player.y += dy;
        if (Math.hypot(game.player.x - game.lastPathPoint.x, game.player.y - game.lastPathPoint.y) > 0.34) {
          const pathDx = game.player.x - game.lastPathPoint.x;
          const pathDy = game.player.y - game.lastPathPoint.y;
          game.signature.push(Math.abs(pathDx) > Math.abs(pathDy) ? (pathDx > 0 ? "R" : "L") : pathDy > 0 ? "D" : "U");
          game.path.push({ x: game.player.x, y: game.player.y });
          if (game.path.length > 420) game.path.shift();
          game.lastPathPoint = { x: game.player.x, y: game.player.y }; game.steps += 1;
        }
      }

      if (game.anchor && game.retrievalArmed && Math.hypot(game.player.x - game.anchor.x, game.player.y - game.anchor.y) >= 3.1) {
        game.retrievalDeparted = true;
      }

      const truthGate = game.gates.find((gate) => gate.name === "TRUTH" && !gate.collected);
      if (truthGate) {
        const distance = Math.hypot(game.player.x - truthGate.x, game.player.y - truthGate.y);
        truthGate.progress = truthProofProgress(
          distance,
          isActing,
          now,
          game.lastMovedAt,
          game.law.figure.truthHoldMs,
        );
        if (truthGate.progress >= 1) openGate(truthGate, "stillness", "No movement or operator was added while the field changed.");
      }

      const measureGate = game.gates.find((gate) => gate.name === "MEASURE" && !gate.collected);
      if (measureGate) {
        const distance = Math.hypot(game.player.x - measureGate.x, game.player.y - measureGate.y);
        const measure = advanceMeasureProof(
          game.measureMs,
          distance,
          game.law.figure.measureMin,
          game.law.figure.measureMax,
          game.law.figure.measureHoldMs,
          delta * 1000,
        );
        game.measureMs = measure.milliseconds;
        measureGate.progress = measure.progress;
        if (measureGate.progress >= 1) {
          openGate(measureGate, "distance", `Distance held at ${distance.toFixed(2)} units for ${Math.round(game.measureMs)}ms.`);
        }
      }

      const resilienceGate = game.gates.find((gate) => gate.name === "RESILIENCE" && !gate.collected);
      if (resilienceGate) {
        const contact = resilienceContact(
          resilienceGate.relocated,
          Math.hypot(game.player.x - resilienceGate.x, game.player.y - resilienceGate.y),
        );
        if (contact === "relocate") {
          resilienceGate.x = resilienceGate.alternate.x;
          resilienceGate.y = resilienceGate.alternate.y;
          resilienceGate.relocated = true;
          resilienceGate.progress = 0.5;
          game.flashUntil = now + 420;
          game.paintingLeakUntil = now + 720;
          addLog(`RESILIENCE / ${resilienceGate.token}: COORDINATE FAILED. TOKEN PERSISTS.`);
        } else if (contact === "open") {
          openGate(resilienceGate, "relocation", "The same verse token was recovered after its coordinate failed.");
        }
      }

      if (game.returnOpen && Math.hypot(game.player.x - game.start.x, game.player.y - game.start.y) < 0.63 && now - game.startedAt > 3500) {
        finishGame(); return;
      }
      if (now - game.lastHudAt > 180) {
        game.lastHudAt = now; setElapsed(now - game.startedAt); setSteps(game.steps);
        const nearby = nearestUnopenedGate(game, 4.25);
        setNearGate(nearby ? {
          name: nearby.gate.name,
          token: nearby.gate.token,
          instruction: nearby.gate.instruction,
          progress: nearby.gate.progress,
          distance: nearby.distance,
        } : null);
      }
      renderCity(canvas, game, now);
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [addLog, finishGame, helpOpen, mechanismOpen, openGate, phase]);

  useEffect(() => {
    if (phase !== "playing" || helpOpen || mechanismOpen) return;
    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) event.preventDefault();
      if (event.repeat && ["q", "e", "r", "f", "1", "2", "3", "4"].includes(key)) return;
      if (key === "q" || key === "1") activateTool("conch");
      else if (key === "e" || key === "2" || key === " ") activateTool("keris");
      else if (key === "r" || key === "3") activateTool("w8");
      else if (key === "f" || key === "4" || key === "m") activateTool("spiral");
      else if (key === "h" || key === "?") setHelpOpen((current) => !current);
      gameRef.current?.keys.add(key);
    };
    const up = (event: KeyboardEvent) => gameRef.current?.keys.delete(event.key.toLowerCase());
    window.addEventListener("keydown", down, { passive: false }); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [activateTool, helpOpen, mechanismOpen, phase]);

  const holdKey = useCallback((key: string, active: boolean) => {
    if (active) gameRef.current?.keys.add(key); else gameRef.current?.keys.delete(key);
  }, []);
  const pointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = { active: true, x: event.clientX }; event.currentTarget.setPointerCapture(event.pointerId);
  }, []);
  const pointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const game = gameRef.current;
    if (!game || !dragRef.current.active) return;
    const delta = event.clientX - dragRef.current.x; dragRef.current.x = event.clientX;
    game.lastMovedAt = performance.now();
    game.player.direction = normalAngle(game.player.direction + delta * 0.0075);
  }, []);
  const pointerUp = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);
  const gateCells = useMemo(() => [
    ...worldLaw.gateOrder.map((name) => {
      const gate = gateDefinition(name);
      return <span key={gate.name} className={foundGates.includes(gate.name) ? "gate-cell found" : "gate-cell"} title={gate.name}>{gate.glyph}</span>;
    }),
    <span key="RETURN" className={returnOpen ? "gate-cell found return-gate-cell" : "gate-cell return-gate-cell"} title="RETURN">回</span>,
  ], [foundGates, returnOpen, worldLaw.gateOrder]);

  return (
    <main className={`game-shell phase-${phase} projection-${projection}`}>
      {phase === "intro" && (
        <section className="intro-screen" aria-labelledby="game-title">
          <div className="intro-wash" />
          <header className="intro-topline"><span>PA–001 / CITY ENGINE V0.2</span><span>PHRASE · VERSE CELL · FIGURE</span></header>
          <div className="intro-copy">
            <p className="eyebrow">ONE WORLD / MANY INNER OPERATORS</p>
            <h1 id="game-title">SLEEPER <span>{"//"}</span> ONE RETURN</h1>
            <p className="intro-lede">Compile a phrase, a verse cell, and a figure into one reproducible ASCII city. Eight Gates require enacted proofs; the ninth is your return to origin.</p>
            <label className="source-field"><span>SOURCE MATERIAL</span>
              <input value={source} maxLength={120} onChange={(event) => setSource(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") startGame(); }} aria-label="Text used to seed the city" />
            </label>
            <div className="compiler-grid">
              <fieldset className="compiler-picker verse-picker">
                <legend>VERSE CELL / GATE ORDER + TOKENS</legend>
                {VERSE_CELLS.map((cell) => (
                  <button key={cell.id} type="button" className={cellId === cell.id ? "selected" : ""} aria-pressed={cellId === cell.id} onClick={() => setCellId(cell.id)}>
                    <b>{cell.label}</b><span>{cell.text}</span>
                  </button>
                ))}
              </fieldset>
              <fieldset className="compiler-picker figure-picker">
                <legend>FIGURE / PHYSICS</legend>
                {FIGURES.map((figure) => (
                  <button key={figure.id} type="button" className={figureId === figure.id ? "selected" : ""} aria-pressed={figureId === figure.id} onClick={() => setFigureId(figure.id)}>
                    <b><i aria-hidden="true">{figure.mark}</i>{figure.label}</b><span>{figure.effect}</span>
                  </button>
                ))}
              </fieldset>
            </div>
            <section className="causal-preview" aria-live="polite">
              <header><b>WORLD {worldLaw.key}</b><span>{worldLaw.cell.label} / {worldLaw.figure.label}</span></header>
              <p>{worldLaw.cell.law}</p>
              <ul>{worldLaw.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
              <small>{worldLaw.cell.provenance}</small>
            </section>
            <button className="enter-button" onClick={startGame}><span>COMPILE / ENTER CITY</span><span aria-hidden="true">↳</span></button>
            <div className="intro-links">
              <button onClick={() => setMechanismOpen(true)}>OPEN CAUSAL LEDGER</button>
              <button onClick={() => { setImportOpen((current) => !current); setImportState(""); }}>{importOpen ? "CLOSE WITNESS PORT" : "LOAD WITNESS JSON"}</button>
              <a href="/interphase">OPEN INTERPHASE TILE <span aria-hidden="true">↗</span></a>
              <a href="/lab">OPEN PROTOTYPE LAB <span aria-hidden="true">↗</span></a>
              <a href="/atlas">PRESERVED FIELD ATLAS <span aria-hidden="true">↗</span></a>
            </div>
            {importOpen && <section className="witness-port">
              <label><span>PASTE RETURN ARTIFACT V2</span><textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder='{"schema":"sleeper.one-return", ...}' /></label>
              <button type="button" onClick={loadWitness}>VERIFY / RESTORE WORLD</button>
            </section>}
            {importState && <p className="import-state" aria-live="polite">{importState}</p>}
          </div>
          <aside className="intro-gates" aria-label="Nine Gates"><p>EIGHT PROOFS + RETURN</p><div>{worldLaw.gateOrder.map((name) => { const gate = gateDefinition(name); return <span key={gate.name} title={gate.name}>{gate.glyph}</span>; })}<span title="RETURN">回</span></div></aside>
          <footer className="intro-footer"><span>WASD / ARROWS / DRAG TO LOOK</span><span>Q CONCH · E KERIS · R W8 · F SPIRAL</span></footer>
        </section>
      )}

      {phase === "cut" && (
        <section className="cut-screen" aria-label="Entering the city">
          <div className="cut-left" /><div className="cut-right" /><div className="cut-light" />
          <p>WORLD {worldLaw.key} / THREE INPUTS COMPILED</p><strong>THE CITY IS A METHOD.</strong><span>{worldLaw.cell.label} / {worldLaw.figure.label}</span>
        </section>
      )}

      {(phase === "playing" || phase === "returning") && (
        <section className="play-screen" aria-label="Glyph city game">
          <canvas ref={canvasRef} className="world-canvas" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} aria-label="First-person ASCII labyrinth. Use keyboard or touch controls to move." />
          <header className="hud-top">
            <div><b>WORLD {worldLaw.key}</b><span>{worldLaw.figure.mark} {worldLaw.figure.label} · {worldLaw.cell.label}</span><span>{projection === "city" ? "RECTILINEAR / DEPTH" : "RADIAL / DISC"}</span></div>
            <div className="gate-strip" aria-label={`${gateCount} of 8 inner Gate proofs completed`}>{gateCells}</div>
            <div className="hud-stats"><span>{elapsedLabel(elapsed)}</span><span>{steps.toString().padStart(3, "0")} STEPS</span></div>
          </header>
          <aside className="field-log" aria-live="polite">{log.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</aside>
          {nearGate && phase === "playing" && (
            <section className="gate-protocol" aria-live="polite">
              <header><b>{gateDefinition(nearGate.name).glyph} {nearGate.name}</b><span>CELL / {nearGate.token}</span></header>
              <p>{nearGate.instruction}</p>
              <div><i style={{ width: `${Math.round(nearGate.progress * 100)}%` }} /></div>
              <small>{nearGate.progress > 0 ? `${Math.round(nearGate.progress * 100)}% PROOF` : `${nearGate.distance.toFixed(1)} UNITS`}</small>
            </section>
          )}
          <div className="operator-dock" aria-label="Operators">
            <button className={`${activeTool === "conch" ? "active " : ""}${worldLaw.transferTool === "conch" ? "transfer-tool" : ""}`} onClick={() => activateTool("conch")}><span>Q / 1</span><b>◉</b><em>CONCH</em><small>listen</small></button>
            <button className={`${activeTool === "keris" ? "active " : ""}${worldLaw.transferTool === "keris" ? "transfer-tool" : ""}`} onClick={() => activateTool("keris")}><span>E / 2</span><b>†</b><em>KERIS</em><small>cut</small></button>
            <button className={`${activeTool === "w8" ? "active " : ""}${worldLaw.transferTool === "w8" ? "transfer-tool" : ""}`} onClick={() => activateTool("w8")}><span>R / 3</span><b>8</b><em>W8</em><small>carry</small></button>
            <button className={`${activeTool === "spiral" ? "active " : ""}${worldLaw.transferTool === "spiral" ? "transfer-tool" : ""}`} onClick={() => activateTool("spiral")}><span>F / 4</span><b>◎</b><em>SPIRAL</em><small>reframe</small></button>
          </div>
          <div className="utility-buttons">
            <button onClick={() => setMuted((current) => !current)} aria-label={muted ? "Unmute sound" : "Mute sound"}>{muted ? "SOUND ×" : "SOUND ◌"}</button>
            <button onClick={() => setHelpOpen(true)}>FIELD MANUAL</button>
          </div>
          <div className="touch-controls" aria-label="Touch movement controls"><div className="touch-move">
            <button onPointerDown={() => holdKey("w", true)} onPointerUp={() => holdKey("w", false)} onPointerCancel={() => holdKey("w", false)} onPointerLeave={() => holdKey("w", false)} aria-label="Move forward">↑</button>
            <button onPointerDown={() => holdKey("arrowleft", true)} onPointerUp={() => holdKey("arrowleft", false)} onPointerCancel={() => holdKey("arrowleft", false)} onPointerLeave={() => holdKey("arrowleft", false)} aria-label="Turn left">←</button>
            <button onPointerDown={() => holdKey("s", true)} onPointerUp={() => holdKey("s", false)} onPointerCancel={() => holdKey("s", false)} onPointerLeave={() => holdKey("s", false)} aria-label="Move backward">↓</button>
            <button onPointerDown={() => holdKey("arrowright", true)} onPointerUp={() => holdKey("arrowright", false)} onPointerCancel={() => holdKey("arrowright", false)} onPointerLeave={() => holdKey("arrowright", false)} aria-label="Turn right">→</button>
          </div></div>
          {revelation && (
            <div className={`revelation revelation-${revelation.name.toLowerCase()}`}>
              {revelation.name === "TRANSFER" && <div className="ridge-vision" />}
              <span>{revelation.glyph}</span><p>PROOF {String(worldLaw.gateOrder.findIndex((name) => name === revelation.name) + 1).padStart(2, "0")} / CELL {revelation.token}</p>
              <h2>{revelation.name}</h2><strong>{revelation.line}</strong><small>{revelation.instruction}</small>
            </div>
          )}
          {returnOpen && phase === "playing" && <div className="return-call">EIGHT PROOFS HELD · RETURN TO THE FIRST MARK</div>}
          {phase === "returning" && (
            <div className="returning-screen"><div /><p>COMPRESSING CAUSAL WITNESS</p><strong>{returnSignature}</strong><span>THE RETURN KEEPS THE SOURCE AND RECORDS THE DIFFERENCE.</span></div>
          )}
        </section>
      )}

      {phase === "complete" && (
        <section className="complete-screen" aria-labelledby="return-title">
          <div className="complete-wash" />
          <header><span>PA–001 / RETURN ARTIFACT V2</span><span>WORLD {returnArtifact?.worldKey ?? worldLaw.key} / STATE: TRANSFORMED</span></header>
          {returnArtifact && <div className="complete-card complete-card-v2">
            <p className="eyebrow">GOOD FOR ONE RETURN</p><h1 id="return-title">THE CITY RETURNS A METHOD.</h1>
            <div className="returned-source"><span>RETURNED PHRASE / {returnArtifact.dominantOperator.toUpperCase()}</span><strong>{returnArtifact.returnedSource}</strong></div>
            <div className="return-ledger-grid">
              <article><span>VERSE-CELL WITNESS</span><strong>{returnArtifact.cell.witness}</strong><small>{returnArtifact.cell.source} · {returnArtifact.cell.provenance}</small></article>
              <article><span>PORTABLE INNER OPERATOR</span><strong>{returnArtifact.transferInstruction}</strong><small>Derived from the most-used operator in this run; apply it outside the city only if useful.</small></article>
            </div>
            <ol className="proof-ledger" aria-label="Gate proof ledger">{proofs.map((proof) => <li key={proof.gate}><b>{proof.gate}</b><span>{proof.token}</span><small>{proof.method} · step {proof.step}</small></li>)}</ol>
            <div className="return-stats"><span><b>{elapsedLabel(elapsed)}</b> TIME</span><span><b>{steps}</b> STEPS</span><span><b>9/9</b> GATES</span><span><b>{returnArtifact.pathSignature}</b> PATH</span>{bestReturn && <span><b>{bestReturn}</b> SAME-WORLD BEST</span>}</div>
            <div className="complete-actions"><button onClick={startGame}>RETURN DIFFERENTLY</button><button onClick={resetGame}>CHANGE WORLD INPUTS</button><button className="evidence-button" onClick={copyWorldLink}>COPY WORLD LINK</button><button className="evidence-button" onClick={copyArtifact}>COPY WITNESS JSON</button><a href="/interphase">OPEN INTERPHASE</a><a href="/lab">OPEN LAB</a></div>
            <section className="utility-transfer">
              <header><b>OPTIONAL USE / NEVER HIDDEN LABOR</b><span>The game is complete. Choose only if a real-world transfer helps.</span></header>
              <div className="utility-doors">
                {(["calm", "home", "oracle", "together"] as const).map((mode) => <button key={mode} className={utilityMode === mode ? "selected" : ""} aria-pressed={utilityMode === mode} onClick={() => { setUtilityMode(mode); setCopyState(""); }}>{mode.toUpperCase()}</button>)}
              </div>
              {utilityMode && <article><pre>{makeUtilityPrompt(returnArtifact, utilityMode)}</pre><button onClick={copyUtility}>COPY OPTIONAL PROMPT</button></article>}
            </section>
            {copyState && <p className="copy-state" aria-live="polite">{copyState}</p>}
          </div>}
          <footer>PHRASE → WORLD · VERSE → LAW · FIGURE → PHYSICS · PLAY → PROOF · RETURN → PORTABLE METHOD</footer>
        </section>
      )}

      {helpOpen && (
        <div className="manual-backdrop" role="dialog" aria-modal="true" aria-labelledby="manual-title">
          <section className="manual gate-manual"><button autoFocus className="manual-close" onClick={() => { setHelpOpen(false); if (gameRef.current) gameRef.current.lastMovedAt = performance.now(); }} aria-label="Close field manual">×</button>
            <p className="eyebrow">SLEEPER FIELD MANUAL / V0.2</p><h2 id="manual-title">GATES ASK FOR EVIDENCE.</h2>
            <p className="manual-intro">Follow a signal with CONCH, cut with KERIS, carry a coordinate with W8, and reframe with SPIRAL. Proximity reveals a Gate protocol; contact alone does nothing.</p>
            <div className="manual-grid gate-manual-grid">
              {worldLaw.gateOrder.map((name, index) => { const gate = gateDefinition(name); const method = name === "TRANSFER" ? worldLaw.transferTool : gate.method; return <article key={name}><b>{String(index + 1).padStart(2, "0")} / {gate.glyph} {name}</b><p>{gateInstruction(worldLaw, name)}</p><small>PROOF / {method.toUpperCase()}</small></article>; })}
              <article><b>09 / 回 RETURN</b><p>After eight proofs, retrieve the coordinate where the run began.</p><small>PROOF / COMPLETE CIRCUIT</small></article>
            </div>
            <button className="manual-return" onClick={() => setHelpOpen(false)}>RETURN TO FIELD</button>
          </section>
        </div>
      )}

      {mechanismOpen && (
        <div className="manual-backdrop" role="dialog" aria-modal="true" aria-labelledby="mechanism-title">
          <section className="manual mechanism-manual"><button autoFocus className="manual-close" onClick={() => setMechanismOpen(false)} aria-label="Close mechanism ledger">×</button>
            <p className="eyebrow">ONE RETURN / CAUSAL LEDGER</p><h2 id="mechanism-title">EVERY INPUT HAS A JOB.</h2>
            <div className="mechanism-grid">
              <article><b>01 / PHRASE</b><p>Its normalized text and alphabet set topology, passage count, wall characters, Gate coordinates, and a reproducible world key.</p></article>
              <article><b>02 / VERSE CELL</b><p>A selected source fragment provides eight visible tokens, their Gate order, and the law the run is testing. Provenance remains attached.</p></article>
              <article><b>03 / FIGURE</b><p>Urchin, Slothcake, and Kite are numeric rule-sets—not skins. They alter movement, listening time, cut recovery, stillness, or distance.</p></article>
              <article><b>04 / GATE PROOF</b><p>Touching a symbol cannot complete it. Each Gate requires an enacted protocol and records token, method, step, time, and causal note.</p></article>
              <article><b>05 / WALK</b><p>Movement becomes a U·D·L·R witness. Cuts, projections, anchors, retries, and Gate order create materially different runs through one world.</p></article>
              <article><b>06 / RETURN</b><p>The city emits a portable JSON artifact: intact source, transformed phrase, verse provenance, proofs, operator counts, path, measures, and one reusable instruction.</p></article>
            </div>
            <p className="mechanism-law">PHRASE + CELL + FIGURE → CITY → ENACTED PROOFS → RETURN ARTIFACT → OPTIONAL TRANSFER</p>
            <button className="manual-return" onClick={() => setMechanismOpen(false)}>RETURN TO SOURCE</button>
          </section>
        </div>
      )}
    </main>
  );
}
