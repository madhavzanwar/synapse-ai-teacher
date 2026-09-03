'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Lock,
  Play,
  Clock,
  Sparkles,
  ChevronRight,
  BookOpen,
  Layers,
  Award,
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
      <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center text-slate-400 text-xs">
        <Compass className="w-8 h-8 text-indigo-400 mx-auto mb-2 opacity-60" />
        No active study plan loaded. Generate an AI roadmap above to begin!
      </div>
    );
  }

  const nodes = studyPlan.nodes;
  const completedCount = nodes.filter((n) => n.is_completed).length;
  const progressPercent = Math.round((completedCount / nodes.length) * 100);

  return (
    <div className="space-y-6">
      {/* Track Header & Progress Bar */}
      <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {studyPlan.timeframe.replace('_', ' ').toUpperCase()} TIMELINE
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {studyPlan.total_days} Days / {nodes.length} Milestones
            </span>
          </div>
          <h3 className="text-base font-bold text-white">{studyPlan.target_topic}</h3>
        </div>

        {/* Progress Dial */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
              Curriculum Progress
            </div>
            <div className="text-sm font-bold text-emerald-400">
              {completedCount} of {nodes.length} Mastered ({progressPercent}%)
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
            {progressPercent}%
          </div>
        </div>
      </div>

      {/* Vertical Skill Tree Timeline */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-[19px] sm:before:left-[27px] before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-indigo-500 before:via-slate-800 before:to-slate-900">
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
                    <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.35)]">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  ) : isCurrent ? (
                    <div className="w-9 h-9 rounded-2xl bg-indigo-600 border-2 border-indigo-300 flex items-center justify-center text-white shadow-[0_0_20px_rgba(99,102,241,0.5)] animate-pulse">
                      <Play className="w-4 h-4 ml-0.5" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-2xl bg-slate-900 border-2 border-slate-700 flex items-center justify-center text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Milestone Content Card */}
                <div
                  className={`flex-1 p-5 rounded-3xl border transition-all duration-200 ${
                    isCompleted
                      ? 'bg-slate-950/60 border-emerald-500/30'
                      : isCurrent
                      ? 'bg-gradient-to-r from-indigo-950/50 to-slate-900 border-indigo-500/60 ring-1 ring-indigo-500/30 shadow-xl shadow-indigo-950/40'
                      : 'bg-slate-950/40 border-slate-800/80 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                          isCompleted
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : isCurrent
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        DAY {node.day_number} • STEP {index + 1}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                        <Clock className="w-3 h-3" />
                        {node.estimated_minutes} min
                      </span>
                    </div>

                    {/* Status Pill */}
                    <div>
                      {isCompleted ? (
                        <span className="px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 rounded-full">
                          Mastery Verified
                        </span>
                      ) : isCurrent ? (
                        <span className="px-2.5 py-0.5 text-[10px] font-bold text-indigo-300 bg-indigo-950/60 border border-indigo-500/40 rounded-full flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-indigo-400" />
                          Ready to Launch
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-900 border border-slate-800 rounded-full">
                          Locked (Requires Step {index})
                        </span>
                      )}
                    </div>
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-white mb-1.5">{node.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed mb-3.5">
                    {node.description}
                  </p>

                  {/* Target Concepts Pills */}
                  {node.target_concepts && node.target_concepts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {node.target_concepts.map((concept, cIdx) => (
                        <span
                          key={cIdx}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-900 border border-slate-800 text-slate-300"
                        >
                          {concept}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action CTA Row */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                    {isUnlocked ? (
                      <button
                        onClick={() => onLaunchNode(node)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md shadow-indigo-950/50 group/btn"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{isCompleted ? 'Review Micro-Lesson' : 'Start Micro-Lesson'}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Complete preceding milestone to unlock</span>
                      </div>
                    )}

                    {onToggleComplete && isUnlocked && (
                      <button
                        onClick={() => onToggleComplete(node.node_id)}
                        className="text-[11px] font-medium text-slate-400 hover:text-emerald-300 transition-colors"
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
