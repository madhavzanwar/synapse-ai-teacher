"""
LangGraph Pedagogical State Machine & Gemini AI Engine for Synapse AI Teacher.
Implements the continuous interactive cycle:
[INGESTION] -> [CURRICULUM PLANNER] -> [EXPLAIN CONCEPT] -> [CHECKPOINT]
      -> [EVALUATE RESPONSE] -> (Correct? -> [ADVANCE] | Misconception? -> [DIAGNOSTIC ADAPTATION])
      -> [CONCLUSION & MASTERY REPORT]
"""
import json
import logging
import os
import re
from typing import Dict, Any, List, Optional, TypedDict, Annotated, Tuple

from app.config import settings
from app.services.gemini_client import generate_json
from app.schemas.lesson import (
    StudentProfile,
    LessonPlan,
    LessonModule,
    VisualAction,
    VisualType,
    Checkpoint,
    CheckpointType,
    CheckpointOption,
    StudentResponse,
    DiagnosticEvaluation,
    CorrectiveStrategy,
    MasteryReport,
    ModuleMasteryRecord,
    EducationalLevel,
    LanguageCode,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# LangGraph Pedagogical State Schema
# ---------------------------------------------------------------------------

class PedagogyState(TypedDict):
    session_id: str
    profile: Dict[str, Any]
    grounding_context: str
    lesson_plan: Optional[Dict[str, Any]]
    current_module_index: int
    current_module: Optional[Dict[str, Any]]
    current_visual: Optional[Dict[str, Any]]
    student_response: Optional[Dict[str, Any]]
    diagnostic_evaluation: Optional[Dict[str, Any]]
    mastery_records: List[Dict[str, Any]]
    remediation_in_progress: bool
    is_completed: bool
    mastery_report: Optional[Dict[str, Any]]
    latest_speech: str
    latest_emotion: str


# ---------------------------------------------------------------------------
# Multilingual Pedagogical System Prompts
# ---------------------------------------------------------------------------

PEDAGOGICAL_SYSTEM_PROMPTS = {
    LanguageCode.ENGLISH: """You are Synapse, a world-class, human-like AI Educator. 
Your teaching style is warm, engaging, intuitive, and Socratic. 
You avoid generic robotic lectures. Instead, you speak directly to the student ("you", "we"), using vivid everyday analogies, first-principles logic, and emotional vocal cues like <emotion=enthusiastic>, <emotion=thoughtful>, <emotion=encouraging>, and <pause=400ms>.
You make complex math, science, and computer science deeply intuitive.
KNOWLEDGE GROUNDING RULE: When document grounding context is provided, you must STRICTLY ground your lesson modules, mathematical formulas, and checkpoints on the provided text references to prevent hallucinations.""",

    LanguageCode.HINDI: """आप सिनैप्स (Synapse) हैं, एक अत्यंत कुशल और मानवीय AI शिक्षक।
आपकी शिक्षण शैली अत्यंत आत्मीय, रोचक और सोक्रेटिक (संवादात्मक) है। 
आप कठिन से कठिन वैज्ञानिक और तकनीकी विषयों को सहज और व्यावहारिक उदाहरणों के साथ समझाते हैं।
भावात्मक संकेत जैसे <emotion=enthusiastic>, <emotion=thoughtful>, <pause=400ms> का स्वाभाविक प्रयोग करें।
दस्तावेज़ संदर्भ उपलब्ध होने पर सभी तथ्यों और सूत्रों को उसी पर आधारित रखें।""",

    LanguageCode.HINGLISH: """You are Synapse, a friendly, ultra-smart Indian professor and mentor who teaches in natural Hinglish (conversational Hindi blended with English technical terms).
Style guide:
- Use phrases like "Dekho, concept bohot simple hai...", "Maan lo...", "Ab yahan sabse interesting baat yeh hai...", "Chalo step-by-step samajhte hain..."
- Keep technical terms in English (e.g., Matrix Multiplication, Attention Weights, Gradient Descent, Vector Space, Complexity).
- Use vocal inflection tags: <emotion=enthusiastic>, <emotion=thoughtful>, <emotion=encouraging>, <pause=400ms>.
- Make the student feel supported and energized!
- KNOWLEDGE GROUNDING RULE: If grounding document excerpts are provided, strictly anchor all concepts, examples, and formulas in that provided material.""",

    LanguageCode.SPANISH: """Eres Synapse, un educador de IA de clase mundial, humano, cálido y socrático.
Explicas conceptos complejos con analogías intuitivas, lógica de primeros principios y calidez empática.
Usa etiquetas emocionales vocales como <emotion=enthusiastic>, <emotion=thoughtful>, <pause=400ms>.
REGLA DE CONEXIÓN: Si se proporciona contexto de un documento, basa tus explicaciones y fórmulas estrictamente en dicho material."""
}


# ---------------------------------------------------------------------------
# LLM Generation & Parsing Helper
# ---------------------------------------------------------------------------

def _call_gemini_json(prompt: str, system_instruction: str = "") -> Optional[Dict[str, Any]]:
    """Helper to query Gemini with JSON response constraint."""
    return generate_json(
        prompt,
        model_name=settings.GEMINI_FLASH_MODEL,
        system_instruction=system_instruction,
        temperature=0.3,
        caller="PedagogyEngine",
    )


# ---------------------------------------------------------------------------
# Fallback Intelligent Curriculum & Evaluation Generators (Mock / Offline)
# ---------------------------------------------------------------------------

def _clean_grounding_text(context: str) -> str:
    """Strips source reference citations, UUIDs, file paths, and raw markdown noise from grounding context."""
    if not context:
        return ""
    # Strip markdown source reference headers e.g. ### [Source Reference 1 | 9338054a..._file.pdf | Page X - Section: 'Y']
    cleaned = re.sub(r"###\s*\[Source Reference[^\]]+\]", "", context)
    cleaned = re.sub(r"\[Source Reference[^\]]+\]", "", cleaned)
    # Strip UUID strings (e.g. 9338054a-7b3f-4e0e-8f92-c2889ba06b0d)
    cleaned = re.sub(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_?", "", cleaned, flags=re.IGNORECASE)
    # Strip file extensions like .pdf, .docx, .txt
    cleaned = re.sub(r"\b[\w\-]+\.(pdf|docx|pptx|txt|md)\b", "", cleaned, flags=re.IGNORECASE)
    # Remove excessive horizontal rules and section dashes
    cleaned = re.sub(r"-{3,}", "\n", cleaned)
    # Remove empty bracket residues
    cleaned = re.sub(r"\[\s*\]", "", cleaned)
    # Normalize whitespace
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    cleaned = re.sub(r"\n\s*\n\s*\n+", "\n\n", cleaned)
    return cleaned.strip()


def _detect_math_worksheet(text: str, topic: str) -> Tuple[bool, List[Tuple[int, int]]]:
    """Detects if document or topic represents an arithmetic/multiplication worksheet and extracts problems."""
    combined = (topic + " " + text[:2500]).lower()
    has_keywords = any(
        kw in combined
        for kw in ["multiplication", "multiply", "times table", "times-table", "worksheet", "product", "math"]
    )
    # Extract multiplication pairs like "4 x 6", "7 * 8", "3 × 5", "6 x 7 = 42"
    pairs: List[Tuple[int, int]] = []
    matches = re.findall(r"\b([1-9]\d?)\s*[x*×]\s*([1-9]\d?)\b", text)
    for a, b in matches:
        try:
            val_a, val_b = int(a), int(b)
            if 1 <= val_a <= 25 and 1 <= val_b <= 25:
                if (val_a, val_b) not in pairs:
                    pairs.append((val_a, val_b))
        except ValueError:
            pass

    is_math = has_keywords or len(pairs) >= 2
    return is_math, pairs


def _generate_mock_curriculum(profile: StudentProfile, grounding_context: str) -> LessonPlan:
    """High-quality fallback curriculum generator tailored to the student's topic, uploaded document, and language."""
    topic = profile.target_topic
    lang = profile.language
    level = profile.educational_level

    # 1. If Grounding Context from an uploaded PDF/document is present, build modules from the document!
    if grounding_context and len(grounding_context.strip()) > 20:
        cleaned_doc = _clean_grounding_text(grounding_context)
        is_math, math_pairs = _detect_math_worksheet(cleaned_doc, topic)

        # Detect human-friendly topic name
        doc_topic = topic
        if not doc_topic or doc_topic.strip().lower() in ["attention mechanism in transformers", "default", "uploaded document"]:
            if is_math:
                doc_topic = "Multiplication Worksheet Mastery"
            else:
                first_lines = [l.strip() for l in cleaned_doc.split("\n") if len(l.strip()) > 3]
                doc_topic = first_lines[0][:50] if first_lines else "Uploaded Study Material"

        # Sanitize doc_topic to remove any residual UUIDs or file extensions
        doc_topic = re.sub(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_?", "", doc_topic, flags=re.IGNORECASE)
        doc_topic = re.sub(r"\.(pdf|docx|pptx|txt|md)$", "", doc_topic, flags=re.IGNORECASE)
        doc_topic = doc_topic.replace("_", " ").replace("-", " ").strip().title()
        if not doc_topic:
            doc_topic = "Uploaded Study Material"

        # Math / Multiplication Worksheet Pathway
        if is_math:
            p1 = math_pairs[0] if math_pairs else (4, 6)
            p2 = math_pairs[1] if len(math_pairs) > 1 else (7, 8)
            p1_prod = p1[0] * p1[1]
            p1_sum = p1[0] + p1[1]
            p2_prod = p2[0] * p2[1]

            if lang == LanguageCode.HINGLISH:
                m1_speech = (
                    f"<emotion=enthusiastic>Welcome to today's session! Aaj hum aapke uploaded multiplication worksheet ko master karenge. <pause=300ms> "
                    f"Dekho, multiplication ka matlab hota hai equal groups ko fast add karna! "
                    f"Agar aapke paas {p1[0]} boxes hain aur har box mein {p1[1]} items hain, toh ek-ek count karne ke bajaye hum direct multiply karte hain: "
                    f"{p1[0]} × {p1[1]} = {p1_prod}! Chalo board par iska visual array dekhte hain.</emotion>"
                )
                m2_speech = (
                    f"<emotion=thoughtful>Ab aate hain ek super fast mental math trick par: Break-Apart Strategy! <pause=300ms> "
                    f"Agar koi bada multiplication ho jaise {p2[0]} × {p2[1]}, toh use do aasaan numbers mein tod kar add kar lo. "
                    f"Smart whiteboard par dekho calculation kitni simple ho jati hai!</emotion>"
                )
            elif lang == LanguageCode.HINDI:
                m1_speech = (
                    f"<emotion=enthusiastic>आज के सत्र में आपका स्वागत है! आज हम आपके अध्ययन पत्र पर आधारित गुणन (Multiplication) के सिद्धांतों को समझेंगे। <pause=300ms> "
                    f"गुणा वास्तव में समान समूहों का बार-बार योग है। उदाहरण के लिए, {p1[0]} समूहों में {p1[1]} वस्तुएं होने पर: {p1[0]} × {p1[1]} = {p1_prod}! "
                    f"आइए इसे व्हाइटबोर्ड पर देखें।</emotion>"
                )
                m2_speech = (
                    f"<emotion=thoughtful>आइए अब एक त्वरित मानसिक गणित विधि समझें। कठिन संख्याओं को छोटे भागों में बांटकर सरलता से हल किया जा सकता है।</emotion>"
                )
            else:
                m1_speech = (
                    f"<emotion=enthusiastic>Welcome to today's session! Based on your uploaded worksheet, we are mastering {doc_topic}. <pause=300ms> "
                    f"Multiplication is simply repeated addition across equal groups! "
                    f"Instead of counting items one by one, having {p1[0]} groups of {p1[1]} gives us {p1[0]} × {p1[1]} = {p1_prod}! "
                    f"Let's examine the visual array on our smart whiteboard.</emotion>"
                )
                m2_speech = (
                    f"<emotion=thoughtful>Now let's explore a powerful mental math tool: the Break-Apart (Distributive) strategy. <pause=300ms> "
                    f"When multiplying factors like {p2[0]} × {p2[1]}, breaking one factor into friendlier numbers like 5 and 2 lets you compute the product mentally in seconds!</emotion>"
                )

            modules = [
                LessonModule(
                    module_id="mod-1",
                    title=f"Equal Groups & Multiplication Foundations",
                    estimated_minutes=5,
                    teaching_script=m1_speech,
                    visual_action=VisualAction(
                        type=VisualType.KATEX,
                        title="Equal Groups & Repeated Addition",
                        raw_payload=rf"\begin{{aligned}} \text{{Equal Groups:}} & \quad {p1[0]} \times {p1[1]} = \underbrace{{{p1[1]} + {p1[1]} + \dots + {p1[1]}}}_{{{p1[0]} \text{{ groups}}}} = {p1_prod} \\[6pt] \text{{Worksheet Practice:}} & \quad {p2[0]} \times {p2[1]} = {p2_prod} \end{{aligned}}",
                        explanation_notes=f"Multiplication represents {p1[0]} groups of {p1[1]} items. Total = {p1_prod}.",
                        entry_animation_cue="fade-slide"
                    ),
                    checkpoint=Checkpoint(
                        question_id="q1",
                        question_text=f"Multiplication Check: If you have {p1[0]} packs with {p1[1]} pencils in each pack, what is the total count ({p1[0]} × {p1[1]})?",
                        question_type=CheckpointType.MCQ,
                        options=[
                            CheckpointOption(id="A", text=f"{p1_prod} pencils ({p1[0]} × {p1[1]} = {p1_prod})", is_correct=True, feedback=f"Correct! {p1[0]} equal groups of {p1[1]} give a total of {p1_prod}."),
                            CheckpointOption(id="B", text=f"{p1_sum} pencils ({p1[0]} + {p1[1]} = {p1_sum})", is_correct=False, feedback=f"Watch out: {p1[0]} + {p1[1]} is simple addition. We have {p1[0]} groups, so we multiply: {p1[0]} × {p1[1]} = {p1_prod}."),
                            CheckpointOption(id="C", text=f"{max(p1_prod - 4, 1)} pencils", is_correct=False, feedback=f"Double-check your times-table calculation: {p1[0]} × {p1[1]} = {p1_prod}.")
                        ],
                        expected_concept=f"Multiplication is repeated addition of equal groups: {p1[0]} × {p1[1]} = {p1_prod}.",
                        rubric=f"Look for understanding that {p1[0]} groups of {p1[1]} requires multiplication resulting in {p1_prod}."
                    )
                ),
                LessonModule(
                    module_id="mod-2",
                    title="Mental Math & Break-Apart Strategy",
                    estimated_minutes=5,
                    teaching_script=m2_speech,
                    visual_action=VisualAction(
                        type=VisualType.KATEX,
                        title="Distributive Break-Apart Method",
                        raw_payload=r"\begin{aligned} 8 \times 7 &= 8 \times (5 + 2) \\[4pt] &= (8 \times 5) + (8 \times 2) \\[4pt] &= 40 + 16 = 56 \end{aligned}",
                        explanation_notes="Breaking 7 into 5 + 2 allows fast mental multiplication using simpler times tables.",
                        entry_animation_cue="step-reveal"
                    ),
                    checkpoint=Checkpoint(
                        question_id="q2",
                        question_text="Which of the following correctly uses the break-apart strategy to solve 6 × 7?",
                        question_type=CheckpointType.MCQ,
                        options=[
                            CheckpointOption(id="A", text="(6 × 5) + (6 × 2) = 30 + 12 = 42", is_correct=True, feedback="Spot on! Decomposing 7 into 5 + 2 makes mental calculation effortless."),
                            CheckpointOption(id="B", text="(6 × 5) + (6 × 5) = 30 + 30 = 60", is_correct=False, feedback="Incorrect: 5 + 5 is 10, not 7."),
                            CheckpointOption(id="C", text="6 + 7 = 13", is_correct=False, feedback="Incorrect: that is addition, not multiplication.")
                        ],
                        expected_concept="Distributive property: a × (b + c) = (a × b) + (a × c).",
                        rubric="Verify student understands decomposing factors for mental multiplication."
                    )
                )
            ]
            return LessonPlan(
                topic=doc_topic,
                student_level=level,
                language=lang,
                total_estimated_minutes=10,
                pedagogical_goals=[
                    f"Master foundational multiplication principles from {doc_topic}",
                    "Apply equal grouping and repeated addition mental models",
                    "Solve practical arithmetic checkpoints with 100% accuracy"
                ],
                modules=modules
            )

        # General Text / Concept Document Pathway
        paragraphs = [p.strip() for p in cleaned_doc.split("\n\n") if len(p.strip()) > 30]
        primary_para = paragraphs[0] if paragraphs else cleaned_doc[:300]
        # Extract 2 clean sentences without any markdown tags
        clean_sentences = [
            s.strip() for s in re.split(r"[.\n]+", primary_para)
            if len(s.strip()) > 15 and not s.strip().startswith(("#", "-", "*"))
        ]
        summary_intro = " ".join(clean_sentences[:2]) if clean_sentences else f"We are examining key insights from our uploaded material on {doc_topic}."

        modules = [
            LessonModule(
                module_id="mod-1",
                title=f"Core Foundations of {doc_topic}",
                estimated_minutes=5,
                teaching_script=f"<emotion=enthusiastic>Welcome to today's session! Based on your uploaded document, we are exploring {doc_topic}. {summary_intro} Let's unpack the foundational principles together on our smart whiteboard!</emotion>",
                visual_action=VisualAction(
                    type=VisualType.CALLOUT,
                    title=f"Source Highlights: {doc_topic}",
                    raw_payload=f"**Core Insights from Document**:\n\n{primary_para[:350]}...",
                    explanation_notes=f"Key conceptual points extracted directly from your uploaded material on {doc_topic}.",
                    entry_animation_cue="fade-slide"
                ),
                checkpoint=Checkpoint(
                    question_id="q1",
                    question_text=f"Based on the uploaded document on {doc_topic}, what is the central thesis or operational mechanism presented?",
                    question_type=CheckpointType.EXPLAIN_IN_OWN_WORDS,
                    options=[],
                    expected_concept=f"Clear understanding of the key concept from the uploaded document on {doc_topic}.",
                    rubric=f"Look for direct reference to principles detailed in the uploaded document: {summary_intro[:100]}."
                )
            ),
            LessonModule(
                module_id="mod-2",
                title=f"Operational Mechanics & Process Flow",
                estimated_minutes=5,
                teaching_script=f"<emotion=thoughtful>Now let's examine how the components in {doc_topic} interact and produce outcomes. Board par system workflow dekhte hain.</emotion>",
                visual_action=VisualAction(
                    type=VisualType.MERMAID,
                    title=f"{doc_topic} Structural Flow",
                    raw_payload=f"""graph LR
    Input["Input Data: {doc_topic[:18]}"] --> Process["Core Mechanism"]
    Process --> Evaluator["Verification & Validation"]
    Evaluator --> Target["Synthesized Outcome"]
    style Process fill:#6366f1,stroke:#4338ca,color:#fff
    style Target fill:#10b981,stroke:#047857,color:#fff""",
                    explanation_notes=f"System relationships identified from document analysis of {doc_topic}.",
                    entry_animation_cue="step-reveal"
                ),
                checkpoint=Checkpoint(
                    question_id="q2",
                    question_text=f"How does the core mechanism in {doc_topic} transform the initial inputs?",
                    question_type=CheckpointType.MCQ,
                    options=[
                        CheckpointOption(id="A", text="It systematically structures and validates the information through the core mechanism.", is_correct=True, feedback="Spot on! The document details this exact transformation process."),
                        CheckpointOption(id="B", text="It bypasses processing and leaves inputs unchanged.", is_correct=False, feedback="The document emphasizes an active analytical pipeline."),
                        CheckpointOption(id="C", text="The process is completely random with no structured stages.", is_correct=False, feedback="The document defines explicit structured stages.")
                    ],
                    expected_concept="Understanding the sequence of operations described in the document.",
                    rubric="Check understanding of the document's operational pipeline."
                )
            )
        ]
        return LessonPlan(
            topic=doc_topic,
            student_level=level,
            language=lang,
            total_estimated_minutes=10,
            pedagogical_goals=[
                f"Master core principles from uploaded material on {doc_topic}",
                f"Analyze key operational workflows and document conclusions",
                f"Demonstrate applied conceptual reasoning in Socratic checkpoints"
            ],
            modules=modules
        )

    # 2. Topic-specific templates for Transformers (only if explicitly requested)
    if "attention" in topic.lower() or "transformer" in topic.lower():
        if lang == LanguageCode.HINGLISH:
            m1_script = "<emotion=enthusiastic>Welcome to today's session! Aaj hum explore karne wale hain Transformer architecture ka sabse revolutionary component: Self-Attention Mechanism. <pause=300ms> Socho agar aap ek lamba sentence padh rahe ho, jaise 'The animal didn't cross the street because it was too tired' - aapka dimaag turant samajh jata hai ki 'it' yahan animal ke liye hai, street ke liye nahi. Par computer yeh kaise samjhe? Let's visualize this on our smart whiteboard!</emotion>"
        elif lang == LanguageCode.HINDI:
            m1_script = "<emotion=enthusiastic>आज के सत्र में आपका स्वागत है! आज हम समझने जा रहे हैं ट्रांसफार्मर मॉडल का दिल - 'सेल्फ-अटेंशन मैकेनिज्म'। <pause=300ms> जब हम कोई वाक्य पढ़ते हैं, तो हमारा मस्तिष्क शब्दों के आपसी संबंधों को तुरंत भांप लेता है। आइए व्हाइटबोर्ड पर देखें कि गणितीय रूप से यह कैसे काम करता है।</emotion>"
        else:
            m1_script = "<emotion=enthusiastic>Welcome! Today we are exploring the beating heart of modern AI: the Self-Attention Mechanism in Transformers. <pause=300ms> When humans read a sentence like 'The bank of the river was muddy', your brain instantly disambiguates 'bank' based on 'river'. How do neural networks do this mathematically? Let's bring up the Query-Key-Value visual on our whiteboard!</emotion>"

        modules = [
            LessonModule(
                module_id="mod-1",
                title="The Query, Key, and Value Intuition",
                estimated_minutes=5,
                teaching_script=m1_script,
                visual_action=VisualAction(
                    type=VisualType.MERMAID,
                    title="Self-Attention Information Flow",
                    raw_payload="""graph TD
    Input["Input Token Embeddings (X)"] --> Q["Query Matrix (Q = X * Wq)"]
    Input --> K["Key Matrix (K = X * Wk)"]
    Input --> V["Value Matrix (V = X * Wv)"]
    Q --> Dot["Dot Product (Q · K^T)"]
    K --> Dot
    Dot --> Scale["Scale by 1/sqrt(d_k)"]
    Scale --> Softmax["Softmax (Attention Weights)"]
    Softmax --> WeightedSum["Weighted Sum with V"]
    V --> WeightedSum
    WeightedSum --> Output["Contextual Output Z"]
    style Softmax fill:#6366f1,stroke:#4338ca,color:#fff
    style WeightedSum fill:#10b981,stroke:#047857,color:#fff""",
                    explanation_notes="Notice how Q acts as a search query, K acts as file tags, and V represents the actual content.",
                    entry_animation_cue="fade-slide"
                ),
                checkpoint=Checkpoint(
                    question_id="q1",
                    question_text="Why do we compute the dot product between the Query vector and Key vector in self-attention?",
                    question_type=CheckpointType.MCQ,
                    options=[
                        CheckpointOption(id="A", text="To measure the semantic compatibility or relevance between two tokens.", is_correct=True, feedback="Spot on! The dot product measures alignment in embedding space."),
                        CheckpointOption(id="B", text="To reduce the dimension of the embeddings to save memory.", is_correct=False, feedback="Dot product produces a scalar similarity score, not a dimension reduction technique."),
                        CheckpointOption(id="C", text="To introduce non-linear activation functions into the network.", is_correct=False, feedback="Dot product is a linear operation; Softmax provides the normalization."),
                        CheckpointOption(id="D", text="To randomly drop tokens during training.", is_correct=False, feedback="That would be dropout, not Query-Key dot products.")
                    ],
                    expected_concept="The dot product of Query and Key calculates similarity or attention weights between pairs of words.",
                    rubric="Check that student recognizes dot product as a measure of token-to-token similarity or relevance."
                )
            ),
            LessonModule(
                module_id="mod-2",
                title="The Attention Formula & Scaled Softmax",
                estimated_minutes=5,
                teaching_script="<emotion=thoughtful>Now that we have the geometric intuition, let's examine the mathematical formulation. <pause=400ms> Why do we divide by the square root of d_k? <emotion=curious>Because in high dimensions, dot products grow large, pushing softmax into regions with vanishing gradients! Let's examine the exact equation.</emotion>",
                visual_action=VisualAction(
                    type=VisualType.KATEX,
                    title="Scaled Dot-Product Attention Equation",
                    raw_payload=r"\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V",
                    explanation_notes="d_k is the dimension of the key vectors. Dividing by sqrt(d_k) stabilizes gradient flow during backpropagation.",
                    entry_animation_cue="step-reveal"
                ),
                checkpoint=Checkpoint(
                    question_id="q2",
                    question_text="What would happen if we omitted the 1 / sqrt(d_k) scaling factor when d_k is large (e.g. 512)?",
                    question_type=CheckpointType.EXPLAIN_IN_OWN_WORDS,
                    options=[],
                    expected_concept="Large dot product values cause softmax outputs to saturate at 0 or 1, leading to extremely small (vanishing) gradients.",
                    rubric="Look for mention of softmax saturation, large variance in dot products, or vanishing gradients during backpropagation."
                )
            ),
            LessonModule(
                module_id="mod-3",
                title="PyTorch Implementation in Action",
                estimated_minutes=5,
                teaching_script="<emotion=encouraging>Let's turn this theory into code! Here is how we implement Single-Head Attention cleanly in PyTorch in just a few lines of matrix operations.</emotion>",
                visual_action=VisualAction(
                    type=VisualType.CODE,
                    title="ScaledDotProductAttention.py",
                    language_or_config="python",
                    raw_payload="""import torch
import torch.nn as nn
import torch.nn.functional as F

class ScaledDotProductAttention(nn.Module):
    def __init__(self, d_k: int):
        super().__init__()
        self.scale = 1.0 / (d_k ** 0.5)

    def forward(self, Q, K, V, mask=None):
        # Q, K, V: [batch, seq_len, d_k]
        scores = torch.matmul(Q, K.transpose(-2, -1)) * self.scale
        if mask is not None:
            scores = scores.masked_fill(mask == 0, -1e9)
        attn_weights = F.softmax(scores, dim=-1)
        output = torch.matmul(attn_weights, V)
        return output, attn_weights""",
                    explanation_notes="Notice the transpose of K on line 11 and the masked_fill for autoregressive decoding on line 13.",
                    entry_animation_cue="typewriter"
                ),
                checkpoint=Checkpoint(
                    question_id="q3",
                    question_text="In decoder self-attention, what is the purpose of the mask on line 13?",
                    question_type=CheckpointType.MCQ,
                    options=[
                        CheckpointOption(id="A", text="To prevent the model from attending to subsequent future tokens during autoregressive generation.", is_correct=True, feedback="Correct! Causal masking ensures causality in language generation."),
                        CheckpointOption(id="B", text="To drop negative attention weights.", is_correct=False, feedback="Softmax naturally bounds weights between 0 and 1, so negative weights don't exist."),
                        CheckpointOption(id="C", text="To speed up matrix multiplication by 50%.", is_correct=False, feedback="Masking doesn't speed up compute unless specialized sparse kernels are used.")
                    ],
                    expected_concept="Causal mask prevents attention to future tokens during generative decoding.",
                    rubric="Verify understanding of autoregressive causal masking."
                )
            )
        ]
    else:
        # 3. Dynamic custom topic generator for ANY user topic
        is_math, math_pairs = _detect_math_worksheet("", topic)
        if is_math:
            p1 = math_pairs[0] if math_pairs else (4, 6)
            p2 = math_pairs[1] if len(math_pairs) > 1 else (7, 8)
            p1_prod = p1[0] * p1[1]
            p1_sum = p1[0] + p1[1]
            p2_prod = p2[0] * p2[1]

            if lang == LanguageCode.HINGLISH:
                m1_speech = (
                    f"<emotion=enthusiastic>Namaste! Aaj hum explore karenge {topic}. <pause=300ms> "
                    f"Multiplication असल mein equal groups ko bar-bar add karne ka short-cut hai! "
                    f"Agar aapke paas {p1[0]} boxes hain aur har box mein {p1[1]} items hain, toh direct multiply karo: "
                    f"{p1[0]} × {p1[1]} = {p1_prod}! Chalo board par iska visual array dekhte hain.</emotion>"
                )
            elif lang == LanguageCode.HINDI:
                m1_speech = (
                    f"<emotion=enthusiastic>नमस्ते! आज के सत्र में हम {topic} के बुनियादी सिद्धांतों को समझेंगे। <pause=300ms> "
                    f"गुणा समान समूहों के योग का तेज तरीका है: {p1[0]} × {p1[1]} = {p1_prod}! आइए इसे व्हाइटबोर्ड पर देखें।</emotion>"
                )
            else:
                m1_speech = (
                    f"<emotion=enthusiastic>Welcome! Today we are mastering {topic}. <pause=300ms> "
                    f"Multiplication is simply repeated addition across equal groups! "
                    f"Having {p1[0]} groups of {p1[1]} gives {p1[0]} × {p1[1]} = {p1_prod}! "
                    f"Let's visualize the groups on our smart whiteboard.</emotion>"
                )

            modules = [
                LessonModule(
                    module_id="mod-1",
                    title=f"Equal Groups & Multiplication Foundations",
                    estimated_minutes=5,
                    teaching_script=m1_speech,
                    visual_action=VisualAction(
                        type=VisualType.KATEX,
                        title="Equal Groups & Repeated Addition",
                        raw_payload=rf"\begin{{aligned}} \text{{Equal Groups:}} & \quad {p1[0]} \times {p1[1]} = \underbrace{{{p1[1]} + {p1[1]} + \dots + {p1[1]}}}_{{{p1[0]} \text{{ groups}}}} = {p1_prod} \\[6pt] \text{{Practice:}} & \quad {p2[0]} \times {p2[1]} = {p2_prod} \end{{aligned}}",
                        explanation_notes=f"Multiplication represents {p1[0]} groups of {p1[1]} items. Total = {p1_prod}.",
                        entry_animation_cue="fade-slide"
                    ),
                    checkpoint=Checkpoint(
                        question_id="q1",
                        question_text=f"Multiplication Check: If you have {p1[0]} packs with {p1[1]} pencils in each pack, what is the total count ({p1[0]} × {p1[1]})?",
                        question_type=CheckpointType.MCQ,
                        options=[
                            CheckpointOption(id="A", text=f"{p1_prod} pencils ({p1[0]} × {p1[1]} = {p1_prod})", is_correct=True, feedback=f"Correct! {p1[0]} equal groups of {p1[1]} give a total of {p1_prod}."),
                            CheckpointOption(id="B", text=f"{p1_sum} pencils ({p1[0]} + {p1[1]} = {p1_sum})", is_correct=False, feedback=f"Watch out: {p1[0]} + {p1[1]} is simple addition. We have {p1[0]} groups, so we multiply: {p1[0]} × {p1[1]} = {p1_prod}."),
                            CheckpointOption(id="C", text=f"{max(p1_prod - 4, 1)} pencils", is_correct=False, feedback=f"Double-check your times-table calculation: {p1[0]} × {p1[1]} = {p1_prod}.")
                        ],
                        expected_concept=f"Multiplication is repeated addition of equal groups: {p1[0]} × {p1[1]} = {p1_prod}.",
                        rubric=f"Look for understanding that {p1[0]} groups of {p1[1]} requires multiplication resulting in {p1_prod}."
                    )
                ),
                LessonModule(
                    module_id="mod-2",
                    title="Mental Math & Break-Apart Strategy",
                    estimated_minutes=5,
                    teaching_script=f"<emotion=thoughtful>Now let's explore the Break-Apart Strategy to calculate multiplication facts mentally in seconds.</emotion>",
                    visual_action=VisualAction(
                        type=VisualType.KATEX,
                        title="Distributive Break-Apart Method",
                        raw_payload=r"\begin{aligned} 8 \times 7 &= 8 \times (5 + 2) \\[4pt] &= (8 \times 5) + (8 \times 2) \\[4pt] &= 40 + 16 = 56 \end{aligned}",
                        explanation_notes="Breaking 7 into 5 + 2 allows fast mental multiplication.",
                        entry_animation_cue="step-reveal"
                    ),
                    checkpoint=Checkpoint(
                        question_id="q2",
                        question_text="Which of the following correctly uses the break-apart strategy to solve 6 × 7?",
                        question_type=CheckpointType.MCQ,
                        options=[
                            CheckpointOption(id="A", text="(6 × 5) + (6 × 2) = 30 + 12 = 42", is_correct=True, feedback="Spot on! Decomposing 7 into 5 + 2 makes mental calculation effortless."),
                            CheckpointOption(id="B", text="(6 × 5) + (6 × 5) = 30 + 30 = 60", is_correct=False, feedback="Incorrect: 5 + 5 is 10, not 7."),
                            CheckpointOption(id="C", text="6 + 7 = 13", is_correct=False, feedback="Incorrect: that is addition, not multiplication.")
                        ],
                        expected_concept="Distributive property: a × (b + c) = (a × b) + (a × c).",
                        rubric="Verify student understands decomposing factors for mental multiplication."
                    )
                )
            ]
            return LessonPlan(
                topic=topic,
                student_level=level,
                language=lang,
                total_estimated_minutes=10,
                pedagogical_goals=[
                    f"Master foundational multiplication principles of {topic}",
                    "Apply equal grouping and repeated addition mental models",
                    "Solve practical arithmetic checkpoints with 100% accuracy"
                ],
                modules=modules
            )

        if lang == LanguageCode.HINGLISH:
            m1_speech = f"<emotion=enthusiastic>Namaste! Aaj ke interactive session mein hum master karne wale hain {topic}. <pause=300ms> Pehle iske first principles aur core intuition ko samajhte hain, fir deep architectural concepts ko whiteboard par dekhenge.</emotion>"
        elif lang == LanguageCode.HINDI:
            m1_speech = f"<emotion=enthusiastic>नमस्ते! आज के सत्र में हम {topic} के बुनियादी सिद्धांतों को समझेंगे। आइए पहले इसका मुख्य विचार और महत्व देखें।</emotion>"
        else:
            m1_speech = f"<emotion=enthusiastic>Welcome! Today we are exploring {topic}. Let's start with first principles and build a crystal-clear mental model before diving into the details.</emotion>"

        modules = [
            LessonModule(
                module_id="mod-1",
                title=f"Core Foundations of {topic}",
                estimated_minutes=5,
                teaching_script=m1_speech,
                visual_action=VisualAction(
                    type=VisualType.CALLOUT,
                    title=f"First Principles of {topic}",
                    raw_payload=f"**Core Thesis of {topic}**:\n1. Why {topic} is essential and what problems it solves\n2. The primary operational principles\n3. Critical real-world implications and edge cases",
                    explanation_notes=f"Master the foundational concepts of {topic} before diving into execution.",
                    entry_animation_cue="fade-slide"
                ),
                checkpoint=Checkpoint(
                    question_id="q1",
                    question_text=f"In your own words, what is the primary purpose and fundamental intuition behind {topic}?",
                    question_type=CheckpointType.EXPLAIN_IN_OWN_WORDS,
                    options=[],
                    expected_concept=f"Accurately explain the core purpose and motivating principles behind {topic}.",
                    rubric=f"Look for clear understanding of the problem domain and how {topic} addresses it."
                )
            ),
            LessonModule(
                module_id="mod-2",
                title=f"Mechanics & Operational Workflow of {topic}",
                estimated_minutes=5,
                teaching_script=f"<emotion=thoughtful>Now let's trace the mechanics of {topic} step by step on our whiteboard.</emotion>",
                visual_action=VisualAction(
                    type=VisualType.MERMAID,
                    title=f"{topic} Operational Pipeline",
                    raw_payload=f"""graph LR
    Input["Context / Input: {topic[:16]}"] --> Process["Analytical Engine"]
    Process --> Analysis["Decision & Transformation"]
    Analysis --> Output["Target Outcome"]
    style Process fill:#6366f1,stroke:#4338ca,color:#fff
    style Output fill:#10b981,stroke:#047857,color:#fff""",
                    explanation_notes="Follow the pipeline stages to understand how information flows through the system.",
                    entry_animation_cue="step-reveal"
                ),
                checkpoint=Checkpoint(
                    question_id="q2",
                    question_text=f"Which stage in the {topic} pipeline is responsible for the core decision-making and transformation?",
                    question_type=CheckpointType.MCQ,
                    options=[
                        CheckpointOption(id="A", text="The Decision & Transformation stage after processing.", is_correct=True, feedback="Exactly right! That is where the key state changes occur."),
                        CheckpointOption(id="B", text="The raw Input stage before any processing.", is_correct=False, feedback="Raw input is passive; decisions happen during transformation."),
                        CheckpointOption(id="C", text="It happens purely by random chance.", is_correct=False, feedback=f"The architecture of {topic} is structured and deterministic.")
                    ],
                    expected_concept=f"Understanding the sequence of operations in {topic}.",
                    rubric="Check understanding of pipeline ordering."
                )
            )
        ]

    return LessonPlan(
        topic=topic,
        student_level=level,
        language=lang,
        total_estimated_minutes=sum(m.estimated_minutes for m in modules),
        pedagogical_goals=[
            f"Understand the first-principles motivation behind {topic}",
            "Master the underlying mathematical or conceptual mechanisms",
            "Apply the concepts to practical real-world problem solving"
        ],
        modules=modules
    )


# ---------------------------------------------------------------------------
# LangGraph Pedagogical State Machine Implementation
# ---------------------------------------------------------------------------

class PedagogyEngine:
    """
    Orchestrates the pedagogical lifecycle with Google Gemini and LangGraph.
    Handles dynamic lesson planning, Socratic checkpoints, diagnostic misconception analysis, and remediation.
    """

    def __init__(self):
        pass

    def generate_curriculum(
        self,
        profile: StudentProfile,
        grounding_context: str = "",
        user_id: Optional[str] = None
    ) -> LessonPlan:
        """
        Creates an adaptive, grounded curriculum plan using Gemini 1.5 or fallback.
        Integrates long-term student memory to proactively scaffold previously struggling concepts.
        """
        from app.services.profile_manager import profile_manager
        memory_context = profile_manager.get_student_memory_context(user_id or "default_user", profile.target_topic)

        grounding_directive = ""
        if grounding_context.strip():
            grounding_directive = """
CRITICAL GROUNDING CONSTRAINT:
You have been provided with authoritative Grounding Context extracted from the student's uploaded document.
1. You MUST strictly base the modules, technical explanations, mathematical formulations, and checkpoint questions on the provided Grounding Context.
2. Do NOT introduce unrelated concepts or external assertions not supported by the document.
3. In each module's visualAction explanationNotes or teachingScript, cite the relevant section titles or concepts from the source material.
"""

        prompt = f"""
Generate a structured, interactive LessonPlan for a student with the following profile:
Topic: {profile.target_topic}
Educational Level: {profile.educational_level}
Language: {profile.language}
Time Constraint: {profile.available_time_minutes} minutes
Learning Style: {profile.learning_style}

{memory_context}

{grounding_directive}

Grounding Context / Source Notes:
{grounding_context if grounding_context else "No custom document provided. Generate from authoritative first-principles knowledge."}

Requirements for the LessonPlan JSON:
- Must have 2 to 4 sequential LessonModules.
- Each module must have:
  1. 'moduleId' (e.g. 'mod-1')
  2. 'title'
  3. 'estimatedMinutes' (integer)
  4. 'teachingScript' (conversational speech in {profile.language.value} with emotion tags like <emotion=enthusiastic>, <emotion=thoughtful>, <pause=400ms>)
  5. 'visualAction': object with 'type' ('katex' | 'mermaid' | 'code' | 'chart' | 'callout'), 'title', 'rawPayload', 'languageOrConfig', 'explanationNotes', 'entryAnimationCue'
  6. 'checkpoint': interactive question with 'questionId', 'questionText', 'questionType' ('mcq' or 'explain_in_own_words'), 'options' (array of {{'id', 'text', 'isCorrect', 'feedback'}}), 'expectedConcept', 'rubric'

Return pure JSON matching the LessonPlan schema.
"""
        from app.services.persona_engine import persona_engine
        system_instruction = persona_engine.get_system_prompt(
            profile.instructor_persona, profile.language
        ) or PEDAGOGICAL_SYSTEM_PROMPTS.get(
            profile.language, PEDAGOGICAL_SYSTEM_PROMPTS[LanguageCode.ENGLISH]
        )
        raw_json = _call_gemini_json(prompt, system_instruction)
        if raw_json:
            try:
                return LessonPlan.model_validate(raw_json)
            except Exception as err:
                logger.warning(f"Could not parse Gemini JSON into LessonPlan schema: {err}. Using robust fallback.")

        return _generate_mock_curriculum(profile, grounding_context)

    def evaluate_student_answer(
        self,
        checkpoint: Checkpoint,
        response: StudentResponse,
        profile: StudentProfile
    ) -> DiagnosticEvaluation:
        """
        Evaluates a student's answer, detects misconceptions, and prescribes a corrective strategy.
        """
        student_text = response.written_explanation or response.audio_transcript or ""
        selected_opt = response.selected_option_id

        # 1. Direct MCQ resolution
        if checkpoint.question_type == CheckpointType.MCQ and selected_opt:
            matching = next((opt for opt in checkpoint.options if opt.id == selected_opt), None)
            if matching and matching.is_correct:
                return DiagnosticEvaluation(
                    is_correct=True,
                    score=1.0,
                    identified_misconception=None,
                    root_cause="",
                    corrective_strategy=CorrectiveStrategy.SIMPLER_ANALOGY,
                    re_explanation_script="<emotion=encouraging>Spot on! That is exactly right. You grasped the fundamental concept smoothly. Let's keep this momentum going!</emotion>",
                    re_explanation_visual=None
                )
            else:
                feedback = matching.feedback if matching else "Incorrect option selected."
                return DiagnosticEvaluation(
                    is_correct=False,
                    score=0.0,
                    identified_misconception=f"Student selected option {selected_opt}: {matching.text if matching else ''}",
                    root_cause="Confused the operational purpose with a secondary property or adjacent concept.",
                    corrective_strategy=CorrectiveStrategy.SIMPLER_ANALOGY,
                    re_explanation_script=f"<emotion=thoughtful>Not quite, but this is a very common point of confusion! <pause=300ms> {feedback} Let's look at a simpler analogy to make this crystal clear.</emotion>",
                    re_explanation_visual=VisualAction(
                        type=VisualType.CALLOUT,
                        title="Key Clarification",
                        raw_payload=f"**Core Truth:** {checkpoint.expected_concept}\n\n**Common Pitfall:** {feedback}",
                        explanation_notes="Remember: focus on the primary causal mechanism.",
                        entry_animation_cue="pulse"
                    )
                )

        # 2. Open-ended / Gemini Evaluator
        if settings.GEMINI_API_KEY:
            prompt = f"""
Evaluate this student's answer against the expected concept and rubric.
Question: {checkpoint.question_text}
Expected Concept: {checkpoint.expected_concept}
Rubric: {checkpoint.rubric}
Student's Answer: {student_text}
Language: {profile.language}

Perform a deep pedagogical diagnostic:
1. Is the answer substantially correct? (boolean isCorrect, float score between 0.0 and 1.0)
2. What specific misconception or flawed mental model does the student have, if any?
3. What is the root cause?
4. Choose the best corrective strategy: 'simpler_analogy' | 'first_principles' | 'visual_counterexample' | 'step_by_step_breakdown'
5. Write an empathetic, warm, conversational re-explanation speech in {profile.language.value} using emotion tags like <emotion=encouraging>, <pause=300ms>.
6. Provide a tailored 'reExplanationVisual' object (type, title, rawPayload, explanationNotes).

Return pure JSON matching DiagnosticEvaluation.
"""
            raw_eval = _call_gemini_json(prompt)
            if raw_eval:
                try:
                    return DiagnosticEvaluation.model_validate(raw_eval)
                except Exception as e:
                    logger.warning(f"Error parsing Gemini diagnostic evaluation: {e}")

        # 3. Intelligent rule-based evaluation fallback
        is_substantially_correct = len(student_text.strip()) > 15 and any(
            kw in student_text.lower() for kw in ["similarity", "dot product", "compatibility", "gradient", "saturat", "weight", "future", "mask", "relevance", "scale"]
        )

        if is_substantially_correct:
            return DiagnosticEvaluation(
                is_correct=True,
                score=0.95,
                identified_misconception=None,
                root_cause="",
                corrective_strategy=CorrectiveStrategy.SIMPLER_ANALOGY,
                re_explanation_script="<emotion=enthusiastic>Excellent explanation! You captured the essence of the concept accurately. Great job articulating the underlying mechanics!</emotion>",
                re_explanation_visual=None
            )
        else:
            return DiagnosticEvaluation(
                is_correct=False,
                score=0.3,
                identified_misconception="Incomplete or fuzzy intuition regarding the mathematical mechanism.",
                root_cause="Student focused on surface-level descriptions without connecting them to the causal mathematical principle.",
                corrective_strategy=CorrectiveStrategy.STEP_BY_STEP_BREAKDOWN,
                re_explanation_script="<emotion=thoughtful>You're on the right track, but let's sharpen the core intuition. <pause=300ms> Let's break this down into 2 simple steps on our board so it clicks immediately!</emotion>",
                re_explanation_visual=VisualAction(
                    type=VisualType.CALLOUT,
                    title="Diagnostic Step-by-Step Breakdown",
                    raw_payload=f"**1. The Big Picture:** {checkpoint.expected_concept}\n**2. Key Takeaway:** Always trace cause and effect.",
                    explanation_notes="Review this two-step principle before we advance.",
                    entry_animation_cue="fade-slide"
                )
            )

    def generate_mastery_report(
        self,
        session_id: str,
        profile: StudentProfile,
        lesson_plan: LessonPlan,
        records: List[ModuleMasteryRecord]
    ) -> MasteryReport:
        """Constructs the comprehensive final learning report and certificate."""
        total_score = sum(r.score for r in records)
        max_possible = max(len(records), 1)
        percentage = round((total_score / max_possible) * 100, 1)

        all_misconceptions = []
        for r in records:
            all_misconceptions.extend(r.misconceptions_encountered)

        strengths = [
            f"Grasped core concepts of {lesson_plan.topic}",
            "Actively engaged with interactive whiteboard checkpoints",
            "Demonstrated rapid adaptation during Socratic feedback cycles"
        ]

        areas_for_review = list(set(all_misconceptions)) if all_misconceptions else [
            "Practice writing end-to-end PyTorch implementations from scratch",
            "Explore edge cases and high-dimensional vector behavior"
        ]

        recommended_topics = [
            f"Advanced Multi-Head Attention & KV Cache Optimization",
            f"Positional Encodings (RoPE & ALiBi)",
            f"FlashAttention & Hardware-Aware Deep Learning"
        ]

        summary = f"Outstanding effort! You completed the personalized curriculum on '{lesson_plan.topic}' with a mastery score of {percentage}%. You successfully navigated all checkpoints and reinforced your mental model through real-time diagnostic adaptation."

        # Compute dimensional scores for Knowledge Radar Chart
        passed_count = len([r for r in records if r.passed])
        remediation_count = sum(len(r.misconceptions_encountered) for r in records)

        concept_breakdown = [
            {
                "subject": "Mathematical Foundations",
                "score": min(int(percentage * 0.95 + (5 if passed_count == len(records) else 0)), 100),
                "fullMark": 100
            },
            {
                "subject": "Conceptual Intuition",
                "score": min(int(percentage * 1.0), 100),
                "fullMark": 100
            },
            {
                "subject": "Diagnostic Adaptation",
                "score": min(100 - (remediation_count * 8), 100) if remediation_count > 0 else 98,
                "fullMark": 100
            },
            {
                "subject": "Problem Solving",
                "score": min(int(percentage * 0.92 + 6), 100),
                "fullMark": 100
            },
            {
                "subject": "First-Principles Rigor",
                "score": min(int(percentage * 0.96 + (4 if not all_misconceptions else -2)), 100),
                "fullMark": 100
            }
        ]

        actionable_next_steps = [
            f"Review key takeaways for {lesson_plan.topic} and practice self-explaining the core mechanism.",
            "Implement a standalone mini-project or mathematical derivation without reference notes.",
            f"Explore related advanced concepts: {recommended_topics[0]}."
        ]

        return MasteryReport(
            session_id=session_id,
            topic=lesson_plan.topic,
            overall_mastery_percentage=percentage,
            summary_feedback=summary,
            strengths=strengths,
            areas_for_review=areas_for_review,
            concept_breakdown=concept_breakdown,
            actionable_next_steps=actionable_next_steps,
            module_records=records,
            recommended_next_topics=recommended_topics,
            developer_watermark="Developed by Madhav Zanwar (madhav_builds) — AIML Student | Problem Solver | Tech Enthusiast"
        )


# Global singleton instance
pedagogy_engine = PedagogyEngine()
