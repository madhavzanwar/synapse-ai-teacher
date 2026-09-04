"""
Main FastAPI Application for Synapse AI Teacher.
Provides REST, Server-Sent Events (SSE), and WebSocket APIs for real-time pedagogical interaction.
Includes Phase 2 Production-Grade RAG Ingestion and Hybrid Grounding Endpoints.
"""
import uuid
import asyncio
import logging
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, Response

from app.config import settings
from app.schemas.lesson import (
    StudentProfile,
    EducationalLevel,
    LanguageCode,
    TimeBudget,
    LessonPlan,
    ClassroomSessionCreateRequest,
    StudentResponse,
    ClassroomEvent,
    EventType,
    GenerateStudyPlanRequest,
    StudyPlan,
)
from app.services.rag_engine import rag_engine
from app.services.pedagogy_engine import pedagogy_engine
from app.services.session_manager import session_manager
from app.services.profile_manager import profile_manager
from app.services.study_material_engine import study_material_engine
from app.services.path_engine import path_engine

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("synapse_api")

app = FastAPI(
    title=settings.APP_NAME,
    description="Interactive human-like AI Teacher backend powering live blackboard visualizations, audio avatars, and adaptive Socratic pedagogy grounded with RAG.",
    version="1.1.0"
)

# CORS Configuration
is_cors_wildcard = "*" in settings.CORS_ORIGINS or settings.CORS_ORIGINS == ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if is_cors_wildcard else settings.CORS_ORIGINS,
    allow_origin_regex=None if is_cors_wildcard else r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=not is_cors_wildcard,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": "1.1.0",
        "gemini_configured": bool(settings.GEMINI_API_KEY),
        "total_documents_indexed": len(rag_engine.documents),
        "total_chunks_indexed": len(rag_engine.chunks),
    }


@app.post("/api/v1/simli/session")
async def create_simli_session():
    """
    Create a short-lived Simli session from the backend so the browser never
    needs the long-lived Simli API key.
    """
    if not settings.SIMLI_API_KEY:
        raise HTTPException(status_code=503, detail="Simli API key is not configured")

    headers = {
        "Content-Type": "application/json",
        "x-simli-api-key": settings.SIMLI_API_KEY,
    }
    token_payload = {
        "faceId": settings.SIMLI_FACE_ID,
        "handleSilence": True,
        "maxSessionLength": 600,
        "maxIdleTime": 120,
    }

    try:
        import httpx

        async with httpx.AsyncClient(base_url="https://api.simli.ai", timeout=15.0) as client:
            token_response = await client.post("/compose/token", json=token_payload, headers=headers)
            token_response.raise_for_status()
            ice_response = await client.get("/compose/ice", headers=headers)
            ice_servers = (
                ice_response.json()
                if ice_response.status_code == 200
                else [{"urls": ["stun:stun.l.google.com:19302"]}]
            )

        session_token = token_response.json().get("session_token")
        if not session_token:
            raise HTTPException(status_code=502, detail="Simli did not return a session token")

        return {
            "success": True,
            "session_token": session_token,
            "ice_servers": ice_servers or [{"urls": ["stun:stun.l.google.com:19302"]}],
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Simli session creation failed: %s", exc)
        raise HTTPException(status_code=502, detail="Failed to create Simli session")


# ---------------------------------------------------------------------------
# Phase 2: Production-Grade RAG Endpoints (/api/v1/...)
# ---------------------------------------------------------------------------

class GenerateCurriculumRequest(BaseModel):
    document_id: Optional[str] = Field(default=None, description="ID of previously uploaded grounding document")
    topic: Optional[str] = Field(default=None, description="Optional target topic override")
    language: LanguageCode = Field(default=LanguageCode.ENGLISH, description="Language of instruction")
    educational_level: EducationalLevel = Field(default=EducationalLevel.INTERMEDIATE, description="Proficiency level")
    available_time_minutes: Union[TimeBudget, str] = Field(default=TimeBudget.TWENTY_MINS, description="Time budget in minutes")
    learning_style: Optional[str] = Field(default="visual-intuitive", description="Pedagogical style")


class RetrieveContextRequest(BaseModel):
    query: str = Field(..., description="Query string or learning goal")
    document_id: Optional[str] = Field(default=None, description="Filter to specific document ID")
    top_k: int = Field(default=5, ge=1, le=20, description="Number of chunks to return")


@app.post("/api/v1/upload")
async def v1_upload_document(
    file: UploadFile = File(...),
    document_id: Optional[str] = Form(None)
):
    """
    Upload and parse PDF, DOCX, PPTX, or text files into structured semantic chunks with metadata.
    """
    try:
        content = await file.read()
        filename = file.filename or "uploaded_document"

        meta = rag_engine.ingest_bytes(
            file_bytes=content,
            filename=filename,
            document_id=document_id
        )

        return {
            "success": True,
            "document_id": meta.document_id,
            "filename": meta.source_filename,
            "detected_title": meta.detected_title,
            "file_type": meta.file_type,
            "total_pages": meta.total_pages,
            "total_chunks": meta.total_chunks,
            "sections_detected": meta.sections_detected,
            "char_count": meta.char_count,
            "has_math": meta.has_math
        }
    except Exception as e:
        logger.error(f"Upload and RAG ingestion error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")


@app.post("/api/v1/retrieve")
async def v1_retrieve_context(request: RetrieveContextRequest):
    """
    Execute Hybrid Search (Dense Vector + Sparse BM25) with Reciprocal Rank Fusion (RRF).
    """
    try:
        chunks = rag_engine.retrieve_context(
            query=request.query,
            document_id=request.document_id,
            top_k=request.top_k
        )
        formatted_context = rag_engine.format_grounding_context(chunks)

        return {
            "success": True,
            "query": request.query,
            "document_id": request.document_id,
            "chunks_returned": len(chunks),
            "chunks": [c.to_dict() for c in chunks],
            "formatted_grounding_context": formatted_context
        }
    except Exception as e:
        logger.error(f"RAG retrieval error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Retrieval failed: {str(e)}")


@app.post("/api/v1/generate-curriculum")
async def v1_generate_curriculum(request: GenerateCurriculumRequest):
    """
    Generate an adaptive, structured LessonPlan strictly grounded in the uploaded document context.
    """
    try:
        grounding_context = ""
        topic = request.topic

        # If document_id provided, retrieve relevant chunks for the topic
        if request.document_id:
            doc_meta = rag_engine.get_document_metadata(request.document_id)
            if not doc_meta:
                raise HTTPException(status_code=404, detail=f"Document ID '{request.document_id}' not found in index")

            if not topic:
                topic = doc_meta.detected_title

            chunks = rag_engine.retrieve_context(
                query=topic,
                document_id=request.document_id,
                top_k=5
            )
            grounding_context = rag_engine.format_grounding_context(chunks)

        if not topic:
            topic = "Fundamental Concept Overview"

        profile = StudentProfile(
            target_topic=topic,
            educational_level=request.educational_level,
            language=request.language,
            available_time_minutes=request.available_time_minutes,
            learning_style=request.learning_style or "visual-intuitive",
            uploaded_document_ids=[request.document_id] if request.document_id else []
        )

        lesson_plan = pedagogy_engine.generate_curriculum(profile, grounding_context)

        return {
            "success": True,
            "topic": topic,
            "document_id": request.document_id,
            "is_grounded": bool(grounding_context),
            "lesson_plan": lesson_plan.model_dump(),
            "grounding_context_preview": grounding_context[:600] + ("..." if len(grounding_context) > 600 else "")
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Curriculum generation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate curriculum: {str(e)}")


@app.get("/api/v1/documents")
async def v1_list_documents():
    """List all indexed documents and their chunk stats."""
    docs = rag_engine.list_documents()
    return {
        "success": True,
        "total_documents": len(docs),
        "documents": [d.to_dict() for d in docs]
    }


@app.get("/api/v1/documents/{document_id}")
async def v1_get_document(document_id: str):
    """Get metadata for a specific document."""
    meta = rag_engine.get_document_metadata(document_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"success": True, "metadata": meta.to_dict()}


# ---------------------------------------------------------------------------
# Backward-Compatible Document Ingestion Endpoint
# ---------------------------------------------------------------------------

@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None)
):
    """
    Ingest uploaded PDF or text notes into the RAG knowledge grounding engine (v1 wrapper).
    """
    try:
        content = await file.read()
        filename = file.filename or "uploaded_document"
        meta = rag_engine.ingest_bytes(content, filename=filename)

        return {
            "success": True,
            "document_id": meta.document_id,
            "filename": meta.source_filename,
            "title": meta.detected_title,
            "total_chunks": meta.total_chunks,
            "preview": f"Document '{meta.detected_title}' parsed ({meta.total_pages} pages, {meta.total_chunks} chunks)."
        }
    except Exception as e:
        logger.error(f"Failed to ingest document: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")


# ---------------------------------------------------------------------------
# Classroom Session Endpoints
# ---------------------------------------------------------------------------

@app.post("/api/classroom/session/create")
async def create_classroom_session(
    request: ClassroomSessionCreateRequest,
    background_tasks: BackgroundTasks
):
    """
    Initialize a personalized pedagogical session for the given profile and kickoff the curriculum planner.
    """
    session_id = str(uuid.uuid4())
    session = session_manager.create_session(
        session_id=session_id,
        profile=request.profile,
        doc_content_override=request.document_content_override
    )

    logger.info(f"Created new classroom session: {session_id} for topic: '{request.profile.target_topic}'")

    return {
        "success": True,
        "session_id": session_id,
        "topic": request.profile.target_topic,
        "language": request.profile.language.value,
        "educational_level": request.profile.educational_level.value,
        "available_time_minutes": request.profile.available_time_minutes
    }


@app.post("/api/classroom/session/{session_id}/start")
async def start_classroom_session(session_id: str, background_tasks: BackgroundTasks):
    """
    Trigger curriculum planning and start the live lesson.
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Launch curriculum planner in background
    background_tasks.add_task(session_manager.start_session_curriculum, session_id)
    return {"success": True, "message": "Curriculum planning initiated"}


@app.post("/api/classroom/session/{session_id}/answer")
async def submit_checkpoint_answer(
    session_id: str,
    response: StudentResponse,
    background_tasks: BackgroundTasks
):
    """
    Submit student response to current module checkpoint.
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    background_tasks.add_task(session_manager.handle_student_response, response)
    return {"success": True, "message": "Answer received and diagnostic evaluation in progress"}


@app.post("/api/classroom/session/{session_id}/advance")
async def advance_module(session_id: str, background_tasks: BackgroundTasks):
    """
    Manually or automatically advance to the next module in the lesson plan.
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    background_tasks.add_task(session_manager.advance_to_next_module, session_id)
    return {"success": True, "message": "Advancing curriculum"}


@app.get("/api/classroom/session/{session_id}/state")
async def get_session_state(session_id: str):
    """
    Get full snapshot of the active classroom state.
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "session_id": session.session_id,
        "profile": session.profile.model_dump(),
        "lesson_plan": session.lesson_plan.model_dump() if session.lesson_plan else None,
        "current_module_index": session.current_module_index,
        "is_remediating": session.is_remediating,
        "is_completed": session.is_completed,
        "event_count": len(session.event_history)
    }


@app.post("/api/v1/session/{session_id}/evaluate-response")
async def v1_evaluate_response(
    session_id: str,
    request: StudentResponse,
    background_tasks: BackgroundTasks
):
    """
    Evaluate student response to checkpoint with cognitive misconception detection.
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    background_tasks.add_task(session_manager.handle_student_response, request)
    return {"success": True, "message": "Evaluating response with Socratic Diagnostic Engine"}


@app.post("/api/v1/session/{session_id}/switch-language")
async def v1_switch_language(
    session_id: str,
    request: Dict[str, str],
    background_tasks: BackgroundTasks
):
    """
    Switch instruction language in real-time (English, Hindi, Hinglish, Spanish).
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    new_lang_str = request.get("new_language", "English")
    try:
        new_lang = LanguageCode(new_lang_str)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid language: {new_lang_str}")

    background_tasks.add_task(session_manager.switch_language, session_id, new_lang)
    return {"success": True, "new_language": new_lang.value}


@app.post("/api/v1/session/{session_id}/interrupt")
async def v1_interrupt_teacher(
    session_id: str,
    request: Optional[Dict[str, str]] = None,
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    Student hand-raise interrupt mid-explanation.
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    query = request.get("student_query") if request else None
    background_tasks.add_task(session_manager.interrupt_teacher, session_id, query)
    return {"success": True, "status": "Teacher paused for student inquiry"}


# ---------------------------------------------------------------------------
# Advanced Phase 1: Study Materials & Persistent Learner Profile Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/v1/session/{session_id}/export-materials")
async def export_study_materials(session_id: str):
    """
    Export structured Markdown notes, targeted flashcards, and Anki CSV for a completed session.
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.study_materials:
        return session.study_materials

    if not session.lesson_plan:
        raise HTTPException(status_code=400, detail="Lesson plan not yet available for this session")

    # Generate if not already generated
    report = session.mastery_records and pedagogy_engine.generate_mastery_report(
        session_id=session_id,
        profile=session.profile,
        lesson_plan=session.lesson_plan,
        records=session.mastery_records
    )
    if not report:
        report = pedagogy_engine.generate_mastery_report(
            session_id=session_id,
            profile=session.profile,
            lesson_plan=session.lesson_plan,
            records=[]
        )

    materials = study_material_engine.generate_study_materials(
        session_id=session_id,
        lesson_plan=session.lesson_plan,
        report=report,
        grounding_context=session.grounding_context
    )
    session.study_materials = materials
    return materials


@app.get("/api/v1/session/{session_id}/download-anki")
async def download_anki_csv(session_id: str):
    """Direct downloadable CSV file formatted for instant import into Anki / Quizlet."""
    materials = await export_study_materials(session_id)
    csv_content = materials.get("anki_csv", "")
    filename = f"synapse_anki_{session_id[:8]}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@app.get("/api/v1/session/{session_id}/download-notes")
async def download_markdown_notes(session_id: str):
    """Direct downloadable Markdown summary guide."""
    materials = await export_study_materials(session_id)
    md_content = materials.get("markdown_notes", "")
    filename = f"synapse_notes_{session_id[:8]}.md"
    return Response(
        content=md_content,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@app.get("/api/v1/user/{user_id}/profile")
async def get_user_learning_profile(user_id: str):
    """
    Get persistent learner profile, historical progress, and AI-generated learning roadmap.
    """
    profile = profile_manager.get_learning_profile(user_id)
    return {"success": True, "profile": profile}


# ---------------------------------------------------------------------------
# Phase 5: AI Learning Path & Multi-Day Study Planner Endpoints
# ---------------------------------------------------------------------------

@app.post("/api/v1/study-plan/generate")
async def generate_study_plan_endpoint(request: GenerateStudyPlanRequest):
    """
    Generate an AI-structured multi-day learning roadmap decomposing broad subjects.
    """
    try:
        plan = path_engine.generate_study_plan(request)
        return {"success": True, "plan": plan.model_dump()}
    except Exception as e:
        logger.error(f"Failed to generate study plan: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate study plan: {str(e)}")


@app.get("/api/v1/study-plan/{plan_id}")
async def get_study_plan_endpoint(plan_id: str):
    """Retrieve an existing or preset study plan by ID."""
    plan = path_engine.get_study_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Study plan not found")
    return {"success": True, "plan": plan.model_dump()}


@app.get("/api/v1/study-plan/default/{topic_key}")
async def get_default_study_plan(topic_key: str):
    """Retrieve built-in default high-yield tracks (greentech | aiml)."""
    plan = path_engine.get_study_plan(f"preset-{topic_key}")
    if not plan:
        # Fallback to greentech
        plan = path_engine.get_study_plan("preset-greentech")
    if not plan:
        raise HTTPException(status_code=404, detail="Default track not found")
    return {"success": True, "plan": plan.model_dump()}


@app.post("/api/v1/study-plan/{plan_id}/complete-node")
async def complete_roadmap_node(plan_id: str, request: Dict[str, str]):
    """Mark a roadmap node complete and unlock subsequent nodes."""
    node_id = request.get("node_id")
    if not node_id:
        raise HTTPException(status_code=400, detail="node_id is required")

    updated_plan = path_engine.unlock_next_node(plan_id, node_id)
    if not updated_plan:
        raise HTTPException(status_code=404, detail="Study plan not found")
    return {"success": True, "plan": updated_plan.model_dump()}


# ---------------------------------------------------------------------------
# Real-Time WebSocket Endpoint
# ---------------------------------------------------------------------------

@app.websocket("/ws/classroom/{session_id}")
async def classroom_websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    Bi-directional WebSocket connection for streaming live blackboard updates, teacher speech, and student responses.
    """
    await websocket.accept()
    query_params = dict(websocket.query_params)
    param_topic = query_params.get("topic")
    param_lang = query_params.get("lang") or "Hinglish"
    param_level = query_params.get("level") or "Intermediate"
    param_doc_id = query_params.get("doc_id")

    session = session_manager.get_session(session_id)

    if not session:
        chosen_topic = param_topic
        if param_doc_id:
            doc_meta = rag_engine.get_document_metadata(param_doc_id)
            if doc_meta and (not chosen_topic or chosen_topic == "Attention Mechanism in Transformers"):
                chosen_topic = doc_meta.detected_title
        if not chosen_topic:
            chosen_topic = "Attention Mechanism in Transformers"

        logger.info(f"Session {session_id} not found in memory, creating auto-session for topic='{chosen_topic}' doc_id='{param_doc_id}'...")
        from app.schemas.lesson import StudentProfile
        auto_profile = StudentProfile(
            target_topic=chosen_topic,
            educational_level=param_level,
            language=param_lang,
            available_time_minutes="20",
            uploaded_document_ids=[param_doc_id] if param_doc_id else []
        )
        session = session_manager.create_session(
            session_id=session_id,
            profile=auto_profile
        )
    else:
        if param_topic and param_topic != session.profile.target_topic and session.profile.target_topic == "Attention Mechanism in Transformers":
            session.profile.target_topic = param_topic
        if param_doc_id and not session.grounding_context:
            if not session.profile.uploaded_document_ids:
                session.profile.uploaded_document_ids = [param_doc_id]
            chunks = rag_engine.retrieve_context(query=session.profile.target_topic, document_id=param_doc_id, top_k=5)
            session.grounding_context = rag_engine.format_grounding_context(chunks)

    await session_manager.register_connection(session_id, websocket)
    logger.info(f"WebSocket connected for session: {session_id}")

    try:
        # Send initial connection acknowledgment
        init_event = ClassroomEvent(
            event_type=EventType.SESSION_INITIALIZED,
            session_id=session_id,
            data={"connected": True, "topic": session.profile.target_topic}
        )
        await websocket.send_text(init_event.model_dump_json())

        # Start curriculum if not already generated
        if not session.lesson_plan:
            asyncio.create_task(session_manager.start_session_curriculum(session_id))

        while True:
            raw_data = await websocket.receive_text()
            logger.debug(f"Received WS message: {raw_data}")
            # Dispatch to session manager handler
            asyncio.create_task(session_manager.process_websocket_message(session_id, raw_data))

    except WebSocketDisconnect:
        session_manager.remove_connection(session_id, websocket)
        logger.info(f"WebSocket disconnected for session: {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        session_manager.remove_connection(session_id, websocket)


# ---------------------------------------------------------------------------
# Server-Sent Events (SSE) Stream Fallback
# ---------------------------------------------------------------------------

@app.get("/api/classroom/stream/{session_id}")
async def classroom_sse_stream(session_id: str):
    """
    SSE fallback stream for environments where WebSockets are constrained.
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    async def event_generator():
        last_index = 0
        while True:
            if last_index < len(session.event_history):
                for ev in session.event_history[last_index:]:
                    yield f"event: {ev.event_type.value}\ndata: {ev.model_dump_json()}\n\n"
                last_index = len(session.event_history)
            if session.is_completed and last_index >= len(session.event_history):
                break
            await asyncio.sleep(0.5)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
