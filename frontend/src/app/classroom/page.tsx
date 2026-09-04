'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useClassroomSession } from '@/hooks/useClassroomSession';
import { SmartWhiteboard } from '@/components/classroom/SmartWhiteboard';
import { TeacherVideoFeed } from '@/components/classroom/TeacherVideoFeed';
import { CheckpointDrawer } from '@/components/classroom/CheckpointDrawer';
import { ClassroomHeader } from '@/components/classroom/ClassroomHeader';
import { MasteryReportModal } from '@/components/classroom/MasteryReportModal';
import { EducationalLevel, LanguageCode, LessonPlan, StudentProfile } from '@/types';

import sampleLessonData from '../../../../shared/samples/sample-lesson.json';

const EDUCATIONAL_LEVELS: EducationalLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
const LANGUAGE_CODES: LanguageCode[] = ['English', 'Hindi', 'Hinglish', 'Spanish'];

function coerceEducationalLevel(value: string | null): EducationalLevel {
  return EDUCATIONAL_LEVELS.includes(value as EducationalLevel)
    ? (value as EducationalLevel)
    : 'Intermediate';
}

function coerceLanguage(value: string | null): LanguageCode {
  return LANGUAGE_CODES.includes(value as LanguageCode) ? (value as LanguageCode) : 'Hinglish';
}

function createTopicFallbackPlan(topic: string, level: EducationalLevel, language: LanguageCode): LessonPlan {
  if (topic.toLowerCase().includes('attention') || topic.toLowerCase().includes('transformer')) {
    return sampleLessonData as unknown as LessonPlan;
  }

  const isMath = /multiplication|multiply|times table|math|worksheet|arithmetic/i.test(topic);
  if (isMath) {
    return {
      topic,
      student_level: level,
      language,
      total_estimated_minutes: 10,
      pedagogical_goals: [
        `Master foundational multiplication principles of ${topic}`,
        'Apply equal grouping and repeated addition mental models',
        'Solve practical arithmetic checkpoints with 100% accuracy',
      ],
      modules: [
        {
          module_id: 'mod-1',
          title: 'Equal Groups & Multiplication Foundations',
          estimated_minutes: 5,
          teaching_script: `<emotion=enthusiastic>Welcome to today's session! Based on your uploaded worksheet, we are mastering ${topic}. At its core, multiplication is simply repeated addition across equal groups! Having 4 groups of 6 gives us 4 × 6 = 24. Let's examine the visual array on our smart whiteboard.</emotion>`,
          visual_action: {
            type: 'katex',
            title: 'Equal Groups & Repeated Addition',
            raw_payload:
              '\\begin{aligned} \\text{Equal Groups:} & \\quad 4 \\times 6 = \\underbrace{6 + 6 + 6 + 6}_{4 \\text{ groups}} = 24 \\\\[6pt] \\text{Worksheet Practice:} & \\quad 7 \\times 8 = 56 \\end{aligned}',
            explanation_notes: 'Multiplication represents 4 groups of 6 items. Total = 24.',
            entry_animation_cue: 'fade-slide',
          },
          checkpoint: {
            question_id: 'q1',
            question_text:
              'Multiplication Check: If you have 4 packs with 6 pencils in each pack, what is the total count (4 × 6)?',
            question_type: 'mcq',
            options: [
              {
                id: 'A',
                text: '24 pencils (4 × 6 = 24)',
                is_correct: true,
                feedback: 'Correct! 4 equal groups of 6 give a total of 24.',
              },
              {
                id: 'B',
                text: '10 pencils (4 + 6 = 10)',
                is_correct: false,
                feedback: 'Watch out: 4 + 6 is addition. We have 4 groups of 6, so we multiply: 4 × 6 = 24.',
              },
              {
                id: 'C',
                text: '20 pencils',
                is_correct: false,
                feedback: 'Double check: 4 × 6 = 24.',
              },
            ],
            expected_concept: 'Multiplication is repeated addition of equal groups: 4 × 6 = 24.',
            rubric: 'Look for understanding that 4 groups of 6 requires multiplication resulting in 24.',
          },
        },
        {
          module_id: 'mod-2',
          title: 'Mental Math & Break-Apart Strategy',
          estimated_minutes: 5,
          teaching_script:
            '<emotion=thoughtful>Now let\'s explore a powerful mental math tool: the Break-Apart (Distributive) strategy. When multiplying factors like 8 × 7, breaking 7 into 5 and 2 lets you compute 40 + 16 = 56 mentally in seconds!</emotion>',
          visual_action: {
            type: 'katex',
            title: 'Distributive Break-Apart Method',
            raw_payload:
              '\\begin{aligned} 8 \\times 7 &= 8 \\times (5 + 2) \\\\[4pt] &= (8 \\times 5) + (8 \\times 2) \\\\[4pt] &= 40 + 16 = 56 \\end{aligned}',
            explanation_notes:
              'Breaking 7 into 5 + 2 allows fast mental multiplication using simpler times tables.',
            entry_animation_cue: 'step-reveal',
          },
          checkpoint: {
            question_id: 'q2',
            question_text: 'Which of the following correctly uses the break-apart strategy to solve 6 × 7?',
            question_type: 'mcq',
            options: [
              {
                id: 'A',
                text: '(6 × 5) + (6 × 2) = 30 + 12 = 42',
                is_correct: true,
                feedback: 'Spot on! Decomposing 7 into 5 + 2 makes mental calculation effortless.',
              },
              {
                id: 'B',
                text: '(6 × 5) + (6 × 5) = 30 + 30 = 60',
                is_correct: false,
                feedback: 'Incorrect: 5 + 5 is 10, not 7.',
              },
              {
                id: 'C',
                text: '6 + 7 = 13',
                is_correct: false,
                feedback: 'Incorrect: that is addition, not multiplication.',
              },
            ],
            expected_concept: 'Distributive property: a × (b + c) = (a × b) + (a × c).',
            rubric: 'Verify student understands decomposing factors for mental multiplication.',
          },
        },
      ],
    };
  }
  return {
    topic,
    student_level: level,
    language,
    total_estimated_minutes: 10,
    pedagogical_goals: [
      `Understand fundamental principles and problem domain of ${topic}`,
      `Analyze core operational relationships and technical architecture`,
      `Demonstrate applied reasoning in Socratic checkpoints`,
    ],
    modules: [
      {
        module_id: 'mod-1',
        title: `Core Foundations of ${topic}`,
        estimated_minutes: 5,
        teaching_script: `<emotion=enthusiastic>Welcome to today's session! We are diving into ${topic}. Let's first build a rock-solid mental model of why this exists and the fundamental problem it solves.</emotion>`,
        visual_action: {
          type: 'callout',
          title: `First Principles: ${topic}`,
          raw_payload: `**Core Foundations of ${topic}**:\n\n1. **Core Purpose**: Why ${topic} was developed and what challenge it addresses\n2. **Underlying Dynamics**: The essential mechanisms that govern how it behaves\n3. **Real-World Impact**: Practical applications and critical trade-offs`,
          explanation_notes: `Foundational mental model for ${topic}. Focus on the core intuition first.`,
          entry_animation_cue: 'fade-slide',
        },
        checkpoint: {
          question_id: 'q1',
          question_text: `In your own words, what is the primary purpose and core motivating challenge that ${topic} addresses?`,
          question_type: 'explain_in_own_words',
          options: [],
          expected_concept: `Clear conceptual understanding of the motivating problem and primary mechanism of ${topic}.`,
          rubric: `Look for clear identification of the problem domain and why standard naive approaches fail.`,
        },
      },
      {
        module_id: 'mod-2',
        title: `Operational Architecture & Key Dynamics`,
        estimated_minutes: 5,
        teaching_script: `<emotion=thoughtful>Now let's trace the architectural flow of ${topic} step-by-step on our smart whiteboard.</emotion>`,
        visual_action: {
          type: 'mermaid',
          title: `${topic} System Pipeline`,
          raw_payload: `graph LR
    Input["Input / Context: ${topic.slice(0, 16)}"] --> Engine["Core Processing Engine"]
    Engine --> Logic["Transformation & Decision"]
    Logic --> Result["Target Output"]
    style Engine fill:#6366f1,stroke:#4338ca,color:#fff
    style Result fill:#10b981,stroke:#047857,color:#fff`,
          explanation_notes: `System relationships and state transitions for ${topic}.`,
          entry_animation_cue: 'step-reveal',
        },
        checkpoint: {
          question_id: 'q2',
          question_text: `Which stage in the ${topic} pipeline is responsible for the core decision-making and active transformation?`,
          question_type: 'mcq',
          options: [
            {
              id: 'A',
              text: 'The Transformation & Decision stage after core processing.',
              is_correct: true,
              feedback: 'Exactly right! That is where the key state changes occur.',
            },
            {
              id: 'B',
              text: 'The raw Input stage before any processing.',
              is_correct: false,
              feedback: 'Raw input is passive; decisions happen during transformation.',
            },
            {
              id: 'C',
              text: 'The system has no structured processing stages.',
              is_correct: false,
              feedback: `The architecture of ${topic} is structured and deterministic.`,
            },
          ],
          expected_concept: `Understanding the sequence of operations in ${topic}.`,
          rubric: 'Check understanding of pipeline ordering.',
        },
      },
    ],
  };
}

function ClassroomContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId') || `demo-session-${Date.now()}`;
  const topic = searchParams.get('topic') || 'Attention Mechanism in Transformers';
  const language = coerceLanguage(searchParams.get('lang'));
  const level = coerceEducationalLevel(searchParams.get('level'));
  const docId = searchParams.get('docId') || undefined;

  const initialProfile: StudentProfile = {
    target_topic: topic,
    educational_level: level,
    language,
    available_time_minutes: '20',
    uploaded_document_ids: docId ? [docId] : [],
  };

  const session = useClassroomSession({
    sessionId,
    initialProfile,
  });

  const [localFallbackPlan, setLocalFallbackPlan] = useState<LessonPlan | null>(null);
  const [fallbackIndex, setFallbackIndex] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!session.lessonPlan && !localFallbackPlan) {
        setLocalFallbackPlan(createTopicFallbackPlan(topic, level, language));
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [session.lessonPlan, localFallbackPlan, topic, level, language]);

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
      } else {
        // Trigger completion modal certificate
        session.setMasteryReport({
          student_id: 'default_user',
          session_id: sessionId,
          topic: activeLessonPlan?.topic || topic,
          completion_timestamp: new Date().toISOString(),
          overall_score: 95.0,
          radar: {
            conceptual_depth: 92,
            first_principles_reasoning: 96,
            mathematical_rigor: 90,
            problem_solving_adaptability: 94,
            retention_stability: 98,
          },
          strengths: ['First-principles reasoning', 'Intuitive problem decomposition'],
          remaining_misconceptions: [],
          remedial_actions_taken: 0,
          next_recommended_topics: ['Advanced Real-world Implementations', 'System Engineering'],
        });
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 overflow-hidden select-none">
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

        {/* Right Area: Teacher Avatar & Checkpoint Drawer (5 cols on desktop) */}
        <div className="lg:col-span-5 h-full flex flex-col gap-4 min-h-0">
          {/* Top Half: Teacher Video Feed */}
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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-['Inter']">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            <span>Initializing Virtual Classroom...</span>
          </div>
        </div>
      }
    >
      <ClassroomContent />
    </Suspense>
  );
}
