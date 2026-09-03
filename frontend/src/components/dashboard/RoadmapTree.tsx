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
      <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 text-center text-slate-500 text-xs">
        <Compass className="w-8 h-8 text-slate-400 mx-auto mb-2" />
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
      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-[0.1em] bg-white text-slate-700 border border-slate-200">
              {studyPlan.timeframe.replace('_', ' ')} Timeline
            </span>
            <span className="text-xs text-slate-500 font-mono">
              {studyPlan.total_days} Days · {nodes.length} Milestones
            </span>
          </div>
          <h3 className="text-base font-['Instrument_Serif'] text-slate-900">{studyPlan.target_topic}</h3>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.12em] font-medium text-slate-500">
              Progress
            </div>
            <div className="text-sm font-medium text-slate-900">
              {completedCount} of {nodes.length} ({progressPercent}%)
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 font-medium text-xs shadow-sm">
            {progressPercent}%
          </div>
        </div>
      </div>

      {/* Vertical Skill Tree Timeline */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-[19px] sm:before:left-[27px] before:top-4 before:bottom-4 before:w-px before:bg-slate-200">
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
                    <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-300 flex items-center justify-center text-emerald-700 shadow-sm">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  ) : isCurrent ? (
                    <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-900 flex items-center justify-center text-white shadow-md animate-pulse">
                      <Play className="w-4 h-4 ml-0.5 fill-current" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Milestone Content Card */}
                <div
                  className={`flex-1 p-5 rounded-2xl transition-all duration-200 ${
                    isCompleted
                      ? 'bg-white border border-slate-200 shadow-sm'
                      : isCurrent
                      ? 'bg-white border-2 border-slate-900 shadow-md'
                      : 'bg-slate-50/60 border border-slate-200/60 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium font-mono bg-slate-100 text-slate-700 border border-slate-200">
                        DAY {node.day_number} · STEP {index + 1}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Clock className="w-3 h-3" />
                        {node.estimated_minutes} min
                      </span>
                    </div>

                    <div>
                      {isCompleted ? (
                        <span className="px-2.5 py-0.5 text-[10px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full">
                          Mastered
                        </span>
                      ) : isCurrent ? (
                        <span className="px-2.5 py-0.5 text-[10px] font-medium text-slate-900 bg-slate-100 border border-slate-300 rounded-full flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-slate-700" />
                          Ready
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 text-[10px] font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded-full">
                          Locked
                        </span>
                      )}
                    </div>
                  </div>

                  <h4 className="text-sm sm:text-base font-medium text-slate-900 mb-1.5">{node.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed mb-3.5 font-light">
                    {node.description}
                  </p>

                  {node.target_concepts && node.target_concepts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {node.target_concepts.map((concept, cIdx) => (
                        <span
                          key={cIdx}
                          className="px-2 py-0.5 rounded-full text-[10px] font-light bg-slate-100 border border-slate-200 text-slate-700"
                        >
                          {concept}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    {isUnlocked ? (
                      <button
                        onClick={() => onLaunchNode(node)}
                        className="flex items-center gap-2 rounded-full px-5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 transition-transform hover:scale-[1.02] shadow-sm group/btn"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{isCompleted ? 'Review' : 'Start Lesson'}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-light">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Complete preceding milestone</span>
                      </div>
                    )}

                    {onToggleComplete && isUnlocked && (
                      <button
                        onClick={() => onToggleComplete(node.node_id)}
                        className="text-[11px] font-light text-slate-400 hover:text-slate-700 transition-colors"
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
