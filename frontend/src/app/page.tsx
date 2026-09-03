'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  Sparkles,
  UploadCloud,
  Clock,
  Globe,
  Award,
  ArrowRight,
  Cpu,
  Atom,
  Binary,
  CheckCircle2,
  Volume2,
  UserCheck,
  Zap,
  Code2,
  Terminal,
  HeartHandshake,
} from 'lucide-react';
import {
  StudentProfile,
  EducationalLevel,
  LanguageCode,
  TimeBudget,
  TeacherPersona,
} from '@/types';
import { createClassroomSession, uploadDocument } from '@/lib/api';

const PRESET_TOPICS = [
  {
    title: 'Attention Mechanism in Transformers',
    icon: <Cpu className="w-4 h-4 text-indigo-400" />,
    level: 'Intermediate' as EducationalLevel,
    time: '20' as TimeBudget,
  },
  {
    title: 'Backpropagation from First Principles',
    icon: <Binary className="w-4 h-4 text-sky-400" />,
    level: 'Beginner' as EducationalLevel,
    time: '20' as TimeBudget,
  },
  {
    title: 'Quantum Superposition & Qubits',
    icon: <Atom className="w-4 h-4 text-emerald-400" />,
    level: 'Intermediate' as EducationalLevel,
    time: '5' as TimeBudget,
  },
  {
    title: 'CRISPR-Cas9 Gene Editing Architecture',
    icon: <Sparkles className="w-4 h-4 text-amber-400" />,
    level: 'Advanced' as EducationalLevel,
    time: '20' as TimeBudget,
  },
];

const TEACHER_PERSONAS: Array<{
  id: TeacherPersona;
  name: string;
  role: string;
  badge: string;
  tagline: string;
  traits: string[];
  sampleSpeech: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'mentor',
    name: 'Dr. Sophia',
    role: 'The Socratic Mentor',
    badge: 'Recommended / Concept-First',
    tagline: 'Warm, patient, intuitive everyday analogies & Socratic questioning.',
    traits: ['Patient', 'Analogical', 'Socratic Guidance'],
    sampleSpeech: 'Hello! I am Dr. Sophia. Together, we will build crystal-clear mental models from everyday intuitions.',
    icon: <HeartHandshake className="w-5 h-5 text-indigo-400" />,
  },
  {
    id: 'tech_lead',
    name: 'Alex Chen',
    role: 'The Senior Tech Lead',
    badge: 'Advanced / Rigorous',
    tagline: 'Direct, first-principles, production tradeoffs & systems architecture.',
    traits: ['First-Principles', 'Code-First', 'Production Tradeoffs'],
    sampleSpeech: 'Alex Chen here. No fluff — we will trace asymptotic complexity, GPU memory tradeoffs, and production architectures.',
    icon: <Terminal className="w-5 h-5 text-cyan-400" />,
  },
  {
    id: 'coach',
    name: 'Coach Marcus',
    role: 'The Fast-Paced Coach',
    badge: 'High-Yield / 5-Min Drills',
    tagline: 'High-energy, rapid-fire drills, bottom-line facts & exam mastery.',
    traits: ['High Energy', 'Rapid Drills', 'Bottom-Line Takeaways'],
    sampleSpeech: 'Coach Marcus ready! We are here to lock down high-yield takeaways and master every checkpoint with 100% velocity.',
    icon: <Zap className="w-5 h-5 text-amber-400" />,
  },
];

export default function HomePage() {
  const router = useRouter();
  const [topic, setTopic] = useState('Attention Mechanism in Transformers');
  const [educationalLevel, setEducationalLevel] = useState<EducationalLevel>('Intermediate');
  const [language, setLanguage] = useState<LanguageCode>('Hinglish');
  const [timeBudget, setTimeBudget] = useState<TimeBudget>('20');
  const [instructorPersona, setInstructorPersona] = useState<TeacherPersona>('mentor');
  const [uploadedDocId, setUploadedDocId] = useState<string | null>(null);
  const [uploadedDocName, setUploadedDocName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await uploadDocument(file);
      if (res.success && res.document_id) {
        setUploadedDocId(res.document_id);
        setUploadedDocName(res.filename);
      }
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePreviewVoice = (persona: typeof TEACHER_PERSONAS[0], e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setPlayingAudioId(persona.id);
      const utterance = new SpeechSynthesisUtterance(persona.sampleSpeech);
      utterance.rate = persona.id === 'coach' ? 1.15 : persona.id === 'tech_lead' ? 1.05 : 0.98;
      utterance.pitch = persona.id === 'coach' ? 1.08 : persona.id === 'tech_lead' ? 0.95 : 1.02;
      utterance.onend = () => setPlayingAudioId(null);
      utterance.onerror = () => setPlayingAudioId(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleStartLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsStarting(true);
    try {
      const profile: StudentProfile = {
        target_topic: topic,
        educational_level: educationalLevel,
        language: language,
        available_time_minutes: timeBudget,
        learning_style: 'visual-intuitive',
        instructor_persona: instructorPersona,
        uploaded_document_ids: uploadedDocId ? [uploadedDocId] : [],
      };

      const res = await createClassroomSession(profile);
      if (res.session_id) {
        router.push(
          `/classroom?sessionId=${res.session_id}&topic=${encodeURIComponent(topic)}&lang=${language}&level=${educationalLevel}&persona=${instructorPersona}`
        );
      }
    } catch (err) {
      console.error('Failed to create classroom session:', err);
      // Fallback: navigate with mock ID
      const fallbackId = `local-${Date.now()}`;
      router.push(
        `/classroom?sessionId=${fallbackId}&topic=${encodeURIComponent(topic)}&lang=${language}&level=${educationalLevel}&persona=${instructorPersona}`
      );
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between blackboard-grid">
      {/* Navbar */}
      <header className="px-6 py-4 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-950/40">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              Synapse AI Teacher
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                Hackathon 2026
              </span>
            </h1>
            <p className="text-xs text-slate-400">Adaptive Multimodal Video Educator</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
          >
            <Award className="w-3.5 h-3.5 text-indigo-400" />
            <span>Learner Dashboard</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8 flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Human-Like Multimodal Pedagogical Engine
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
            What would you like to master today?
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Choose your AI Instructor persona, upload optional lecture notes, and experience live smart whiteboard teaching with Socratic feedback.
          </p>
        </motion.div>

        {/* Configuration Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6"
        >
          <form onSubmit={handleStartLesson} className="space-y-6">
            {/* 1. Teacher Persona Selector Carousel */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2.5 flex items-center justify-between">
                <span>Choose Your Instructor Persona</span>
                <span className="text-[11px] text-indigo-400 lowercase font-normal">
                  Click voice preview to listen
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {TEACHER_PERSONAS.map((persona) => {
                  const isSelected = instructorPersona === persona.id;
                  const isPlaying = playingAudioId === persona.id;

                  return (
                    <div
                      key={persona.id}
                      onClick={() => setInstructorPersona(persona.id)}
                      className={`relative p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-950/50'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-700">
                              {persona.icon}
                            </div>
                            <div>
                              <h3 className="text-xs font-bold text-white leading-tight">
                                {persona.name}
                              </h3>
                              <p className="text-[10px] text-slate-400">{persona.role}</p>
                            </div>
                          </div>

                          {isSelected && (
                            <UserCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                          )}
                        </div>

                        <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                          {persona.tagline}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                        <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                          {persona.badge.split('/')[0]}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => handlePreviewVoice(persona, e)}
                          className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                            isPlaying
                              ? 'bg-indigo-600 text-white animate-pulse'
                              : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                          }`}
                          title="Preview Instructor Voice"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span className="text-[10px]">{isPlaying ? 'Playing...' : 'Voice'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Topic Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Subject or Topic
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Attention Mechanism in Transformers, Quantum Cryptography..."
                className="w-full px-4 py-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                required
              />

              {/* Preset Topic Chips */}
              <div className="flex flex-wrap gap-2 mt-3">
                {PRESET_TOPICS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTopic(preset.title);
                      setEducationalLevel(preset.level);
                      setTimeBudget(preset.time);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      topic === preset.title
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                  >
                    {preset.icon}
                    <span>{preset.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Custom Notes / PDF Upload Dropzone */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Grounding Knowledge (Optional PDF / Lecture Notes)
              </label>
              <div className="relative border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 text-center transition-all bg-slate-950/40">
                <input
                  type="file"
                  accept=".pdf,.docx,.pptx,.txt,.md"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {uploadedDocName ? (
                  <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Grounded with: {uploadedDocName}</span>
                  </div>
                ) : isUploading ? (
                  <div className="flex items-center justify-center gap-2 text-indigo-400 text-xs">
                    <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    <span>Parsing & Chunking Document...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
                    <UploadCloud className="w-4 h-4 text-slate-500" />
                    <span>Drop your lecture PDF, PPTX, DOCX, or notes for tailored grounding</span>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Configuration Selectors: Level, Language, Time */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Educational Level */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  Target Level
                </label>
                <select
                  value={educationalLevel}
                  onChange={(e) => setEducationalLevel(e.target.value as EducationalLevel)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="Beginner">Beginner (Foundations)</option>
                  <option value="Intermediate">Intermediate (Undergraduate)</option>
                  <option value="Advanced">Advanced (Research/Industry)</option>
                </select>
              </div>

              {/* Language */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-400" />
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="Hinglish">Hinglish (Natural Blend)</option>
                  <option value="English">English</option>
                  <option value="Hindi">Hindi (हिंदी)</option>
                  <option value="Spanish">Spanish (Español)</option>
                </select>
              </div>

              {/* Time Budget */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  Time Budget
                </label>
                <select
                  value={timeBudget}
                  onChange={(e) => setTimeBudget(e.target.value as TimeBudget)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="5">5 Minutes (Quick Byte)</option>
                  <option value="20">20 Minutes (Deep Dive)</option>
                  <option value="60">60 Minutes (Masterclass)</option>
                  <option value="7_days_plan">7 Days Mastery Plan</option>
                </select>
              </div>
            </div>

            {/* Launch CTA */}
            <button
              type="submit"
              disabled={isStarting}
              className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-xl shadow-indigo-950/50 hover:shadow-indigo-600/30 group"
            >
              {isStarting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Synthesizing Curriculum & Whiteboard...
                </>
              ) : (
                <>
                  <span>Begin Interactive Classroom Session</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </main>

      {/* Footer with Developer Attribution */}
      <footer className="py-4 px-6 border-t border-slate-900 bg-slate-950 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <Code2 className="w-4 h-4 text-indigo-400" />
        <span>
          Developed by <strong className="text-slate-300">Madhav Zanwar (madhav_builds)</strong> — AIML Student | Problem Solver | Tech Enthusiast
        </span>
      </footer>
    </div>
  );
}
