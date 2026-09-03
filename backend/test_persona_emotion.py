"""
Comprehensive Test Suite for Advanced Phase 2: Multiple Teacher Personalities & Emotion-Aware Interaction.
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

def test_persona_engine_prompts():
    print("Testing Scenario 1: Teacher Persona Engine Configurations...")
    from app.services.persona_engine import persona_engine
    from app.schemas.lesson import TeacherPersona, LanguageCode

    # 1. Verify Socratic Mentor Prompt
    mentor_prompt = persona_engine.get_system_prompt(TeacherPersona.MENTOR, LanguageCode.ENGLISH)
    assert "Socratic Mentor" in mentor_prompt
    assert "analogies" in mentor_prompt.lower()
    print("  [OK] Dr. Sophia (The Socratic Mentor) prompt verified.")

    # 2. Verify Senior Tech Lead Prompt
    tech_lead_prompt = persona_engine.get_system_prompt(TeacherPersona.TECH_LEAD, LanguageCode.ENGLISH)
    assert "Senior Tech Lead" in tech_lead_prompt
    assert "first-principles" in tech_lead_prompt.lower() or "complexity" in tech_lead_prompt.lower()
    print("  [OK] Alex Chen (The Senior Tech Lead) prompt verified.")

    # 3. Verify Fast-Paced Coach Prompt
    coach_prompt = persona_engine.get_system_prompt(TeacherPersona.COACH, LanguageCode.HINGLISH)
    assert "Coach Marcus" in coach_prompt
    assert "energetic" in coach_prompt.lower() or "rapid" in coach_prompt.lower()
    print("  [OK] Coach Marcus (The Fast-Paced Coach) Hinglish prompt verified.")

    # 4. Metadata verification
    personas = persona_engine.get_all_personas()
    assert len(personas) == 3
    assert any(p["id"] == "mentor" for p in personas)
    assert any(p["id"] == "tech_lead" for p in personas)
    assert any(p["id"] == "coach" for p in personas)
    print(f"  [OK] Successfully registered {len(personas)} distinct instructor personas.")


def test_emotion_aware_frustration_detection():
    print("\nTesting Scenario 2: Frustration Detection & Emotional Intervention...")
    from app.services.diagnostic_engine import diagnostic_engine
    from app.schemas.lesson import (
        Checkpoint,
        CheckpointType,
        LanguageCode,
        VisualType,
    )

    checkpoint = Checkpoint(
        question_id="q-attention-scaling",
        question_text="Explain why we divide the dot products by sqrt(d_k) in Self-Attention.",
        question_type=CheckpointType.EXPLAIN_IN_OWN_WORDS,
        expected_concept="Scaling prevents dot products from growing large, preventing vanishing gradients in softmax.",
        rubric="Look for gradient saturation or softmax scaling explanation."
    )

    # Test 1: Frustrated English Response
    frustrated_resp = "I don't understand this at all, it is too confusing and I am totally lost!"
    eval_result = diagnostic_engine.evaluate_checkpoint(
        question=checkpoint,
        student_response=frustrated_resp,
        language=LanguageCode.ENGLISH
    )

    assert eval_result.is_frustrated is True
    assert eval_result.is_emotional_intervention is True
    assert eval_result.sentiment_score < 0.0
    assert "<emotion=empathetic>" in eval_result.re_explanation_script
    assert eval_result.re_explanation_visual is not None
    assert eval_result.re_explanation_visual.type == VisualType.CALLOUT
    assert eval_result.follow_up_checkpoint is not None
    print("  [OK] English frustration successfully detected -> EMOTIONAL_INTERVENTION triggered.")
    print(f"       Speech excerpt: {eval_result.re_explanation_script[:85]}...")

    # Test 2: Frustrated Hinglish Response
    frustrated_hinglish = "Mujhe kuch samajh nahi aa raha, bohot hard hai ye math!"
    eval_hinglish = diagnostic_engine.evaluate_checkpoint(
        question=checkpoint,
        student_response=frustrated_hinglish,
        language=LanguageCode.HINGLISH
    )
    assert eval_hinglish.is_frustrated is True
    assert eval_hinglish.is_emotional_intervention is True
    assert "<emotion=empathetic>" in eval_hinglish.re_explanation_script
    print("  [OK] Hinglish frustration successfully detected -> Hinglish empathetic reassurance.")
    print(f"       Speech excerpt: {eval_hinglish.re_explanation_script[:85]}...")


def test_voice_engine_empathetic_ssml_mapping():
    print("\nTesting Scenario 3: Voice Engine Empathetic SSML & Prosody Mapping...")
    from app.services.voice_engine import voice_engine
    from app.schemas.lesson import LanguageCode

    script = "<emotion=empathetic>Take a deep breath — this is completely normal! <pause=300ms> Let's step back and look at ground zero intuition.</emotion>"
    clean_text, ssml, emotion, rate = voice_engine.parse_script_to_ssml(script, LanguageCode.ENGLISH)

    assert emotion == "empathetic"
    assert rate == 0.88  # Slower, calming rate
    assert '<prosody rate="88%" pitch="-1st">' in ssml
    assert '<break time="300ms"/>' in ssml
    assert "<emotion=" not in clean_text
    print("  [OK] Empathetic tag mapped to 0.88x speech rate, -1st pitch, and clean SSML prosody:")
    print(f"       SSML: {ssml}")


if __name__ == "__main__":
    print("==================================================")
    print("SYNAPSE AI TEACHER - ADVANCED PHASE 2 TEST SUITE")
    print("==================================================")
    try:
        test_persona_engine_prompts()
        test_emotion_aware_frustration_detection()
        test_voice_engine_empathetic_ssml_mapping()
        print("\n==================================================")
        print("ALL ADVANCED PHASE 2 TESTS PASSED SUCCESSFULLY!")
        print("==================================================")
    except Exception as e:
        print(f"\n[!] TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
