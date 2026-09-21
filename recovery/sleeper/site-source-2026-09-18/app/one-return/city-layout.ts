import { seededRandom } from "../lib/seed.ts";
import {
  compileWorldLaw,
  gateDefinition,
  gateInstruction,
  type FigureId,
  type GateDefinition,
  type VerseCellId,
  type WorldLaw,
} from "./world-law.ts";

export type CityPoint = { x: number; y: number };

export type CityGate = GateDefinition & {
  x: number;
  y: number;
  alternate: CityPoint;
  token: string;
  collected: boolean;
  relocated: boolean;
  progress: number;
};

export type CityLayout = {
  law: WorldLaw;
  size: number;
  grid: number[][];
  start: CityPoint;
  gates: CityGate[];
  sourceChars: readonly string[];
};

const WORLD_SIZE = 27;

function shuffled<T>(items: T[], random: () => number) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function distancesFrom(grid: number[][], startX: number, startY: number) {
  const size = grid.length;
  const distances = Array.from({ length: size }, () => Array(size).fill(-1));
  const queue: CityPoint[] = [{ x: startX, y: startY }];
  distances[startY][startX] = 0;
  let head = 0;
  while (head < queue.length) {
    const current = queue[head++];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = current.x + dx;
      const y = current.y + dy;
      if (x >= 0 && x < size && y >= 0 && y < size && grid[y][x] === 0 && distances[y][x] < 0) {
        distances[y][x] = distances[current.y][current.x] + 1;
        queue.push({ x, y });
      }
    }
  }
  return distances;
}

export function buildCityLayout(source: string, cellId: VerseCellId, figureId: FigureId): CityLayout {
  const law = compileWorldLaw(source, cellId, figureId);
  const random = seededRandom(law.seed);
  const size = WORLD_SIZE;
  const grid = Array.from({ length: size }, () => Array(size).fill(1));
  const stack: CityPoint[] = [{ x: 1, y: 1 }];
  grid[1][1] = 0;

  while (stack.length) {
    const current = stack[stack.length - 1];
    const options = shuffled([[2, 0], [-2, 0], [0, 2], [0, -2]], random).filter(([dx, dy]) => {
      const x = current.x + dx;
      const y = current.y + dy;
      return x > 0 && x < size - 1 && y > 0 && y < size - 1 && grid[y][x] !== 0;
    });
    if (!options.length) {
      stack.pop();
      continue;
    }
    const [dx, dy] = options[0];
    grid[current.y + dy / 2][current.x + dx / 2] = 0;
    grid[current.y + dy][current.x + dx] = 0;
    stack.push({ x: current.x + dx, y: current.y + dy });
  }

  let loopsMade = 0;
  let attempts = 0;
  while (loopsMade < law.loops && attempts < 800) {
    attempts += 1;
    const x = 1 + Math.floor(random() * (size - 2));
    const y = 1 + Math.floor(random() * (size - 2));
    if (grid[y][x] !== 1) continue;
    const horizontal = grid[y][x - 1] === 0 && grid[y][x + 1] === 0;
    const vertical = grid[y - 1][x] === 0 && grid[y + 1][x] === 0;
    if (horizontal !== vertical) {
      grid[y][x] = 0;
      loopsMade += 1;
    }
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (x === 0 || y === 0 || x === size - 1 || y === size - 1) grid[y][x] = 9;
      else if (grid[y][x] !== 0) grid[y][x] = 1 + Math.floor(random() * 3);
    }
  }

  const distance = distancesFrom(grid, 1, 1);
  const candidates: Array<CityPoint & { distance: number }> = [];
  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      if (distance[y][x] >= 5) candidates.push({ x, y, distance: distance[y][x] });
    }
  }
  candidates.sort((left, right) => left.distance - right.distance);
  const selected: CityPoint[] = [];
  for (let gateIndex = 0; gateIndex < law.gateOrder.length; gateIndex += 1) {
    const target = Math.floor(((gateIndex + 1) / (law.gateOrder.length + 1)) * candidates.length);
    let chosen: CityPoint | null = null;
    for (let radius = 0; radius < candidates.length; radius += 1) {
      for (const candidateIndex of [target + radius, target - radius]) {
        const candidate = candidates[candidateIndex];
        if (!candidate) continue;
        if (selected.every((point) => Math.hypot(point.x - candidate.x, point.y - candidate.y) >= 4.25)) {
          chosen = candidate;
          break;
        }
      }
      if (chosen) break;
    }
    selected.push(chosen ?? candidates[Math.min(target, candidates.length - 1)] ?? { x: 1, y: 1 });
  }

  const usedAlternates: CityPoint[] = [];
  const gates = law.gateOrder.map((name, index): CityGate => {
    const definition = gateDefinition(name);
    const alternateCandidate = candidates
      .slice()
      .reverse()
      .find((candidate) =>
        selected.every((point) => Math.hypot(point.x - candidate.x, point.y - candidate.y) >= 3.5)
        && usedAlternates.every((point) => Math.hypot(point.x - candidate.x, point.y - candidate.y) >= 3.5));
    const alternate = alternateCandidate ?? candidates[candidates.length - 1] ?? { x: 1, y: 1 };
    usedAlternates.push(alternate);
    return {
      ...definition,
      method: name === "TRANSFER" ? law.transferTool : definition.method,
      instruction: gateInstruction(law, name),
      x: selected[index].x + 0.5,
      y: selected[index].y + 0.5,
      alternate: { x: alternate.x + 0.5, y: alternate.y + 0.5 },
      token: law.cellTokens[index],
      collected: false,
      relocated: false,
      progress: 0,
    };
  });

  return {
    law,
    size,
    grid,
    start: { x: 1.5, y: 1.5 },
    gates,
    sourceChars: law.wallAlphabet,
  };
}
