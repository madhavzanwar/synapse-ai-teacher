"""
Comprehensive Pydantic v2 validation models for Synapse AI Teacher.
Covers StudentProfile, LessonPlan, VisualActions, DiagnosticEvaluations, and Live Classroom Events.
"""
from enum import Enum
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, ConfigDict


class EducationalLevel(str, Enum):
    BEGINNER = "Beginner"
    INTERMEDIATE = "Intermediate"
    ADVANCED = "Advanced"


class LanguageCode(str, Enum):
    ENGLISH = "English"
    HINDI = "Hindi"
    HINGLISH = "Hinglish"
    SPANISH = "Spanish"


class TimeBudget(str, Enum):
    FIVE_MINS = "5"
    TWENTY_MINS = "20"
    SIXTY_MINS = "60"
    SEVEN_DAYS_PLAN = "7_days_plan"


class VisualType(str, Enum):
    KATEX = "katex"
    MERMAID = "mermaid"
    CODE = "code"
    CHART = "chart"
    CALLOUT = "callout"


class CheckpointType(str, Enum):
    MCQ = "mcq"
    EXPLAIN_IN_OWN_WORDS = "explain_in_own_words"


class CorrectiveStrategy(str, Enum):
    SIMPLER_ANALOGY = "simpler_analogy"
    FIRST_PRINCIPLES = "first_principles"
    VISUAL_COUNTEREXAMPLE = "visual_counterexample"
    STEP_BY_STEP_BREAKDOWN = "step_by_step_breakdown"


class TeacherPersona(str, Enum):
    MENTOR = "mentor"
    TECH_LEAD = "tech_lead"
    COACH = "coach"


class EventType(str, Enum):
    SESSION_INITIALIZED = "SESSION_INITIALIZED"
    CURRICULUM_READY = "CURRICULUM_READY"
    MODULE_START = "MODULE_START"
    TEACHER_SPEAKING = "TEACHER_SPEAKING"
    WHITEBOARD_UPDATE = "WHITEBOARD_UPDATE"
    WHITEBOARD_REMEDIATION = "WHITEBOARD_REMEDIATION"
    CHECKPOINT_TRIGGER = "CHECKPOINT_TRIGGER"
    STUDENT_ANSWER = "STUDENT_ANSWER"
    TEACHER_EVALUATING = "TEACHER_EVALUATING"
    DIAGNOSTIC_RESULT = "DIAGNOSTIC_RESULT"
    EMOTIONAL_INTERVENTION = "EMOTIONAL_INTERVENTION"
    FOLLOWUP_CHECKPOINT = "FOLLOWUP_CHECKPOINT"
    RESUME_CURRICULUM = "RESUME_CURRICULUM"
    LANGUAGE_SWITCHED = "LANGUAGE_SWITCHED"
    TEACHER_INTERRUPTED = "TEACHER_INTERRUPTED"
    MODULE_COMPLETE = "MODULE_COMPLETE"
    LESSON_COMPLETE = "LESSON_COMPLETE"
    ERROR = "ERROR"


# ---------------------------------------------------------------------------
# Core Data Models
# ---------------------------------------------------------------------------

class StudentProfile(BaseModel):
    """Profile describing the student's background, goals, and delivery preferences."""
    target_topic: str = Field(..., description="The main subject or topic the student wants to master.")
    educational_level: EducationalLevel = Field(
        default=EducationalLevel.BEGINNER,
        description="Current mastery level: Beginner, Intermediate, or Advanced."
    )
    language: LanguageCode = Field(
        default=LanguageCode.HINGLISH,
        description="Language of delivery: English, Hindi, Hinglish, or Spanish."
    )
    available_time_minutes: TimeBudget = Field(
        default=TimeBudget.TWENTY_MINS,
        description="Target duration constraint in minutes."
    )
    learning_style: str = Field(
        default="Visual and Concept-First with step-by-step intuitive analogies",
        description="Instructional style preference."
    )
    instructor_persona: TeacherPersona = Field(
        default=TeacherPersona.MENTOR,
        description="Teacher persona: mentor (Socratic Mentor) | tech_lead (Senior Tech Lead) | coach (Fast-Paced Coach)"
    )
    uploaded_document_ids: List[str] = Field(
        default_factory=list,
        description="List of document IDs uploaded for grounding."
    )

    model_config = ConfigDict(extra="ignore", json_schema_extra={
        "example": {
            "target_topic": "Attention Mechanism in Transformers",
            "educational_level": "Intermediate",
            "language": "Hinglish",
            "available_time_minutes": "20",
            "learning_style": "visual-intuitive",
            "uploaded_document_ids": []
        }
    })


class VisualAction(BaseModel):
    """Specification for dynamic blackboard rendering."""
    type: VisualType = Field(
        ...,
        description="Type of visual component to render: katex | mermaid | code | chart | callout"
    )
    title: Optional[str] = Field(
        default="",
        description="Heading or label for the visual element."
    )
    raw_payload: str = Field(
        ...,
        description="Raw code/formula/markup string (LaTeX formula, Mermaid diagram source, code snippet, JSON chart spec)."
    )
    language_or_config: Optional[str] = Field(
        default="",
        description="Programming language for 'code', or chart type config (e.g., 'python', 'typescript', 'line_chart')."
    )
    explanation_notes: Optional[str] = Field(
        default="",
        description="Teacher annotations or step-by-step pointers to highlight on the whiteboard."
    )
    entry_animation_cue: Optional[str] = Field(
        default="fade-slide",
        description="Animation style: fade-slide | typewriter | step-reveal | pulse"
    )


class CheckpointOption(BaseModel):
    id: str = Field(..., description="Option identifier, e.g., 'A', 'B', 'C', 'D'")
    text: str = Field(..., description="Text of the option.")
    is_correct: bool = Field(default=False, description="Whether this is the correct answer.")
    feedback: Optional[str] = Field(default="", description="Specific diagnostic feedback if this option is chosen.")


class Checkpoint(BaseModel):
    """Interactive Socratic inquiry checkpoint to assess comprehension before advancing."""
    question_id: str = Field(..., description="Unique question ID within the module.")
    question_text: str = Field(..., description="The conceptual or application question posed by the teacher.")
    question_type: CheckpointType = Field(
        ...,
        description="Type of question: mcq or explain_in_own_words"
    )
    options: Optional[List[CheckpointOption]] = Field(
        default_factory=list,
        description="Selectable options if question_type is 'mcq'."
    )
    expected_concept: str = Field(
        ...,
        description="The core conceptual truth or principle the student should grasp."
    )
    rubric: str = Field(
        ...,
        description="Rubric for evaluating open-ended answers and identifying common cognitive pitfalls."
    )


class LessonModule(BaseModel):
    """A discrete pedagogical building block within the overarching curriculum."""
    module_id: str = Field(..., description="Unique ID for the module, e.g. 'mod-1'")
    title: str = Field(..., description="Descriptive title of the module.")
    estimated_minutes: int = Field(default=5, description="Estimated duration in minutes.")
    teaching_script: str = Field(
        ...,
        description="Human-like conversational teacher speech including vocal emotion tags like <emotion=enthusiastic>, <pause=400ms>, <emphasis=word>."
    )
    visual_action: VisualAction = Field(
        ...,
        description="Dynamic visual artifact dispatched to the smart whiteboard."
    )
    checkpoint: Checkpoint = Field(
        ...,
        description="Interactive question assessing the module's core idea."
    )


class LessonPlan(BaseModel):
    """The complete structured curriculum created by the LangGraph curriculum planner."""
    topic: str = Field(..., description="Main topic.")
    student_level: EducationalLevel = Field(..., description="Target proficiency level.")
    language: LanguageCode = Field(..., description="Language of instruction.")
    total_estimated_minutes: int = Field(..., description="Sum of module durations.")
    pedagogical_goals: List[str] = Field(
        default_factory=list,
        description="Key high-level outcomes the student will master."
    )
    modules: List[LessonModule] = Field(
        ...,
        description="Sequential list of lesson modules."
    )


class StudentResponse(BaseModel):
    """Student's submitted response to a checkpoint."""
    session_id: str
    module_id: str
    question_id: str
    selected_option_id: Optional[str] = None
    written_explanation: Optional[str] = None
    audio_transcript: Optional[str] = None


class DiagnosticEvaluation(BaseModel):
    """Deep cognitive evaluation of a student's answer with remedial strategy if incorrect."""
    is_correct: bool = Field(..., description="True if answer demonstrates mastery of expected concept.")
    score: float = Field(default=1.0, ge=0.0, le=1.0, description="Mastery score from 0.0 to 1.0")
    identified_misconception: Optional[str] = Field(
        default=None,
        description="Explicit description of the flawed mental model or misconception detected, or null if correct."
    )
    root_cause: str = Field(
        default="",
        description="Why the student might hold this misconception based on cognitive heuristics or knowledge gaps."
    )
    corrective_strategy: CorrectiveStrategy = Field(
        default=CorrectiveStrategy.SIMPLER_ANALOGY,
        description="Strategy to remediate: simpler_analogy | first_principles | visual_counterexample | step_by_step_breakdown"
    )
    re_explanation_script: str = Field(
        default="",
        description="Warm, empathetic teacher voice script directly resolving the misconception without shaming the student."
    )
    re_explanation_visual: Optional[VisualAction] = Field(
        default=None,
        description="Tailored visual (analogy diagram, counterexample code, or simplified formula) targeting the root cause."
    )
    follow_up_prompt: Optional[str] = Field(
        default="",
        description="A short follow-up check question to verify the student grasped the re-explanation."
    )
    follow_up_checkpoint: Optional[Checkpoint] = Field(
        default=None,
        description="Calibrated verification check question."
    )
    is_frustrated: bool = Field(
        default=False,
        description="True if student expressed confusion, frustration, or cognitive fatigue."
    )
    sentiment_score: float = Field(
        default=0.0,
        description="Sentiment score from -1.0 (very frustrated) to +1.0 (confident/positive)."
    )
    is_emotional_intervention: bool = Field(
        default=False,
        description="True if an emotional reassurance intervention was triggered."
    )


class ModuleMasteryRecord(BaseModel):
    module_id: str
    title: str
    attempts_count: int = 1
    passed: bool = True
    score: float = 1.0
    misconceptions_encountered: List[str] = Field(default_factory=list)


class MasteryReport(BaseModel):
    """Final mastery certificate and diagnostic report generated upon lesson conclusion."""
    session_id: str
    topic: str
    overall_mastery_percentage: float = Field(..., ge=0.0, le=100.0)
    summary_feedback: str
    strengths: List[str] = Field(default_factory=list)
    areas_for_review: List[str] = Field(default_factory=list)
    concept_breakdown: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Dimensional mastery breakdown for Knowledge Radar Chart (e.g. subject, score, fullMark)."
    )
    actionable_next_steps: List[str] = Field(
        default_factory=list,
        description="Concrete, actionable follow-up learning milestones."
    )
    module_records: List[ModuleMasteryRecord] = Field(default_factory=list)
    recommended_next_topics: List[str] = Field(default_factory=list)
    developer_watermark: str = Field(
        default="Developed by Madhav Zanwar (madhav_builds) — AIML Student | Problem Solver | Tech Enthusiast",
        description="Developer portfolio attribution."
    )


class ClassroomEvent(BaseModel):
    """Real-time event payload pushed over WebSocket or SSE to the client."""
    event_type: EventType
    session_id: str
    module_id: Optional[str] = None
    data: Dict[str, Any] = Field(default_factory=dict)
    timestamp: float = Field(default_factory=lambda: 0.0)


class ClassroomSessionCreateRequest(BaseModel):
    profile: StudentProfile
    document_content_override: Optional[str] = None


class RemedialAction(BaseModel):
    """Encapsulates the full remedial intervention when a misconception is detected."""
    strategy: CorrectiveStrategy = Field(..., description="The chosen corrective strategy.")
    identified_misconception: Optional[str] = Field(default=None, description="The specific flawed mental model.")
    root_cause: str = Field(default="", description="Why the misconception occurred.")
    re_explanation_script: str = Field(..., description="Empathetic conversational teacher speech.")
    re_explanation_visual: Optional[VisualAction] = Field(default=None, description="Tailored whiteboard visual artifact.")
    follow_up_checkpoint: Optional[Checkpoint] = Field(default=None, description="Calibrated verification check question.")
    is_emotional_intervention: bool = Field(default=False, description="True if emotional reassurance intervention.")


class EvaluateResponseRequest(BaseModel):
    session_id: str
    module_id: str
    question_id: str
    response_text: Optional[str] = None
    selected_option_id: Optional[str] = None
    response_time_seconds: Optional[float] = None


class SwitchLanguageRequest(BaseModel):
    session_id: str
    new_language: LanguageCode


class InterruptRequest(BaseModel):
    session_id: str
    student_query: Optional[str] = None


class ClassroomSessionState(BaseModel):
    session_id: str
    profile: StudentProfile
    lesson_plan: Optional[LessonPlan] = None
    current_module_index: int = 0
    current_state: str = "INITIAL"
    grounding_context: str = ""
    history_events: List[ClassroomEvent] = Field(default_factory=list)
    mastery_report: Optional[MasteryReport] = None


# ---------------------------------------------------------------------------
# Phase 5: Multi-Day Study Planner & Learning Path Schemas
# ---------------------------------------------------------------------------

class LearningPathNode(BaseModel):
    """A milestone node in a multi-day learning roadmap / skill tree."""
    node_id: str = Field(..., description="Unique ID for this roadmap node (e.g. node-day-1)")
    title: str = Field(..., description="Milestone topic title")
    description: str = Field(..., description="Concise overview of what will be mastered")
    day_number: int = Field(default=1, description="Target day number in the study timeframe")
    sequence_index: int = Field(default=0, description="0-indexed order in the path")
    estimated_minutes: int = Field(default=20, description="Estimated time to complete")
    is_unlocked: bool = Field(default=False, description="True if student is eligible to begin this module")
    is_completed: bool = Field(default=False, description="True if completed with verified mastery")
    prerequisites: List[str] = Field(default_factory=list, description="List of prerequisite node_ids")
    target_concepts: List[str] = Field(default_factory=list, description="Key concepts tested")
    curriculum_payload: Dict[str, Any] = Field(
        default_factory=dict,
        description="Payload ready to pass to create_classroom_session"
    )


class StudyPlan(BaseModel):
    """Complete multi-day structured learning path."""
    plan_id: str = Field(..., description="Unique ID for the study plan")
    user_id: str = Field(default="default_user", description="Owner user ID")
    target_topic: str = Field(..., description="Broad subject area")
    timeframe: str = Field(default="7_days", description="Duration (e.g. 7_days, 14_days)")
    total_days: int = Field(default=7, description="Number of days")
    student_level: EducationalLevel = Field(default=EducationalLevel.BEGINNER)
    nodes: List[LearningPathNode] = Field(default_factory=list, description="Sequential roadmap milestones")
    created_at: float = Field(default_factory=lambda: 0.0)


class GenerateStudyPlanRequest(BaseModel):
    target_topic: str
    timeframe: str = "7_days"
    educational_level: EducationalLevel = EducationalLevel.BEGINNER
    language: LanguageCode = LanguageCode.ENGLISH
    user_id: str = "default_user"

