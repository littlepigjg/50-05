import type { Level, Position } from './types';
import {
  bfsWithDirection,
  greedyStarPath,
  calculateStarScatter,
  countCellsByType,
  checkReachability,
  isWalkableCell,
} from './pathfinding';

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

function sigmoid(x: number, midpoint: number, steepness: number): number {
  return 1 / (1 + Math.exp(-steepness * (x - midpoint)));
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

export function evaluateDifficulty(level: Level): DifficultyBreakdown {
  const totalCells = level.width * level.height;
  const wallCount = countCellsByType(level, 'wall');
  const pitCount = countCellsByType(level, 'pit');
  const wallDensity = wallCount / totalCells;
  const pitDensity = pitCount / totalCells;

  const reachability = checkReachability(level);

  let reachableStars: Position[] = reachability.reachableStars;
  if (!isWalkableCell(level, level.start)) {
    reachableStars = [];
  }

  const directPath = bfsWithDirection(level, level.start, level.startDirection, level.goal);
  const directDist = directPath.distance === Infinity ? totalCells : directPath.distance;
  const directTurns = directPath.turns === Infinity ? totalCells : directPath.turns;

  const starPathResult = greedyStarPath(level, level.start, reachableStars, level.goal);
  const starPathDist = starPathResult.totalDistance;
  const effectivePathLen = starPathDist === Infinity ? directDist * 2 : starPathDist;

  const starScatter = calculateStarScatter(level);
  const blockComplexity = calculateBlockComplexity(level);

  const mapSizeScore = sigmoid(totalCells, 40, 0.05) * 3;
  const wallDensityScore = sigmoid(wallDensity, 0.2, 8) * 3;
  const pitDensityScore = sigmoid(pitDensity, 0.05, 15) * 3;
  const starCountScore = sigmoid(level.stars.length, 3, 0.5) * 3;
  const pathLengthScore = sigmoid(effectivePathLen, 15, 0.08) * 4;

  const detourRatio = reachableStars.length > 0 && directDist > 0
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
