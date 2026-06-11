import type { Level, Position } from './types';

export interface DifficultyBreakdown {
  mapSizeScore: number;
  wallDensityScore: number;
  pitDensityScore: number;
  starCountScore: number;
  pathLengthScore: number;
  starPathScore: number;
  blockComplexityScore: number;
  pathComplexityScore: number;
  totalScore: number;
  difficulty: number;
  label: string;
  color: string;
}

interface BFSResult {
  distance: number;
  turns: number;
}

function key(pos: Position): string {
  return `${pos.x},${pos.y}`;
}

function isWalkable(level: Level, pos: Position): boolean {
  if (pos.x < 0 || pos.x >= level.width || pos.y < 0 || pos.y >= level.height) return false;
  return level.grid[pos.y][pos.x] !== 'wall';
}

const DIR_VECS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
];

function bfsWithDirection(
  level: Level,
  start: Position,
  startDir: number,
  end: Position
): BFSResult {
  const visited = new Set<string>();
  const queue: { x: number; y: number; dir: number; dist: number; turns: number }[] = [];
  queue.push({ x: start.x, y: start.y, dir: startDir, dist: 0, turns: 0 });
  visited.add(`${key(start)},${startDir}`);

  while (queue.length > 0) {
    const cur = queue.shift()!;

    if (cur.x === end.x && cur.y === end.y) {
      return { distance: cur.dist, turns: cur.turns };
    }

    for (let d = 0; d < 4; d++) {
      const nx = cur.x + DIR_VECS[d].dx;
      const ny = cur.y + DIR_VECS[d].dy;
      const npos = { x: nx, y: ny };

      if (!isWalkable(level, npos)) continue;

      const stateKey = `${key(npos)},${d}`;
      if (visited.has(stateKey)) continue;
      visited.add(stateKey);

      const isTurn = d !== cur.dir;
      const dist = d === cur.dir ? cur.dist + 1 : cur.dist + 2;
      const turns = isTurn ? cur.turns + 1 : cur.turns;

      queue.push({ x: nx, y: ny, dir: d, dist, turns });
    }
  }

  return { distance: Infinity, turns: Infinity };
}

function bfsDistance(level: Level, start: Position, end: Position): number {
  const visited = new Set<string>();
  const queue: Position[] = [start];
  visited.add(key(start));
  let dist = 0;

  while (queue.length > 0) {
    const size = queue.length;
    for (let i = 0; i < size; i++) {
      const cur = queue.shift()!;
      if (cur.x === end.x && cur.y === end.y) return dist;

      for (const dv of DIR_VECS) {
        const npos = { x: cur.x + dv.dx, y: cur.y + dv.dy };
        if (!isWalkable(level, npos)) continue;
        const k = key(npos);
        if (visited.has(k)) continue;
        visited.add(k);
        queue.push(npos);
      }
    }
    dist++;
  }

  return Infinity;
}

function greedyStarPath(level: Level, start: Position, stars: Position[], goal: Position): number {
  if (stars.length === 0) {
    return bfsDistance(level, start, goal);
  }

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

    if (bestDist === Infinity) return Infinity;

    totalDist += bestDist;
    current = remaining[bestIdx];
    remaining.splice(bestIdx, 1);
  }

  const toGoal = bfsDistance(level, current, goal);
  if (toGoal === Infinity) return Infinity;
  totalDist += toGoal;

  return totalDist;
}

function countWalls(level: Level): number {
  let count = 0;
  for (let y = 0; y < level.height; y++) {
    for (let x = 0; x < level.width; x++) {
      if (level.grid[y][x] === 'wall') count++;
    }
  }
  return count;
}

function countPits(level: Level): number {
  let count = 0;
  for (let y = 0; y < level.height; y++) {
    for (let x = 0; x < level.width; x++) {
      if (level.grid[y][x] === 'pit') count++;
    }
  }
  return count;
}

function calculateBlockComplexity(level: Level): number {
  let complexity = 0;

  const hasBasic = level.allowedBlocks.includes('move');
  const hasLoop = level.allowedBlocks.includes('loop');
  const hasCondition =
    level.allowedBlocks.includes('ifWall') ||
    level.allowedBlocks.includes('ifStar') ||
    level.allowedBlocks.includes('ifEmpty');
  const hasFunction =
    level.allowedBlocks.includes('function') ||
    level.allowedBlocks.includes('callFunction');

  if (hasBasic && !hasLoop && !hasCondition && !hasFunction) {
    complexity += 0;
  } else if (hasLoop && !hasCondition && !hasFunction) {
    complexity += 1;
  } else if (hasCondition && !hasFunction) {
    complexity += 2;
  } else if (hasFunction) {
    complexity += 3;
  }

  if (level.maxBlocks && level.maxBlocks > 0) {
    if (level.maxBlocks <= 3) complexity += 2;
    else if (level.maxBlocks <= 5) complexity += 1.5;
    else if (level.maxBlocks <= 8) complexity += 1;
    else if (level.maxBlocks <= 12) complexity += 0.5;
  }

  return complexity;
}

function calculateStarScatter(level: Level): number {
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

function sigmoid(x: number, midpoint: number, steepness: number): number {
  return 1 / (1 + Math.exp(-steepness * (x - midpoint)));
}

export function evaluateDifficulty(level: Level): DifficultyBreakdown {
  const totalCells = level.width * level.height;
  const wallCount = countWalls(level);
  const pitCount = countPits(level);
  const wallDensity = wallCount / totalCells;
  const pitDensity = pitCount / totalCells;

  const directPath = bfsWithDirection(level, level.start, level.startDirection, level.goal);
  const directDist = directPath.distance === Infinity ? totalCells : directPath.distance;
  const directTurns = directPath.turns === Infinity ? totalCells : directPath.turns;

  const starPathDist = greedyStarPath(level, level.start, level.stars, level.goal);
  const effectivePathLen = starPathDist === Infinity ? directDist * 2 : starPathDist;

  const starScatter = calculateStarScatter(level);

  const blockComplexity = calculateBlockComplexity(level);

  const mapSizeScore = sigmoid(totalCells, 40, 0.05) * 3;

  const wallDensityScore = sigmoid(wallDensity, 0.2, 8) * 3;

  const pitDensityScore = sigmoid(pitDensity, 0.05, 15) * 3;

  const starCountScore = sigmoid(level.stars.length, 3, 0.5) * 3;

  const pathLengthScore = sigmoid(effectivePathLen, 15, 0.08) * 4;

  const detourRatio = level.stars.length > 0 && directDist > 0
    ? effectivePathLen / directDist
    : 1;
  const starPathScore = sigmoid(detourRatio, 2, 1.5) * 2.5 + starScatter * 1.5;

  const blockComplexityScore = blockComplexity * 0.8;

  const pathComplexityScore = sigmoid(directTurns, 5, 0.3) * 2.5;

  const rawScore =
    mapSizeScore +
    wallDensityScore +
    pitDensityScore +
    starCountScore +
    pathLengthScore +
    starPathScore +
    blockComplexityScore +
    pathComplexityScore;

  const maxPossibleScore = 3 + 3 + 3 + 3 + 4 + 4 + 3.2 + 2.5;
  const normalizedScore = rawScore / maxPossibleScore;

  let difficulty: number;
  if (normalizedScore < 0.12) difficulty = 1;
  else if (normalizedScore < 0.22) difficulty = 2;
  else if (normalizedScore < 0.32) difficulty = 3;
  else if (normalizedScore < 0.42) difficulty = 4;
  else if (normalizedScore < 0.52) difficulty = 5;
  else if (normalizedScore < 0.65) difficulty = 6;
  else if (normalizedScore < 0.78) difficulty = 7;
  else difficulty = 8;

  const label = getDifficultyLabel(difficulty);
  const color = getDifficultyColor(difficulty);

  return {
    mapSizeScore: Math.round(mapSizeScore * 100) / 100,
    wallDensityScore: Math.round(wallDensityScore * 100) / 100,
    pitDensityScore: Math.round(pitDensityScore * 100) / 100,
    starCountScore: Math.round(starCountScore * 100) / 100,
    pathLengthScore: Math.round(pathLengthScore * 100) / 100,
    starPathScore: Math.round(starPathScore * 100) / 100,
    blockComplexityScore: Math.round(blockComplexityScore * 100) / 100,
    pathComplexityScore: Math.round(pathComplexityScore * 100) / 100,
    totalScore: Math.round(rawScore * 100) / 100,
    difficulty,
    label,
    color,
  };
}

export function getDifficultyLabel(difficulty: number): string {
  const labels: Record<number, string> = {
    1: '入门',
    2: '简单',
    3: '普通',
    4: '中等',
    5: '困难',
    6: '很难',
    7: '极难',
    8: '地狱',
  };
  return labels[Math.max(1, Math.min(8, Math.round(difficulty)))] || '未知';
}

export function getDifficultyColor(difficulty: number): string {
  const colors: Record<number, string> = {
    1: '#22c55e',
    2: '#4ade80',
    3: '#3b82f6',
    4: '#6366f1',
    5: '#a855f7',
    6: '#f97316',
    7: '#ef4444',
    8: '#dc2626',
  };
  return colors[Math.max(1, Math.min(8, Math.round(difficulty)))] || '#6b7280';
}

export function getDifficultyBgClass(difficulty: number): string {
  const classes: Record<number, string> = {
    1: 'bg-green-100 text-green-700 border-green-200',
    2: 'bg-green-50 text-green-600 border-green-200',
    3: 'bg-blue-100 text-blue-700 border-blue-200',
    4: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    5: 'bg-purple-100 text-purple-700 border-purple-200',
    6: 'bg-orange-100 text-orange-700 border-orange-200',
    7: 'bg-red-100 text-red-700 border-red-200',
    8: 'bg-red-200 text-red-800 border-red-300',
  };
  return classes[Math.max(1, Math.min(8, Math.round(difficulty)))] || 'bg-gray-100 text-gray-700 border-gray-200';
}

export function getDifficultyStars(difficulty: number): string {
  const d = Math.max(1, Math.min(8, Math.round(difficulty)));
  if (d <= 2) return '★'.repeat(d);
  if (d <= 4) return '★'.repeat(d);
  return '★'.repeat(Math.min(d, 5));
}
