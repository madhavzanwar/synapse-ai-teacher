"""
Comprehensive Backend Smoke & Unit Test for Synapse AI Teacher
"""
import sys
import os
import json

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "."))

def test_schemas():
    print("Testing Pydantic v2 Schemas...")
    from app.schemas.lesson import (
        StudentProfile,
        LessonPlan,
        LessonModule,
        VisualAction,
        VisualType,
        Checkpoint,
        CheckpointType,
        CheckpointOption,
        DiagnosticEvaluation,
        MasteryReport,
        EducationalLevel,
        LanguageCode,
    )

    profile = StudentProfile(
        target_topic="Attention Mechanism in Transformers",
        educational_level=EducationalLevel.INTERMEDIATE,
        language=LanguageCode.HINGLISH,
        available_time_minutes="20",
        learning_style="visual-intuitive"
    )
    assert profile.target_topic == "Attention Mechanism in Transformers"
    print("  [OK] StudentProfile validated successfully")

    # Load and validate sample lesson json
    sample_path = os.path.join(os.path.dirname(__file__), "..", "shared", "samples", "sample-lesson.json")
    with open(sample_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Convert camelCase keys from JSON to snake_case for Pydantic if needed
    plan = LessonPlan(
        topic=data["topic"],
        student_level=EducationalLevel(data["studentLevel"]),
        language=LanguageCode(data["language"]),
        total_estimated_minutes=data["totalEstimatedMinutes"],
        pedagogical_goals=data["pedagogicalGoals"],
        modules=[
            LessonModule(
                module_id=m["moduleId"],
                title=m["title"],
                estimated_minutes=m["estimatedMinutes"],
                teaching_script=m["teachingScript"],
                visual_action=VisualAction(
                    type=VisualType(m["visualAction"]["type"]),
                    title=m["visualAction"].get("title", ""),
                    raw_payload=m["visualAction"]["rawPayload"],
                    language_or_config=m["visualAction"].get("languageOrConfig", ""),
                    explanation_notes=m["visualAction"].get("explanationNotes", ""),
                    entry_animation_cue=m["visualAction"].get("entryAnimationCue", "fade-slide"),
                ),
                checkpoint=Checkpoint(
                    question_id=m["checkpoint"]["questionId"],
                    question_text=m["checkpoint"]["questionText"],
                    question_type=CheckpointType(m["checkpoint"]["questionType"]),
                    options=[
                        CheckpointOption(
                            id=opt["id"],
                            text=opt["text"],
                            is_correct=opt["isCorrect"],
                            feedback=opt.get("feedback", ""),
                        )
                        for opt in m["checkpoint"].get("options", [])
                    ],
                    expected_concept=m["checkpoint"]["expectedConcept"],
                    rubric=m["checkpoint"]["rubric"],
                )
            )
            for m in data["modules"]
        ]
    )
    assert len(plan.modules) == 3
    print(f"  [OK] LessonPlan with {len(plan.modules)} modules validated successfully")


def test_rag_engine():
    print("Testing RAG Engine...")
    from app.services.rag_engine import rag_engine

    sample_doc = """
    # Scaled Dot-Product Attention
    The attention mechanism maps a query and a set of key-value pairs to an output.
    The output is computed as a weighted sum of the values, where the weight assigned
    to each value is computed by a compatibility function of the query with the corresponding key.
    We compute the dot products of the query with all keys, divide each by sqrt(d_k), and apply a softmax function.
    """
    doc_id = rag_engine.ingest_text(sample_doc, title="Attention Paper Excerpt")
    assert doc_id in rag_engine.documents
    print(f"  [OK] Document ingested with doc_id: {doc_id}")

    context = rag_engine.retrieve("dot product query keys", top_k=2)
    assert "Scaled Dot-Product Attention" in context
    print("  [OK] RAG retrieval query succeeded with relevant context")


def test_pedagogy_engine():
    print("Testing Pedagogy Engine & Diagnostic Adaptation...")
    from app.services.pedagogy_engine import pedagogy_engine
    from app.schemas.lesson import (
        StudentProfile,
        StudentResponse,
        EducationalLevel,
        LanguageCode,
        Checkpoint,
        CheckpointType,
        CheckpointOption,
    )

    profile = StudentProfile(
        target_topic="Attention Mechanism in Transformers",
        educational_level=EducationalLevel.INTERMEDIATE,
        language=LanguageCode.HINGLISH,
        available_time_minutes="20"
    )

    # 1. Generate curriculum
    plan = pedagogy_engine.generate_curriculum(profile)
    assert len(plan.modules) >= 2
    print(f"  [OK] Curriculum generated with {len(plan.modules)} modules for {profile.language.value}")

    # 2. Test diagnostic evaluation for MCQ
    cp = Checkpoint(
        question_id="q1",
        question_text="Why do we calculate Q dot K?",
        question_type=CheckpointType.MCQ,
        options=[
            CheckpointOption(id="A", text="To measure semantic similarity", is_correct=True, feedback="Correct!"),
            CheckpointOption(id="B", text="To compress memory", is_correct=False, feedback="Incorrect: dot product is similarity, not compression.")
        ],
        expected_concept="Measure semantic alignment.",
        rubric="Check for similarity concept."
    )

    # Test correct answer
    resp_correct = StudentResponse(
        session_id="test-session",
        module_id="mod-1",
        question_id="q1",
        selected_option_id="A"
    )
    eval_correct = pedagogy_engine.evaluate_student_answer(cp, resp_correct, profile)
    assert eval_correct.is_correct is True
    print("  [OK] Correct answer evaluated properly")

    # Test incorrect answer with diagnostic misconception detection
    resp_wrong = StudentResponse(
        session_id="test-session",
        module_id="mod-1",
        question_id="q1",
        selected_option_id="B"
    )
    eval_wrong = pedagogy_engine.evaluate_student_answer(cp, resp_wrong, profile)
    assert eval_wrong.is_correct is False
    assert eval_wrong.identified_misconception is not None
    assert eval_wrong.re_explanation_script != ""
    print(f"  [OK] Misconception detected: '{eval_wrong.identified_misconception}'")
    print(f"  [OK] Corrective strategy assigned: '{eval_wrong.corrective_strategy}'")


def test_session_manager():
    print("Testing Session Manager Lifecycle...")
    import asyncio
    from app.services.session_manager import session_manager
    from app.schemas.lesson import StudentProfile, EducationalLevel, LanguageCode

    profile = StudentProfile(
        target_topic="Attention Mechanism in Transformers",
        educational_level=EducationalLevel.INTERMEDIATE,
        language=LanguageCode.HINGLISH,
        available_time_minutes="20"
    )

    session = session_manager.create_session("sess-123", profile)
    assert session.session_id == "sess-123"

    async def run_async():
        await session_manager.start_session_curriculum("sess-123")
        assert session.lesson_plan is not None
        assert session.current_module is not None
        print(f"  [OK] Session initialized with curriculum: {session.lesson_plan.topic}")

    asyncio.run(run_async())


if __name__ == "__main__":
    print("==================================================")
    print("SYNAPSE AI TEACHER - BACKEND VERIFICATION SUITE")
    print("==================================================")
    try:
        test_schemas()
        test_rag_engine()
        test_pedagogy_engine()
        test_session_manager()
        print("\n==================================================")
        print("ALL BACKEND VERIFICATION TESTS PASSED SUCCESSFULLY!")
        print("==================================================")
    except Exception as e:
        print(f"\n[!] TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
