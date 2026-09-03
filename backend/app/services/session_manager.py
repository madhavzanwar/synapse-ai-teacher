"""
Classroom Session Manager.
Tracks live active classroom sessions, WebSocket connections, Socratic misconception evaluations,
remediation branching, and pedagogical event dispatching.
"""
import time
import json
import asyncio
import logging
from typing import Dict, List, Optional, Set
from fastapi import WebSocket

from app.schemas.lesson import (
    StudentProfile,
    LessonPlan,
    LessonModule,
    ClassroomEvent,
    EventType,
    StudentResponse,
    DiagnosticEvaluation,
    RemedialAction,
    Checkpoint,
    ModuleMasteryRecord,
    MasteryReport,
    LanguageCode,
)
from app.services.pedagogy_engine import pedagogy_engine
from app.services.diagnostic_engine import diagnostic_engine
from app.services.rag_engine import rag_engine
from app.services.voice_engine import voice_engine
from app.services.profile_manager import profile_manager
from app.services.study_material_engine import study_material_engine

logger = logging.getLogger(__name__)


class ClassroomSession:
    def __init__(self, session_id: str, profile: StudentProfile, grounding_context: str = "", user_id: str = "default_user"):
        self.session_id = session_id
        self.user_id = user_id
        self.profile = profile
        self.grounding_context = grounding_context
        self.lesson_plan: Optional[LessonPlan] = None
        self.current_module_index: int = 0
        self.mastery_records: List[ModuleMasteryRecord] = []
        self.active_connections: Set[WebSocket] = set()
        self.event_history: List[ClassroomEvent] = []
        self.is_remediating: bool = False
        self.is_evaluating: bool = False
        self.is_completed: bool = False
        self.active_followup: Optional[Checkpoint] = None
        self.study_materials: Optional[Dict[str, Any]] = None
        self.created_at: float = time.time()

    @property
    def current_module(self) -> Optional[LessonModule]:
        if not self.lesson_plan or not self.lesson_plan.modules:
            return None
        if 0 <= self.current_module_index < len(self.lesson_plan.modules):
            return self.lesson_plan.modules[self.current_module_index]
        return None

    async def broadcast_event(self, event: ClassroomEvent):
        """Send event to all active WebSocket clients for this session."""
        self.event_history.append(event)
        dead_connections = set()
        for ws in self.active_connections:
            try:
                await ws.send_text(event.model_dump_json())
            except Exception as e:
                logger.warning(f"Error broadcasting event to client: {e}")
                dead_connections.add(ws)

        for ws in dead_connections:
            self.active_connections.remove(ws)


class SessionManager:
    """Manages all live learning sessions, WebSocket event routing, and pedagogical loops."""

    def __init__(self):
        self.sessions: Dict[str, ClassroomSession] = {}

    def create_session(
        self,
        session_id: str,
        profile: StudentProfile,
        doc_content_override: Optional[str] = None,
        user_id: str = "default_user"
    ) -> ClassroomSession:
        grounding = ""
        if profile.uploaded_document_ids:
            doc_id = profile.uploaded_document_ids[0]
            chunks = rag_engine.retrieve_context(query=profile.target_topic, document_id=doc_id, top_k=5)
            grounding = rag_engine.format_grounding_context(chunks)
        elif doc_content_override:
            grounding = doc_content_override

        # Ensure user profile exists in database
        profile_manager.get_or_create_user(user_id)

        session = ClassroomSession(
            session_id=session_id,
            profile=profile,
            grounding_context=grounding,
            user_id=user_id
        )
        self.sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[ClassroomSession]:
        return self.sessions.get(session_id)

    async def register_connection(self, session_id: str, websocket: WebSocket):
        session = self.get_session(session_id)
        if session:
            session.active_connections.add(websocket)

    def remove_connection(self, session_id: str, websocket: WebSocket):
        session = self.get_session(session_id)
        if session and websocket in session.active_connections:
            session.active_connections.remove(websocket)

    async def start_session_curriculum(self, session_id: str):
        """Generate curriculum and kick off the first module."""
        session = self.get_session(session_id)
        if not session:
            return

        # 1. Generate Curriculum with Persistent Learner Memory
        lesson_plan = pedagogy_engine.generate_curriculum(
            profile=session.profile,
            grounding_context=session.grounding_context,
            user_id=session.user_id
        )
        session.lesson_plan = lesson_plan

        await session.broadcast_event(
            ClassroomEvent(
                event_type=EventType.CURRICULUM_READY,
                session_id=session_id,
                data={"lesson_plan": lesson_plan.model_dump()}
            )
        )

        # 2. Dispatch Module 1
        await self.dispatch_current_module(session_id)

    async def dispatch_current_module(self, session_id: str):
        session = self.get_session(session_id)
        if not session or not session.current_module:
            return

        mod = session.current_module
        session.is_remediating = False
        session.active_followup = None

        # Step 1: Module Start
        await session.broadcast_event(
            ClassroomEvent(
                event_type=EventType.MODULE_START,
                session_id=session_id,
                module_id=mod.module_id,
                data={
                    "module_index": session.current_module_index,
                    "title": mod.title,
                    "estimated_minutes": mod.estimated_minutes
                }
            )
        )

        # Step 2: Whiteboard Visual Action
        await session.broadcast_event(
            ClassroomEvent(
                event_type=EventType.WHITEBOARD_UPDATE,
                session_id=session_id,
                module_id=mod.module_id,
                data={"visual_action": mod.visual_action.model_dump()}
            )
        )

        # Step 3: Teacher Speech & Audio Synthesis
        audio_b64 = await voice_engine.synthesize_speech_base64(mod.teaching_script, session.profile.language)
        clean_text, _, emotion, rate = voice_engine.parse_script_to_ssml(mod.teaching_script, session.profile.language)

        await session.broadcast_event(
            ClassroomEvent(
                event_type=EventType.TEACHER_SPEAKING,
                session_id=session_id,
                module_id=mod.module_id,
                data={
                    "script": mod.teaching_script,
                    "clean_text": clean_text,
                    "emotion": emotion,
                    "speech_rate": rate,
                    "audio_base64": audio_b64,
                    "is_remediation": False
                }
            )
        )

        # Step 4: Socratic Checkpoint Trigger
        await session.broadcast_event(
            ClassroomEvent(
                event_type=EventType.CHECKPOINT_TRIGGER,
                session_id=session_id,
                module_id=mod.module_id,
                data={"checkpoint": mod.checkpoint.model_dump()}
            )
        )

    async def handle_student_response(self, response: StudentResponse):
        """
        Process student checkpoint response, detect cognitive misconceptions,
        and trigger adaptive remediation.
        """
        session = self.get_session(response.session_id)
        if not session or not session.current_module:
            return

        mod = session.current_module

        # Broadcast Student Answer
        await session.broadcast_event(
            ClassroomEvent(
                event_type=EventType.STUDENT_ANSWER,
                session_id=session.session_id,
                module_id=mod.module_id,
                data=response.model_dump()
            )
        )

        # Broadcast Teacher Evaluating indicator
        session.is_evaluating = True
        await session.broadcast_event(
            ClassroomEvent(
                event_type=EventType.TEACHER_EVALUATING,
                session_id=session.session_id,
                module_id=mod.module_id,
                data={"message": "Analyzing reasoning and mental model structure..."}
            )
        )

        # Deep Socratic Diagnostic Evaluation
        student_text = response.written_explanation or response.audio_transcript or ""
        diagnostic = diagnostic_engine.evaluate_checkpoint(
            question=mod.checkpoint,
            student_response=student_text,
            selected_option_id=response.selected_option_id,
            lesson_context=session.grounding_context,
            language=session.profile.language
        )
        session.is_evaluating = False

        # Broadcast Diagnostic Result
        await session.broadcast_event(
            ClassroomEvent(
                event_type=EventType.DIAGNOSTIC_RESULT,
                session_id=session.session_id,
                module_id=mod.module_id,
                data={"diagnostic": diagnostic.model_dump()}
            )
        )

        # Track mastery record
        misconceptions = [diagnostic.identified_misconception] if diagnostic.identified_misconception else []
        session.mastery_records.append(
            ModuleMasteryRecord(
                module_id=mod.module_id,
                title=mod.title,
                attempts_count=1,
                passed=diagnostic.is_correct,
                score=diagnostic.score,
                misconceptions_encountered=misconceptions
            )
        )

        if diagnostic.is_correct:
            # Student Mastered Concept!
            session.is_remediating = False
            session.active_followup = None

            await session.broadcast_event(
                ClassroomEvent(
                    event_type=EventType.TEACHER_SPEAKING,
                    session_id=session.session_id,
                    module_id=mod.module_id,
                    data={
                        "script": diagnostic.re_explanation_script,
                        "is_remediation": False
                    }
                )
            )
        elif diagnostic.is_emotional_intervention:
            # Emotional Intervention Triggered (Frustration/Cognitive Overload Detected)
            session.is_remediating = True
            session.active_followup = diagnostic.follow_up_checkpoint

            await session.broadcast_event(
                ClassroomEvent(
                    event_type=EventType.EMOTIONAL_INTERVENTION,
                    session_id=session.session_id,
                    module_id=mod.module_id,
                    data={
                        "diagnostic": diagnostic.model_dump(),
                        "checkpoint": diagnostic.follow_up_checkpoint.model_dump() if diagnostic.follow_up_checkpoint else None
                    }
                )
            )

            # 1. Update Whiteboard with Calming Ground Zero Callout
            if diagnostic.re_explanation_visual:
                await session.broadcast_event(
                    ClassroomEvent(
                        event_type=EventType.WHITEBOARD_REMEDIATION,
                        session_id=session.session_id,
                        module_id=mod.module_id,
                        data={"visual_action": diagnostic.re_explanation_visual.model_dump()}
                    )
                )

            # 2. Teacher Empathetic Voice Script
            await session.broadcast_event(
                ClassroomEvent(
                    event_type=EventType.TEACHER_SPEAKING,
                    session_id=session.session_id,
                    module_id=mod.module_id,
                    data={
                        "script": diagnostic.re_explanation_script,
                        "is_remediation": True,
                        "is_emotional_intervention": True,
                        "strategy": diagnostic.corrective_strategy.value
                    }
                )
            )
        else:
            # Misconception Detected -> Dynamic Socratic Remediation
            session.is_remediating = True
            remedial_action = diagnostic_engine.generate_remediation(
                evaluation=diagnostic,
                question=mod.checkpoint,
                lesson_context=session.grounding_context,
                language=session.profile.language
            )

            session.active_followup = remedial_action.follow_up_checkpoint

            # 1. Update Whiteboard with Remedial Visual
            if remedial_action.re_explanation_visual:
                await session.broadcast_event(
                    ClassroomEvent(
                        event_type=EventType.WHITEBOARD_REMEDIATION,
                        session_id=session.session_id,
                        module_id=mod.module_id,
                        data={"visual_action": remedial_action.re_explanation_visual.model_dump()}
                    )
                )

            # 2. Teacher Empathetic Voice Script
            await session.broadcast_event(
                ClassroomEvent(
                    event_type=EventType.TEACHER_SPEAKING,
                    session_id=session.session_id,
                    module_id=mod.module_id,
                    data={
                        "script": remedial_action.re_explanation_script,
                        "is_remediation": True,
                        "strategy": remedial_action.strategy.value
                    }
                )
            )

            # 3. Emit Follow-up Checkpoint
            if remedial_action.follow_up_checkpoint:
                await session.broadcast_event(
                    ClassroomEvent(
                        event_type=EventType.FOLLOWUP_CHECKPOINT,
                        session_id=session.session_id,
                        module_id=mod.module_id,
                        data={"checkpoint": remedial_action.follow_up_checkpoint.model_dump()}
                    )
                )

    async def handle_followup_response(self, response: StudentResponse):
        """Process student response to the remedial follow-up check question."""
        session = self.get_session(response.session_id)
        if not session or not session.active_followup:
            return

        follow_up_q = session.active_followup
        student_text = response.written_explanation or response.audio_transcript or ""

        diagnostic = diagnostic_engine.evaluate_checkpoint(
            question=follow_up_q,
            student_response=student_text,
            selected_option_id=response.selected_option_id,
            lesson_context=session.grounding_context,
            language=session.profile.language
        )

        if diagnostic.is_correct:
            session.is_remediating = False
            session.active_followup = None

            praise = diagnostic_engine._get_success_praise(session.profile.language)
            await session.broadcast_event(
                ClassroomEvent(
                    event_type=EventType.TEACHER_SPEAKING,
                    session_id=session.session_id,
                    data={"script": praise, "is_remediation": False}
                )
            )

            await session.broadcast_event(
                ClassroomEvent(
                    event_type=EventType.RESUME_CURRICULUM,
                    session_id=session.session_id,
                    data={"message": "Remediation mastered. Resuming curriculum!"}
                )
            )
            # Advance to next module
            await self.advance_to_next_module(session.session_id)
        else:
            # Second attempt clarification
            await session.broadcast_event(
                ClassroomEvent(
                    event_type=EventType.TEACHER_SPEAKING,
                    session_id=session.session_id,
                    data={
                        "script": diagnostic.re_explanation_script,
                        "is_remediation": True
                    }
                )
            )

    async def switch_language(self, session_id: str, new_language: LanguageCode):
        """Dynamic in-session language switcher."""
        session = self.get_session(session_id)
        if not session:
            return

        session.profile.language = new_language
        logger.info(f"Session {session_id} switched language to {new_language.value}")

        await session.broadcast_event(
            ClassroomEvent(
                event_type=EventType.LANGUAGE_SWITCHED,
                session_id=session_id,
                data={"new_language": new_language.value}
            )
        )

    async def interrupt_teacher(self, session_id: str, student_query: Optional[str] = None):
        """Handle student hand-raise / interrupt."""
        session = self.get_session(session_id)
        if not session:
            return

        await session.broadcast_event(
            ClassroomEvent(
                event_type=EventType.TEACHER_INTERRUPTED,
                session_id=session_id,
                data={"student_query": student_query, "status": "paused"}
            )
        )

    async def advance_to_next_module(self, session_id: str):
        """Advance to next module or conclude lesson."""
        session = self.get_session(session_id)
        if not session or not session.lesson_plan:
            return

        session.current_module_index += 1

        if session.current_module_index < len(session.lesson_plan.modules):
            await self.dispatch_current_module(session_id)
        else:
            # Lesson Completed - Generate Mastery Report
            session.is_completed = True
            report = pedagogy_engine.generate_mastery_report(
                session_id=session_id,
                profile=session.profile,
                lesson_plan=session.lesson_plan,
                records=session.mastery_records
            )

            # Update long-term persistent learner memory
            profile_manager.update_profile_from_mastery(session.user_id, report)

            # Generate downloadable study materials & Anki flashcards
            study_materials = study_material_engine.generate_study_materials(
                session_id=session_id,
                lesson_plan=session.lesson_plan,
                report=report,
                grounding_context=session.grounding_context
            )
            session.study_materials = study_materials

            await session.broadcast_event(
                ClassroomEvent(
                    event_type=EventType.LESSON_COMPLETE,
                    session_id=session_id,
                    data={
                        "mastery_report": report.model_dump(),
                        "study_materials": study_materials
                    }
                )
            )

    async def process_websocket_message(self, session_id: str, raw_text: str):
        """Route incoming client WebSocket actions."""
        try:
            payload = json.loads(raw_text)
            action = payload.get("action")

            if action == "STUDENT_SUBMIT_RESPONSE":
                resp = StudentResponse(
                    session_id=session_id,
                    module_id=payload.get("module_id", ""),
                    question_id=payload.get("question_id", ""),
                    selected_option_id=payload.get("selected_option_id"),
                    written_explanation=payload.get("written_explanation") or payload.get("response_text"),
                    audio_transcript=payload.get("audio_transcript"),
                    response_time_seconds=payload.get("response_time_seconds")
                )
                await self.handle_student_response(resp)

            elif action == "SUBMIT_FOLLOWUP_ANSWER":
                resp = StudentResponse(
                    session_id=session_id,
                    module_id=payload.get("module_id", ""),
                    question_id=payload.get("question_id", "follow-up-retest"),
                    selected_option_id=payload.get("selected_option_id"),
                    written_explanation=payload.get("written_explanation") or payload.get("response_text")
                )
                await self.handle_followup_response(resp)

            elif action == "SWITCH_LANGUAGE":
                lang_str = payload.get("new_language", "English")
                new_lang = LanguageCode(lang_str)
                await self.switch_language(session_id, new_lang)

            elif action == "INTERRUPT_TEACHER":
                query = payload.get("student_query")
                await self.interrupt_teacher(session_id, query)

            elif action == "ADVANCE_MODULE":
                await self.advance_to_next_module(session_id)

        except Exception as e:
            logger.error(f"Error processing WebSocket message for session {session_id}: {e}", exc_info=True)


# Global singleton instance
session_manager = SessionManager()
