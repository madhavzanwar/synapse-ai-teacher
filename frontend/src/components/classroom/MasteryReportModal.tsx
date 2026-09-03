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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[hsl(201,100%,13%)]/80 backdrop-blur-xl overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl max-h-[92vh] flex flex-col liquid-glass-strong rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* Header Banner */}
          <div className="relative p-6 sm:p-8 bg-white/[0.02] border-b border-white/[0.06]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-white shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.06] text-emerald-300 border border-white/[0.12]">
                      Curriculum Mastered
                    </span>
                    <span className="text-xs text-neutral-500 font-mono">Session ID: {report.session_id.slice(0, 8)}</span>
                  </div>
                  <h2 className="font-['Instrument_Serif'] text-2xl sm:text-3xl text-white tracking-tight">
                    Certificate of Cognitive Mastery
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-300 font-light">Topic: {report.topic}</p>
                </div>
              </div>

              {/* Overall Score Dial */}
              <div className="flex items-center gap-3 px-5 py-3 rounded-2xl liquid-glass-subtle">
                <div className="text-right">
                  <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-medium">Mastery Score</div>
                  <div className="text-2xl sm:text-3xl font-['Instrument_Serif'] text-white">
                    {report.overall_mastery_percentage}%
                  </div>
                </div>
                <Sparkles className="w-5 h-5 text-neutral-300 animate-pulse" />
              </div>
            </div>

            {/* Tab Selector */}
            <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/[0.06]">
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'analytics'
                    ? 'liquid-glass text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                Mastery Analytics & Radar
              </button>

              <button
                onClick={() => setActiveTab('flashcards')}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'flashcards'
                    ? 'liquid-glass text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Smart Flashcards & Notes ({flashcards.length})
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-6">
            {activeTab === 'analytics' ? (
              <>
                {/* Socratic Feedback Summary */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs sm:text-sm text-neutral-300 leading-relaxed font-light">
                  <span className="font-medium text-white font-['Inter']">Executive Summary: </span>
                  {report.summary_feedback}
                </div>

                {/* Grid: Knowledge Radar Chart + Module Mastery Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Radar Chart (6 cols) */}
                  <div className="lg:col-span-6 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col items-center">
                    <h3 className="text-sm font-['Instrument_Serif'] text-white self-start mb-2 flex items-center gap-2">
                      <Compass className="w-4 h-4 text-neutral-300" />
                      Cognitive Knowledge Radar
                    </h3>
                    <div className="w-full h-64 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                          <PolarGrid stroke="rgba(255, 255, 255, 0.15)" />
                          <PolarAngleAxis
                            dataKey="subject"
                            tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'Inter' }}
                          />
                          <PolarRadiusAxis
                            angle={30}
                            domain={[0, 100]}
                            tick={{ fill: '#64748b', fontSize: 8 }}
                          />
                          <Radar
                            name="Proficiency"
                            dataKey="score"
                            stroke="rgba(255, 255, 255, 0.6)"
                            fill="rgba(255, 255, 255, 0.15)"
                            fillOpacity={0.45}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(201,100%,13%)',
                              borderColor: 'rgba(255, 255, 255, 0.15)',
                              borderRadius: '0.75rem',
                              color: '#F8FAFC',
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
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                      <h4 className="text-xs font-medium uppercase tracking-wider text-emerald-300 mb-2.5 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Demonstrated Conceptual Strengths
                      </h4>
                      <ul className="space-y-2">
                        {report.strengths.map((str, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-neutral-300 font-light">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                            <span>{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Areas for Review */}
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                      <h4 className="text-xs font-medium uppercase tracking-wider text-amber-300 mb-2.5 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        Targeted Review & Misconceptions Remediated
                      </h4>
                      <ul className="space-y-2">
                        {report.areas_for_review.map((area, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-neutral-300 font-light">
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
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                    <h4 className="text-xs font-medium uppercase tracking-wider text-neutral-300 mb-3 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-neutral-400" />
                      Recommended Next Steps
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {report.actionable_next_steps.map((step, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-neutral-300 leading-relaxed font-light"
                        >
                          <span className="inline-block px-2 py-0.5 rounded bg-white/[0.05] text-neutral-300 font-mono text-[10px] mb-1.5 border border-white/[0.08]">
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
                  <div className="w-full max-w-lg mb-2 flex items-center justify-between text-xs text-neutral-400 font-light">
                    <span>
                      Card {currentCardIndex + 1} of {flashcards.length}
                    </span>
                    {currentCard.is_weak_concept_targeted && (
                      <span className="px-2.5 py-0.5 text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-400" />
                        Targeted Weak Node
                      </span>
                    )}
                  </div>

                  <motion.div
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="w-full max-w-lg min-h-[220px] p-6 rounded-3xl liquid-glass-subtle hover:border-white/20 cursor-pointer shadow-xl flex flex-col justify-between transition-all select-none"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider mb-3">
                        <span className={isFlipped ? 'text-emerald-300' : 'text-neutral-400'}>
                          {isFlipped ? 'Answer / Explanation' : 'Prompt / Question'}
                        </span>
                        <span className="text-neutral-500 font-mono">{currentCard.tag}</span>
                      </div>

                      <p className="text-sm sm:text-base font-light text-neutral-200 leading-relaxed whitespace-pre-line font-['Inter']">
                        {isFlipped ? currentCard.back : currentCard.front}
                      </p>
                    </div>

                    <div className="text-center text-[11px] text-neutral-500 font-light pt-4 border-t border-white/[0.06]">
                      Click card to flip
                    </div>
                  </motion.div>

                  {/* Navigation Arrows */}
                  <div className="flex items-center gap-4 mt-4">
                    <button
                      onClick={handlePrevCard}
                      className="p-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 border border-white/[0.08] transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setIsFlipped(!isFlipped)}
                      className="px-4 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-neutral-300 border border-white/[0.08] transition-colors"
                    >
                      Flip Card
                    </button>
                    <button
                      onClick={handleNextCard}
                      className="p-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 border border-white/[0.08] transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Export Buttons Grid */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-medium uppercase tracking-wider text-neutral-200">
                      Download Study Assets
                    </h4>
                    <p className="text-xs text-neutral-400 mt-0.5 font-light">
                      Export structured Markdown study guides and CSV flashcards directly formatted for Anki & Quizlet.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <a
                      href={getAnkiDownloadUrl(report.session_id)}
                      download
                      className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-neutral-200 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5 text-neutral-300" />
                      Anki CSV (.csv)
                    </a>

                    <a
                      href={getNotesDownloadUrl(report.session_id)}
                      download
                      className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-neutral-200 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-neutral-300" />
                      Notes Guide (.md)
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer with Developer Portfolio Branding */}
          <div className="p-6 bg-white/[0.02] border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Developer Portfolio Watermark */}
            <div className="text-center sm:text-left">
              <p className="font-['Inter'] text-xs uppercase tracking-[0.2em] text-neutral-400">
                Developed by Madhav Zanwar (madhav_builds) — AIML Student | Problem Solver | Tech Enthusiast
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {onRestart && (
                <button
                  onClick={onRestart}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-neutral-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  New Topic
                </button>
              )}

              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 liquid-glass rounded-full px-5 py-2 text-xs font-medium text-white transition-transform hover:scale-[1.02]"
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
