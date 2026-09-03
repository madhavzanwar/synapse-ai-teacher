'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useClassroomSession } from '@/hooks/useClassroomSession';
import { SmartWhiteboard } from '@/components/classroom/SmartWhiteboard';
import { TeacherVideoFeed } from '@/components/classroom/TeacherVideoFeed';
import { CheckpointDrawer } from '@/components/classroom/CheckpointDrawer';
import { ClassroomHeader } from '@/components/classroom/ClassroomHeader';
import { MasteryReportModal } from '@/components/classroom/MasteryReportModal';
import { LessonPlan, StudentProfile } from '@/types';

// Standalone fallback sample lesson for instant preview
import sampleLessonData from '../../../../shared/samples/sample-lesson.json';

function ClassroomContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId') || `demo-session-${Date.now()}`;
  const topic = searchParams.get('topic') || 'Attention Mechanism in Transformers';
  const language = searchParams.get('lang') || 'Hinglish';
  const level = searchParams.get('level') || 'Intermediate';

  const initialProfile: StudentProfile = {
    target_topic: topic,
    educational_level: level as any,
    language: language as any,
    available_time_minutes: '20',
  };

  const session = useClassroomSession({
    sessionId,
    initialProfile,
  });

  // Local fallback state if backend WebSocket is offline
  const [localFallbackPlan, setLocalFallbackPlan] = useState<LessonPlan | null>(null);
  const [fallbackIndex, setFallbackIndex] = useState(0);

  useEffect(() => {
    // If after 1.5 seconds no backend lessonPlan arrived, load rich sample curriculum
    const timer = setTimeout(() => {
      if (!session.lessonPlan && !localFallbackPlan) {
        setLocalFallbackPlan(sampleLessonData as unknown as LessonPlan);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [session.lessonPlan, localFallbackPlan]);

  const activeLessonPlan = session.lessonPlan || localFallbackPlan;
  const currentModule = activeLessonPlan?.modules[session.lessonPlan ? session.currentModuleIndex : fallbackIndex];

  const activeVisual = session.currentVisual || currentModule?.visual_action || null;
  const activeScript = session.teacherScript || currentModule?.teaching_script || '';
  const activeCheckpoint = session.activeCheckpoint || currentModule?.checkpoint || null;

  const handleAdvanceModule = () => {
    if (session.lessonPlan) {
      session.advance();
    } else if (localFallbackPlan) {
      if (fallbackIndex < localFallbackPlan.modules.length - 1) {
        setFallbackIndex((prev) => prev + 1);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#090d16] text-slate-100 overflow-hidden select-none">
      {/* Top Classroom Navigation Bar */}
      <ClassroomHeader
        topic={topic}
        lessonPlan={activeLessonPlan}
        currentModuleIndex={session.lessonPlan ? session.currentModuleIndex : fallbackIndex}
        language={language}
        level={level}
      />

      {/* Primary Split-Screen Stage */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 min-h-0">
        {/* Left / Center Area: Smart Whiteboard (7 cols on desktop) */}
        <div className="lg:col-span-7 h-full flex flex-col min-h-0">
          <SmartWhiteboard
            visualAction={activeVisual}
            topicTitle={currentModule?.title || topic}
            isRemediating={session.isRemediating}
          />
        </div>

        {/* Right Area: Teacher Avatar & Socratic Checkpoint Drawer (5 cols on desktop) */}
        <div className="lg:col-span-5 h-full flex flex-col gap-4 min-h-0">
          {/* Top Half: Teacher Video Feed & Speech */}
          <div className="h-[45%] min-h-[240px]">
            <TeacherVideoFeed
              script={activeScript}
              isSpeaking={session.isTeacherSpeaking}
              isRemediating={session.isRemediating}
              onInterrupt={session.interruptTeacher}
              onSwitchLanguage={session.switchLanguage}
              language={session.currentLanguage}
            />
          </div>

          {/* Bottom Half: Checkpoint & Diagnostic Remediation */}
          <div className="flex-1 min-h-0">
            <CheckpointDrawer
              checkpoint={activeCheckpoint}
              sessionId={sessionId}
              moduleId={currentModule?.module_id || 'mod-1'}
              diagnostic={session.diagnosticResult}
              followUpCheckpoint={session.followUpCheckpoint}
              onSubmitAnswer={session.submitResponse}
              onSubmitFollowUp={session.submitFollowUpResponse}
              onAdvance={handleAdvanceModule}
              isEvaluating={session.isEvaluating}
            />
          </div>
        </div>
      </main>

      {/* End of Lesson Mastery Certificate Modal */}
      <MasteryReportModal
        report={session.masteryReport}
        isOpen={Boolean(session.masteryReport)}
        onRestart={() => router.push('/')}
      />
    </div>
  );
}

export default function ClassroomPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-slate-400">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span>Initializing Virtual Classroom...</span>
          </div>
        </div>
      }
    >
      <ClassroomContent />
    </Suspense>
  );
}
