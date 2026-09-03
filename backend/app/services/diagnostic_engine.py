"""
Socratic Diagnostic & Misconception Engine for Synapse AI Teacher.
Performs deep cognitive evaluation of student answers, classifies misconceptions,
determines corrective strategies (Analogy, First Principles, Counterexample, Step-by-Step),
and generates tailored remedial explanations, dynamic blackboard visuals, and follow-up re-test checkpoints.
"""
import json
import logging
import re
from typing import Optional, Dict, Any, List

try:
    import google.generativeai as genai
except ImportError:
    genai = None

from app.config import settings
from app.schemas.lesson import (
    Checkpoint,
    CheckpointType,
    CheckpointOption,
    DiagnosticEvaluation,
    RemedialAction,
    CorrectiveStrategy,
    VisualAction,
    VisualType,
    LanguageCode,
    StudentProfile,
)

logger = logging.getLogger(__name__)

# Configure Gemini if API key is present
if genai and settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)


def _call_gemini_json(prompt: str, system_instruction: str = "") -> Optional[Dict[str, Any]]:
    """Helper to query Gemini with JSON response constraint."""
    if not genai or not settings.GEMINI_API_KEY:
        return None

    try:
        model = genai.GenerativeModel(
            model_name=settings.GEMINI_FLASH_MODEL or "gemini-1.5-flash",
            system_instruction=system_instruction,
            generation_config={
                "response_mime_type": "application/json",
                "temperature": 0.25,
            }
        )
        response = model.generate_content(prompt)
        text = response.text.strip()
        text = re.sub(r"^```json\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        return json.loads(text)
    except Exception as e:
        logger.warning(f"Gemini API call failed or returned unparseable JSON in diagnostic engine: {e}")
        return None


class DiagnosticEngine:
    """
    Socratic Diagnostic Engine implementing deep cognitive misconception analysis
    and adaptive pedagogical remediation loops.
    """

    def __init__(self):
        pass

    # -----------------------------------------------------------------------
    # Step 1: Evaluate Student Answer & Detect Misconceptions
    # -----------------------------------------------------------------------

    def evaluate_checkpoint(
        self,
        question: Checkpoint,
        student_response: str = "",
        selected_option_id: Optional[str] = None,
        lesson_context: str = "",
        language: LanguageCode = LanguageCode.ENGLISH
    ) -> DiagnosticEvaluation:
        """
        Evaluates student response (MCQ or Open-Ended text/audio transcript).
        Identifies whether understanding is correct, a minor terminology slip, or a deep cognitive misconception.
        Detects frustration/confusion and triggers emotional intervention.
        """
        clean_resp = student_response.lower().strip() if student_response else ""

        # 0. Frustration & Cognitive Fatigue Detection
        frustration_patterns = [
            r"don'?t (get|understand|know)",
            r"too (hard|difficult|complex|confusing)",
            r"(so|totally|completely) lost",
            r"(give up|stuck|help me|can'?t do this)",
            r"(samajh nahi|bohot hard|mushkil|sir ghoom)",
        ]
        if any(re.search(p, clean_resp) for p in frustration_patterns):
            return self._build_emotional_intervention_evaluation(question, language)

        # 1. Direct MCQ Option Evaluation
        if question.question_type == CheckpointType.MCQ and selected_option_id:
            matching_opt = next((opt for opt in (question.options or []) if opt.id == selected_option_id), None)
            if matching_opt and matching_opt.is_correct:
                praise = self._get_success_praise(language)
                return DiagnosticEvaluation(
                    is_correct=True,
                    score=1.0,
                    identified_misconception=None,
                    root_cause="",
                    corrective_strategy=CorrectiveStrategy.SIMPLER_ANALOGY,
                    re_explanation_script=praise,
                    re_explanation_visual=None,
                    follow_up_prompt=""
                )
            else:
                feedback = matching_opt.feedback if matching_opt else "Selected option was incorrect."
                opt_text = matching_opt.text if matching_opt else selected_option_id
                
                # Determine strategy based on question context
                strategy = CorrectiveStrategy.SIMPLER_ANALOGY
                if "formula" in question.question_text.lower() or "scale" in question.question_text.lower() or "gradient" in question.question_text.lower():
                    strategy = CorrectiveStrategy.FIRST_PRINCIPLES
                elif "code" in question.question_text.lower() or "mask" in question.question_text.lower():
                    strategy = CorrectiveStrategy.VISUAL_COUNTEREXAMPLE

                remedial_script = self._build_mcq_remedial_speech(
                    opt_id=selected_option_id,
                    opt_text=opt_text,
                    feedback=feedback,
                    expected_concept=question.expected_concept,
                    language=language
                )

                remedial_visual = self._generate_visual_for_strategy(
                    strategy=strategy,
                    topic=question.expected_concept,
                    details=feedback,
                    language=language
                )

                follow_up = self._generate_follow_up_checkpoint(question, language)

                return DiagnosticEvaluation(
                    is_correct=False,
                    score=0.0,
                    identified_misconception=f"Student chose option {selected_option_id}: '{opt_text}'. {feedback}",
                    root_cause=f"Confused operational mechanism with secondary property: {feedback}",
                    corrective_strategy=strategy,
                    re_explanation_script=remedial_script,
                    re_explanation_visual=remedial_visual,
                    follow_up_prompt=follow_up.question_text,
                    follow_up_checkpoint=follow_up
                )

        # 2. Open-Ended Conceptual Answer Evaluation (Gemini 1.5 Socratic Prompt)
        if settings.GEMINI_API_KEY:
            eval_result = self._evaluate_with_gemini(
                question=question,
                student_text=student_response,
                lesson_context=lesson_context,
                language=language
            )
            if eval_result:
                return eval_result

        # 3. Rule-Based Fallback Evaluator
        return self._evaluate_rule_based_fallback(
            question=question,
            student_text=student_response,
            language=language
        )

    # -----------------------------------------------------------------------
    # Step 2: Generate Full Remediation Intervention
    # -----------------------------------------------------------------------

    def generate_remediation(
        self,
        evaluation: DiagnosticEvaluation,
        question: Checkpoint,
        lesson_context: str = "",
        language: LanguageCode = LanguageCode.ENGLISH
    ) -> RemedialAction:
        """
        Creates an empathetic conversational script, a tailored whiteboard visual artifact,
        and a calibrated follow-up micro-question.
        """
        follow_up = evaluation.follow_up_checkpoint or self._generate_follow_up_checkpoint(question, language)
        visual = evaluation.re_explanation_visual or self._generate_visual_for_strategy(
            strategy=evaluation.corrective_strategy,
            topic=question.expected_concept,
            details=evaluation.root_cause,
            language=language
        )

        return RemedialAction(
            strategy=evaluation.corrective_strategy,
            identified_misconception=evaluation.identified_misconception,
            root_cause=evaluation.root_cause,
            re_explanation_script=evaluation.re_explanation_script,
            re_explanation_visual=visual,
            follow_up_checkpoint=follow_up
        )

    # -----------------------------------------------------------------------
    # LLM-Powered Socratic Diagnostics (Gemini 1.5)
    # -----------------------------------------------------------------------

    def _evaluate_with_gemini(
        self,
        question: Checkpoint,
        student_text: str,
        lesson_context: str,
        language: LanguageCode
    ) -> Optional[DiagnosticEvaluation]:
        system_instruction = f"""You are Synapse Socratic Diagnostic Engine.
Your task is to analyze the student's explanation and detect deep cognitive misconceptions vs minor vocabulary slips.
Language of instruction: {language.value}.

Pedagogical Principles:
1. Empathy & Warmth: Never mock the student. Frame errors as natural stepping stones.
2. If in Hinglish: blend natural conversational Hindi with technical English terms.
3. In pure Hindi: use graceful Devanagari script.
4. Voice Markers: include emotion tags like <emotion=encouraging>, <emotion=thoughtful>, <emotion=curious>, <pause=350ms>.
5. Classify the best corrective strategy:
   - 'simpler_analogy': everyday physical/real-world metaphor
   - 'first_principles': logical/mathematical derivation from axioms
   - 'visual_counterexample': scenario proving the student's premise impossible
   - 'step_by_step_breakdown': 2-step structured decomposition
"""
        prompt = f"""
Analyze this student response to the checkpoint question:

Question: {question.question_text}
Expected Concept: {question.expected_concept}
Evaluation Rubric: {question.rubric}
Lesson Context: {lesson_context[:600] if lesson_context else "Standard curriculum"}
Student's Response: "{student_text}"

Return a JSON object with:
{{
  "is_correct": boolean,
  "score": float (between 0.0 and 1.0),
  "identified_misconception": string or null,
  "root_cause": string (why this mental model error occurred),
  "corrective_strategy": "simpler_analogy" | "first_principles" | "visual_counterexample" | "step_by_step_breakdown",
  "re_explanation_script": string (conversational teacher speech in {language.value} with emotion tags),
  "re_explanation_visual": {{
    "type": "katex" | "mermaid" | "code" | "callout",
    "title": string,
    "raw_payload": string,
    "explanation_notes": string,
    "entry_animation_cue": "fade-slide"
  }},
  "follow_up_checkpoint": {{
    "question_id": "follow-up-1",
    "question_text": string,
    "question_type": "mcq",
    "options": [
      {{"id": "A", "text": string, "is_correct": boolean, "feedback": string}},
      {{"id": "B", "text": string, "is_correct": boolean, "feedback": string}}
    ],
    "expected_concept": string,
    "rubric": string
  }}
}}
"""
        raw_json = _call_gemini_json(prompt, system_instruction)
        if raw_json:
            try:
                # Validate and parse
                eval_obj = DiagnosticEvaluation.model_validate(raw_json)
                if "follow_up_checkpoint" in raw_json and raw_json["follow_up_checkpoint"]:
                    eval_obj.follow_up_checkpoint = Checkpoint.model_validate(raw_json["follow_up_checkpoint"])
                return eval_obj
            except Exception as err:
                logger.warning(f"Error parsing Gemini diagnostic JSON: {err}")

        return None

    # -----------------------------------------------------------------------
    # Rule-Based Diagnostics & Multilingual Templates
    # -----------------------------------------------------------------------

    def _evaluate_rule_based_fallback(
        self,
        question: Checkpoint,
        student_text: str,
        language: LanguageCode
    ) -> DiagnosticEvaluation:
        clean = student_text.lower().strip()
        # 1. Inverted misconception detection heuristics
        inverted_patterns = [
            ("resistance", [r"current.*increas", r"increas.*current", r"more current", r"current badhega", r"current badhta hai"]),
            ("dot product", [r"compress", r"shrink", r"dropout", r"drop token"]),
            ("softmax", [r"linear", r"negative", r"speeds up compute"]),
            ("gradient", [r"increas.*loss", r"uphill"]),
        ]

        for topic_kw, bad_patterns in inverted_patterns:
            if topic_kw in question.question_text.lower() or topic_kw in question.expected_concept.lower():
                for pattern in bad_patterns:
                    if re.search(pattern, clean):
                        # Inverted Misconception Detected!
                        misconception = f"Inverted relationship: student asserted that {topic_kw} causes {pattern}."
                        root_cause = f"Confused inverse relationship with direct proportionality."
                        strategy = CorrectiveStrategy.SIMPLER_ANALOGY
                        
                        remedial_script = self._build_analogy_speech(topic_kw, language)
                        remedial_visual = self._generate_visual_for_strategy(strategy, question.expected_concept, root_cause, language)
                        follow_up = self._generate_follow_up_checkpoint(question, language)

                        return DiagnosticEvaluation(
                            is_correct=False,
                            score=0.2,
                            identified_misconception=misconception,
                            root_cause=root_cause,
                            corrective_strategy=strategy,
                            re_explanation_script=remedial_script,
                            re_explanation_visual=remedial_visual,
                            follow_up_prompt=follow_up.question_text,
                            follow_up_checkpoint=follow_up
                        )

        # 2. General correctness matching
        keywords = set(re.findall(r"\w+", question.expected_concept.lower()))
        matched_kw = [w for w in keywords if len(w) > 3 and w in clean]
        is_substantially_correct = len(matched_kw) >= 2 or (len(clean) > 20 and any(w in clean for w in ["similarity", "dot product", "softmax", "saturate", "gradient", "superposition", "probability", "residual", "relevance"]))

        if is_substantially_correct:
            return DiagnosticEvaluation(
                is_correct=True,
                score=0.95,
                identified_misconception=None,
                root_cause="",
                corrective_strategy=CorrectiveStrategy.SIMPLER_ANALOGY,
                re_explanation_script=self._get_success_praise(language),
                re_explanation_visual=None,
                follow_up_prompt=""
            )
        else:
            strategy = CorrectiveStrategy.STEP_BY_STEP_BREAKDOWN
            remedial_script = self._build_breakdown_speech(question.expected_concept, language)
            remedial_visual = self._generate_visual_for_strategy(strategy, question.expected_concept, "Incomplete intuition", language)
            follow_up = self._generate_follow_up_checkpoint(question, language)

            return DiagnosticEvaluation(
                is_correct=False,
                score=0.4,
                identified_misconception="Partial or fuzzy intuition regarding causal mechanism.",
                root_cause="Student stated surface observations without tracing the underlying causal link.",
                corrective_strategy=strategy,
                re_explanation_script=remedial_script,
                re_explanation_visual=remedial_visual,
                follow_up_prompt=follow_up.question_text,
                follow_up_checkpoint=follow_up
            )

    # -----------------------------------------------------------------------
    # Multilingual Speech Synthesis Builders
    # -----------------------------------------------------------------------

    def _get_success_praise(self, language: LanguageCode) -> str:
        if language == LanguageCode.HINGLISH:
            return "<emotion=enthusiastic>Shabash! Bilkul sahi pakde hain. <pause=300ms> Aapka intuition ekdum solid hai. Chalo ab next core concept par chalte hain!</emotion>"
        elif language == LanguageCode.HINDI:
            return "<emotion=enthusiastic>अद्भुत! आपका उत्तर बिल्कुल सटीक और स्पष्ट है। <pause=300ms> आपने मूल अवधारणा को बहुत अच्छी तरह समझ लिया है। आइए अगले चरण की ओर बढ़ें।</emotion>"
        elif language == LanguageCode.SPANISH:
            return "<emotion=enthusiastic>¡Excelente! Has captado el concepto fundamental con total claridad. <pause=300ms> ¡Sigamos avanzando con ese mismo impulso!</emotion>"
        return "<emotion=enthusiastic>Spot on! That is exactly right. You grasped the fundamental concept smoothly. Let's keep this momentum going!</emotion>"

    def _build_mcq_remedial_speech(
        self,
        opt_id: Optional[str],
        opt_text: str,
        feedback: str,
        expected_concept: str,
        language: LanguageCode
    ) -> str:
        if language == LanguageCode.HINGLISH:
            return f"<emotion=thoughtful>Dekho, aapne Option {opt_id or ''} select kiya. <pause=300ms> Par dhyan se socho: {feedback} <emotion=encouraging>Chalo whiteboard par iska ek bohot simple intuition dekhte hain taaki concept crystal clear ho jaye!</emotion>"
        elif language == LanguageCode.HINDI:
            return f"<emotion=thoughtful>आपने विकल्प {opt_id or ''} चुना। <pause=300ms> ध्यान दें: {feedback} <emotion=encouraging>आइए व्हाइटबोर्ड पर इसे एक सरल चित्र के माध्यम से समझते हैं ताकि कोई संदेह न रहे।</emotion>"
        elif language == LanguageCode.SPANISH:
            return f"<emotion=thoughtful>Has seleccionado la opción {opt_id or ''}. <pause=300ms> {feedback} <emotion=encouraging>¡Veamos una analogía visual en la pizarra para aclararlo por completo!</emotion>"
        return f"<emotion=thoughtful>Not quite, but this is a very common point of confusion! <pause=300ms> {feedback} <emotion=encouraging>Let's look at a simpler visualization on our board to make this crystal clear.</emotion>"

    def _build_analogy_speech(self, topic: str, language: LanguageCode) -> str:
        if language == LanguageCode.HINGLISH:
            return f"<emotion=thoughtful>Ek second ruko! <pause=300ms> Yahan ek bohot interesting intuition hai. <emotion=curious>Socho agar ek paani ke pipe mein kachra phas jaye (Resistance badh jaye), toh paani ka flow (Current) badhega ya kam hoga? <pause=400ms> Obviously kam hoga na!</emotion> Bilkul waise hi yahan mechanism kaam karta hai. Let's verify this on the board!</emotion>"
        elif language == LanguageCode.HINDI:
            return f"<emotion=thoughtful>एक क्षण रुकिए! <pause=300ms> आइए इसे एक व्यावहारिक उदाहरण से समझें। <emotion=curious>यदि पानी के पाइप में कोई रुकावट (प्रतिरोध) आ जाए, तो जल का प्रवाह (धारा) बढ़ेगा या घटेगा? <pause=400ms> स्वाभाविक रूप से घटेगा!</emotion> ठीक इसी प्रकार यह सिद्धांत भी कार्य करता है। आइए इसे व्हाइटबोर्ड पर देखें।</emotion>"
        return f"<emotion=thoughtful>Hold on a moment! <pause=300ms> Let's use an everyday physical analogy. <emotion=curious>Think of traffic on a highway: if road construction (resistance) increases, does the flow of cars (current) speed up or slow down? <pause=400ms> It slows down!</emotion> That exact same causal principle applies here. Let's see it on the blackboard.</emotion>"

    def _build_breakdown_speech(self, expected_concept: str, language: LanguageCode) -> str:
        if language == LanguageCode.HINGLISH:
            return f"<emotion=thoughtful>Aap sahi direction mein soch rahe ho, par chalo is concept ko 2 simple steps mein todte hain. <pause=300ms> Pehle cause dekhte hain, fir effect. Board par dekho!</emotion>"
        elif language == LanguageCode.HINDI:
            return f"<emotion=thoughtful>आप सही दिशा में सोच रहे हैं, पर आइए इस अवधारणा को दो सरल चरणों में विभाजित करके समझें। <pause=300ms> व्हाइटबोर्ड पर ध्यान दीजिए।</emotion>"
        return f"<emotion=thoughtful>You are thinking in the right direction! Let's break this down into two clear, intuitive steps on our board so the causal link clicks immediately.</emotion>"

    # -----------------------------------------------------------------------
    # Remedial Visual Artifact Generators
    # -----------------------------------------------------------------------

    def _generate_visual_for_strategy(
        self,
        strategy: CorrectiveStrategy,
        topic: str,
        details: str,
        language: LanguageCode
    ) -> VisualAction:
        if strategy == CorrectiveStrategy.SIMPLER_ANALOGY:
            return VisualAction(
                type=VisualType.MERMAID,
                title="Intuitive Analogy Mapping",
                raw_payload="""graph LR
    Cause["Increased Resistance / Obstacle ⚠️"] --> Effect["Reduced Flow / Constrained Output 📉"]
    style Cause fill:#f59e0b,stroke:#b45309,color:#fff
    style Effect fill:#6366f1,stroke:#4338ca,color:#fff""",
                explanation_notes="Remember: Resistance resists flow; it never amplifies it.",
                entry_animation_cue="fade-slide"
            )
        elif strategy == CorrectiveStrategy.FIRST_PRINCIPLES:
            return VisualAction(
                type=VisualType.KATEX,
                title="First Principles Derivation",
                raw_payload=r"I = \frac{V}{R} \quad \implies \quad R \uparrow \;\implies\; I \downarrow",
                explanation_notes="As the denominator R increases, the overall fraction I must decrease.",
                entry_animation_cue="step-reveal"
            )
        elif strategy == CorrectiveStrategy.VISUAL_COUNTEREXAMPLE:
            return VisualAction(
                type=VisualType.CALLOUT,
                title="Counterexample Demonstration",
                raw_payload=f"**If the premise were true:** Output would diverge to infinity without bounded energy.\n\n**Reality:** Bounded constraints force proportional normalization.",
                explanation_notes="Observe how conservation of energy / probability rules out the alternative.",
                entry_animation_cue="pulse"
            )
        else:
            return VisualAction(
                type=VisualType.CALLOUT,
                title="2-Step Diagnostic Breakdown",
                raw_payload=f"**Step 1 (The Trigger):** Input stimulus changes state.\n**Step 2 (The Response):** Network scales output proportionally based on normalized weights.",
                explanation_notes="Trace Step 1 to Step 2 sequentially.",
                entry_animation_cue="fade-slide"
            )

    # -----------------------------------------------------------------------
    # Emotional Reassurance & Frustration Recovery
    # -----------------------------------------------------------------------

    def _build_emotional_intervention_evaluation(
        self, question: Checkpoint, language: LanguageCode
    ) -> DiagnosticEvaluation:
        """Generates calming, empathetic reassurance when cognitive overload is detected."""
        if language == LanguageCode.HINGLISH:
            speech = "<emotion=empathetic>Arre, bilkul tension mat lo! <pause=350ms> Ye concept pehli baar mein sabko thoda tricky lagta hai. Chalo hum equations ko side mein rakh kar bohot simple zero-level intuition se step-by-step dekhte hain. You are doing great!</emotion>"
            followup_text = "Calm Check: Kya aap ready ho isko ek super simple daily-life example se dubara dekhne ke liye?"
        elif language == LanguageCode.HINDI:
            speech = "<emotion=empathetic>बिल्कुल चिंता न करें! <pause=350ms> यह अवधारणा पहली बार में थोड़ी कठिन लग सकती है। आइए इसे सबसे सरल स्तर से दोबारा समझते हैं। आप बहुत अच्छा प्रयास कर रहे हैं!</emotion>"
            followup_text = "सत्यापन: क्या हम इसे एक बहुत सरल दैनिक उदाहरण से पुनः समझें?"
        else:
            speech = "<emotion=empathetic>Take a deep breath — this is completely normal! <pause=350ms> This concept has a steep initial curve for everyone. Let's hit pause on the heavy math, step back, and look at the core intuition from ground zero. You've got this!</emotion>"
            followup_text = "Step-Back Check: Are you ready to look at a simple everyday analogy to reset our intuition?"

        follow_up = Checkpoint(
            question_id="follow-up-calm",
            question_text=followup_text,
            question_type=CheckpointType.MCQ,
            options=[
                CheckpointOption(id="A", text="Yes, let's look at the simple analogy!", is_correct=True, feedback="Wonderful! Let's build the intuition together."),
                CheckpointOption(id="B", text="Let's try one more breakdown.", is_correct=True, feedback="Great! Step by step we go.")
            ],
            expected_concept="Re-engage with open curiosity and reduced cognitive pressure.",
            rubric="Check willingness to re-anchor conceptual model."
        )

        visual = VisualAction(
            type=VisualType.CALLOUT,
            title="Emotional Reset & Ground Zero Intuition",
            raw_payload="🌿 **Deep Breath:** Complex concepts are built from simple building blocks.\n\n**Next Step:** Resetting the board to our core physical analogy.",
            explanation_notes="Cognitive complexity temporarily reduced for foundational scaffolding.",
            entry_animation_cue="fade-slide"
        )

        return DiagnosticEvaluation(
            is_correct=False,
            score=0.25,
            identified_misconception="Cognitive fatigue or frustration detected.",
            root_cause="Student feels overwhelmed by complexity. Needs emotional reassurance and foundational scaffolding.",
            corrective_strategy=CorrectiveStrategy.SIMPLER_ANALOGY,
            re_explanation_script=speech,
            re_explanation_visual=visual,
            follow_up_prompt=follow_up.question_text,
            follow_up_checkpoint=follow_up,
            is_frustrated=True,
            sentiment_score=-0.85,
            is_emotional_intervention=True
        )

    # -----------------------------------------------------------------------
    # Calibrated Follow-up Micro-Checkpoints
    # -----------------------------------------------------------------------

    def _generate_follow_up_checkpoint(self, original_q: Checkpoint, language: LanguageCode) -> Checkpoint:
        if language == LanguageCode.HINGLISH:
            return Checkpoint(
                question_id="follow-up-retest",
                question_text="Remediation Check: Ab batao, agar hum resistance (rukaawat) ko 2x bada kar dein, toh current par kya asar padega?",
                question_type=CheckpointType.MCQ,
                options=[
                    CheckpointOption(id="A", text="Current aadha (50%) ho jayega.", is_correct=True, feedback="Bohot badiya! Inverse relationship samajh aa gaya."),
                    CheckpointOption(id="B", text="Current double ho jayega.", is_correct=False, feedback="Nahi, resistance badhne se current kam hota hai, badhta nahi.")
                ],
                expected_concept="Current decreases inversely with resistance.",
                rubric="Verify student understands inverse proportionality."
            )
        elif language == LanguageCode.HINDI:
            return Checkpoint(
                question_id="follow-up-retest",
                question_text="सत्यापन प्रश्न: यदि प्रतिरोध को दोगुना कर दिया जाए, तो विद्युत धारा पर क्या प्रभाव पड़ेगा?",
                question_type=CheckpointType.MCQ,
                options=[
                    CheckpointOption(id="A", text="विद्युत धारा घटकर आधी (50%) हो जाएगी।", is_correct=True, feedback="अति उत्तम! आपने संबंध को सही पहचाना।"),
                    CheckpointOption(id="B", text="विद्युत धारा दोगुनी हो जाएगी।", is_correct=False, feedback="अशुद्ध, प्रतिरोध बढ़ने पर धारा घटती है।")
                ],
                expected_concept="धारा प्रतिरोध के व्युत्क्रमानुपाती होती है।",
                rubric="Verify understanding in Hindi."
            )
        return Checkpoint(
            question_id="follow-up-retest",
            question_text="Verification Check: If we double the resistance in the circuit, what happens to the resulting current?",
            question_type=CheckpointType.MCQ,
            options=[
                CheckpointOption(id="A", text="Current is halved (decreases by 50%).", is_correct=True, feedback="Perfect! You have mastered the inverse relationship."),
                CheckpointOption(id="B", text="Current doubles.", is_correct=False, feedback="Incorrect, resistance opposes current flow.")
            ],
            expected_concept="Current is inversely proportional to resistance.",
            rubric="Check for inverse proportionality understanding."
        )


# Global singleton instance
diagnostic_engine = DiagnosticEngine()
