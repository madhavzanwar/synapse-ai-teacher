'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Lock,
  Play,
  Clock,
  Sparkles,
  ArrowUpRight,
  Compass,
} from 'lucide-react';
import { StudyPlan, LearningPathNode } from '@/types';

interface RoadmapTreeProps {
  studyPlan: StudyPlan | null;
  onLaunchNode: (node: LearningPathNode) => void;
  onToggleComplete?: (nodeId: string) => void;
}

export const RoadmapTree: React.FC<RoadmapTreeProps> = ({
  studyPlan,
  onLaunchNode,
  onToggleComplete,
}) => {
  if (!studyPlan || !studyPlan.nodes || studyPlan.nodes.length === 0) {
    return (
      <div className="p-8 rounded-3xl liquid-glass-subtle text-center text-neutral-500 text-xs">
        <Compass className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
        No active study plan loaded. Generate an AI roadmap above to begin.
      </div>
    );
  }

  const nodes = studyPlan.nodes;
  const completedCount = nodes.filter((n) => n.is_completed).length;
  const progressPercent = Math.round((completedCount / nodes.length) * 100);

  return (
    <div className="space-y-6">
      {/* Track Header & Progress Bar */}
      <div className="p-5 rounded-2xl liquid-glass-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-[0.1em] bg-white/[0.05] text-neutral-300 border border-white/[0.08]">
              {studyPlan.timeframe.replace('_', ' ')} Timeline
            </span>
            <span className="text-xs text-neutral-500 font-mono">
              {studyPlan.total_days} Days · {nodes.length} Milestones
            </span>
          </div>
          <h3 className="text-base font-['Instrument_Serif'] text-white">{studyPlan.target_topic}</h3>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.12em] font-medium text-neutral-500">
              Progress
            </div>
            <div className="text-sm font-medium text-neutral-200">
              {completedCount} of {nodes.length} ({progressPercent}%)
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-neutral-300 font-medium text-xs">
            {progressPercent}%
          </div>
        </div>
      </div>

      {/* Vertical Skill Tree Timeline */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-[19px] sm:before:left-[27px] before:top-4 before:bottom-4 before:w-px before:bg-gradient-to-b before:from-white/20 before:via-white/[0.06] before:to-transparent">
        <AnimatePresence>
          {nodes.map((node, index) => {
            const isCompleted = node.is_completed;
            const isUnlocked = node.is_unlocked;
            const isCurrent = isUnlocked && !isCompleted;

            return (
              <motion.div
                key={node.node_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
                className="relative flex items-start gap-4 group"
              >
                {/* Node Status Indicator Pin */}
                <div className="relative z-10 -ml-6 sm:-ml-8 shrink-0">
                  {isCompleted ? (
                    <div className="w-9 h-9 rounded-full bg-white/[0.08] border border-white/20 flex items-center justify-center text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  ) : isCurrent ? (
                    <div className="w-9 h-9 rounded-full bg-white/10 border border-white/30 flex items-center justify-center text-white shadow-[0_0_20px_rgba(255,255,255,0.15)] animate-pulse">
                      <Play className="w-4 h-4 ml-0.5" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-neutral-600">
                      <Lock className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Milestone Content Card */}
                <div
                  className={`flex-1 p-5 rounded-2xl transition-all duration-200 ${
                    isCompleted
                      ? 'liquid-glass-subtle'
                      : isCurrent
                      ? 'liquid-glass-strong shadow-xl'
                      : 'bg-white/[0.01] border border-white/[0.04] opacity-50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium font-mono bg-white/[0.05] text-neutral-400 border border-white/[0.06]">
                        DAY {node.day_number} · STEP {index + 1}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-neutral-500">
                        <Clock className="w-3 h-3" />
                        {node.estimated_minutes} min
                      </span>
                    </div>

                    <div>
                      {isCompleted ? (
                        <span className="px-2.5 py-0.5 text-[10px] font-medium text-emerald-300 bg-white/[0.03] border border-white/[0.08] rounded-full">
                          Mastered
                        </span>
                      ) : isCurrent ? (
                        <span className="px-2.5 py-0.5 text-[10px] font-medium text-white bg-white/[0.06] border border-white/[0.12] rounded-full flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Ready
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 text-[10px] font-medium text-neutral-600 bg-white/[0.02] border border-white/[0.04] rounded-full">
                          Locked
                        </span>
                      )}
                    </div>
                  </div>

                  <h4 className="text-sm sm:text-base font-medium text-white mb-1.5">{node.title}</h4>
                  <p className="text-xs text-neutral-400 leading-relaxed mb-3.5 font-light">
                    {node.description}
                  </p>

                  {node.target_concepts && node.target_concepts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {node.target_concepts.map((concept, cIdx) => (
                        <span
                          key={cIdx}
                          className="px-2 py-0.5 rounded-full text-[10px] font-light bg-white/[0.03] border border-white/[0.06] text-neutral-400"
                        >
                          {concept}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                    {isUnlocked ? (
                      <button
                        onClick={() => onLaunchNode(node)}
                        className="flex items-center gap-2 liquid-glass rounded-full px-5 py-2 text-xs font-medium text-white transition-transform hover:scale-[1.03] active:scale-[0.98] group/btn"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{isCompleted ? 'Review' : 'Start Lesson'}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-neutral-600 font-light">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Complete preceding milestone</span>
                      </div>
                    )}

                    {onToggleComplete && isUnlocked && (
                      <button
                        onClick={() => onToggleComplete(node.node_id)}
                        className="text-[11px] font-light text-neutral-500 hover:text-neutral-300 transition-colors"
                      >
                        {isCompleted ? 'Mark Incomplete' : 'Simulate Complete'}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
