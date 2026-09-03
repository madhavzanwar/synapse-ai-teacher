"""
AI-Generated Learning Path & Automatic Study Planner Engine.
Decomposes broad educational topics into structured, multi-day skill trees
with prerequisite tracking, unlocking logic, and direct curriculum launch payloads.
"""
import uuid
import time
import json
import re
import logging
from typing import Dict, Any, List, Optional
import google.generativeai as genai

from app.config import settings
from app.schemas.lesson import (
    StudyPlan,
    LearningPathNode,
    GenerateStudyPlanRequest,
    EducationalLevel,
    LanguageCode,
)

logger = logging.getLogger(__name__)

if settings.GEMINI_API_KEY:
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
    except Exception as e:
        logger.warning(f"Failed to configure Gemini in path_engine: {e}")


def _call_gemini_json(prompt: str, system_instruction: str = "") -> Optional[Dict[str, Any]]:
    """Calls Gemini with strict JSON mode."""
    if not settings.GEMINI_API_KEY:
        return None
    try:
        model = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL_NAME,
            system_instruction=system_instruction,
            generation_config={
                "response_mime_type": "application/json",
                "temperature": 0.3,
            }
        )
        response = model.generate_content(prompt)
        text = response.text.strip()
        text = re.sub(r"^```json\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        return json.loads(text)
    except Exception as e:
        logger.warning(f"Gemini API call failed in StudyPlannerEngine: {e}")
        return None


# Built-in High-Yield Default Curricula Presets
DEFAULT_TRACKS = {
    "greentech": {
        "title": "GreenTech & Climate Action (NextGen Hackathon Prep)",
        "timeframe": "7_days",
        "total_days": 7,
        "nodes": [
            {
                "node_id": "gt-day-1",
                "title": "Atmospheric Carbon Cycles & Radiative Forcing",
                "description": "First-principles thermodynamics of greenhouse gases and global heat capacity.",
                "day_number": 1,
                "sequence_index": 0,
                "estimated_minutes": 20,
                "is_unlocked": True,
                "is_completed": True,
                "prerequisites": [],
                "target_concepts": ["Radiative Forcing", "Stefan-Boltzmann Feedback", "Carbon Sinks"],
            },
            {
                "node_id": "gt-day-2",
                "title": "Renewable Energy Grid Interconnection & Storage",
                "description": "Solid-state batteries, flow batteries, and intermittency load balancing algorithms.",
                "day_number": 2,
                "sequence_index": 1,
                "estimated_minutes": 25,
                "is_unlocked": True,
                "is_completed": False,
                "prerequisites": ["gt-day-1"],
                "target_concepts": ["Grid Inertia", "Lithium-Iron-Phosphate Chemistry", "Smart Inverters"],
            },
            {
                "node_id": "gt-day-3",
                "title": "Direct Air Capture (DAC) & Chemical Sequestration",
                "description": "Solid sorbent systems, metal-organic frameworks (MOFs), and mineralization.",
                "day_number": 3,
                "sequence_index": 2,
                "estimated_minutes": 20,
                "is_unlocked": False,
                "is_completed": False,
                "prerequisites": ["gt-day-2"],
                "target_concepts": ["Solid Sorbents", "Desorption Enthalpy", "Basalt Mineralization"],
            },
            {
                "node_id": "gt-day-4",
                "title": "AI for Precision Agritech & Soil Health",
                "description": "Multispectral satellite telemetry and neural predictive irrigation pipelines.",
                "day_number": 4,
                "sequence_index": 3,
                "estimated_minutes": 20,
                "is_unlocked": False,
                "is_completed": False,
                "prerequisites": ["gt-day-3"],
                "target_concepts": ["NDVI Indexing", "Soil Microbiome Sensing", "Edge AI Inference"],
            },
            {
                "node_id": "gt-day-5",
                "title": "Circular Economy & Polymer Lifecycle Engineering",
                "description": "Enzymatic PET recycling, bio-plastics synthesis, and cradle-to-cradle lifecycle.",
                "day_number": 5,
                "sequence_index": 4,
                "estimated_minutes": 25,
                "is_unlocked": False,
                "is_completed": False,
                "prerequisites": ["gt-day-4"],
                "target_concepts": ["Enzymatic Depolymerization", "PLA Synthesis", "Carbon Footprint Auditing"],
            },
        ]
    },
    "aiml": {
        "title": "Artificial Intelligence & Modern Transformer Architecture",
        "timeframe": "7_days",
        "total_days": 7,
        "nodes": [
            {
                "node_id": "ai-day-1",
                "title": "Mathematical Foundations: Linear Algebra & Autodiff",
                "description": "Matrix rank, eigenvalues, and computational graph backpropagation mechanics.",
                "day_number": 1,
                "sequence_index": 0,
                "estimated_minutes": 20,
                "is_unlocked": True,
                "is_completed": True,
                "prerequisites": [],
                "target_concepts": ["Vector Spaces", "Jacobians", "Reverse-Mode Autodiff"],
            },
            {
                "node_id": "ai-day-2",
                "title": "Attention Mechanism in Transformers",
                "description": "Query, Key, Value vector projections and scaled dot-product attention algebra.",
                "day_number": 2,
                "sequence_index": 1,
                "estimated_minutes": 20,
                "is_unlocked": True,
                "is_completed": False,
                "prerequisites": ["ai-day-1"],
                "target_concepts": ["QKV Projections", "Softmax Saturation", "KV Cache"],
            },
            {
                "node_id": "ai-day-3",
                "title": "Positional Encodings: Sinusoidal to RoPE",
                "description": "Rotary Position Embeddings and relative distance preservation across long contexts.",
                "day_number": 3,
                "sequence_index": 2,
                "estimated_minutes": 25,
                "is_unlocked": False,
                "is_completed": False,
                "prerequisites": ["ai-day-2"],
                "target_concepts": ["Complex Vector Rotations", "RoPE", "Long-Context Extrapolation"],
            },
            {
                "node_id": "ai-day-4",
                "title": "FlashAttention & GPU Hardware Acceleration",
                "description": "Tiling, SRAM vs HBM memory hierarchy, and kernel fusion for O(N) IO.",
                "day_number": 4,
                "sequence_index": 3,
                "estimated_minutes": 25,
                "is_unlocked": False,
                "is_completed": False,
                "prerequisites": ["ai-day-3"],
                "target_concepts": ["GPU SRAM Tiling", "Memory IO Bottlenecks", "Kernel Fusion"],
            },
            {
                "node_id": "ai-day-5",
                "title": "Mixture-of-Experts (MoE) & Efficient Serving",
                "description": "Sparse routing gates, top-k expert selection, and load balancing auxiliary loss.",
                "day_number": 5,
                "sequence_index": 4,
                "estimated_minutes": 20,
                "is_unlocked": False,
                "is_completed": False,
                "prerequisites": ["ai-day-4"],
                "target_concepts": ["Router Gating", "Expert Capacity Factor", "Speculative Decoding"],
            },
        ]
    }
}


class StudyPlannerEngine:
    """Orchestrates structured multi-day learning roadmap synthesis."""

    def __init__(self):
        self.stored_plans: Dict[str, StudyPlan] = {}
        # Prepopulate default high-yield tracks
        self._initialize_default_tracks()

    def _initialize_default_tracks(self):
        for key, track in DEFAULT_TRACKS.items():
            plan_id = f"preset-{key}"
            nodes = []
            for n in track["nodes"]:
                node = LearningPathNode(
                    node_id=n["node_id"],
                    title=n["title"],
                    description=n["description"],
                    day_number=n["day_number"],
                    sequence_index=n["sequence_index"],
                    estimated_minutes=n["estimated_minutes"],
                    is_unlocked=n["is_unlocked"],
                    is_completed=n["is_completed"],
                    prerequisites=n["prerequisites"],
                    target_concepts=n["target_concepts"],
                    curriculum_payload={
                        "target_topic": n["title"],
                        "educational_level": "Intermediate",
                        "language": "English",
                        "available_time_minutes": str(n["estimated_minutes"]),
                        "learning_style": "Visual and Concept-First with step-by-step intuitive analogies"
                    }
                )
                nodes.append(node)

            self.stored_plans[plan_id] = StudyPlan(
                plan_id=plan_id,
                user_id="default_user",
                target_topic=track["title"],
                timeframe=track["timeframe"],
                total_days=track["total_days"],
                student_level=EducationalLevel.INTERMEDIATE,
                nodes=nodes,
                created_at=time.time()
            )

    def generate_study_plan(self, request: GenerateStudyPlanRequest) -> StudyPlan:
        """
        Generates a structured, multi-day learning roadmap using Gemini 1.5
        or intelligent first-principles decomposition.
        """
        plan_id = f"plan-{uuid.uuid4().hex[:8]}"

        # Check for close preset match
        topic_lower = request.target_topic.lower()
        if "green" in topic_lower or "climate" in topic_lower or "sustain" in topic_lower:
            base = self.stored_plans.get("preset-greentech")
            if base:
                return base
        elif "ai" in topic_lower or "transformer" in topic_lower or "machine learning" in topic_lower or "ml" in topic_lower:
            base = self.stored_plans.get("preset-aiml")
            if base:
                return base

        # Call Gemini 1.5 for Custom Topic
        prompt = f"""
Decompose the target topic into a structured {request.timeframe} learning roadmap.
Topic: {request.target_topic}
Educational Level: {request.educational_level.value}
Language: {request.language.value}

Requirements:
Generate a JSON object with:
1. 'target_topic': "{request.target_topic}"
2. 'total_days': integer (e.g. 5 to 7)
3. 'nodes': array of 4 to 6 sequential learning milestone objects with:
   - 'node_id': string (e.g. 'node-1')
   - 'title': concise specific subtopic title
   - 'description': 1-2 sentence overview
   - 'day_number': integer (1 to total_days)
   - 'sequence_index': integer (0-indexed)
   - 'estimated_minutes': integer (15 to 30)
   - 'prerequisites': array of preceding node_id strings
   - 'target_concepts': array of 3 key sub-concepts
"""
        system_instruction = "You are a Principal Curriculum Architect at Synapse AI. Create logically sequenced, first-principles learning roadmaps."
        raw_json = _call_gemini_json(prompt, system_instruction)

        nodes: List[LearningPathNode] = []
        if raw_json and "nodes" in raw_json:
            for idx, n in enumerate(raw_json["nodes"]):
                is_first = idx == 0
                node = LearningPathNode(
                    node_id=n.get("node_id", f"node-{idx+1}"),
                    title=n.get("title", f"Module {idx+1}"),
                    description=n.get("description", "Master fundamental concepts."),
                    day_number=n.get("day_number", idx + 1),
                    sequence_index=idx,
                    estimated_minutes=n.get("estimated_minutes", 20),
                    is_unlocked=is_first,  # First node is unlocked by default
                    is_completed=False,
                    prerequisites=n.get("prerequisites", []),
                    target_concepts=n.get("target_concepts", []),
                    curriculum_payload={
                        "target_topic": n.get("title", request.target_topic),
                        "educational_level": request.educational_level.value,
                        "language": request.language.value,
                        "available_time_minutes": str(n.get("estimated_minutes", 20)),
                        "learning_style": "Visual and Concept-First with step-by-step intuitive analogies"
                    }
                )
                nodes.append(node)
        else:
            # Domain-expert fallback synthesis
            subtopics = [
                f"{request.target_topic}: Foundations & First Principles",
                f"{request.target_topic}: Core Architectural Mechanics",
                f"{request.target_topic}: Mathematical & Algorithmic Formulations",
                f"{request.target_topic}: Real-World Systems & Tradeoffs",
                f"{request.target_topic}: Advanced Synthesis & Mastery Drill"
            ]
            for idx, title in enumerate(subtopics):
                is_first = idx == 0
                node_id = f"node-{idx+1}"
                prereqs = [f"node-{idx}"] if idx > 0 else []
                node = LearningPathNode(
                    node_id=node_id,
                    title=title,
                    description=f"Deep dive into {title.lower()} with interactive whiteboard visualizations.",
                    day_number=idx + 1,
                    sequence_index=idx,
                    estimated_minutes=20,
                    is_unlocked=is_first,
                    is_completed=False,
                    prerequisites=prereqs,
                    target_concepts=[f"Concept {idx}.1", f"Concept {idx}.2", f"Concept {idx}.3"],
                    curriculum_payload={
                        "target_topic": title,
                        "educational_level": request.educational_level.value,
                        "language": request.language.value,
                        "available_time_minutes": "20",
                        "learning_style": "Visual and Concept-First with step-by-step intuitive analogies"
                    }
                )
                nodes.append(node)

        plan = StudyPlan(
            plan_id=plan_id,
            user_id=request.user_id,
            target_topic=request.target_topic,
            timeframe=request.timeframe,
            total_days=len(nodes),
            student_level=request.educational_level,
            nodes=nodes,
            created_at=time.time()
        )

        self.stored_plans[plan_id] = plan
        return plan

    def get_study_plan(self, plan_id: str) -> Optional[StudyPlan]:
        """Retrieve a cached or preset study plan by ID."""
        return self.stored_plans.get(plan_id)

    def unlock_next_node(self, plan_id: str, completed_node_id: str) -> Optional[StudyPlan]:
        """Mark a completed node and automatically unlock subsequent dependent nodes."""
        plan = self.get_study_plan(plan_id)
        if not plan:
            return None

        for node in plan.nodes:
            if node.node_id == completed_node_id:
                node.is_completed = True

        for node in plan.nodes:
            if not node.is_unlocked:
                if all(
                    any(n.node_id == prereq and n.is_completed for n in plan.nodes)
                    for prereq in node.prerequisites
                ):
                    node.is_unlocked = True

        return plan


# Global singleton instance
path_engine = StudyPlannerEngine()
