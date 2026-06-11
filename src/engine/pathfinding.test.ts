import { describe, it, expect } from 'vitest';
import type { Level, Position } from './types';
import { createEmptyGrid } from './GameEngine';
import {
  posKey,
  posEquals,
  isValidCell,
  isWalkableCell,
  bfsDistance,
  bfsWithDirection,
  getReachableCells,
  isPositionReachable,
  checkReachability,
  greedyStarPath,
  calculateStarScatter,
  countCellsByType,
} from './pathfinding';

function makeEmptyLevel(width: number, height: number): Level {
  return {
    id: 'test',
    name: 'Test Level',
    description: '',
    difficulty: 1,
    width,
    height,
    grid: createEmptyGrid(width, height),
    start: { x: 0, y: 0 },
    startDirection: 1,
    goal: { x: width - 1, y: height - 1 },
    stars: [],
    allowedBlocks: ['move', 'turnLeft', 'turnRight'],
  };
}

function setWall(level: Level, x: number, y: number): Level {
  const newGrid = level.grid.map((row) => [...row]);
  newGrid[y][x] = 'wall';
  return { ...level, grid: newGrid };
}

function setPit(level: Level, x: number, y: number): Level {
  const newGrid = level.grid.map((row) => [...row]);
  newGrid[y][x] = 'pit';
  return { ...level, grid: newGrid };
}

function addStar(level: Level, x: number, y: number): Level {
  return {
    ...level,
    stars: [...level.stars, { x, y }],
  };
}

describe('posKey / posEquals', () => {
  it('生成正确的位置键', () => {
    expect(posKey({ x: 3, y: 5 })).toBe('3,5');
    expect(posKey({ x: 0, y: 0 })).toBe('0,0');
  });

  it('正确比较两个位置是否相等', () => {
    expect(posEquals({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true);
    expect(posEquals({ x: 1, y: 2 }, { x: 2, y: 1 })).toBe(false);
  });
});

describe('isValidCell', () => {
  const level = makeEmptyLevel(5, 5);

  it('边界内的格子有效', () => {
    expect(isValidCell(level, { x: 0, y: 0 })).toBe(true);
    expect(isValidCell(level, { x: 4, y: 4 })).toBe(true);
    expect(isValidCell(level, { x: 2, y: 3 })).toBe(true);
  });

  it('边界外的格子无效', () => {
    expect(isValidCell(level, { x: -1, y: 0 })).toBe(false);
    expect(isValidCell(level, { x: 0, y: -1 })).toBe(false);
    expect(isValidCell(level, { x: 5, y: 0 })).toBe(false);
    expect(isValidCell(level, { x: 0, y: 5 })).toBe(false);
  });
});

describe('isWalkableCell', () => {
  let level = makeEmptyLevel(5, 5);
  level = setWall(level, 2, 2);
  level = setPit(level, 3, 3);

  it('空格子可通行', () => {
    expect(isWalkableCell(level, { x: 0, y: 0 })).toBe(true);
  });

  it('墙壁不可通行', () => {
    expect(isWalkableCell(level, { x: 2, y: 2 })).toBe(false);
  });

  it('陷阱不可通行', () => {
    expect(isWalkableCell(level, { x: 3, y: 3 })).toBe(false);
  });

  it('越界格子不可通行', () => {
    expect(isWalkableCell(level, { x: 10, y: 10 })).toBe(false);
  });
});

describe('bfsDistance', () => {
  it('空地图上直线距离正确', () => {
    const level = makeEmptyLevel(5, 5);
    const dist = bfsDistance(level, { x: 0, y: 0 }, { x: 4, y: 4 });
    expect(dist).toBe(8);
  });

  it('同一点距离为 0', () => {
    const level = makeEmptyLevel(5, 5);
    const dist = bfsDistance(level, { x: 2, y: 2 }, { x: 2, y: 2 });
    expect(dist).toBe(0);
  });

  it('有墙壁时绕道', () => {
    let level = makeEmptyLevel(5, 5);
    level = setWall(level, 1, 0);
    level = setWall(level, 1, 1);
    level = setWall(level, 1, 2);
    const dist = bfsDistance(level, { x: 0, y: 0 }, { x: 4, y: 0 });
    expect(dist).toBeGreaterThan(4);
    expect(dist).toBe(10);
  });

  it('完全被墙挡住返回 Infinity', () => {
    let level = makeEmptyLevel(5, 5);
    for (let x = 0; x < 5; x++) {
      level = setWall(level, x, 2);
    }
    const dist = bfsDistance(level, { x: 0, y: 0 }, { x: 4, y: 4 });
    expect(dist).toBe(Infinity);
  });

  it('陷阱也会阻挡路径', () => {
    let level = makeEmptyLevel(5, 5);
    for (let x = 0; x < 5; x++) {
      level = setPit(level, x, 2);
    }
    const dist = bfsDistance(level, { x: 0, y: 0 }, { x: 4, y: 4 });
    expect(dist).toBe(Infinity);
  });
});

describe('bfsWithDirection', () => {
  it('同方向直行步数 = 格数', () => {
    const level = makeEmptyLevel(5, 5);
    const result = bfsWithDirection(level, { x: 0, y: 2 }, 1, { x: 4, y: 2 });
    expect(result.distance).toBe(4);
    expect(result.turns).toBe(0);
  });

  it('需要转弯时步数增加', () => {
    const level = makeEmptyLevel(5, 5);
    const result = bfsWithDirection(level, { x: 0, y: 0 }, 1, { x: 2, y: 2 });
    expect(result.distance).toBe(5);
    expect(result.turns).toBe(1);
  });

  it('无法到达返回 Infinity', () => {
    let level = makeEmptyLevel(5, 5);
    for (let x = 0; x < 5; x++) level = setWall(level, x, 2);
    const result = bfsWithDirection(level, { x: 0, y: 0 }, 1, { x: 4, y: 4 });
    expect(result.distance).toBe(Infinity);
    expect(result.turns).toBe(Infinity);
  });
});

describe('getReachableCells', () => {
  it('空地图所有格子都可达', () => {
    const level = makeEmptyLevel(3, 3);
    const reachable = getReachableCells(level, { x: 0, y: 0 });
    expect(reachable.size).toBe(9);
  });

  it('墙壁围死区域不可达', () => {
    let level = makeEmptyLevel(5, 5);
    for (let x = 0; x < 5; x++) {
      level = setWall(level, x, 2);
    }
    const reachable = getReachableCells(level, { x: 0, y: 0 });
    expect(reachable.size).toBe(10);
    expect(reachable.has('0,3')).toBe(false);
    expect(reachable.has('4,4')).toBe(false);
    expect(reachable.has('0,0')).toBe(true);
  });

  it('陷阱阻挡可达性', () => {
    let level = makeEmptyLevel(3, 3);
    level = setPit(level, 1, 0);
    level = setPit(level, 0, 1);
    const reachable = getReachableCells(level, { x: 0, y: 0 });
    expect(reachable.size).toBe(1);
  });
});

describe('isPositionReachable', () => {
  it('可达位置返回 true', () => {
    const level = makeEmptyLevel(5, 5);
    expect(isPositionReachable(level, { x: 0, y: 0 }, { x: 4, y: 4 })).toBe(true);
  });

  it('不可达位置返回 false', () => {
    let level = makeEmptyLevel(5, 5);
    for (let x = 0; x < 5; x++) level = setWall(level, x, 2);
    expect(isPositionReachable(level, { x: 0, y: 0 }, { x: 4, y: 4 })).toBe(false);
  });
});

describe('checkReachability', () => {
  it('空旷地图终点可达，无星星时返回正确', () => {
    const level = makeEmptyLevel(5, 5);
    const report = checkReachability(level);
    expect(report.goalReachable).toBe(true);
    expect(report.reachableStars).toEqual([]);
    expect(report.unreachableStars).toEqual([]);
  });

  it('终点被墙两面围死时 goalReachable = false', () => {
    let level = makeEmptyLevel(5, 5);
    level = { ...level, goal: { x: 4, y: 4 } };
    level = setWall(level, 3, 4);
    level = setWall(level, 4, 3);
    const report = checkReachability(level);
    expect(report.goalReachable).toBe(false);
  });

  it('完全封闭的终点不可达', () => {
    let level = makeEmptyLevel(5, 5);
    level = { ...level, goal: { x: 4, y: 4 } };
    level = setWall(level, 3, 4);
    level = setWall(level, 4, 3);
    level = setWall(level, 3, 3);
    const report = checkReachability(level);
    expect(report.goalReachable).toBe(false);
  });

  it('正确区分可达和不可达的星星', () => {
    let level = makeEmptyLevel(5, 5);
    level = addStar(level, 1, 1);
    level = addStar(level, 4, 4);
    for (let x = 0; x < 5; x++) {
      level = setWall(level, x, 2);
    }
    level = { ...level, goal: { x: 1, y: 1 } };
    const report = checkReachability(level);
    expect(report.reachableStars.length).toBe(1);
    expect(report.unreachableStars.length).toBe(1);
    expect(report.unreachableStars[0].x).toBe(4);
    expect(report.unreachableStars[0].y).toBe(4);
  });

  it('星星在陷阱上时不可达', () => {
    let level = makeEmptyLevel(5, 5);
    level = setPit(level, 2, 2);
    level = addStar(level, 2, 2);
    const report = checkReachability(level);
    expect(report.unreachableStars.length).toBe(1);
    expect(report.unreachableStars[0].x).toBe(2);
    expect(report.unreachableStars[0].y).toBe(2);
  });
});

describe('greedyStarPath', () => {
  it('无星星时直接到终点', () => {
    const level = makeEmptyLevel(5, 5);
    const result = greedyStarPath(level, { x: 0, y: 0 }, [], { x: 4, y: 4 });
    expect(result.totalDistance).toBe(8);
    expect(result.visitOrder.length).toBe(1);
  });

  it('单颗星星路径正确', () => {
    const level = makeEmptyLevel(5, 5);
    const stars: Position[] = [{ x: 2, y: 2 }];
    const result = greedyStarPath(level, { x: 0, y: 0 }, stars, { x: 4, y: 4 });
    expect(result.visitOrder.length).toBe(2);
    expect(result.totalDistance).toBe(8);
  });

  it('多颗星星按最近邻顺序访问', () => {
    const level = makeEmptyLevel(10, 10);
    const stars: Position[] = [
      { x: 5, y: 0 },
      { x: 9, y: 5 },
      { x: 0, y: 9 },
    ];
    const result = greedyStarPath(level, { x: 0, y: 0 }, stars, { x: 9, y: 9 });
    expect(result.visitOrder.length).toBe(4);
    expect(result.totalDistance).toBeGreaterThan(10);
  });

  it('有星星不可达时返回 Infinity', () => {
    let level = makeEmptyLevel(5, 5);
    for (let x = 0; x < 5; x++) {
      level = setWall(level, x, 2);
    }
    const stars: Position[] = [{ x: 4, y: 4 }];
    const result = greedyStarPath(level, { x: 0, y: 0 }, stars, { x: 1, y: 1 });
    expect(result.totalDistance).toBe(Infinity);
  });
});

describe('calculateStarScatter', () => {
  it('0 或 1 颗星星分散度为 0', () => {
    const level0 = makeEmptyLevel(5, 5);
    expect(calculateStarScatter(level0)).toBe(0);

    const level1 = addStar(level0, 2, 2);
    expect(calculateStarScatter(level1)).toBe(0);
  });

  it('星星越分散分数越高', () => {
    const level = makeEmptyLevel(10, 10);
    const closeStars = addStar(addStar(level, 4, 4), 5, 5);
    const farStars = addStar(addStar(level, 0, 0), 9, 9);
    expect(calculateStarScatter(farStars)).toBeGreaterThan(calculateStarScatter(closeStars));
  });

  it('最大分散度不超过 1', () => {
    const level = makeEmptyLevel(10, 10);
    const maxScatter = addStar(addStar(level, 0, 0), 9, 9);
    expect(calculateStarScatter(maxScatter)).toBeLessThanOrEqual(1);
  });
});

describe('countCellsByType', () => {
  it('正确统计墙壁数量', () => {
    let level = makeEmptyLevel(5, 5);
    level = setWall(level, 1, 1);
    level = setWall(level, 2, 2);
    level = setWall(level, 3, 3);
    expect(countCellsByType(level, 'wall')).toBe(3);
  });

  it('正确统计陷阱数量', () => {
    let level = makeEmptyLevel(5, 5);
    level = setPit(level, 0, 0);
    expect(countCellsByType(level, 'pit')).toBe(1);
  });

  it('空地图墙壁和陷阱都是 0', () => {
    const level = makeEmptyLevel(5, 5);
    expect(countCellsByType(level, 'wall')).toBe(0);
    expect(countCellsByType(level, 'pit')).toBe(0);
  });
});
