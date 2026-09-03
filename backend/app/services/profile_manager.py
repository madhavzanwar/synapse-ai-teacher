"""
Persistent Learner Memory Service for Synapse AI Teacher.
Manages long-term student memory, tracks strengths and weak concepts across sessions,
and injects historical cognitive context into pedagogical planning.
"""
import os
import json
import sqlite3
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.schemas.lesson import MasteryReport, StudentProfile

logger = logging.getLogger(__name__)

DB_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")
DB_PATH = os.path.join(DB_DIR, "synapse_learning.db")


class ProfileManager:
    """
    Manages long-term student memory, persistent profiles, and historical knowledge graphs.
    """

    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        """Initialize database schema if not exists."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            # Users Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    overall_score REAL DEFAULT 0.0,
                    total_sessions INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL
                )
            """)
            # Learning Profiles Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS learning_profiles (
                    user_id TEXT PRIMARY KEY,
                    topics_studied TEXT DEFAULT '[]',
                    strong_concepts TEXT DEFAULT '[]',
                    weak_concepts TEXT DEFAULT '[]',
                    learning_history TEXT DEFAULT '[]',
                    current_learning_path TEXT DEFAULT '[]',
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users (user_id)
                )
            """)
            conn.commit()

    # -----------------------------------------------------------------------
    # User & Profile Retrieval / Creation
    # -----------------------------------------------------------------------

    def get_or_create_user(self, user_id: str, name: str = "Learner") -> Dict[str, Any]:
        """Fetch user or initialize new record."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
            row = cursor.fetchone()
            if row:
                return dict(row)

            # Create User
            now = datetime.utcnow().isoformat()
            cursor.execute(
                "INSERT INTO users (user_id, name, overall_score, total_sessions, created_at) VALUES (?, ?, ?, ?, ?)",
                (user_id, name, 0.0, 0, now)
            )
            # Create Default Profile
            cursor.execute(
                "INSERT INTO learning_profiles (user_id, topics_studied, strong_concepts, weak_concepts, learning_history, current_learning_path, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (user_id, json.dumps([]), json.dumps([]), json.dumps([]), json.dumps([]), json.dumps([]), now)
            )
            conn.commit()
            return {
                "user_id": user_id,
                "name": name,
                "overall_score": 0.0,
                "total_sessions": 0,
                "created_at": now
            }

    def get_learning_profile(self, user_id: str) -> Dict[str, Any]:
        """Fetch full learning profile with parsed JSON fields."""
        self.get_or_create_user(user_id)
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT u.name, u.overall_score, u.total_sessions, u.created_at,
                       p.topics_studied, p.strong_concepts, p.weak_concepts, p.learning_history, p.current_learning_path, p.updated_at
                FROM users u
                JOIN learning_profiles p ON u.user_id = p.user_id
                WHERE u.user_id = ?
            """, (user_id,))
            row = cursor.fetchone()
            if not row:
                return {}

            return {
                "user_id": user_id,
                "name": row["name"],
                "overall_score": row["overall_score"],
                "total_sessions": row["total_sessions"],
                "created_at": row["created_at"],
                "topics_studied": json.loads(row["topics_studied"]),
                "strong_concepts": json.loads(row["strong_concepts"]),
                "weak_concepts": json.loads(row["weak_concepts"]),
                "learning_history": json.loads(row["learning_history"]),
                "current_learning_path": json.loads(row["current_learning_path"]),
                "updated_at": row["updated_at"]
            }

    # -----------------------------------------------------------------------
    # Update Memory from Session Mastery Report
    # -----------------------------------------------------------------------

    def update_profile_from_mastery(self, user_id: str, report: MasteryReport) -> Dict[str, Any]:
        """Updates persistent learning profile when a session concludes."""
        profile = self.get_learning_profile(user_id)
        
        # 1. Update topics studied
        topics = profile.get("topics_studied", [])
        if report.topic not in topics:
            topics.append(report.topic)

        # 2. Update strong and weak concepts
        strong = set(profile.get("strong_concepts", []))
        strong.update(report.strengths)

        weak = set(profile.get("weak_concepts", []))
        weak.update(report.areas_for_review)

        # 3. Append history record
        history = profile.get("learning_history", [])
        history_entry = {
            "session_id": report.session_id,
            "topic": report.topic,
            "mastery_percentage": report.overall_mastery_percentage,
            "timestamp": datetime.utcnow().isoformat(),
            "strengths": report.strengths,
            "areas_for_review": report.areas_for_review
        }
        history.append(history_entry)

        # 4. Compute average overall score
        total_sessions = len(history)
        overall_score = round(sum(h["mastery_percentage"] for h in history) / total_sessions, 1)

        # 5. Update learning path with recommended next topics
        current_path = profile.get("current_learning_path", [])
        for rec in report.recommended_next_topics:
            if rec not in current_path:
                current_path.append(rec)

        now = datetime.utcnow().isoformat()

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE users
                SET overall_score = ?, total_sessions = ?
                WHERE user_id = ?
            """, (overall_score, total_sessions, user_id))

            cursor.execute("""
                UPDATE learning_profiles
                SET topics_studied = ?, strong_concepts = ?, weak_concepts = ?, learning_history = ?, current_learning_path = ?, updated_at = ?
                WHERE user_id = ?
            """, (
                json.dumps(topics),
                json.dumps(list(strong)),
                json.dumps(list(weak)),
                json.dumps(history),
                json.dumps(current_path),
                now,
                user_id
            ))
            conn.commit()

        logger.info(f"Updated persistent profile for user {user_id}: score={overall_score}, sessions={total_sessions}")
        return self.get_learning_profile(user_id)

    # -----------------------------------------------------------------------
    # Cognitive Memory Injection for Pedagogy Engine
    # -----------------------------------------------------------------------

    def get_student_memory_context(self, user_id: str, target_topic: str) -> str:
        """
        Generates contextual memory notes for the curriculum planner prompt.
        Highlights previously encountered misconceptions so the AI can scaffold.
        """
        profile = self.get_learning_profile(user_id)
        if not profile:
            return ""

        weak = profile.get("weak_concepts", [])
        strong = profile.get("strong_concepts", [])
        topics = profile.get("topics_studied", [])

        if not weak and not strong and not topics:
            return ""

        memory_lines = [
            f"--- LONG-TERM LEARNER MEMORY (Student: {profile.get('name', 'Learner')}) ---",
            f"Overall Historical Mastery: {profile.get('overall_score', 0)}% across {profile.get('total_sessions', 0)} sessions.",
            f"Previously Mastered Topics: {', '.join(topics) if topics else 'None yet'}.",
        ]

        if weak:
            memory_lines.append(
                f"PREVIOUS KNOWLEDGE GAPS & WEAK NODES: {'; '.join(weak[:5])}."
            )
            memory_lines.append(
                "PEDAGOGICAL INSTRUCTION: The student previously struggled with these principles. "
                "Proactively spend extra time, supply simpler real-world intuitive analogies, "
                "and provide progressive scaffolding when these concepts arise in this lesson."
            )

        if strong:
            memory_lines.append(f"Demonstrated Strengths: {'; '.join(strong[:4])}.")

        memory_lines.append("--------------------------------------------------")
        return "\n".join(memory_lines)


# Global singleton instance
profile_manager = ProfileManager()
