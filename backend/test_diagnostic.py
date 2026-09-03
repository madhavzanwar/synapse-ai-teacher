"""
Comprehensive Socratic Diagnostic Engine & Interactive Remediation Test Suite (Phase 3).
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

def test_accurate_student_answer():
    print("Testing Scenario 1: Accurate Student Answer...")
    from app.services.diagnostic_engine import diagnostic_engine
    from app.schemas.lesson import Checkpoint, CheckpointType, CheckpointOption, LanguageCode

    cp = Checkpoint(
        question_id="q1-attention",
        question_text="Why do we calculate the dot product between Query and Key vectors in Self-Attention?",
        question_type=CheckpointType.MCQ,
        options=[
            CheckpointOption(id="A", text="To measure the semantic compatibility or relevance between two tokens.", is_correct=True, feedback="Correct!"),
            CheckpointOption(id="B", text="To randomly drop tokens.", is_correct=False, feedback="Incorrect: that is dropout.")
        ],
        expected_concept="Dot product computes semantic similarity weights.",
        rubric="Look for similarity or relevance alignment."
    )

    # 1. Test MCQ Correct Selection
    eval_mcq = diagnostic_engine.evaluate_checkpoint(
        question=cp,
        selected_option_id="A",
        language=LanguageCode.HINGLISH
    )
    assert eval_mcq.is_correct is True
    assert eval_mcq.score == 1.0
    assert "Shabash" in eval_mcq.re_explanation_script or "sahi" in eval_mcq.re_explanation_script
    print("  [OK] MCQ Correct answer evaluated: instant mastery approved with celebratory feedback.")

    # 2. Test Open-Ended Conceptual Correct Answer
    eval_text = diagnostic_engine.evaluate_checkpoint(
        question=cp,
        student_response="Because computing the dot product gives the cosine similarity or alignment between word vectors in high dimensional space.",
        language=LanguageCode.ENGLISH
    )
    assert eval_text.is_correct is True
    assert eval_text.score >= 0.9
    print("  [OK] Open-ended correct explanation evaluated accurately.")


def test_inverted_misconception_and_remediation():
    print("\nTesting Scenario 2: Inverted Misconception Detection & Hinglish Remediation...")
    from app.services.diagnostic_engine import diagnostic_engine
    from app.schemas.lesson import Checkpoint, CheckpointType, CorrectiveStrategy, LanguageCode

    cp_ohm = Checkpoint(
        question_id="q-ohms-law",
        question_text="What happens to the current flowing through a resistor when the resistance value increases?",
        question_type=CheckpointType.EXPLAIN_IN_OWN_WORDS,
        options=[],
        expected_concept="Current is inversely proportional to resistance; as resistance increases, current decreases.",
        rubric="Must state current decreases as resistance increases."
    )

    # Student states an inverted misconception
    student_flawed_answer = "When resistance increases, the electric current increases because there is more resistance pushing it."

    eval_diag = diagnostic_engine.evaluate_checkpoint(
        question=cp_ohm,
        student_response=student_flawed_answer,
        language=LanguageCode.HINGLISH
    )

    assert eval_diag.is_correct is False
    assert eval_diag.identified_misconception is not None
    assert eval_diag.corrective_strategy == CorrectiveStrategy.SIMPLER_ANALOGY
    assert "pipe" in eval_diag.re_explanation_script.lower() or "resistance" in eval_diag.re_explanation_script.lower()
    print(f"  [OK] Detected Misconception: {eval_diag.identified_misconception}")
    print(f"  [OK] Corrective Strategy Assigned: {eval_diag.corrective_strategy.value}")
    print(f"  [OK] Generated Hinglish Analogy Script: '{eval_diag.re_explanation_script[:90]}...'")

    # Generate Full Remediation
    remediation = diagnostic_engine.generate_remediation(
        evaluation=eval_diag,
        question=cp_ohm,
        language=LanguageCode.HINGLISH
    )
    assert remediation.re_explanation_visual is not None
    assert remediation.follow_up_checkpoint is not None
    assert remediation.follow_up_checkpoint.question_id == "follow-up-retest"
    print("  [OK] Remedial visual artifact and calibrated follow-up checkpoint created successfully.")


def test_hindi_devanagari_support():
    print("\nTesting Scenario 3: शुद्ध Hindi (Devanagari) Evaluation & Follow-Up...")
    from app.services.diagnostic_engine import diagnostic_engine
    from app.schemas.lesson import Checkpoint, CheckpointType, CheckpointOption, LanguageCode

    cp_hindi = Checkpoint(
        question_id="q-hindi",
        question_text="ओम के नियम के अनुसार, प्रतिरोध और धारा में क्या संबंध है?",
        question_type=CheckpointType.MCQ,
        options=[
            CheckpointOption(id="A", text="धारा प्रतिरोध के व्युत्क्रमानुपाती होती है।", is_correct=True, feedback="सत्य!"),
            CheckpointOption(id="B", text="धारा प्रतिरोध के समानुपाती होती है।", is_correct=False, feedback="गलत, यह व्युत्क्रमानुपाती है।")
        ],
        expected_concept="धारा प्रतिरोध के व्युत्क्रमानुपाती होती है।",
        rubric="Check for inverse proportionality."
    )

    # 1. Correct Answer in Hindi
    eval_hi_correct = diagnostic_engine.evaluate_checkpoint(
        question=cp_hindi,
        selected_option_id="A",
        language=LanguageCode.HINDI
    )
    assert eval_hi_correct.is_correct is True
    assert "अद्भुत" in eval_hi_correct.re_explanation_script or "सटीक" in eval_hi_correct.re_explanation_script
    print("  [OK] Hindi correct answer evaluated with pure Devanagari praise.")

    # 2. Incorrect Answer in Hindi
    eval_hi_wrong = diagnostic_engine.evaluate_checkpoint(
        question=cp_hindi,
        selected_option_id="B",
        language=LanguageCode.HINDI
    )
    assert eval_hi_wrong.is_correct is False
    assert "विकल्प" in eval_hi_wrong.re_explanation_script or "उदाहरण" in eval_hi_wrong.re_explanation_script
    print("  [OK] Hindi misconception evaluated with empathetic Devanagari re-explanation.")


def test_whiteboard_visual_payload_syntax():
    print("\nTesting Scenario 4: Whiteboard Visual Payload Syntax Validity...")
    from app.services.diagnostic_engine import diagnostic_engine
    from app.schemas.lesson import CorrectiveStrategy, LanguageCode, VisualType

    # 1. KaTeX Visual Syntax Check
    katex_visual = diagnostic_engine._generate_visual_for_strategy(
        strategy=CorrectiveStrategy.FIRST_PRINCIPLES,
        topic="Ohm's Law",
        details="Inverse relationship",
        language=LanguageCode.ENGLISH
    )
    assert katex_visual.type == VisualType.KATEX
    assert "\\frac" in katex_visual.raw_payload
    print(f"  [OK] KaTeX Visual Syntax: {katex_visual.raw_payload}")

    # 2. Mermaid Visual Syntax Check
    mermaid_visual = diagnostic_engine._generate_visual_for_strategy(
        strategy=CorrectiveStrategy.SIMPLER_ANALOGY,
        topic="Resistance",
        details="Traffic obstruction",
        language=LanguageCode.ENGLISH
    )
    assert mermaid_visual.type == VisualType.MERMAID
    assert "graph LR" in mermaid_visual.raw_payload or "graph TD" in mermaid_visual.raw_payload
    print(f"  [OK] Mermaid Diagram Syntax: Verified valid graph definition.")


def test_session_websocket_orchestration():
    print("\nTesting Scenario 5 & 6: Session Manager WebSocket Remediation Cycle...")
    from app.services.session_manager import session_manager
    from app.schemas.lesson import (
        StudentProfile,
        EducationalLevel,
        LanguageCode,
        StudentResponse,
    )

    profile = StudentProfile(
        target_topic="Attention Mechanism in Transformers",
        educational_level=EducationalLevel.INTERMEDIATE,
        language=LanguageCode.HINGLISH,
        available_time_minutes="20"
    )

    session = session_manager.create_session("sess-ws-test", profile)

    async def run_ws_simulation():
        # Start lesson
        await session_manager.start_session_curriculum("sess-ws-test")
        assert session.lesson_plan is not None
        assert session.current_module is not None
        print("  [OK] Curriculum started. Module 1 dispatched.")

        # Simulate incorrect student response (Option B)
        flawed_resp = StudentResponse(
            session_id="sess-ws-test",
            module_id=session.current_module.module_id,
            question_id=session.current_module.checkpoint.question_id,
            selected_option_id="B"
        )
        await session_manager.handle_student_response(flawed_resp)
        assert session.is_remediating is True
        assert session.active_followup is not None
        print(f"  [OK] Misconception triggered remediation state and dispatched follow-up check.")

        # Simulate student answering the follow-up check correctly (Option A)
        followup_resp = StudentResponse(
            session_id="sess-ws-test",
            module_id=session.current_module.module_id,
            question_id=session.active_followup.question_id,
            selected_option_id="A"
        )
        await session_manager.handle_followup_response(followup_resp)
        assert session.is_remediating is False
        assert session.active_followup is None
        print("  [OK] Follow-up check passed! Curriculum resumed and advanced.")

        # Test language switch
        await session_manager.switch_language("sess-ws-test", LanguageCode.HINDI)
        assert session.profile.language == LanguageCode.HINDI
        print("  [OK] Dynamic language switched to Hindi.")

    asyncio.run(run_ws_simulation())


if __name__ == "__main__":
    print("==================================================")
    print("SYNAPSE AI TEACHER - PHASE 3 SOCRATIC DIAGNOSTICS")
    print("==================================================")
    try:
        test_accurate_student_answer()
        test_inverted_misconception_and_remediation()
        test_hindi_devanagari_support()
        test_whiteboard_visual_payload_syntax()
        test_session_websocket_orchestration()
        print("\n==================================================")
        print("ALL PHASE 3 SOCRATIC DIAGNOSTIC TESTS PASSED!")
        print("==================================================")
    except Exception as e:
        print(f"\n[!] TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
