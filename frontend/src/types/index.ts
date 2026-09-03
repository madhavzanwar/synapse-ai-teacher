/**
 * Unified TypeScript Type Definitions for Synapse AI Teacher.
 * Strictly synchronized with backend Pydantic v2 schemas.
 */

export type EducationalLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type LanguageCode = 'English' | 'Hindi' | 'Hinglish' | 'Spanish';
export type TimeBudget = '5' | '20' | '60' | '7_days_plan';
export type VisualType = 'katex' | 'mermaid' | 'code' | 'chart' | 'callout';
export type CheckpointType = 'mcq' | 'explain_in_own_words';
export type CorrectiveStrategy = 
  | 'simpler_analogy' 
  | 'first_principles' 
  | 'visual_counterexample' 
  | 'step_by_step_breakdown';

export type TeacherPersona = 'mentor' | 'tech_lead' | 'coach';

export type EventType =
  | 'SESSION_INITIALIZED'
  | 'CURRICULUM_READY'
  | 'MODULE_START'
  | 'TEACHER_SPEAKING'
  | 'WHITEBOARD_UPDATE'
  | 'WHITEBOARD_REMEDIATION'
  | 'CHECKPOINT_TRIGGER'
  | 'STUDENT_ANSWER'
  | 'TEACHER_EVALUATING'
  | 'DIAGNOSTIC_RESULT'
  | 'EMOTIONAL_INTERVENTION'
  | 'FOLLOWUP_CHECKPOINT'
  | 'RESUME_CURRICULUM'
  | 'LANGUAGE_SWITCHED'
  | 'TEACHER_INTERRUPTED'
  | 'MODULE_COMPLETE'
  | 'LESSON_COMPLETE'
  | 'ERROR';

export interface StudentProfile {
  target_topic: string;
  educational_level: EducationalLevel;
  language: LanguageCode;
  available_time_minutes: TimeBudget | string;
  learning_style?: string;
  instructor_persona?: TeacherPersona;
  uploaded_document_ids?: string[];
}

export interface VisualAction {
  type: VisualType;
  title?: string;
  raw_payload: string;
  language_or_config?: string;
  explanation_notes?: string;
  entry_animation_cue?: string;
}

export interface CheckpointOption {
  id: string;
  text: string;
  is_correct: boolean;
  feedback?: string;
}

export interface Checkpoint {
  question_id: string;
  question_text: string;
  question_type: CheckpointType;
  options?: CheckpointOption[];
  expected_concept: string;
  rubric: string;
}

export interface LessonModule {
  module_id: string;
  title: string;
  estimated_minutes: number;
  teaching_script: string;
  visual_action: VisualAction;
  checkpoint: Checkpoint;
}

export interface LessonPlan {
  topic: string;
  student_level: EducationalLevel;
  language: LanguageCode;
  total_estimated_minutes: number;
  pedagogical_goals: string[];
  modules: LessonModule[];
}

export interface StudentResponse {
  session_id: string;
  module_id: string;
  question_id: string;
  selected_option_id?: string | null;
  written_explanation?: string | null;
  audio_transcript?: string | null;
  response_time_seconds?: number;
}

export interface DiagnosticEvaluation {
  is_correct: boolean;
  score: number;
  identified_misconception?: string | null;
  root_cause: string;
  corrective_strategy: CorrectiveStrategy;
  re_explanation_script: string;
  re_explanation_visual?: VisualAction | null;
  follow_up_prompt?: string;
  follow_up_checkpoint?: Checkpoint | null;
  is_frustrated?: boolean;
  sentiment_score?: number;
  is_emotional_intervention?: boolean;
}

export interface RemedialAction {
  strategy: CorrectiveStrategy;
  identified_misconception?: string | null;
  root_cause: string;
  re_explanation_script: string;
  re_explanation_visual?: VisualAction | null;
  follow_up_checkpoint?: Checkpoint | null;
  is_emotional_intervention?: boolean;
}

export interface ModuleMasteryRecord {
  module_id: string;
  title: string;
  attempts_count: number;
  passed: boolean;
  score: number;
  misconceptions_encountered: string[];
}

export interface MasteryReport {
  session_id: string;
  topic: string;
  overall_mastery_percentage: number;
  summary_feedback: string;
  strengths: string[];
  areas_for_review: string[];
  concept_breakdown?: Array<{
    subject: string;
    score: number;
    fullMark: number;
  }>;
  actionable_next_steps?: string[];
  module_records: ModuleMasteryRecord[];
  recommended_next_topics: string[];
  developer_watermark?: string;
}

export interface ClassroomEvent {
  event_type: EventType;
  session_id: string;
  module_id?: string;
  data: Record<string, any>;
  timestamp?: number;
}

export interface TeacherState {
  isSpeaking: boolean;
  currentSpeechText: string;
  emotion: 'enthusiastic' | 'thoughtful' | 'encouraging' | 'curious' | 'empathetic' | 'neutral';
  isRemediating: boolean;
  isEvaluating?: boolean;
  isEmotionalIntervention?: boolean;
  audioWaveData?: number[];
}

export interface LearningPathNode {
  node_id: string;
  title: string;
  description: string;
  day_number: number;
  sequence_index: number;
  estimated_minutes: number;
  is_unlocked: boolean;
  is_completed: boolean;
  prerequisites: string[];
  target_concepts: string[];
  curriculum_payload?: Record<string, any>;
}

export interface StudyPlan {
  plan_id: string;
  user_id: string;
  target_topic: string;
  timeframe: string;
  total_days: number;
  student_level: EducationalLevel;
  nodes: LearningPathNode[];
  created_at?: number;
}

export interface GenerateStudyPlanRequest {
  target_topic: string;
  timeframe?: string;
  educational_level?: EducationalLevel;
  language?: LanguageCode;
  user_id?: string;
}
