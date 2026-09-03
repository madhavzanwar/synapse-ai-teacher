'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Clock,
  Globe,
  Award,
  ChevronRight,
  Home,
  CheckCircle,
} from 'lucide-react';
import { LessonPlan } from '@/types';

interface ClassroomHeaderProps {
  topic: string;
  lessonPlan: LessonPlan | null;
  currentModuleIndex: number;
  language: string;
  level: string;
}

export const ClassroomHeader: React.FC<ClassroomHeaderProps> = ({
  topic,
  lessonPlan,
  currentModuleIndex,
  language,
  level,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const totalModules = lessonPlan?.modules.length || 1;
  const progressPercentage = Math.round(((currentModuleIndex + 1) / totalModules) * 100);

  return (
    <header className="flex items-center justify-between px-6 py-3.5 bg-white/[0.02] border-b border-white/[0.06] backdrop-blur-xl z-20">
      {/* ── Left: Brand + Topic ── */}
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2.5 text-neutral-100 hover:text-white transition-colors group">
          <span className="font-['Instrument_Serif'] text-xl text-white tracking-tight">Synapse</span>
        </Link>

        <div className="h-5 w-px bg-white/[0.08]" />

        <div className="flex items-center gap-2 max-w-md truncate">
          <span className="text-xs font-['Inter'] font-medium text-neutral-300 truncate">{topic}</span>
        </div>
      </div>

      {/* ── Center: Module Step Timeline ── */}
      <div className="hidden md:flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          {lessonPlan?.modules.map((m, idx) => {
            const isDone = idx < currentModuleIndex;
            const isCurrent = idx === currentModuleIndex;
            return (
              <React.Fragment key={m.module_id}>
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-['Inter'] font-medium transition-all ${
                  isCurrent
                    ? 'bg-white/10 border border-white/20 text-white ring-1 ring-white/10'
                    : isDone
                    ? 'bg-white/[0.05] border border-white/[0.1] text-emerald-300'
                    : 'bg-white/[0.03] border border-white/[0.06] text-neutral-500'
                }`}>
                  {isDone ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <span className="text-[11px] font-bold">{idx + 1}</span>
                  )}
                  <span className="max-w-[120px] truncate">{m.title}</span>
                </div>
                {idx < totalModules - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Right: Badges + Timer + Dashboard ── */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg liquid-glass-subtle text-neutral-300 text-xs font-['Inter']">
          <Globe className="w-3.5 h-3.5 text-neutral-400" />
          <span>{language}</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg liquid-glass-subtle text-neutral-300 text-xs font-['Inter']">
          <Award className="w-3.5 h-3.5 text-neutral-400" />
          <span>{level}</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg liquid-glass-subtle text-neutral-200 text-xs font-mono">
          <Clock className="w-3.5 h-3.5 text-neutral-400" />
          <span>{formatTime(elapsedSeconds)}</span>
        </div>

        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-neutral-300 hover:text-white text-xs font-['Inter'] font-medium transition-colors"
        >
          <Award className="w-3.5 h-3.5 text-neutral-400" />
          <span>Dashboard</span>
        </Link>
      </div>
    </header>
  );
};
