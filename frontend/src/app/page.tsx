'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
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
  Sparkles,
  X,
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
    icon: <Cpu className="w-3.5 h-3.5" />,
    level: 'Intermediate' as EducationalLevel,
    time: '20' as TimeBudget,
  },
  {
    title: 'Backpropagation from First Principles',
    icon: <Binary className="w-3.5 h-3.5" />,
    level: 'Beginner' as EducationalLevel,
    time: '20' as TimeBudget,
  },
  {
    title: 'Quantum Superposition & Qubits',
    icon: <Atom className="w-3.5 h-3.5" />,
    level: 'Intermediate' as EducationalLevel,
    time: '5' as TimeBudget,
  },
  {
    title: 'CRISPR-Cas9 Gene Editing Architecture',
    icon: <Sparkles className="w-3.5 h-3.5" />,
    level: 'Advanced' as EducationalLevel,
    time: '20' as TimeBudget,
  },
];

const TEACHER_PERSONAS: Array<{
  id: TeacherPersona;
  name: string;
  role: string;
  tagline: string;
  sampleSpeech: string;
}> = [
  {
    id: 'mentor',
    name: 'Dr. Sophia',
    role: 'Socratic Mentor',
    tagline: 'Patient, intuitive analogies, guided questioning.',
    sampleSpeech: 'Hello! I am Dr. Sophia. Together, we will build crystal-clear mental models from everyday intuitions.',
  },
  {
    id: 'tech_lead',
    name: 'Alex Chen',
    role: 'Tech Lead',
    tagline: 'First-principles, production tradeoffs, rigorous.',
    sampleSpeech: 'Alex Chen here. No fluff — we will trace asymptotic complexity, GPU memory tradeoffs, and production architectures.',
  },
  {
    id: 'coach',
    name: 'Coach Marcus',
    role: 'Fast-Paced Coach',
    tagline: 'High-energy drills, bottom-line takeaways.',
    sampleSpeech: 'Coach Marcus ready! We are here to lock down high-yield takeaways and master every checkpoint with 100% velocity.',
  },
];

export default function HomePage() {
  const router = useRouter();
  const [showConfigurator, setShowConfigurator] = useState(false);
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
        let detected = res.title || (res as any).detected_title;
        if (!detected && file.name) {
          detected = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
        }
        if (detected) {
          const cleanTitle = detected
            .replace(/^[0-9a-f-]{36}_?/i, '')
            .replace(/[_-]+/g, ' ')
            .replace(/\b\w/g, (c: string) => c.toUpperCase())
            .trim();
          setTopic(cleanTitle);
        }
      }
    } catch (err) {
      console.warn('File upload error:', err);
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
      const docQuery = uploadedDocId ? `&docId=${encodeURIComponent(uploadedDocId)}` : '';
      if (res.session_id) {
        router.push(
          `/classroom?sessionId=${res.session_id}&topic=${encodeURIComponent(topic)}&lang=${language}&level=${educationalLevel}&persona=${instructorPersona}${docQuery}`
        );
      }
    } catch (err) {
      console.warn('Failed to create classroom session:', err);
      const fallbackId = `local-${Date.now()}`;
      const docQuery = uploadedDocId ? `&docId=${encodeURIComponent(uploadedDocId)}` : '';
      router.push(
        `/classroom?sessionId=${fallbackId}&topic=${encodeURIComponent(topic)}&lang=${language}&level=${educationalLevel}&persona=${instructorPersona}${docQuery}`
      );
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="dark-hero relative min-h-screen flex flex-col overflow-hidden bg-[hsl(201,100%,13%)] text-white">
      {/* ─── Fullscreen Looping Background Video ─── */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none brightness-[0.85] contrast-[1.05]"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
      />

      {/* ─── Vignette + Gradient Overlay ─── */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-t from-[hsl(201,100%,13%)]/80 via-transparent to-[hsl(201,100%,13%)]/40" />
      <div className="fixed inset-0 z-0 pointer-events-none vignette-overlay opacity-60" />

      {/* ─── Navigation Bar ─── */}
      <nav className="relative z-20 flex items-center justify-between px-8 py-7 max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-1">
          <span className="font-['Instrument_Serif'] text-3xl tracking-tight text-white">
            Synapse<sup className="text-xs">®</sup>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/classroom" className="text-sm text-neutral-300 hover:text-white transition-colors tracking-wide">
            Live Classroom
          </Link>
          <Link href="/dashboard" className="text-sm text-neutral-300 hover:text-white transition-colors tracking-wide">
            Analytics & Progress
          </Link>
          <button
            onClick={() => setShowConfigurator(true)}
            className="text-sm text-neutral-300 hover:text-white transition-colors tracking-wide cursor-pointer"
          >
            Custom Curriculum
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/classroom"
            className="px-5 py-2 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-xs tracking-wide text-white transition-all font-medium"
          >
            Classroom
          </Link>
          <Link
            href="/dashboard"
            className="liquid-glass rounded-full px-5 py-2 text-xs uppercase tracking-[0.15em] text-white transition-transform hover:scale-[1.03] active:scale-[0.98] font-medium"
          >
            Dashboard
          </Link>
        </div>
      </nav>

      {/* ─── Hero Content ─── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-24 text-center max-w-5xl mx-auto">
        <h1 className="text-5xl sm:text-7xl md:text-8xl leading-[0.94] tracking-[-0.03em] font-normal font-['Instrument_Serif'] animate-fade-rise text-white">
          Where understanding{' '}
          <em className="not-italic text-neutral-400">rises through the silence.</em>
        </h1>

        <p className="text-neutral-300/80 text-base sm:text-lg max-w-2xl mx-auto mt-8 leading-relaxed font-light animate-fade-rise-delay">
          An autonomous AI educator engineered for deep focus. Upload any complex text, research
          paper, or domain, and enter an adaptive, video-guided visual lecture that listens and
          evolves with you.
        </p>

        {/* Hero Section Connected Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-10 animate-fade-rise-delay-2">
          <button
            onClick={() => setShowConfigurator(true)}
            className="liquid-glass rounded-full px-8 py-4 text-sm font-medium tracking-wide text-white hover:scale-[1.03] active:scale-[0.98] transition-transform cursor-pointer shadow-lg shadow-white/5"
          >
            Begin Custom Journey
          </button>
          <Link
            href="/classroom"
            className="px-8 py-4 rounded-full bg-white text-slate-900 hover:bg-neutral-100 text-sm font-medium tracking-wide transition-transform hover:scale-[1.03] active:scale-[0.98] shadow-md"
          >
            Enter Classroom
          </Link>
          <Link
            href="/dashboard"
            className="px-7 py-4 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-sm font-medium tracking-wide text-neutral-200 hover:text-white transition-all backdrop-blur-md"
          >
            Mastery Dashboard
          </Link>
        </div>
      </main>

      {/* ─── Clean Footer ─── */}
      <footer className="relative z-10 py-6 text-center">
        <p className="font-['Inter'] text-xs uppercase tracking-[0.2em] text-neutral-400/60">
          Synapse® Multimodal Pedagogical Engine
        </p>
      </footer>

      {/* ─── Lesson Configurator Modal (Liquid Glass) ─── */}
      <AnimatePresence>
        {showConfigurator && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[hsl(201,100%,13%)]/70 backdrop-blur-sm"
              onClick={() => setShowConfigurator(false)}
            />

            {/* Modal Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto liquid-glass-strong rounded-3xl p-8 sm:p-10"
            >
              {/* Close */}
              <button
                onClick={() => setShowConfigurator(false)}
                className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-white transition-colors hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="font-['Instrument_Serif'] text-3xl sm:text-4xl text-white tracking-tight mb-1">
                Configure your session
              </h2>
              <p className="text-sm text-neutral-400 font-light mb-8">
                Select an instructor, define your subject, and begin.
              </p>

              <form onSubmit={handleStartLesson} className="space-y-7">
                {/* Instructor Persona */}
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.15em] text-neutral-400 font-medium mb-3">
                    Instructor
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {TEACHER_PERSONAS.map((persona) => {
                      const isSelected = instructorPersona === persona.id;
                      const isPlaying = playingAudioId === persona.id;
                      return (
                        <div
                          key={persona.id}
                          onClick={() => setInstructorPersona(persona.id)}
                          className={`relative p-4 rounded-2xl cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? 'liquid-glass-strong ring-1 ring-white/20'
                              : 'liquid-glass-subtle hover:bg-white/[0.03]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-white">{persona.name}</h3>
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-400 font-light leading-relaxed mb-3">
                            {persona.tagline}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => handlePreviewVoice(persona, e)}
                            className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${
                              isPlaying
                                ? 'text-white'
                                : 'text-neutral-500 hover:text-white'
                            }`}
                          >
                            <Volume2 className="w-3 h-3" />
                            {isPlaying ? 'Playing...' : 'Preview voice'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Subject / Topic */}
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.15em] text-neutral-400 font-medium mb-3">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Attention Mechanism in Transformers"
                    className="w-full px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-white/20 transition-colors font-light"
                    required
                  />
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
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                          topic === preset.title
                            ? 'bg-white/10 text-white border border-white/20'
                            : 'text-neutral-500 hover:text-neutral-300 border border-transparent hover:border-white/10'
                        }`}
                      >
                        {preset.icon}
                        <span>{preset.title}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Document Upload */}
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.15em] text-neutral-400 font-medium mb-3">
                    Grounding document <span className="normal-case text-neutral-600">(optional)</span>
                  </label>
                  <div className="relative rounded-2xl p-4 text-center transition-all liquid-glass-subtle hover:bg-white/[0.03] cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.docx,.pptx,.txt,.md"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {uploadedDocName ? (
                      <div className="flex items-center justify-center gap-2 text-emerald-300 text-xs font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Grounded with: {uploadedDocName}</span>
                      </div>
                    ) : isUploading ? (
                      <div className="flex items-center justify-center gap-2 text-neutral-400 text-xs">
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Parsing document...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-neutral-500 text-xs">
                        <UploadCloud className="w-4 h-4" />
                        <span>Drop your lecture PDF, PPTX, or notes for grounding</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Configuration Row */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.15em] text-neutral-400 font-medium mb-2">
                      Level
                    </label>
                    <select
                      value={educationalLevel}
                      onChange={(e) => setEducationalLevel(e.target.value as EducationalLevel)}
                      className="w-full px-3.5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-neutral-200 text-xs focus:outline-none focus:border-white/20 transition-colors"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.15em] text-neutral-400 font-medium mb-2">
                      Language
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                      className="w-full px-3.5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-neutral-200 text-xs focus:outline-none focus:border-white/20 transition-colors"
                    >
                      <option value="Hinglish">Hinglish</option>
                      <option value="English">English</option>
                      <option value="Hindi">Hindi (हिंदी)</option>
                      <option value="Spanish">Spanish</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.15em] text-neutral-400 font-medium mb-2">
                      Duration
                    </label>
                    <select
                      value={timeBudget}
                      onChange={(e) => setTimeBudget(e.target.value as TimeBudget)}
                      className="w-full px-3.5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-neutral-200 text-xs focus:outline-none focus:border-white/20 transition-colors"
                    >
                      <option value="5">5 min</option>
                      <option value="20">20 min</option>
                      <option value="60">60 min</option>
                      <option value="7_days_plan">7-Day Plan</option>
                    </select>
                  </div>
                </div>

                {/* Launch CTA */}
                <button
                  type="submit"
                  disabled={isStarting}
                  className="w-full liquid-glass rounded-full py-4 px-6 text-sm font-medium tracking-wide text-white disabled:opacity-50 transition-transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3 group"
                >
                  {isStarting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Synthesizing curriculum...</span>
                    </>
                  ) : (
                    <>
                      <span>Enter Classroom</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
