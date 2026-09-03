'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  BookOpen,
  Brain,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Compass,
  Code2,
  Clock,
  Layers,
  Flame,
  Plus,
  TreePine,
  Binary,
  Globe,
  Sliders,
} from 'lucide-react';
import { getUserProfile, getDefaultStudyPlan, generateStudyPlan, completeRoadmapNode } from '@/lib/api';
import { StudyPlan, LearningPathNode } from '@/types';
import { RoadmapTree } from '@/components/dashboard/RoadmapTree';

export default function StudentDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [activeTab, setActiveTab] = useState<'roadmap' | 'history' | 'weak_nodes'>('roadmap');
  const [selectedTrack, setSelectedTrack] = useState<'greentech' | 'aiml' | 'custom'>('greentech');
  const [loading, setLoading] = useState(true);

  // New Roadmap Form State
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [customTopic, setCustomTopic] = useState('');
  const [customTimeframe, setCustomTimeframe] = useState('7_days');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        // 1. Fetch User Profile
        const resProf = await getUserProfile('default_user');
        if (resProf.profile && resProf.profile.user_id) {
          setProfile(resProf.profile);
        } else {
          setProfile({
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
              {
                topic: 'Atmospheric Carbon Cycles & Radiative Forcing',
                mastery_percentage: 96.0,
                timestamp: '2026-09-02T22:30:00Z',
              },
              {
                topic: 'Attention Mechanism in Transformers',
                mastery_percentage: 94.0,
                timestamp: '2026-09-02T23:15:00Z',
              },
              {
                topic: 'Renewable Energy Grid Storage',
                mastery_percentage: 92.5,
                timestamp: '2026-09-03T00:10:00Z',
              },
            ],
          });
        }

        // 2. Load Default Study Plan Track
        const resPlan = await getDefaultStudyPlan('greentech');
        if (resPlan.plan) {
          setStudyPlan(resPlan.plan);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
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
      if (res.plan) {
        setStudyPlan(res.plan);
      }
    } catch (e) {
      console.error('Failed to switch track:', e);
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
      console.error('Failed to generate study plan:', err);
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
      if (res.plan) {
        setStudyPlan(res.plan);
      }
    } catch (err) {
      // Local fallback toggle
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
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="px-6 py-4 bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-600/30">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold text-white tracking-tight">Synapse AI</span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded">
                  Study Planner & Memory
                </span>
              </div>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewPlanModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Plan New Learning Track
          </button>

          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-950/50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Start Instant Lesson
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 sm:p-8 space-y-8">
        {/* Welcome & Key Metrics Banner */}
        <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-950 border border-slate-800 shadow-2xl overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-indigo-400 font-semibold uppercase tracking-wider mb-1">
                <Flame className="w-4 h-4 text-amber-400" />
                Persistent Cognitive Profile
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                Welcome back, {profile?.name || 'Learner'}!
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
                Synapse structures your learning goals into multi-day sequential roadmaps, remembers your past misconception nodes, and adapts every lesson plan to your cognitive strengths.
              </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3 shrink-0">
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
                <div className="text-xs text-slate-400 font-medium">Mastery</div>
                <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5">
                  {overallScore}%
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
                <div className="text-xs text-slate-400 font-medium">Sessions</div>
                <div className="text-xl sm:text-2xl font-black text-indigo-400 mt-0.5">
                  {totalSessions}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
                <div className="text-xs text-slate-400 font-medium">Topics</div>
                <div className="text-xl sm:text-2xl font-black text-amber-400 mt-0.5">
                  {topicsCount}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('roadmap')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'roadmap'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              AI Skill Tree Roadmap
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'history'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Mastery History ({profile?.learning_history?.length || 0})
            </button>

            <button
              onClick={() => setActiveTab('weak_nodes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'weak_nodes'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Weak Nodes & Strengths
            </button>
          </div>

          {activeTab === 'roadmap' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 hidden sm:inline">Curated Tracks:</span>
              <button
                onClick={() => handleSwitchTrack('greentech')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  selectedTrack === 'greentech'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                🌿 GreenTech Hackathon
              </button>

              <button
                onClick={() => handleSwitchTrack('aiml')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  selectedTrack === 'aiml'
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                ⚡ AI & Transformers
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Tab Body */}
        {activeTab === 'roadmap' && (
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <RoadmapTree
              studyPlan={studyPlan}
              onLaunchNode={handleLaunchNode}
              onToggleComplete={handleToggleComplete}
            />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              Completed Socratic Learning Sessions
            </h3>

            <div className="space-y-3">
              {profile?.learning_history && profile.learning_history.length > 0 ? (
                profile.learning_history.map((hist: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-100">
                          {hist.topic}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {new Date(hist.timestamp || Date.now()).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        {hist.mastery_percentage}%
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No completed lessons yet.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'weak_nodes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cognitive Strengths */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Verified Cognitive Strengths
              </h3>
              <div className="space-y-2">
                {profile?.strong_concepts && profile.strong_concepts.length > 0 ? (
                  profile.strong_concepts.map((concept: string, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-200 flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{concept}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">Complete lessons to populate strengths.</p>
                )}
              </div>
            </div>

            {/* Weak Nodes */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  Targeted Revision Areas
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                  Memory Active
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Concepts identified where misconceptions occurred. Future curricula will automatically scaffold these:
              </p>
              <div className="space-y-2">
                {profile?.weak_concepts && profile.weak_concepts.length > 0 ? (
                  profile.weak_concepts.map((weak: string, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      <div className="flex-1 font-medium">{weak}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No persistent weak nodes recorded.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal: Generate New AI Study Plan */}
      <AnimatePresence>
        {showNewPlanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Generate AI Learning Track</h3>
                    <p className="text-xs text-slate-400">Decompose any topic into a multi-day skill tree</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleGenerateCustomPlan} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    Subject or Broad Topic
                  </label>
                  <input
                    type="text"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="e.g. Distributed Systems Architecture, Quantum Machine Learning..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    Study Timeframe
                  </label>
                  <select
                    value={customTimeframe}
                    onChange={(e) => setCustomTimeframe(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="3_days">3 Days Intensive Sprint</option>
                    <option value="7_days">7 Days Mastery Track</option>
                    <option value="14_days">14 Days Deep Curriculum</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowNewPlanModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isGeneratingPlan}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-lg shadow-indigo-950/50"
                  >
                    {isGeneratingPlan ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Generating Roadmap...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Synthesize Learning Track
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Developer Portfolio Watermark */}
      <footer className="py-6 px-6 border-t border-slate-900 bg-slate-950 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <Code2 className="w-4 h-4 text-indigo-400" />
        <span>
          Developed by <strong className="text-slate-300">Madhav Zanwar (madhav_builds)</strong> — AIML Student | Problem Solver | Tech Enthusiast
        </span>
      </footer>
    </div>
  );
}
