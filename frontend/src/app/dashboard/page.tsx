'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Compass,
  Clock,
  Plus,
  X,
} from 'lucide-react';
import { getUserProfile, getDefaultStudyPlan, generateStudyPlan, completeRoadmapNode } from '@/lib/api';
import { LearningHistoryItem, LearningPathNode, LearningProfile, StudyPlan } from '@/types';
import { RoadmapTree } from '@/components/dashboard/RoadmapTree';

const FALLBACK_PROFILE: LearningProfile = {
  name: 'Learner',
  overall_score: 94.5,
  total_sessions: 3,
  topics_studied: [
    'Atmospheric Carbon Cycles & Radiative Forcing',
    'Attention Mechanism in Transformers',
    'Renewable Energy Grid Storage',
  ],
  strong_concepts: [
    'Stefan-Boltzmann Radiation Feedback',
    'Query/Key Matrix Multiplications',
    'Solid-State Battery Intermittency',
  ],
  weak_concepts: [
    'Direct Air Capture Desorption Enthalpy',
    'Inverse Scaling in High Dimensions',
  ],
  learning_history: [
    { topic: 'Atmospheric Carbon Cycles & Radiative Forcing', mastery_percentage: 96.0, timestamp: '2026-09-02T22:30:00Z' },
    { topic: 'Attention Mechanism in Transformers', mastery_percentage: 94.0, timestamp: '2026-09-02T23:15:00Z' },
    { topic: 'Renewable Energy Grid Storage', mastery_percentage: 92.5, timestamp: '2026-09-03T00:10:00Z' },
  ],
};

export default function StudentDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<LearningProfile | null>(null);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [activeTab, setActiveTab] = useState<'roadmap' | 'history' | 'weak_nodes'>('roadmap');
  const [selectedTrack, setSelectedTrack] = useState<'greentech' | 'aiml' | 'custom'>('greentech');
  const [loading, setLoading] = useState(true);

  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [customTopic, setCustomTopic] = useState('');
  const [customTimeframe, setCustomTimeframe] = useState('7_days');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const resProf = await getUserProfile('default_user');
        if (resProf.profile && resProf.profile.user_id) {
          setProfile(resProf.profile);
        } else {
          setProfile(FALLBACK_PROFILE);
        }
        const resPlan = await getDefaultStudyPlan('greentech');
        if (resPlan.plan) {
          setStudyPlan(resPlan.plan);
        }
      } catch (err) {
        console.warn('Failed to load dashboard data:', err);
        setProfile(FALLBACK_PROFILE);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSwitchTrack = async (trackKey: 'greentech' | 'aiml') => {
    setSelectedTrack(trackKey);
    try {
      setLoading(true);
      const res = await getDefaultStudyPlan(trackKey);
      if (res.plan) { setStudyPlan(res.plan); }
    } catch (e) {
      console.warn('Failed to switch track:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCustomPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTopic.trim()) return;
    setIsGeneratingPlan(true);
    try {
      const res = await generateStudyPlan({
        target_topic: customTopic,
        timeframe: customTimeframe,
        educational_level: 'Intermediate',
        language: 'English',
      });
      if (res.plan) {
        setStudyPlan(res.plan);
        setSelectedTrack('custom');
        setShowNewPlanModal(false);
        setActiveTab('roadmap');
      }
    } catch (err) {
      console.warn('Failed to generate study plan:', err);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleLaunchNode = (node: LearningPathNode) => {
    router.push(
      `/classroom?topic=${encodeURIComponent(node.title)}&time=${node.estimated_minutes}&level=Intermediate`
    );
  };

  const handleToggleComplete = async (nodeId: string) => {
    if (!studyPlan) return;
    try {
      const res = await completeRoadmapNode(studyPlan.plan_id, nodeId);
      if (res.plan) { setStudyPlan(res.plan); }
    } catch (err) {
      const updatedNodes = studyPlan.nodes.map((n) =>
        n.node_id === nodeId ? { ...n, is_completed: !n.is_completed } : n
      );
      setStudyPlan({ ...studyPlan, nodes: updatedNodes });
    }
  };

  const overallScore = profile?.overall_score || 94.5;
  const totalSessions = profile?.total_sessions || profile?.learning_history?.length || 3;
  const topicsCount = profile?.topics_studied?.length || 3;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Inter']">
      {/* Navigation */}
      <nav className="relative z-20 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full border-b border-slate-200">
        <Link href="/" className="flex items-center gap-1">
          <span className="font-['Instrument_Serif'] text-2xl tracking-tight text-slate-900">
            Synapse<sup className="text-[10px]">®</sup>
          </span>
          <span className="ml-3 text-[11px] uppercase tracking-[0.12em] text-slate-500 font-medium hidden sm:inline">
            Telemetry & Dashboard
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/classroom"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
          >
            Enter Classroom
          </Link>
          <button
            onClick={() => setShowNewPlanModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            New Track
          </button>
          <Link
            href="/"
            className="px-5 py-2 rounded-full text-xs uppercase tracking-[0.12em] text-white bg-slate-900 hover:bg-slate-800 font-medium transition-transform hover:scale-[1.02] shadow-sm"
          >
            Home
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 sm:px-8 py-10 space-y-10">
        {/* Welcome Banner */}
        <div className="animate-fade-rise">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-medium mb-2">
            Persistent Cognitive Profile
          </p>
          <h1 className="font-['Instrument_Serif'] text-4xl sm:text-5xl text-slate-900 tracking-tight mb-3">
            Welcome back, {profile?.name || 'Learner'}.
          </h1>
          <p className="text-sm text-slate-600 font-light max-w-2xl leading-relaxed">
            Synapse structures your goals into multi-day sequential roadmaps, remembers past misconception nodes,
            and adapts every lesson plan to your cognitive strengths.
          </p>

          {/* Stats Row */}
          <div className="flex items-center gap-6 mt-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-medium text-slate-900 font-['Instrument_Serif']">{overallScore}%</span>
              <span className="text-[11px] uppercase tracking-wider text-slate-500">Mastery</span>
            </div>
            <div className="w-px h-6 bg-slate-200" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-medium text-slate-900 font-['Instrument_Serif']">{totalSessions}</span>
              <span className="text-[11px] uppercase tracking-wider text-slate-500">Sessions</span>
            </div>
            <div className="w-px h-6 bg-slate-200" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-medium text-slate-900 font-['Instrument_Serif']">{topicsCount}</span>
              <span className="text-[11px] uppercase tracking-wider text-slate-500">Topics</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 animate-fade-rise-delay">
          <div className="flex items-center gap-1">
            {(['roadmap', 'history', 'weak_nodes'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-full text-xs font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'roadmap' ? 'Roadmap' : tab === 'history' ? `History (${profile?.learning_history?.length || 0})` : 'Strengths & Gaps'}
              </button>
            ))}
          </div>

          {activeTab === 'roadmap' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 hidden sm:inline mr-1">Tracks:</span>
              {(['greentech', 'aiml'] as const).map((track) => (
                <button
                  key={track}
                  onClick={() => handleSwitchTrack(track)}
                  className={`px-3.5 py-1.5 rounded-full text-[11px] font-medium border transition-colors ${
                    selectedTrack === track
                      ? 'bg-slate-200/80 text-slate-900 border-slate-300 font-medium'
                      : 'text-slate-600 border-transparent hover:text-slate-900'
                  }`}
                >
                  {track === 'greentech' ? '🌿 GreenTech' : '⚡ AI & Transformers'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tab Content */}
        <div className="animate-fade-rise-delay-2">
          {activeTab === 'roadmap' && (
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
              <RoadmapTree
                studyPlan={studyPlan}
                onLaunchNode={handleLaunchNode}
                onToggleComplete={handleToggleComplete}
              />
            </div>
          )}

          {activeTab === 'history' && (
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-['Instrument_Serif'] text-xl text-slate-900 mb-4">Completed Sessions</h3>
              <div className="space-y-3">
                {profile?.learning_history && profile.learning_history.length > 0 ? (
                  profile.learning_history.map((hist: LearningHistoryItem, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-slate-900">{hist.topic}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {new Date(hist.timestamp || Date.now()).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {hist.mastery_percentage}%
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No completed lessons yet.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'weak_nodes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Strengths */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-['Instrument_Serif'] text-lg text-slate-900">Verified Strengths</h3>
                <div className="space-y-2">
                  {profile?.strong_concepts && profile.strong_concepts.length > 0 ? (
                    profile.strong_concepts.map((concept: string, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 flex items-center gap-2 font-light"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{concept}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">Complete lessons to populate strengths.</p>
                  )}
                </div>
              </div>

              {/* Weak Nodes */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-['Instrument_Serif'] text-lg text-slate-900">Targeted Revision</h3>
                  <span className="text-[10px] font-medium px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full uppercase tracking-wider">
                    Memory Active
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-light leading-relaxed">
                  Concepts where misconceptions occurred. Future curricula will automatically scaffold these.
                </p>
                <div className="space-y-2">
                  {profile?.weak_concepts && profile.weak_concepts.length > 0 ? (
                    profile.weak_concepts.map((weak: string, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 flex items-start gap-2.5 font-light"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        <span>{weak}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">No persistent weak nodes recorded.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Generate New Plan Modal */}
      <AnimatePresence>
        {showNewPlanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setShowNewPlanModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-8 space-y-6 shadow-2xl"
            >
              <button
                onClick={() => setShowNewPlanModal(false)}
                className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-900 transition-colors hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <h3 className="font-['Instrument_Serif'] text-2xl text-slate-900 mb-1">New learning track</h3>
                <p className="text-sm text-slate-600 font-light">Decompose any topic into a multi-day skill tree.</p>
              </div>

              <form onSubmit={handleGenerateCustomPlan} className="space-y-5">
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.15em] text-slate-500 font-medium mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="e.g. Distributed Systems, Quantum ML..."
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-slate-800 transition-colors font-light"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.15em] text-slate-500 font-medium mb-2">
                    Timeframe
                  </label>
                  <select
                    value={customTimeframe}
                    onChange={(e) => setCustomTimeframe(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-slate-800 transition-colors"
                  >
                    <option value="3_days">3 Days</option>
                    <option value="7_days">7 Days</option>
                    <option value="14_days">14 Days</option>
                  </select>
                </div>
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowNewPlanModal(false)}
                    className="px-5 py-2.5 rounded-full text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isGeneratingPlan}
                    className="px-6 py-2.5 rounded-full text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-transform hover:scale-[1.02] flex items-center gap-2 shadow-sm"
                  >
                    {isGeneratingPlan ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Generate
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
