import { StudentProfile, StudentResponse } from "../types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function createClassroomSession(profile: StudentProfile, documentContentOverride?: string) {
  const res = await fetch(`${API_BASE_URL}/api/classroom/session/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      profile,
      document_content_override: documentContentOverride,
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create session: ${res.statusText}`);
  }
  return res.json();
}

export async function uploadDocument(file: File, title?: string) {
  const formData = new FormData();
  formData.append("file", file);
  if (title) {
    formData.append("title", title);
  }

  const res = await fetch(`${API_BASE_URL}/api/documents/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    throw new Error(`Failed to upload document: ${res.statusText}`);
  }
  return res.json();
}

export async function submitAnswer(sessionId: string, response: StudentResponse) {
  const res = await fetch(`${API_BASE_URL}/api/classroom/session/${sessionId}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(response),
  });
  if (!res.ok) {
    throw new Error(`Failed to submit answer: ${res.statusText}`);
  }
  return res.json();
}

export async function advanceCurriculum(sessionId: string) {
  const res = await fetch(`${API_BASE_URL}/api/classroom/session/${sessionId}/advance`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`Failed to advance curriculum: ${res.statusText}`);
  }
  return res.json();
}

export async function exportStudyMaterials(sessionId: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/session/${sessionId}/export-materials`);
  if (!res.ok) {
    throw new Error(`Failed to fetch study materials: ${res.statusText}`);
  }
  return res.json();
}

export async function getUserProfile(userId: string = "default_user") {
  const res = await fetch(`${API_BASE_URL}/api/v1/user/${userId}/profile`);
  if (!res.ok) {
    throw new Error(`Failed to fetch user profile: ${res.statusText}`);
  }
  return res.json();
}

export function getAnkiDownloadUrl(sessionId: string): string {
  return `${API_BASE_URL}/api/v1/session/${sessionId}/download-anki`;
}

export function getNotesDownloadUrl(sessionId: string): string {
  return `${API_BASE_URL}/api/v1/session/${sessionId}/download-notes`;
}

export async function generateStudyPlan(data: {
  target_topic: string;
  timeframe?: string;
  educational_level?: string;
  language?: string;
  user_id?: string;
}) {
  const res = await fetch(`${API_BASE_URL}/api/v1/study-plan/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`Failed to generate study plan: ${res.statusText}`);
  }
  return res.json();
}

export async function getStudyPlan(planId: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/study-plan/${planId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch study plan: ${res.statusText}`);
  }
  return res.json();
}

export async function getDefaultStudyPlan(topicKey: string = "greentech") {
  const res = await fetch(`${API_BASE_URL}/api/v1/study-plan/default/${topicKey}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch default study plan: ${res.statusText}`);
  }
  return res.json();
}

export async function completeRoadmapNode(planId: string, nodeId: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/study-plan/${planId}/complete-node`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ node_id: nodeId }),
  });
  if (!res.ok) {
    throw new Error(`Failed to complete node: ${res.statusText}`);
  }
  return res.json();
}

export function getWebSocketUrl(sessionId: string): string {
  const wsProto = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = process.env.NEXT_PUBLIC_WS_HOST || "localhost:8000";
  return `${wsProto}//${host}/ws/classroom/${sessionId}`;
}
