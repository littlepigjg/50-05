import type { Level, Position } from './types';

export const DIR_VECTORS: { dx: number; dy: number }[] = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
];

export function posKey(pos: Position): string {
  return `${pos.x},${pos.y}`;
}

export function posEquals(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

export function isValidCell(level: Level, pos: Position): boolean {
  return pos.x >= 0 && pos.x < level.width && pos.y >= 0 && pos.y < level.height;
}

export function isWalkableCell(level: Level, pos: Position): boolean {
  if (!isValidCell(level, pos)) return false;
  return level.grid[pos.y][pos.x] !== 'wall';
}

export interface BFSResult {
  distance: number;
  turns: number;
}

export function bfsWithDirection(
  level: Level,
  start: Position,
  startDirection: number,
  end: Position
): BFSResult {
  if (posEquals(start, end)) {
    return { distance: 0, turns: 0 };
  }

  const visited = new Set<string>();
  const queue: { x: number; y: number; dir: number; dist: number; turns: number }[] = [];
  queue.push({ x: start.x, y: start.y, dir: startDirection, dist: 0, turns: 0 });
  visited.add(`${posKey(start)},${startDirection}`);

  while (queue.length > 0) {
    const cur = queue.shift()!;

    if (cur.x === end.x && cur.y === end.y) {
      return { distance: cur.dist, turns: cur.turns };
    }

    for (let d = 0; d < 4; d++) {
      const nx = cur.x + DIR_VECTORS[d].dx;
      const ny = cur.y + DIR_VECTORS[d].dy;
      const npos = { x: nx, y: ny };

      if (!isWalkableCell(level, npos)) continue;

      const stateKey = `${posKey(npos)},${d}`;
      if (visited.has(stateKey)) continue;
      visited.add(stateKey);

      const isTurn = d !== cur.dir;
      const dist = isTurn ? cur.dist + 2 : cur.dist + 1;
      const turns = isTurn ? cur.turns + 1 : cur.turns;

      queue.push({ x: nx, y: ny, dir: d, dist, turns });
    }
  }

  return { distance: Infinity, turns: Infinity };
}

export function bfsDistance(
  level: Level,
  start: Position,
  end: Position
): number {
  if (posEquals(start, end)) return 0;

  const visited = new Set<string>();
  const queue: Position[] = [start];
  visited.add(posKey(start));
  let dist = 0;

  while (queue.length > 0) {
    const size = queue.length;
    for (let i = 0; i < size; i++) {
      const cur = queue.shift()!;
      if (cur.x === end.x && cur.y === end.y) return dist;

      for (const dv of DIR_VECTORS) {
        const npos = { x: cur.x + dv.dx, y: cur.y + dv.dy };
        if (!isWalkableCell(level, npos)) continue;
        const k = posKey(npos);
        if (visited.has(k)) continue;
        visited.add(k);
        queue.push(npos);
      }
    }
    dist++;
  }

  return Infinity;
}

export function getReachableCells(
  level: Level,
  start: Position
): Set<string> {
  const reachable = new Set<string>();
  if (!isWalkableCell(level, start)) return reachable;

  const queue: Position[] = [start];
  reachable.add(posKey(start));

  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const dv of DIR_VECTORS) {
      const npos = { x: cur.x + dv.dx, y: cur.y + dv.dy };
      if (!isWalkableCell(level, npos)) continue;
      const k = posKey(npos);
      if (reachable.has(k)) continue;
      reachable.add(k);
      queue.push(npos);
    }
  }

  return reachable;
}

export function isPositionReachable(
  level: Level,
  start: Position,
  target: Position
): boolean {
  return bfsDistance(level, start, target) !== Infinity;
}

export interface ReachabilityReport {
  goalReachable: boolean;
  reachableStars: Position[];
  unreachableStars: Position[];
  reachableCells: Set<string>;
}

export function checkReachability(level: Level): ReachabilityReport {
  const reachable = getReachableCells(level, level.start);
  const goalReachable = reachable.has(posKey(level.goal));
  const reachableStars: Position[] = [];
  const unreachableStars: Position[] = [];

  for (const star of level.stars) {
    if (reachable.has(posKey(star))) {
      reachableStars.push(star);
    } else {
      unreachableStars.push(star);
    }
  }

  return {
    goalReachable,
    reachableStars,
    unreachableStars,
    reachableCells: reachable,
  };
}

export interface StarPathResult {
  totalDistance: number;
  visitOrder: Position[];
  individualDistances: number[];
}

export function greedyStarPath(
  level: Level,
  start: Position,
  stars: Position[],
  goal: Position
): StarPathResult {
  if (stars.length === 0) {
    const dist = bfsDistance(level, start, goal);
    return {
      totalDistance: dist,
      visitOrder: [goal],
      individualDistances: [dist],
    };
  }

  const totalDistances: number[] = [];
  const visitOrder: Position[] = [];
  let totalDist = 0;
  let current = start;
  const remaining = [...stars];

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const d = bfsDistance(level, current, remaining[i]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    if (bestDist === Infinity) {
      return {
        totalDistance: Infinity,
        visitOrder,
        individualDistances: totalDistances,
      };
    }

    totalDist += bestDist;
    totalDistances.push(bestDist);
    current = remaining[bestIdx];
    visitOrder.push(current);
    remaining.splice(bestIdx, 1);
  }

  const toGoal = bfsDistance(level, current, goal);
  if (toGoal === Infinity) {
    return {
      totalDistance: Infinity,
      visitOrder,
      individualDistances: totalDistances,
    };
  }

  totalDist += toGoal;
  totalDistances.push(toGoal);
  visitOrder.push(goal);

  return {
    totalDistance: totalDist,
    visitOrder,
    individualDistances: totalDistances,
  };
}

export function calculateStarScatter(level: Level): number {
  if (level.stars.length <= 1) return 0;

  let totalDist = 0;
  let count = 0;
  for (let i = 0; i < level.stars.length; i++) {
    for (let j = i + 1; j < level.stars.length; j++) {
      const dx = level.stars[i].x - level.stars[j].x;
      const dy = level.stars[i].y - level.stars[j].y;
      totalDist += Math.abs(dx) + Math.abs(dy);
      count++;
    }
  }

  const avgDist = totalDist / count;
  const maxPossible = level.width + level.height;
  return Math.min(avgDist / maxPossible, 1);
}

export function countCellsByType(level: Level, cellType: string): number {
  let count = 0;
  for (let y = 0; y < level.height; y++) {
    for (let x = 0; x < level.width; x++) {
      if (level.grid[y][x] === cellType) count++;
    }
  }
  return count;
}
