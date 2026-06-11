import { describe, it, expect } from 'vitest';
import type { Level, Position, BlockType } from './types';
import { createEmptyGrid } from './GameEngine';
import { validateLevel } from './GameEngine';

const ALL_BLOCKS: BlockType[] = [
  'move', 'turnLeft', 'turnRight', 'moveForward',
  'loop', 'ifWall', 'ifStar', 'ifEmpty',
];

function makeValidLevel(
  width = 8,
  height = 8,
  start: Position = { x: 0, y: 0 },
  goal: Position = { x: width - 1, y: height - 1 }
): Level {
  return {
    id: 'test-level',
    name: 'Test Level',
    description: '',
    difficulty: 1,
    width,
    height,
    grid: createEmptyGrid(width, height),
    start,
    startDirection: 1,
    goal,
    stars: [],
    allowedBlocks: ALL_BLOCKS,
  };
}

function setCell(level: Level, x: number, y: number, type: 'wall' | 'pit' | 'empty'): Level {
  const newGrid = level.grid.map((row) => [...row]);
  newGrid[y][x] = type;
  return { ...level, grid: newGrid };
}

function addStar(level: Level, x: number, y: number): Level {
  return {
    ...level,
    stars: [...level.stars, { x, y }],
  };
}

function wallOffY(level: Level, y: number): Level {
  let l = level;
  for (let x = 0; x < level.width; x++) {
    l = setCell(l, x, y, 'wall');
  }
  return l;
}

describe('validateLevel - 基础结构验证', () => {
  it('有效的空关卡应该通过验证', () => {
    const level = makeValidLevel();
    const errors = validateLevel(level);
    expect(errors).toEqual([]);
  });

  it('地图宽度过小报错', () => {
    const level = makeValidLevel(2, 8);
    const errors = validateLevel(level);
    expect(errors.some((e) => e.includes('宽度'))).toBe(true);
  });

  it('地图宽度过大报错', () => {
    const level = makeValidLevel(21, 8);
    const errors = validateLevel(level);
    expect(errors.some((e) => e.includes('宽度'))).toBe(true);
  });

  it('地图高度过小报错', () => {
    const level = makeValidLevel(8, 2);
    const errors = validateLevel(level);
    expect(errors.some((e) => e.includes('高度'))).toBe(true);
  });

  it('地图高度过大报错', () => {
    const level = makeValidLevel(8, 21);
    const errors = validateLevel(level);
    expect(errors.some((e) => e.includes('高度'))).toBe(true);
  });

  it('起点和终点相同时报错', () => {
    const level = makeValidLevel(5, 5, { x: 2, y: 2 }, { x: 2, y: 2 });
    const errors = validateLevel(level);
    expect(errors.some((e) => e.includes('起点和终点不能在同一位置'))).toBe(true);
  });

  it('没有可用指令块时报错', () => {
    const level = { ...makeValidLevel(), allowedBlocks: [] };
    const errors = validateLevel(level);
    expect(errors.some((e) => e.includes('至少允许使用一种指令块'))).toBe(true);
  });
});

describe('validateLevel - 起点和终点验证', () => {
  it('起点是墙壁时报错', () => {
    let level = makeValidLevel(5, 5, { x: 1, y: 1 });
    level = setCell(level, 1, 1, 'wall');
    const errors = validateLevel(level);
    expect(errors.some((e) => e.includes('起点不能是墙壁或陷阱'))).toBe(true);
  });

  it('起点是陷阱时报错', () => {
    let level = makeValidLevel(5, 5, { x: 1, y: 1 });
    level = setCell(level, 1, 1, 'pit');
    const errors = validateLevel(level);
    expect(errors.some((e) => e.includes('起点不能是墙壁或陷阱'))).toBe(true);
  });

  it('终点是墙壁时报错', () => {
    let level = makeValidLevel(5, 5, { x: 0, y: 0 }, { x: 3, y: 3 });
    level = setCell(level, 3, 3, 'wall');
    const errors = validateLevel(level);
    expect(errors.some((e) => e.includes('终点不能是墙壁或陷阱'))).toBe(true);
  });

  it('终点是陷阱时报错', () => {
    let level = makeValidLevel(5, 5, { x: 0, y: 0 }, { x: 3, y: 3 });
    level = setCell(level, 3, 3, 'pit');
    const errors = validateLevel(level);
    expect(errors.some((e) => e.includes('终点不能是墙壁或陷阱'))).toBe(true);
  });
});

describe('validateLevel - 星星位置验证', () => {
  it('星星位置正常时不报错', () => {
    let level = makeValidLevel(5, 5);
    level = addStar(level, 2, 2);
    const errors = validateLevel(level);
    expect(errors).toEqual([]);
  });

  it('星星在起点时报错', () => {
    let level = makeValidLevel(5, 5, { x: 2, y: 2 });
    level = addStar(level, 2, 2);
    const errors = validateLevel(level);
    expect(errors.some((e) => e.includes('星星不能放在起点或终点'))).toBe(true);
  });

  it('星星在终点时报错', () => {
    let level = makeValidLevel(5, 5, { x: 0, y: 0 }, { x: 3, y: 3 });
    level = addStar(level, 3, 3);
    const errors = validateLevel(level);
    expect(errors.some((e) => e.includes('星星不能放在起点或终点'))).toBe(true);
  });

  it('星星在墙壁上报错', () => {
    let level = makeValidLevel(5, 5);
    level = setCell(level, 2, 2, 'wall');
    level = addStar(level, 2, 2);
    const errors = validateLevel(level);
    expect(errors.some((e) => e.includes('放在了墙壁上'))).toBe(true);
  });

  it('星星在陷阱上报错 —— 关键安全漏洞测试', () => {
    let level = makeValidLevel(5, 5);
    level = setCell(level, 2, 2, 'pit');
    level = addStar(level, 2, 2);
    const errors = validateLevel(level);
    const pitErrors = errors.filter((e) => e.includes('陷阱'));
    expect(pitErrors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('机器人走到这里会掉进陷阱'))).toBe(true);
  });

  it('多颗星星在陷阱上，每颗都应该被指出', () => {
    let level = makeValidLevel(6, 6);
    level = setCell(level, 1, 1, 'pit');
    level = setCell(level, 3, 3, 'pit');
    level = setCell(level, 5, 5, 'pit');
    level = addStar(level, 1, 1);
    level = addStar(level, 3, 3);
    level = addStar(level, 5, 5);
    const errors = validateLevel(level);
    const pitStarErrors = errors.filter((e) => e.includes('陷阱上'));
    expect(pitStarErrors.length).toBe(3);
  });
});

describe('validateLevel - 可达性验证', () => {
  it('空旷地图终点可达', () => {
    const level = makeValidLevel(6, 6, { x: 0, y: 0 }, { x: 5, y: 5 });
    const errors = validateLevel(level);
    expect(errors.some((e) => e.includes('无法从起点到达'))).toBe(false);
  });

  it('终点被墙完全围死时报错', () => {
    let level = makeValidLevel(5, 5, { x: 0, y: 0 }, { x: 4, y: 4 });
    level = setCell(level, 3, 4, 'wall');
    level = setCell(level, 4, 3, 'wall');
    level = setCell(level, 3, 3, 'wall');
    const errors = validateLevel(level);
    expect(errors.some((e) => e.includes('无法从起点到达'))).toBe(true);
    expect(errors.some((e) => e.includes('终点'))).toBe(true);
  });

  it('被墙隔开的星星应该被检测为不可达', () => {
    let level = makeValidLevel(6, 6);
    level = wallOffY(level, 3);
    level = addStar(level, 5, 5);
    level = { ...level, goal: { x: 5, y: 0 } };
    const errors = validateLevel(level);
    expect(errors.some((e) => e.includes('星星无法到达'))).toBe(true);
  });

  it('多颗星星部分不可达时，应该列出所有不可达的星星', () => {
    let level = makeValidLevel(6, 6);
    level = wallOffY(level, 3);
    level = addStar(level, 1, 1);
    level = addStar(level, 2, 2);
    level = addStar(level, 4, 4);
    level = addStar(level, 5, 5);
    level = { ...level, goal: { x: 5, y: 0 } };
    const errors = validateLevel(level);
    const starError = errors.find((e) => e.includes('颗星星无法到达'));
    expect(starError).toBeDefined();
    expect(starError).toContain('2');
  });

  it('陷阱围城也会导致终点不可达', () => {
    let level = makeValidLevel(5, 5, { x: 0, y: 0 }, { x: 4, y: 4 });
    for (let x = 0; x < 5; x++) {
      level = setCell(level, x, 2, 'pit');
    }
    const errors = validateLevel(level);
    expect(errors.some((e) => e.includes('终点'))).toBe(true);
    expect(errors.some((e) => e.includes('无法从起点到达'))).toBe(true);
  });
});

describe('validateLevel - 复合错误场景', () => {
  it('同时存在多个错误时，应该全部被检测出来', () => {
    let level = makeValidLevel(2, 2, { x: 0, y: 0 }, { x: 1, y: 1 });
    level = addStar(level, 1, 1);
    level = { ...level, allowedBlocks: [] as BlockType[] };
    const errors = validateLevel(level);
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });

  it('星星在陷阱上 + 终点不可达，两个错误都应该被检测到', () => {
    let level = makeValidLevel(6, 6, { x: 0, y: 0 }, { x: 5, y: 5 });
    level = setCell(level, 2, 2, 'pit');
    level = addStar(level, 2, 2);
    level = wallOffY(level, 4);
    const errors = validateLevel(level);
    expect(errors.some((e) => e.includes('陷阱'))).toBe(true);
    expect(errors.some((e) => e.includes('终点'))).toBe(true);
  });
});

describe('validateLevel - 边界值测试', () => {
  it('3x3 最小地图可通过验证', () => {
    const level = makeValidLevel(3, 3, { x: 0, y: 0 }, { x: 2, y: 2 });
    const errors = validateLevel(level);
    expect(errors).toEqual([]);
  });

  it('20x20 最大地图可通过验证', () => {
    const level = makeValidLevel(20, 20, { x: 0, y: 0 }, { x: 19, y: 19 });
    const errors = validateLevel(level);
    expect(errors).toEqual([]);
  });

  it('10 颗星星都可达时验证通过', () => {
    let level = makeValidLevel(10, 10);
    for (let i = 0; i < 10; i++) {
      level = addStar(level, i, 1);
    }
    const errors = validateLevel(level);
    expect(errors).toEqual([]);
  });
});
