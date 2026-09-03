"""
Comprehensive Test Suite for Advanced Phase 1: Persistent Learner Memory & Study Material Engine.
"""
import os
import sys
import asyncio
import json

# Force UTF-8 on stdout for Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "."))

def test_profile_manager_persistence():
    print("Testing Scenario 1: Persistent Learner Memory SQLite Database...")
    from app.services.profile_manager import profile_manager
    from app.schemas.lesson import MasteryReport, ModuleMasteryRecord

    test_user_id = "test-user-dev"

    # 1. Create / Get User
    user = profile_manager.get_or_create_user(test_user_id, name="Aarav Sharma")
    assert user["user_id"] == test_user_id
    assert user["name"] == "Aarav Sharma"
    print("  [OK] User created / retrieved: Aarav Sharma")

    # 2. Update Profile with Session Mastery Report
    report = MasteryReport(
        session_id="sess-memory-test-1",
        topic="Attention Mechanism in Transformers",
        overall_mastery_percentage=94.0,
        summary_feedback="Strong mastery of Query/Key matrix multiplication.",
        strengths=["Self-Attention Dot Product Alignment", "Vector Normalization"],
        areas_for_review=["Scaling Factor 1/sqrt(d_k) to prevent Softmax saturation"],
        module_records=[
            ModuleMasteryRecord(module_id="m1", title="QKV Projection", score=1.0, passed=True),
            ModuleMasteryRecord(module_id="m2", title="Scaled Dot-Product", score=0.88, passed=True, misconceptions_encountered=["Confused why sqrt(d_k) scaling is needed"])
        ],
        recommended_next_topics=["Multi-Head Attention", "Positional Encodings"]
    )

    updated_profile = profile_manager.update_profile_from_mastery(test_user_id, report)
    assert updated_profile["overall_score"] == 94.0
    assert updated_profile["total_sessions"] >= 1
    assert "Attention Mechanism in Transformers" in updated_profile["topics_studied"]
    assert len(updated_profile["weak_concepts"]) >= 1
    assert "Multi-Head Attention" in updated_profile["current_learning_path"]
    print("  [OK] Profile updated with weak nodes and recommendations.")

    # 3. Retrieve Memory Context for Curriculum Planning
    memory_ctx = profile_manager.get_student_memory_context(test_user_id, "Multi-Head Attention")
    assert "LONG-TERM LEARNER MEMORY" in memory_ctx
    assert "PREVIOUS KNOWLEDGE GAPS" in memory_ctx
    print("  [OK] Generated Cognitive Memory Injection Context:")
    for line in memory_ctx.split("\n"):
        print(f"       {line}")


def test_study_material_and_anki_generation():
    print("\nTesting Scenario 2: Automatic Notes & Anki Flashcard Generator...")
    from app.services.study_material_engine import study_material_engine
    from app.schemas.lesson import (
        LessonPlan,
        LessonModule,
        VisualAction,
        VisualType,
        Checkpoint,
        CheckpointType,
        MasteryReport,
        EducationalLevel,
        LanguageCode,
    )

    plan = LessonPlan(
        topic="Transformers & Self-Attention",
        student_level=EducationalLevel.INTERMEDIATE,
        language=LanguageCode.HINGLISH,
        total_estimated_minutes=15,
        pedagogical_goals=["Understand Q, K, V matrices", "Master scaled dot-product attention"],
        modules=[
            LessonModule(
                module_id="mod-1",
                title="Scaled Dot-Product Attention Formula",
                estimated_minutes=5,
                teaching_script="<emotion=enthusiastic>Attention formula computes similarity weights!</emotion>",
                visual_action=VisualAction(
                    type=VisualType.KATEX,
                    raw_payload=r"\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V",
                    explanation_notes="Divide by sqrt(d_k) to prevent gradient vanishing in softmax."
                ),
                checkpoint=Checkpoint(
                    question_id="q1",
                    question_text="Why do we scale by sqrt(d_k)?",
                    question_type=CheckpointType.EXPLAIN_IN_OWN_WORDS,
                    expected_concept="Scaling prevents dot products from growing excessively large in high dimensions.",
                    rubric="Look for variance / gradient saturation explanation."
                )
            )
        ]
    )

    report = MasteryReport(
        session_id="sess-study-gen-test",
        topic="Transformers & Self-Attention",
        overall_mastery_percentage=92.5,
        summary_feedback="Excellent intuitive grasp of attention weights.",
        strengths=["Query/Key similarity understanding"],
        areas_for_review=["Variance growth when d_k is large"],
        actionable_next_steps=["Implement Scaled Dot Product in PyTorch", "Read 'Attention Is All You Need' Section 3.2"]
    )

    study_pkg = study_material_engine.generate_study_materials(
        session_id="sess-study-gen-test",
        lesson_plan=plan,
        report=report
    )

    assert "flashcards" in study_pkg
    assert "anki_csv" in study_pkg
    assert "markdown_notes" in study_pkg
    assert len(study_pkg["flashcards"]) >= 2

    # Check Anki CSV formatting
    assert "#separator:Semicolon" in study_pkg["anki_csv"]
    assert "Transformers_&_Self-Attention" in study_pkg["anki_csv"]
    print("  [OK] Anki CSV formatted with Semicolon delimiter and tags:")
    print("       " + study_pkg["anki_csv"].split("\n")[3][:80] + "...")

    # Check Markdown Notes structure
    md = study_pkg["markdown_notes"]
    assert "# Synapse AI Teacher — Study Guide: Transformers & Self-Attention" in md
    assert "Attention}(Q, K, V)" in md
    assert "Madhav Zanwar" in md
    print("  [OK] Structured Markdown notes generated with LaTeX equations and developer attribution.")


def test_fastapi_endpoints_export():
    print("\nTesting Scenario 3: FastAPI Study Material & Profile Endpoints...")
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)

    # 1. User Profile Endpoint
    res_prof = client.get("/api/v1/user/test-user-dev/profile")
    assert res_prof.status_code == 200
    data_prof = res_prof.json()
    assert data_prof["success"] is True
    assert data_prof["profile"]["name"] == "Aarav Sharma"
    print("  [OK] GET /api/v1/user/test-user-dev/profile -> 200 OK")

    # 2. Session creation and Study Export Endpoints
    create_res = client.post(
        "/api/classroom/session/create",
        json={
            "profile": {
                "target_topic": "Quantum Teleportation",
                "educational_level": "Intermediate",
                "language": "English",
                "available_time_minutes": "20"
            }
        }
    )
    sess_id = create_res.json()["session_id"]

    # Start and advance to generate plan
    start_res = client.post(f"/api/classroom/session/{sess_id}/start")
    assert start_res.status_code == 200

    # Wait briefly for background curriculum generator
    import time
    time.sleep(0.5)

    # Export materials endpoint
    res_export = client.get(f"/api/v1/session/{sess_id}/export-materials")
    assert res_export.status_code == 200
    assert "flashcards" in res_export.json()
    print("  [OK] GET /api/v1/session/{session_id}/export-materials -> 200 OK")

    # Download Anki CSV endpoint
    res_anki = client.get(f"/api/v1/session/{sess_id}/download-anki")
    assert res_anki.status_code == 200
    assert "text/csv" in res_anki.headers.get("content-type", "")
    print("  [OK] GET /api/v1/session/{session_id}/download-anki -> 200 OK (text/csv attachment)")

    # Download Notes MD endpoint
    res_notes = client.get(f"/api/v1/session/{sess_id}/download-notes")
    assert res_notes.status_code == 200
    assert "text/markdown" in res_notes.headers.get("content-type", "")
    print("  [OK] GET /api/v1/session/{session_id}/download-notes -> 200 OK (text/markdown attachment)")


if __name__ == "__main__":
    print("==================================================")
    print("SYNAPSE AI TEACHER - ADVANCED PHASE 1 TEST SUITE")
    print("==================================================")
    try:
        test_profile_manager_persistence()
        test_study_material_and_anki_generation()
        test_fastapi_endpoints_export()
        print("\n==================================================")
        print("ALL ADVANCED PHASE 1 TESTS PASSED SUCCESSFULLY!")
        print("==================================================")
    except Exception as e:
        print(f"\n[!] TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
