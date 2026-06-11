import { describe, it, expect } from 'vitest';
import type { Level } from './types';
import { validateLevel } from './GameEngine';

const createTestLevel = (
  width: number,
  height: number,
  walls: [number, number][] = [],
  pits: [number, number][] = []
): Level => {
  const grid: ('empty' | 'wall' | 'pit')[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => 'empty' as const)
  );
  walls.forEach(([x, y]) => {
    grid[y][x] = 'wall';
  });
  pits.forEach(([x, y]) => {
    grid[y][x] = 'pit';
  });
  return {
    id: 'test',
    name: 'Test Level',
    description: '',
    difficulty: 1,
    width,
    height,
    grid,
    start: { x: 0, y: 0 },
    startDirection: 1,
    goal: { x: width - 1, y: height - 1 },
    stars: [],
    allowedBlocks: ['move', 'turnLeft', 'turnRight'],
  };
};

describe('validateLevel', () => {
  describe('basic map size validation', () => {
    it('should reject maps that are too narrow', () => {
      const level = createTestLevel(2, 5);
      const errors = validateLevel(level);
      expect(errors).toContain('地图宽度应在 3-20 之间');
    });

    it('should reject maps that are too short', () => {
      const level = createTestLevel(5, 2);
      const errors = validateLevel(level);
      expect(errors).toContain('地图高度应在 3-20 之间');
    });

    it('should accept maps with valid dimensions', () => {
      const level = createTestLevel(5, 5);
      const errors = validateLevel(level);
      expect(errors).not.toContain('地图宽度应在 3-20 之间');
      expect(errors).not.toContain('地图高度应在 3-20 之间');
    });
  });

  describe('start/goal position validation', () => {
    it('should reject same start and goal positions', () => {
      const level = {
        ...createTestLevel(3, 3),
        start: { x: 1, y: 1 },
        goal: { x: 1, y: 1 },
      };
      const errors = validateLevel(level);
      expect(errors).toContain('起点和终点不能在同一位置');
    });

    it('should reject start position on wall', () => {
      const level = createTestLevel(3, 3, [[0, 0]]);
      const errors = validateLevel(level);
      expect(errors).toContain('起点不能是墙壁或陷阱');
    });

    it('should reject start position on pit', () => {
      const level = createTestLevel(3, 3, [], [[0, 0]]);
      const errors = validateLevel(level);
      expect(errors).toContain('起点不能是墙壁或陷阱');
    });

    it('should reject goal position on wall', () => {
      const level = createTestLevel(3, 3, [[2, 2]]);
      const errors = validateLevel(level);
      expect(errors).toContain('终点不能是墙壁或陷阱');
    });

    it('should reject goal position on pit', () => {
      const level = createTestLevel(3, 3, [], [[2, 2]]);
      const errors = validateLevel(level);
      expect(errors).toContain('终点不能是墙壁或陷阱');
    });
  });

  describe('star validation on obstacles', () => {
    it('should reject stars placed on walls', () => {
      const level = {
        ...createTestLevel(4, 4, [[1, 1]]),
        stars: [{ x: 1, y: 1 }],
      };
      const errors = validateLevel(level);
      expect(errors).toContain('星星 (1, 1) 放在了墙壁上，无法放置');
    });

    it('should reject stars placed on pits', () => {
      const level = {
        ...createTestLevel(4, 4, [], [[2, 2]]),
        stars: [{ x: 2, y: 2 }],
      };
      const errors = validateLevel(level);
      expect(errors).toContain(
        '星星 (2, 2) 放在了陷阱上，机器人走到这里会掉进陷阱，无法收集这颗星'
      );
    });

    it('should reject stars placed on start', () => {
      const level = {
        ...createTestLevel(3, 3),
        stars: [{ x: 0, y: 0 }],
      };
      const errors = validateLevel(level);
      expect(errors).toContain('星星不能放在起点或终点');
    });

    it('should reject stars placed on goal', () => {
      const level = {
        ...createTestLevel(3, 3),
        stars: [{ x: 2, y: 2 }],
      };
      const errors = validateLevel(level);
      expect(errors).toContain('星星不能放在起点或终点');
    });

    it('should report multiple stars on obstacles with separate messages', () => {
      const level = {
        ...createTestLevel(5, 5, [[1, 1], [3, 3]], [[2, 2]]),
        stars: [
          { x: 1, y: 1 },
          { x: 2, y: 2 },
          { x: 3, y: 3 },
        ],
      };
      const errors = validateLevel(level);
      expect(errors).toContain('星星 (1, 1) 放在了墙壁上，无法放置');
      expect(errors).toContain('星星 (3, 3) 放在了墙壁上，无法放置');
      expect(errors).toContain(
        '星星 (2, 2) 放在了陷阱上，机器人走到这里会掉进陷阱，无法收集这颗星'
      );
    });
  });

  describe('allowed blocks validation', () => {
    it('should reject levels with no allowed blocks', () => {
      const level = {
        ...createTestLevel(3, 3),
        allowedBlocks: [],
      };
      const errors = validateLevel(level);
      expect(errors).toContain('至少允许使用一种指令块');
    });
  });

  describe('goal reachability validation', () => {
    it('should accept a clear path to goal', () => {
      const level = createTestLevel(5, 5);
      const errors = validateLevel(level);
      const goalError = errors.find((e) => e.includes('无法从起点到达'));
      expect(goalError).toBeUndefined();
    });

    it('should reject when goal is blocked by walls', () => {
      const level = createTestLevel(5, 5, [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]]);
      const errors = validateLevel(level);
      expect(errors).toContain(
        '终点 (4, 4) 无法从起点到达，请检查墙壁布局'
      );
    });

    it('should reject when goal is blocked by pits', () => {
      const level = createTestLevel(5, 5, [], [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]]);
      const errors = validateLevel(level);
      expect(errors).toContain(
        '终点 (4, 4) 无法从起点到达，请检查墙壁布局'
      );
    });

    it('should reject when goal is blocked by mixed walls and pits', () => {
      const level = createTestLevel(5, 5, [[2, 0], [2, 2], [2, 4]], [[2, 1], [2, 3]]);
      const errors = validateLevel(level);
      expect(errors).toContain(
        '终点 (4, 4) 无法从起点到达，请检查墙壁布局'
      );
    });
  });

  describe('star reachability validation', () => {
    it('should accept reachable stars', () => {
      const level = {
        ...createTestLevel(5, 5),
        stars: [
          { x: 1, y: 1 },
          { x: 3, y: 3 },
        ],
      };
      const errors = validateLevel(level);
      const starErrors = errors.filter((e) => e.includes('无法到达') && e.includes('星星'));
      expect(starErrors).toHaveLength(0);
    });

    it('should reject unreachable stars behind walls', () => {
      const level = {
        ...createTestLevel(5, 5, [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]]),
        stars: [
          { x: 1, y: 1 },
          { x: 4, y: 0 },
        ],
      };
      const errors = validateLevel(level);
      expect(errors).toContain('以下 1 颗星星无法到达：(4, 0)');
    });

    it('should reject unreachable stars behind pits', () => {
      const level = {
        ...createTestLevel(5, 5, [], [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]]),
        stars: [
          { x: 1, y: 1 },
          { x: 4, y: 0 },
        ],
      };
      const errors = validateLevel(level);
      expect(errors).toContain('以下 1 颗星星无法到达：(4, 0)');
    });

    it('should list all unreachable stars', () => {
      const level = {
        ...createTestLevel(5, 5, [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]]),
        stars: [
          { x: 1, y: 1 },
          { x: 4, y: 0 },
          { x: 4, y: 3 },
          { x: 3, y: 2 },
        ],
      };
      const errors = validateLevel(level);
      expect(errors).toContain('以下 3 颗星星无法到达：(4, 0)、(4, 3)、(3, 2)');
    });
  });

  describe('combined scenario tests', () => {
    it('should report all errors when multiple problems exist', () => {
      const level = {
        ...createTestLevel(4, 4, [[1, 1]], [[2, 2]]),
        stars: [
          { x: 1, y: 1 },
          { x: 2, y: 2 },
          { x: 3, y: 3 },
        ],
        start: { x: 0, y: 0 },
        goal: { x: 3, y: 3 },
        allowedBlocks: [] as never[],
      };
      const errors = validateLevel(level);
      expect(errors).toContain('星星 (1, 1) 放在了墙壁上，无法放置');
      expect(errors).toContain(
        '星星 (2, 2) 放在了陷阱上，机器人走到这里会掉进陷阱，无法收集这颗星'
      );
      expect(errors).toContain('星星不能放在起点或终点');
      expect(errors).toContain('至少允许使用一种指令块');
    });

    it('should pass for a valid level with stars', () => {
      const level = {
        ...createTestLevel(5, 5, [[1, 2], [2, 2], [3, 2]]),
        stars: [
          { x: 1, y: 1 },
          { x: 2, y: 4 },
          { x: 4, y: 2 },
        ],
        start: { x: 0, y: 0 },
        goal: { x: 4, y: 4 },
      };
      const errors = validateLevel(level);
      expect(errors).toHaveLength(0);
    });

    it('should correctly validate when pit partially blocks path', () => {
      const level = {
        ...createTestLevel(4, 4, [], [[1, 1]]),
        stars: [{ x: 2, y: 2 }],
        start: { x: 0, y: 0 },
        goal: { x: 3, y: 3 },
      };
      const errors = validateLevel(level);
      expect(errors).toHaveLength(0);
    });

    it('should correctly validate when walls force a longer path', () => {
      const level = {
        ...createTestLevel(5, 5, [
          [1, 0],
          [1, 1],
          [1, 2],
          [3, 2],
          [3, 3],
          [3, 4],
        ]),
        stars: [
          { x: 0, y: 4 },
          { x: 4, y: 0 },
        ],
        start: { x: 0, y: 0 },
        goal: { x: 4, y: 4 },
      };
      const errors = validateLevel(level);
      expect(errors).toHaveLength(0);
    });
  });

  describe('pit-specific edge cases', () => {
    it('should detect a star on a pit even if surrounded by walkable cells', () => {
      const level = {
        ...createTestLevel(5, 5, [], [[2, 2]]),
        stars: [{ x: 2, y: 2 }],
      };
      const errors = validateLevel(level);
      expect(errors.some((e) => e.includes('陷阱上'))).toBe(true);
      expect(errors.some((e) => e.includes('(2, 2)'))).toBe(true);
    });

    it('should detect unreachable stars when pits form a barrier', () => {
      const level = {
        ...createTestLevel(6, 6, [], [
          [3, 0],
          [3, 1],
          [3, 2],
          [3, 3],
          [3, 4],
          [3, 5],
        ]),
        stars: [
          { x: 1, y: 1 },
          { x: 5, y: 4 },
        ],
      };
      const errors = validateLevel(level);
      expect(errors).toContain('以下 1 颗星星无法到达：(5, 4)');
    });

    it('should allow stars adjacent to pits but not on them', () => {
      const level = {
        ...createTestLevel(4, 4, [], [[2, 2]]),
        stars: [
          { x: 1, y: 2 },
          { x: 2, y: 1 },
        ],
      };
      const errors = validateLevel(level);
      const pitErrors = errors.filter((e) => e.includes('陷阱'));
      expect(pitErrors).toHaveLength(0);
    });
  });
});
