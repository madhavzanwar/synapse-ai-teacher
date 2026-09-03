'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from 'recharts';
import {
  Award,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Download,
  RotateCcw,
  BookOpen,
  Compass,
  Code2,
  FileText,
  Layers,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { MasteryReport } from '@/types';
import { exportStudyMaterials, getAnkiDownloadUrl, getNotesDownloadUrl } from '@/lib/api';

interface MasteryReportModalProps {
  report: MasteryReport | null;
  isOpen: boolean;
  onClose?: () => void;
  onRestart?: () => void;
}

export const MasteryReportModal: React.FC<MasteryReportModalProps> = ({
  report,
  isOpen,
  onClose,
  onRestart,
}) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'flashcards'>('analytics');
  const [studyMaterials, setStudyMaterials] = useState<any>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  useEffect(() => {
    if (report && isOpen) {
      async function fetchMaterials() {
        try {
          setLoadingMaterials(true);
          const data = await exportStudyMaterials(report!.session_id);
          setStudyMaterials(data);
        } catch (e) {
          console.error('Failed to fetch study materials:', e);
        } finally {
          setLoadingMaterials(false);
        }
      }
      fetchMaterials();
    }
  }, [report, isOpen]);

  if (!isOpen || !report) return null;

  const radarData = report.concept_breakdown || [
    { subject: 'Mathematical Foundations', score: 92, fullMark: 100 },
    { subject: 'Conceptual Intuition', score: 96, fullMark: 100 },
    { subject: 'Diagnostic Adaptation', score: 88, fullMark: 100 },
    { subject: 'Problem Solving', score: 94, fullMark: 100 },
    { subject: 'First-Principles Rigor', score: 90, fullMark: 100 },
  ];

  const flashcards = studyMaterials?.flashcards || [
    {
      id: 'fc-1',
      front: `What is the core intuition behind ${report.topic}?`,
      back: report.summary_feedback,
      tag: 'Core_Concept',
      is_weak_concept_targeted: false,
    },
  ];

  const currentCard = flashcards[currentCardIndex] || flashcards[0];

  const handleNextCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev + 1) % flashcards.length);
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-xl overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header Banner */}
          <div className="relative p-6 sm:p-8 bg-gradient-to-r from-indigo-950 via-slate-900 to-emerald-950 border-b border-slate-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-950/50">
                  <Award className="w-8 h-8 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Curriculum Mastered
                    </span>
                    <span className="text-xs text-slate-400">Session ID: {report.session_id.slice(0, 8)}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                    Mastery Certificate & Study Hub
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium">Topic: {report.topic}</p>
                </div>
              </div>

              {/* Overall Score Dial */}
              <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-900/90 border border-slate-700/80">
                <div className="text-right">
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Mastery Score</div>
                  <div className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400">
                    {report.overall_mastery_percentage}%
                  </div>
                </div>
                <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
              </div>
            </div>

            {/* Tab Selector */}
            <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/80">
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                  activeTab === 'analytics'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                Mastery Analytics & Radar
              </button>

              <button
                onClick={() => setActiveTab('flashcards')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                  activeTab === 'flashcards'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Smart Flashcards & Notes Export ({flashcards.length})
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-6">
            {activeTab === 'analytics' ? (
              <>
                {/* Socratic Feedback Summary */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed">
                  <span className="font-semibold text-indigo-400">Executive Summary: </span>
                  {report.summary_feedback}
                </div>

                {/* Grid: Knowledge Radar Chart + Module Mastery Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Radar Chart (6 cols) */}
                  <div className="lg:col-span-6 p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col items-center">
                    <h3 className="text-sm font-semibold text-slate-200 self-start mb-2 flex items-center gap-2">
                      <Compass className="w-4 h-4 text-indigo-400" />
                      Cognitive Knowledge Radar
                    </h3>
                    <div className="w-full h-64 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                          <PolarGrid stroke="#334155" />
                          <PolarAngleAxis
                            dataKey="subject"
                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                          />
                          <PolarRadiusAxis
                            angle={30}
                            domain={[0, 100]}
                            tick={{ fill: '#64748b', fontSize: 9 }}
                          />
                          <Radar
                            name="Proficiency"
                            dataKey="score"
                            stroke="#6366f1"
                            fill="#6366f1"
                            fillOpacity={0.45}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              borderColor: '#334155',
                              borderRadius: '0.75rem',
                              color: '#f8fafc',
                              fontSize: '12px',
                            }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Strengths & Targeted Reviews (6 cols) */}
                  <div className="lg:col-span-6 flex flex-col gap-4">
                    {/* Strengths */}
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2.5 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Demonstrated Conceptual Strengths
                      </h4>
                      <ul className="space-y-2">
                        {report.strengths.map((str, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                            <span>{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Areas for Review */}
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2.5 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        Targeted Review & Misconceptions Remediated
                      </h4>
                      <ul className="space-y-2">
                        {report.areas_for_review.map((area, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                            <span>{area}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Actionable Next Steps */}
                {report.actionable_next_steps && (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/40 to-slate-950/60 border border-indigo-500/20">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-300 mb-3 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-400" />
                      Recommended Actionable Learning Next Steps
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {report.actionable_next_steps.map((step, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed"
                        >
                          <span className="inline-block px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] mb-1.5">
                            Step {idx + 1}
                          </span>
                          <p>{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Flashcards & Notes Tab */
              <div className="space-y-6">
                {/* Flashcard Interactive Flip Card */}
                <div className="flex flex-col items-center">
                  <div className="w-full max-w-lg mb-2 flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Card {currentCardIndex + 1} of {flashcards.length}
                    </span>
                    {currentCard.is_weak_concept_targeted && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-400" />
                        Targeted Weak Node
                      </span>
                    )}
                  </div>

                  <motion.div
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="w-full max-w-lg min-h-[220px] p-6 rounded-3xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/40 cursor-pointer shadow-xl flex flex-col justify-between transition-all select-none"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider mb-3">
                        <span className={isFlipped ? 'text-emerald-400' : 'text-indigo-400'}>
                          {isFlipped ? 'Answer / Explanation' : 'Prompt / Question'}
                        </span>
                        <span className="text-slate-500 font-mono">{currentCard.tag}</span>
                      </div>

                      <p className="text-sm sm:text-base font-medium text-slate-200 leading-relaxed whitespace-pre-line">
                        {isFlipped ? currentCard.back : currentCard.front}
                      </p>
                    </div>

                    <div className="text-center text-[11px] text-slate-500 pt-4 border-t border-slate-800/80">
                      Click card to flip
                    </div>
                  </motion.div>

                  {/* Navigation Arrows */}
                  <div className="flex items-center gap-4 mt-4">
                    <button
                      onClick={handlePrevCard}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setIsFlipped(!isFlipped)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
                    >
                      Flip Card
                    </button>
                    <button
                      onClick={handleNextCard}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Export Buttons Grid */}
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Download Study Assets
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Export structured Markdown study guides and CSV flashcards directly formatted for Anki & Quizlet.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <a
                      href={getAnkiDownloadUrl(report.session_id)}
                      download
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Anki CSV (.csv)
                    </a>

                    <a
                      href={getNotesDownloadUrl(report.session_id)}
                      download
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Notes Guide (.md)
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer with Developer Portfolio Branding */}
          <div className="p-6 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Developer Portfolio Watermark */}
            <div className="flex items-center gap-2 text-slate-400 text-xs font-sans text-center sm:text-left">
              <Code2 className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                Developed by <strong className="text-slate-200">Madhav Zanwar (madhav_builds)</strong> — AIML Student | Problem Solver | Tech Enthusiast
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {onRestart && (
                <button
                  onClick={onRestart}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  New Topic
                </button>
              )}

              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-950/50"
              >
                <Download className="w-3.5 h-3.5" />
                Export Certificate
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
