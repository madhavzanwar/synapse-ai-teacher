"""
Comprehensive Voice Engine & Post-Lesson Mastery Analytics Test Suite (Phase 4).
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

def test_ssml_and_emotion_parser():
    print("Testing Scenario 1: SSML & Emotion Tag Parser...")
    from app.services.voice_engine import voice_engine
    from app.schemas.lesson import LanguageCode

    raw_script = "<emotion=enthusiastic>Welcome everyone! <pause=350ms> Today we are mastering the Self-Attention mechanism.</emotion>"
    clean_text, ssml, emotion, rate = voice_engine.parse_script_to_ssml(raw_script, LanguageCode.ENGLISH)

    assert emotion == "enthusiastic"
    assert "<emotion=" not in clean_text
    assert "<pause=" not in clean_text
    assert "Welcome everyone! Today we are mastering the Self-Attention mechanism." in clean_text
    assert '<break time="350ms"/>' in ssml
    assert '<prosody rate="105%"' in ssml
    print("  [OK] Clean text extracted without tags: ", clean_text)
    print("  [OK] Valid SSML markup generated: ", ssml[:85], "...")
    print("  [OK] Emotion and speech rate parsed: ", emotion, f"({rate}x)")


def test_audio_waveform_telemetry():
    print("\nTesting Scenario 2: Audio Waveform Telemetry...")
    from app.services.voice_engine import voice_engine

    idle_waves = voice_engine.get_audio_telemetry_wave(is_speaking=False, is_remediating=False)
    speaking_waves = voice_engine.get_audio_telemetry_wave(is_speaking=True, is_remediating=False)
    remediating_waves = voice_engine.get_audio_telemetry_wave(is_speaking=True, is_remediating=True)

    assert len(idle_waves) == 8
    assert len(speaking_waves) == 8
    assert max(speaking_waves) > max(idle_waves)
    assert max(remediating_waves) > max(idle_waves)
    print("  [OK] Audio waveform telemetry generated for idle, speaking, and remedial states.")


def test_mastery_report_calculation_and_branding():
    print("\nTesting Scenario 3: Post-Lesson Mastery Analytics & Radar Chart Data...")
    from app.services.pedagogy_engine import pedagogy_engine
    from app.schemas.lesson import (
        StudentProfile,
        EducationalLevel,
        LanguageCode,
        LessonPlan,
        LessonModule,
        VisualAction,
        VisualType,
        Checkpoint,
        CheckpointType,
        ModuleMasteryRecord,
    )

    profile = StudentProfile(
        target_topic="Deep Residual Networks (ResNets)",
        educational_level=EducationalLevel.INTERMEDIATE,
        language=LanguageCode.ENGLISH,
        available_time_minutes="20"
    )

    lesson_plan = LessonPlan(
        topic="Deep Residual Networks (ResNets)",
        student_level=EducationalLevel.INTERMEDIATE,
        language=LanguageCode.ENGLISH,
        total_estimated_minutes=20,
        pedagogical_goals=["Understand vanishing gradients", "Master skip connections"],
        modules=[
            LessonModule(
                module_id="mod-1",
                title="The Degradation Problem",
                estimated_minutes=5,
                teaching_script="Degradation problem causes accuracy saturation.",
                visual_action=VisualAction(type=VisualType.KATEX, raw_payload="\\mathcal{F}(x) + x"),
                checkpoint=Checkpoint(
                    question_id="q1",
                    question_text="Why do plain deep networks degrade?",
                    question_type=CheckpointType.EXPLAIN_IN_OWN_WORDS,
                    expected_concept="Vanishing gradients hinder backpropagation.",
                    rubric="Check for vanishing gradient concept."
                )
            )
        ]
    )

    records = [
        ModuleMasteryRecord(
            module_id="mod-1",
            title="The Degradation Problem",
            attempts_count=1,
            passed=True,
            score=0.95,
            misconceptions_encountered=[]
        )
    ]

    report = pedagogy_engine.generate_mastery_report(
        session_id="test-session-mastery",
        profile=profile,
        lesson_plan=lesson_plan,
        records=records
    )

    assert report.overall_mastery_percentage == 95.0
    assert len(report.strengths) >= 2
    assert len(report.concept_breakdown) == 5
    # Verify Radar chart keys
    for dim in report.concept_breakdown:
        assert "subject" in dim
        assert "score" in dim
        assert "fullMark" in dim
        assert dim["score"] <= 100

    print("  [OK] Overall Mastery Percentage: ", report.overall_mastery_percentage, "%")
    print("  [OK] Concept Radar Breakdown (5 axes):")
    for dim in report.concept_breakdown:
        print(f"       - {dim['subject']}: {dim['score']}/{dim['fullMark']}")

    # Verify Developer Portfolio Watermark
    expected_watermark = "Developed by Madhav Zanwar (madhav_builds) — AIML Student | Problem Solver | Tech Enthusiast"
    assert report.developer_watermark == expected_watermark
    print(f"  [OK] Developer Portfolio Watermark verified: '{report.developer_watermark}'")


def test_full_session_completion_lifecycle():
    print("\nTesting Scenario 4: End-to-End Lesson Completion & WebSocket Broadcast...")
    from app.services.session_manager import session_manager
    from app.schemas.lesson import (
        StudentProfile,
        EducationalLevel,
        LanguageCode,
        EventType,
    )

    profile = StudentProfile(
        target_topic="Quantum Superposition",
        educational_level=EducationalLevel.BEGINNER,
        language=LanguageCode.HINGLISH,
        available_time_minutes="5"
    )

    session = session_manager.create_session("sess-lifecycle-test", profile)

    async def run_lifecycle():
        await session_manager.start_session_curriculum("sess-lifecycle-test")
        assert session.lesson_plan is not None

        # Advance through all modules to conclude lesson
        for _ in range(len(session.lesson_plan.modules)):
            await session_manager.advance_to_next_module("sess-lifecycle-test")

        assert session.is_completed is True
        # Check event history for LESSON_COMPLETE
        complete_events = [e for e in session.event_history if e.event_type == EventType.LESSON_COMPLETE]
        assert len(complete_events) == 1
        report_data = complete_events[0].data.get("mastery_report")
        assert report_data is not None
        assert "concept_breakdown" in report_data
        assert "developer_watermark" in report_data
        print("  [OK] Session successfully completed! LESSON_COMPLETE event broadcasted with full mastery certificate.")

    asyncio.run(run_lifecycle())


if __name__ == "__main__":
    print("==================================================")
    print("SYNAPSE AI TEACHER - PHASE 4 VOICE & MASTERY SUITE")
    print("==================================================")
    try:
        test_ssml_and_emotion_parser()
        test_audio_waveform_telemetry()
        test_mastery_report_calculation_and_branding()
        test_full_session_completion_lifecycle()
        print("\n==================================================")
        print("ALL PHASE 4 VOICE & MASTERY TESTS PASSED!")
        print("==================================================")
    except Exception as e:
        print(f"\n[!] TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
