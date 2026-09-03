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
    <header className="flex items-center justify-between px-6 py-3.5 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-xl z-20">
      {/* Left: Brand & Home Link */}
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-slate-100 hover:text-indigo-400 transition-colors group"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-md shadow-indigo-950/40">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white group-hover:text-indigo-300">
              Synapse AI
            </h1>
            <span className="text-[10px] text-slate-400 font-medium">Adaptive Teacher</span>
          </div>
        </Link>

        <div className="h-5 w-px bg-slate-800" />

        {/* Topic Title */}
        <div className="flex items-center gap-2 max-w-md truncate">
          <span className="text-xs font-semibold text-slate-200 truncate">{topic}</span>
        </div>
      </div>

      {/* Center: Module Step Progress Timeline */}
      <div className="hidden md:flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          {lessonPlan?.modules.map((m, idx) => {
            const isDone = idx < currentModuleIndex;
            const isCurrent = idx === currentModuleIndex;
            return (
              <React.Fragment key={m.module_id}>
                <div
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    isCurrent
                      ? 'bg-indigo-600/30 border border-indigo-500 text-indigo-200 ring-1 ring-indigo-500/50'
                      : isDone
                      ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-900 border border-slate-800 text-slate-500'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <span className="text-[11px] font-bold">{idx + 1}</span>
                  )}
                  <span className="max-w-[120px] truncate">{m.title}</span>
                </div>
                {idx < totalModules - 1 && <ChevronRight className="w-3.5 h-3.5 text-slate-600" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Right: Badges & Live Timer */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs">
          <Globe className="w-3.5 h-3.5 text-indigo-400" />
          <span>{language}</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs">
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <span>{level}</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-xs font-mono">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatTime(elapsedSeconds)}</span>
        </div>

        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
        >
          <Award className="w-3.5 h-3.5 text-indigo-400" />
          <span>Dashboard</span>
        </Link>
      </div>
    </header>
  );
};
