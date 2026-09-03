'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Clock,
  Globe,
  Award,
  ChevronRight,
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

  return (
    <header className="flex items-center justify-between px-6 py-3.5 bg-white/80 border-b border-slate-200/80 backdrop-blur-md z-20 text-slate-900">
      {/* Left: Brand & Topic */}
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-1 group">
          <span className="font-['Instrument_Serif'] text-2xl tracking-tight text-slate-900 group-hover:text-slate-700 transition-colors">
            Synapse<sup className="text-[10px]">®</sup>
          </span>
        </Link>

        <div className="h-4 w-px bg-slate-200" />

        <div className="flex items-center gap-2 max-w-md truncate">
          <span className="text-xs font-medium text-slate-700 truncate font-['Inter']">{topic}</span>
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
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all ${
                    isCurrent
                      ? 'bg-slate-900 border border-slate-900 text-white font-medium shadow-sm'
                      : isDone
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium'
                      : 'bg-slate-100 border border-slate-200 text-slate-400 font-light'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <span className="text-[11px] font-mono font-medium">{idx + 1}</span>
                  )}
                  <span className="max-w-[120px] truncate">{m.title}</span>
                </div>
                {idx < totalModules - 1 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Right: Badges & Live Timer */}
      <div className="flex items-center gap-3 font-['Inter']">
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-light">
          <Globe className="w-3.5 h-3.5 text-slate-500" />
          <span>{language}</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-light">
          <Award className="w-3.5 h-3.5 text-slate-500" />
          <span>{level}</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono font-medium">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>{formatTime(elapsedSeconds)}</span>
        </div>

        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 px-4 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors"
        >
          <Award className="w-3.5 h-3.5 text-slate-300" />
          <span>Dashboard</span>
        </Link>
      </div>
    </header>
  );
};
