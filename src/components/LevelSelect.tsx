import React, { useMemo } from 'react';
import type { Level } from '../engine/types';
import { LEVELS } from '../engine/levels';
import { loadProgress, isLevelUnlocked } from '../engine/storage';
import { getDifficultyBgClass, getDifficultyLabel } from '../engine/difficultyEvaluator';

type SourceFilter = 'all' | 'main' | 'custom';
type DifficultyFilter = number;

interface LevelSelectProps {
  onSelectLevel: (level: Level) => void;
  onOpenEditor: () => void;
  onImportLevel: () => void;
  customLevels: Level[];
}

const DIFFICULTY_RANGES: { value: DifficultyFilter; label: string; icon: string }[] = [
  { value: 0, label: '全部难度', icon: '📊' },
  { value: 1, label: '入门', icon: '🟢' },
  { value: 2, label: '简单', icon: '🔵' },
  { value: 3, label: '普通', icon: '🟣' },
  { value: 4, label: '中等', icon: '🟠' },
  { value: 5, label: '困难', icon: '🔴' },
];

const DifficultyBadge: React.FC<{ difficulty: number }> = ({ difficulty }) => {
  const d = Math.max(1, Math.min(8, difficulty));
  const bgClass = getDifficultyBgClass(d);
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${bgClass}`}>
      {'★'.repeat(Math.min(d, 5))}
    </span>
  );
};

export const LevelSelect: React.FC<LevelSelectProps> = ({
  onSelectLevel,
  onOpenEditor,
  onImportLevel,
  customLevels,
}) => {
  const progress = useMemo(() => loadProgress(), []);
  const allLevels = useMemo(() => [...LEVELS, ...customLevels], [customLevels]);

  const [sourceFilter, setSourceFilter] = React.useState<SourceFilter>('all');
  const [difficultyFilter, setDifficultyFilter] = React.useState<DifficultyFilter>(0);

  const sourceFiltered = useMemo(() => {
    if (sourceFilter === 'main') return LEVELS;
    if (sourceFilter === 'custom') return customLevels;
    return allLevels;
  }, [sourceFilter, LEVELS, customLevels, allLevels]);

  const displayedLevels = useMemo(() => {
    if (difficultyFilter === 0) return sourceFiltered;
    return sourceFiltered.filter((l) => {
      const d = Math.max(1, Math.min(8, l.difficulty));
      if (difficultyFilter === 1) return d <= 2;
      if (difficultyFilter === 2) return d === 2 || d === 3;
      if (difficultyFilter === 3) return d === 3 || d === 4;
      if (difficultyFilter === 4) return d === 4 || d === 5;
      if (difficultyFilter === 5) return d >= 5;
      return true;
    });
  }, [sourceFiltered, difficultyFilter]);

  const totalCompleted = useMemo(() => {
    return LEVELS.filter((l) => progress[l.id]?.completed).length;
  }, [progress]);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="game-card p-8 mb-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-6xl">🤖</span>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                CodeRobot
              </h1>
              <p className="text-gray-500 mt-1">图形化编程解谜游戏</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 mt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600">
                {totalCompleted}/{LEVELS.length}
              </div>
              <div className="text-sm text-gray-500">关卡完成</div>
            </div>
            <div className="w-px h-12 bg-gray-200" />
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-500">
                {LEVELS.reduce((acc, l) => acc + (progress[l.id]?.starsCollected || 0), 0)}
                /
                {LEVELS.reduce((acc, l) => acc + l.stars.length, 0)}
              </div>
              <div className="text-sm text-gray-500">星星收集</div>
            </div>
            <div className="w-px h-12 bg-gray-200" />
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-500">{customLevels.length}</div>
              <div className="text-sm text-gray-500">自定义关卡</div>
            </div>
          </div>

          <div className="flex gap-4 justify-center mt-8">
            <button onClick={onOpenEditor} className="btn-primary">
              🎨 关卡编辑器
            </button>
            <button onClick={onImportLevel} className="btn-secondary">
              📥 导入关卡
            </button>
          </div>
        </div>

        <div className="game-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">选择关卡</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setSourceFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${sourceFilter === 'all' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                全部
              </button>
              <button
                onClick={() => setSourceFilter('main')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${sourceFilter === 'main' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                官方
              </button>
              <button
                onClick={() => setSourceFilter('custom')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${sourceFilter === 'custom' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                自定义
              </button>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-gray-500 font-medium">按难度筛选：</span>
              {difficultyFilter !== 0 && (
                <span className="text-xs text-gray-400">
                  （{displayedLevels.length} 个关卡）
                </span>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {DIFFICULTY_RANGES.map((range) => (
                <button
                  key={range.value}
                  onClick={() => setDifficultyFilter(range.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border
                    ${difficultyFilter === range.value
                      ? getDifficultyBgClass(range.value || 1) + ' shadow-sm'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                >
                  {range.icon} {range.label}
                </button>
              ))}
            </div>
          </div>

          {displayedLevels.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-6xl mb-4">📭</div>
              {difficultyFilter !== 0 ? (
                <>
                  <p>当前筛选条件下没有关卡</p>
                  <button
                    onClick={() => setDifficultyFilter(0)}
                    className="text-primary-500 hover:text-primary-600 text-sm mt-2 underline"
                  >
                    清除难度筛选
                  </button>
                </>
              ) : (
                <>
                  <p>暂无{sourceFilter === 'custom' ? '自定义' : ''}关卡</p>
                  {sourceFilter === 'custom' && (
                    <p className="text-sm mt-2">使用关卡编辑器创建你的第一个关卡吧！</p>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {displayedLevels.map((level) => {
                const levelProgress = progress[level.id];
                const unlocked = isLevelUnlocked(level.id, allLevels) || customLevels.some(l => l.id === level.id);
                const completed = levelProgress?.completed;
                const isCustom = customLevels.some(l => l.id === level.id);

                return (
                  <button
                    key={level.id}
                    onClick={() => unlocked && onSelectLevel(level)}
                    disabled={!unlocked}
                    className={`
                      relative p-4 rounded-xl border-2 transition-all duration-200
                      ${unlocked
                        ? 'bg-white hover:scale-105 hover:shadow-lg cursor-pointer border-gray-200 hover:border-primary-400'
                        : 'bg-gray-100 cursor-not-allowed border-gray-200 opacity-60'
                      }
                      ${completed ? 'border-green-400 bg-green-50/30' : ''}
                    `}
                  >
                    {isCustom && (
                      <span className="absolute top-1 right-1 text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">
                        自定义
                      </span>
                    )}

                    <div className="flex items-start justify-between mb-2">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold shadow-md">
                        {unlocked ? (
                          isCustom ? '✎' : level.id.split('-')[1] || '?'
                        ) : (
                          '🔒'
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <DifficultyBadge difficulty={level.difficulty} />
                        <span className="text-[10px] text-gray-400">{getDifficultyLabel(level.difficulty)}</span>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-gray-800 text-left truncate mb-1">
                      {level.name}
                    </h3>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex gap-0.5">
                        {level.stars.length > 0 ? (
                          Array.from({ length: level.stars.length }).map((_, i) => (
                            <span
                              key={i}
                              className={`text-sm ${
                                (levelProgress?.starsCollected || 0) > i
                                  ? 'text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            >
                              ★
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">无星</span>
                        )}
                      </div>
                      {completed && (
                        <span className="text-green-500 text-sm">✓</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="text-center mt-8 text-white/70 text-sm">
          💡 提示：使用拖拽指令块的方式编程，控制机器人到达终点并收集所有星星
        </div>
      </div>
    </div>
  );
};

export default LevelSelect;
