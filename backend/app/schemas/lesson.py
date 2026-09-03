"""
Comprehensive Pydantic v2 validation models for Synapse AI Teacher.
Covers StudentProfile, LessonPlan, VisualActions, DiagnosticEvaluations, and Live Classroom Events.
"""
from enum import Enum
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, ConfigDict, field_validator


def to_camel(string: str) -> str:
    components = string.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


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
# Core Data Models with Flexible Alias Support (camelCase & snake_case)
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

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
        extra="ignore"
    )


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

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, extra="ignore")


class CheckpointOption(BaseModel):
    id: str = Field(..., description="Option identifier, e.g., 'A', 'B', 'C', 'D'")
    text: str = Field(..., description="Text of the option.")
    is_correct: bool = Field(default=False, description="Whether this is the correct answer.")
    feedback: Optional[str] = Field(default="", description="Specific diagnostic feedback if this option is chosen.")

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, extra="ignore")


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
    rubric: Optional[str] = Field(
        default="",
        description="Rubric for evaluating open-ended answers and identifying common cognitive pitfalls."
    )

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, extra="ignore")


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

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, extra="ignore")


class LessonPlan(BaseModel):
    """The complete structured curriculum created by the LangGraph curriculum planner."""
    topic: str = Field(default="Attention Mechanism in Transformers", description="Main topic.")
    student_level: EducationalLevel = Field(default=EducationalLevel.BEGINNER, description="Target proficiency level.")
    language: LanguageCode = Field(default=LanguageCode.HINGLISH, description="Language of instruction.")
    total_estimated_minutes: int = Field(default=20, description="Sum of module durations.")
    pedagogical_goals: List[str] = Field(
        default_factory=list,
        description="Key high-level outcomes the student will master."
    )
    modules: List[LessonModule] = Field(
        ...,
        description="Sequential list of lesson modules."
    )

    @field_validator("topic", mode="before")
    @classmethod
    def convert_topic(cls, v: Any, info: Any) -> str:
        if not v and isinstance(info.data, dict) and "title" in info.data:
            return info.data["title"]
        return str(v or "Attention Mechanism in Transformers")

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, extra="ignore")


class StudentResponse(BaseModel):
    """Student's submitted response to a checkpoint."""
    session_id: str
    module_id: str
    question_id: str
    selected_option_id: Optional[str] = None
    written_explanation: Optional[str] = None
    audio_transcript: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, extra="ignore")


class DiagnosticEvaluation(BaseModel):
    """Deep cognitive evaluation of a student's answer with remedial strategy if incorrect."""
    is_correct: bool = Field(..., description="True if answer demonstrates mastery of expected concept.")
    score: float = Field(default=1.0, ge=0.0, le=1.0, description="Mastery score from 0.0 to 1.0")
    identified_misconception: Optional[str] = Field(
        default=None,
        description="Explicit description of the flawed mental model or misconception detected, or null if correct."
    )
    root_cause: Optional[str] = Field(
        default="",
        description="Underlying cognitive reason for the misconception."
    )
    corrective_strategy: Optional[CorrectiveStrategy] = Field(
        default=CorrectiveStrategy.SIMPLER_ANALOGY,
        description="Pedagogical strategy for remediation."
    )
    re_explanation_script: Optional[str] = Field(
        default="",
        description="Conversational teacher speech explaining or praising."
    )
    remedial_teaching_script: Optional[str] = Field(
        default="",
        description="Empathetic, targeted corrective speech script."
    )
    re_explanation_visual: Optional[VisualAction] = Field(
        default=None,
        description="Visual action artifact for re-explanation or whiteboard."
    )
    remedial_visual_action: Optional[VisualAction] = Field(
        default=None,
        description="Targeted visual artifact for blackboard."
    )
    follow_up_prompt: Optional[str] = Field(
        default="",
        description="Follow-up prompt."
    )
    follow_up_checkpoint: Optional[Checkpoint] = Field(
        default=None,
        description="Immediate follow-up inquiry to verify the student's revised mental model."
    )
    is_frustrated: Optional[bool] = Field(
        default=False,
        description="Whether student is experiencing frustration."
    )
    sentiment_score: Optional[float] = Field(
        default=0.0,
        description="Student sentiment score from -1.0 to 1.0."
    )
    is_emotional_intervention: Optional[bool] = Field(
        default=False,
        description="Whether emotional intervention was triggered for frustration."
    )

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, extra="ignore")


class RemedialAction(BaseModel):
    strategy: CorrectiveStrategy = CorrectiveStrategy.SIMPLER_ANALOGY
    identified_misconception: Optional[str] = None
    root_cause: Optional[str] = ""
    re_explanation_script: Optional[str] = ""
    remedial_teaching_script: Optional[str] = ""
    re_explanation_visual: Optional[VisualAction] = None
    remedial_visual_action: Optional[VisualAction] = None
    follow_up_checkpoint: Optional[Checkpoint] = None

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, extra="ignore")


class ModuleMasteryRecord(BaseModel):
    module_id: str
    title: Optional[str] = ""
    attempts_count: int = 1
    passed: bool = True
    score: float = 1.0
    misconceptions_encountered: List[str] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, extra="ignore")


class ConceptScore(BaseModel):
    subject: str
    score: float
    fullMark: float = 100.0


class MasteryReport(BaseModel):
    """Comprehensive end-of-lesson mastery certificate and knowledge analytics."""
    session_id: str
    topic: str
    overall_mastery_percentage: float
    concept_breakdown: List[ConceptScore] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    areas_for_review: List[str] = Field(default_factory=list)
    summary_feedback: str
    actionable_next_steps: List[str] = Field(default_factory=list)
    recommended_next_topics: List[str] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, extra="ignore")


class ClassroomEvent(BaseModel):
    """WebSocket event payload emitted across the classroom connection."""
    event_type: EventType
    session_id: str
    timestamp: Optional[str] = None
    data: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, extra="ignore")


class ClassroomSessionCreateRequest(BaseModel):
    profile: StudentProfile
    document_content_override: Optional[str] = None


class ClassroomSessionState(BaseModel):
    session_id: str
    profile: StudentProfile
    lesson_plan: Optional[LessonPlan] = None
    current_module_index: int = 0
    current_language: LanguageCode = LanguageCode.HINGLISH
    is_teacher_speaking: bool = False
    is_remediating: bool = False
    mastery_report: Optional[MasteryReport] = None


class LearningPathNode(BaseModel):
    node_id: str
    day_number: int
    title: str
    description: str
    estimated_minutes: int = 20
    is_unlocked: bool = False
    is_completed: bool = False
    target_concepts: List[str] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, extra="ignore")


class StudyPlan(BaseModel):
    plan_id: str
    user_id: str = "default_user"
    target_topic: str
    timeframe: str = "7_days"
    total_days: int = 7
    created_at: Union[str, float, int] = ""
    nodes: List[LearningPathNode] = Field(default_factory=list)

    @field_validator("created_at", mode="before")
    @classmethod
    def convert_created_at(cls, v: Any) -> str:
        return str(v)

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, extra="ignore")


class GenerateStudyPlanRequest(BaseModel):
    target_topic: str
    timeframe: str = "7_days"
    educational_level: Optional[EducationalLevel] = EducationalLevel.INTERMEDIATE
    language: Optional[LanguageCode] = LanguageCode.ENGLISH
    user_id: Optional[str] = "default_user"

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, extra="ignore")


class DocumentChunk(BaseModel):
    chunk_id: str
    document_id: str
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    vector_embedding: Optional[List[float]] = None


class DocumentMetadata(BaseModel):
    document_id: str
    filename: str
    file_type: str
    upload_timestamp: str
    chunk_count: int
