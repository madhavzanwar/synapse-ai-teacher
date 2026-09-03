"""
Automated Study Material & Flashcard Generator for Synapse AI Teacher.
Generates comprehensive Markdown summary notes, targeted smart flashcards weighted to weak concepts,
and downloadable Anki/Quizlet-compatible CSV export files.
"""
import csv
import io
import json
import logging
import re
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.config import settings
from app.schemas.lesson import LessonPlan, MasteryReport, Checkpoint

logger = logging.getLogger(__name__)


class StudyMaterialEngine:
    """
    Automated engine that analyzes completed lesson plans and mastery reports
    to generate concise study notes and targeted Anki flashcards.
    """

    def __init__(self):
        pass

    # -----------------------------------------------------------------------
    # Main Generation Pipeline
    # -----------------------------------------------------------------------

    def generate_study_materials(
        self,
        session_id: str,
        lesson_plan: LessonPlan,
        report: MasteryReport,
        grounding_context: str = ""
    ) -> Dict[str, Any]:
        """
        Generates full study package: Markdown Notes, Smart Flashcards, and Anki CSV.
        """
        # 1. Generate Smart Flashcards (weighted to weak concepts)
        flashcards = self._generate_flashcards(lesson_plan, report)

        # 2. Format Anki / Quizlet CSV
        anki_csv = self._format_anki_csv(flashcards)

        # 3. Generate Structured Markdown Notes
        markdown_notes = self._generate_markdown_notes(lesson_plan, report, grounding_context)

        return {
            "session_id": session_id,
            "topic": lesson_plan.topic,
            "overall_mastery_percentage": report.overall_mastery_percentage,
            "generated_at": datetime.utcnow().isoformat(),
            "flashcards": flashcards,
            "anki_csv": anki_csv,
            "markdown_notes": markdown_notes,
            "developer_watermark": "Developed by Madhav Zanwar (madhav_builds) — AIML Student | Problem Solver | Tech Enthusiast"
        }

    # -----------------------------------------------------------------------
    # Flashcard Generation
    # -----------------------------------------------------------------------

    def _generate_flashcards(
        self, lesson_plan: LessonPlan, report: MasteryReport
    ) -> List[Dict[str, Any]]:
        """Generates flashcards with priority weighting on identified weak concepts."""
        flashcards: List[Dict[str, Any]] = []

        # 1. Target weak concepts first
        weak_concepts = report.areas_for_review or []
        for i, weak in enumerate(weak_concepts):
            flashcards.append({
                "id": f"card-weak-{i+1}",
                "front": f"What is the key principle behind: {weak}?",
                "back": f"Key Principle: Always trace the cause-and-effect relationship. In {lesson_plan.topic}, {weak} prevents degeneration and maintains mathematical stability.",
                "tag": f"{lesson_plan.topic.replace(' ', '_')}::Review",
                "is_weak_concept_targeted": True
            })

        # 2. Generate flashcards from lesson modules
        for mod_idx, mod in enumerate(lesson_plan.modules):
            # Formula / Visual Card
            if mod.visual_action and mod.visual_action.raw_payload:
                flashcards.append({
                    "id": f"card-mod-{mod_idx+1}-vis",
                    "front": f"How is '{mod.title}' formulated mathematically or structurally?",
                    "back": f"Formula / Structure: {mod.visual_action.raw_payload}\n\nNote: {mod.visual_action.explanation_notes or 'Core concept in ' + mod.title}",
                    "tag": f"{lesson_plan.topic.replace(' ', '_')}::Formula",
                    "is_weak_concept_targeted": False
                })

            # Checkpoint Question Card
            if mod.checkpoint:
                flashcards.append({
                    "id": f"card-mod-{mod_idx+1}-chk",
                    "front": mod.checkpoint.question_text,
                    "back": f"Correct Insight: {mod.checkpoint.expected_concept}\n\nWhy: {mod.checkpoint.rubric}",
                    "tag": f"{lesson_plan.topic.replace(' ', '_')}::Concept",
                    "is_weak_concept_targeted": False
                })

        return flashcards

    # -----------------------------------------------------------------------
    # Anki CSV Formatter
    # -----------------------------------------------------------------------

    def _format_anki_csv(self, flashcards: List[Dict[str, Any]]) -> str:
        """
        Formats flashcards as a standard Anki-compatible CSV string:
        Front, Back, Tags
        """
        output = io.StringIO()
        writer = csv.writer(output, delimiter=';', quotechar='"', quoting=csv.QUOTE_ALL)

        # Header
        writer.writerow(["#separator:Semicolon"])
        writer.writerow(["#html:true"])
        writer.writerow(["#tags column:3"])

        for card in flashcards:
            front = card["front"].replace("\n", "<br>")
            back = card["back"].replace("\n", "<br>")
            tag = card["tag"]
            writer.writerow([front, back, tag])

        return output.getvalue()

    # -----------------------------------------------------------------------
    # Structured Markdown Notes
    # -----------------------------------------------------------------------

    def _generate_markdown_notes(
        self, lesson_plan: LessonPlan, report: MasteryReport, grounding_context: str
    ) -> str:
        """Generates a complete, publication-ready study guide in Markdown."""
        lines = [
            f"# Synapse AI Teacher — Study Guide: {lesson_plan.topic}",
            "",
            f"> **Mastery Level:** {lesson_plan.student_level.value}  ",
            f"> **Language:** {lesson_plan.language.value}  ",
            f"> **Mastery Score Achieved:** {report.overall_mastery_percentage}%  ",
            f"> **Date:** {datetime.utcnow().strftime('%B %d, %Y')}",
            "",
            "---",
            "",
            "## 1. Executive Concept Summary",
            "",
            report.summary_feedback,
            "",
            "### Pedagogical Goals Mastered",
            "",
        ]

        for goal in lesson_plan.pedagogical_goals:
            lines.append(f"- [x] {goal}")

        lines.extend([
            "",
            "---",
            "",
            "## 2. Core Curriculum Breakdown",
            ""
        ])

        for idx, mod in enumerate(lesson_plan.modules, start=1):
            lines.append(f"### Module {idx}: {mod.title}")
            lines.append(f"**Estimated Duration:** {mod.estimated_minutes} minutes\n")
            lines.append(f"**Key Explanation:**")
            # Strip emotion tags from script for clean reading
            clean_script = re.sub(r"<emotion=[a-zA-Z0-9_-]+>", "", mod.teaching_script)
            clean_script = re.sub(r"</emotion>", "", clean_script)
            clean_script = re.sub(r"<pause=[0-9]+ms>", "", clean_script)
            lines.append(f"> {clean_script.strip()}\n")

            if mod.visual_action:
                lines.append(f"**Whiteboard Visual Representation (`{mod.visual_action.type.value}`):**")
                if mod.visual_action.type.value == "katex":
                    lines.append(f"$$\n{mod.visual_action.raw_payload}\n$$")
                elif mod.visual_action.type.value == "mermaid":
                    lines.append(f"```mermaid\n{mod.visual_action.raw_payload}\n```")
                elif mod.visual_action.type.value == "code":
                    lines.append(f"```python\n{mod.visual_action.raw_payload}\n```")
                else:
                    lines.append(f"```\n{mod.visual_action.raw_payload}\n```")

                if mod.visual_action.explanation_notes:
                    lines.append(f"*Note: {mod.visual_action.explanation_notes}*\n")

            if mod.checkpoint:
                lines.append(f"**Socratic Self-Test Checkpoint:**")
                lines.append(f"- **Question:** {mod.checkpoint.question_text}")
                lines.append(f"- **Expected Insight:** {mod.checkpoint.expected_concept}\n")

            lines.append("---\n")

        # 3. Targeted Review & Weak Nodes
        lines.extend([
            "## 3. Targeted Review & Remediation Insights",
            "",
            "### Identified Areas for Continued Practice",
        ])
        for area in report.areas_for_review:
            lines.append(f"- ⚠️ **{area}**")

        lines.extend([
            "",
            "### Actionable Next Steps",
        ])
        for step in (report.actionable_next_steps or []):
            lines.append(f"1. {step}")

        lines.extend([
            "",
            "---",
            "",
            "## 4. Developer Attribution",
            "",
            "*Developed by **Madhav Zanwar (madhav_builds)** — AIML Student | Problem Solver | Tech Enthusiast*",
            ""
        ])

        return "\n".join(lines)


# Global singleton instance
study_material_engine = StudyMaterialEngine()
