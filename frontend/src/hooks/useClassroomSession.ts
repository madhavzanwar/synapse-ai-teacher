'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  LessonPlan,
  VisualAction,
  Checkpoint,
  DiagnosticEvaluation,
  MasteryReport,
  ClassroomEvent,
  StudentResponse,
  StudentProfile,
  LanguageCode,
} from '@/types';
import { submitAnswer, advanceCurriculum, getWebSocketUrl } from '@/lib/api';

interface UseClassroomSessionProps {
  sessionId: string;
  initialProfile?: StudentProfile;
}

export function useClassroomSession({ sessionId, initialProfile }: UseClassroomSessionProps) {
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [currentModuleIndex, setCurrentModuleIndex] = useState<number>(0);
  const [currentVisual, setCurrentVisual] = useState<VisualAction | null>(null);
  const [teacherScript, setTeacherScript] = useState<string>('');
  const [isTeacherSpeaking, setIsTeacherSpeaking] = useState<boolean>(false);
  const [activeCheckpoint, setActiveCheckpoint] = useState<Checkpoint | null>(null);
  const [followUpCheckpoint, setFollowUpCheckpoint] = useState<Checkpoint | null>(null);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticEvaluation | null>(null);
  const [masteryReport, setMasteryReport] = useState<MasteryReport | null>(null);
  const [isRemediating, setIsRemediating] = useState<boolean>(false);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(
    initialProfile?.language || 'English'
  );

  const wsRef = useRef<WebSocket | null>(null);

  // Handle incoming classroom event
  const handleClassroomEvent = useCallback((event: ClassroomEvent) => {
    console.log('[Classroom Event]', event.event_type, event.data);

    switch (event.event_type) {
      case 'CURRICULUM_READY':
        if (event.data?.lesson_plan) {
          setLessonPlan(event.data.lesson_plan);
        }
        break;

      case 'MODULE_START':
        if (typeof event.data?.module_index === 'number') {
          setCurrentModuleIndex(event.data.module_index);
        }
        setIsRemediating(false);
        setDiagnosticResult(null);
        setFollowUpCheckpoint(null);
        setIsEvaluating(false);
        break;

      case 'WHITEBOARD_UPDATE':
      case 'WHITEBOARD_REMEDIATION':
        if (event.data?.visual_action) {
          setCurrentVisual(event.data.visual_action);
        }
        break;

      case 'TEACHER_SPEAKING':
        if (event.data?.script) {
          setTeacherScript(event.data.script);
          setIsTeacherSpeaking(true);
          if (event.data.is_remediation) {
            setIsRemediating(true);
          }
        }
        break;

      case 'CHECKPOINT_TRIGGER':
        if (event.data?.checkpoint) {
          setActiveCheckpoint(event.data.checkpoint);
          setFollowUpCheckpoint(null);
        }
        break;

      case 'TEACHER_EVALUATING':
        setIsEvaluating(true);
        break;

      case 'DIAGNOSTIC_RESULT':
        setIsEvaluating(false);
        if (event.data?.diagnostic) {
          setDiagnosticResult(event.data.diagnostic);
        }
        break;

      case 'FOLLOWUP_CHECKPOINT':
        setIsEvaluating(false);
        if (event.data?.checkpoint) {
          setFollowUpCheckpoint(event.data.checkpoint);
          setIsRemediating(true);
        }
        break;

      case 'EMOTIONAL_INTERVENTION':
        setIsEvaluating(false);
        setIsRemediating(true);
        if (event.data?.diagnostic) {
          setDiagnosticResult(event.data.diagnostic);
        }
        if (event.data?.checkpoint) {
          setFollowUpCheckpoint(event.data.checkpoint);
        }
        break;

      case 'RESUME_CURRICULUM':
        setIsRemediating(false);
        setFollowUpCheckpoint(null);
        setDiagnosticResult(null);
        break;

      case 'LANGUAGE_SWITCHED':
        if (event.data?.new_language) {
          setCurrentLanguage(event.data.new_language);
        }
        break;

      case 'TEACHER_INTERRUPTED':
        setIsTeacherSpeaking(false);
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        break;

      case 'LESSON_COMPLETE':
        if (event.data?.mastery_report) {
          setMasteryReport(event.data.mastery_report);
        }
        break;

      default:
        break;
    }
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!sessionId) return;

    const wsUrl = getWebSocketUrl(sessionId);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Classroom WebSocket connected to:', wsUrl);
      setIsConnected(true);
    };

    ws.onmessage = (msgEvent) => {
      try {
        const payload: ClassroomEvent = JSON.parse(msgEvent.data);
        handleClassroomEvent(payload);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    ws.onerror = (err) => {
      console.error('Classroom WebSocket error:', err);
    };

    ws.onclose = () => {
      console.log('Classroom WebSocket disconnected');
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [sessionId, handleClassroomEvent]);

  // Send action via WebSocket
  const sendWebSocketAction = (action: string, payload: Record<string, any>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action, ...payload }));
    }
  };

  // Submit student answer to checkpoint
  const submitResponse = async (response: StudentResponse) => {
    setIsEvaluating(true);
    // Send over WebSocket if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      sendWebSocketAction('STUDENT_SUBMIT_RESPONSE', response);
    } else {
      try {
        await submitAnswer(sessionId, response);
      } catch (err) {
        console.error('Failed to submit answer via REST:', err);
        setIsEvaluating(false);
      }
    }
  };

  // Submit follow-up re-test answer
  const submitFollowUpResponse = (selectedOptionId: string | null, text: string) => {
    setIsEvaluating(true);
    sendWebSocketAction('SUBMIT_FOLLOWUP_ANSWER', {
      selected_option_id: selectedOptionId,
      written_explanation: text,
      question_id: followUpCheckpoint?.question_id || 'follow-up-retest',
    });
  };

  // Switch instruction language dynamically
  const switchLanguage = (newLanguage: LanguageCode) => {
    sendWebSocketAction('SWITCH_LANGUAGE', { new_language: newLanguage });
    setCurrentLanguage(newLanguage);
  };

  // Student hand-raise interrupt
  const interruptTeacher = (studentQuery?: string) => {
    setIsTeacherSpeaking(false);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    sendWebSocketAction('INTERRUPT_TEACHER', { student_query: studentQuery });
  };

  // Advance to next module in curriculum
  const advance = async () => {
    setDiagnosticResult(null);
    setFollowUpCheckpoint(null);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      sendWebSocketAction('ADVANCE_MODULE', {});
    } else {
      try {
        await advanceCurriculum(sessionId);
      } catch (err) {
        console.error('Failed to advance curriculum via REST:', err);
      }
    }
  };

  return {
    lessonPlan,
    currentModuleIndex,
    currentVisual,
    teacherScript,
    isTeacherSpeaking,
    activeCheckpoint,
    followUpCheckpoint,
    diagnosticResult,
    masteryReport,
    isRemediating,
    isEvaluating,
    isConnected,
    currentLanguage,
    submitResponse,
    submitFollowUpResponse,
    switchLanguage,
    advance,
    interruptTeacher,
  };
}
