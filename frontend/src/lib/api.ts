import { StudentProfile, StudentResponse, StudyMaterials } from "../types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const primaryUrl = `${API_BASE_URL}${path}`;
  try {
    return await fetch(primaryUrl, init);
  } catch (error) {
    if (API_BASE_URL.includes("localhost")) {
      const fallbackUrl = primaryUrl.replace("localhost", "127.0.0.1");
      console.warn(`Primary API fetch failed, retrying ${fallbackUrl}`, error);
      return fetch(fallbackUrl, init);
    }
    throw error;
  }
}

export async function createClassroomSession(profile: StudentProfile, documentContentOverride?: string) {
  const res = await apiFetch(`/api/classroom/session/create`, {
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

export interface SimliSessionResponse {
  success: boolean;
  session_token: string;
  ice_servers: RTCIceServer[];
}

export async function createSimliSession(): Promise<SimliSessionResponse> {
  const res = await apiFetch(`/api/v1/simli/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to create Simli session: ${res.statusText}`);
  }
  return res.json();
}

export async function uploadDocument(file: File, title?: string) {
  const formData = new FormData();
  formData.append("file", file);
  if (title) {
    formData.append("title", title);
  }

  const res = await apiFetch(`/api/documents/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    throw new Error(`Failed to upload document: ${res.statusText}`);
  }
  return res.json();
}

export async function submitAnswer(sessionId: string, response: StudentResponse) {
  const res = await apiFetch(`/api/classroom/session/${sessionId}/answer`, {
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
  const res = await apiFetch(`/api/classroom/session/${sessionId}/advance`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`Failed to advance curriculum: ${res.statusText}`);
  }
  return res.json();
}

export async function exportStudyMaterials(sessionId: string): Promise<StudyMaterials> {
  const res = await apiFetch(`/api/v1/session/${sessionId}/export-materials`);
  if (!res.ok) {
    throw new Error(`Failed to fetch study materials: ${res.statusText}`);
  }
  return res.json();
}

export async function getUserProfile(userId: string = "default_user") {
  const res = await apiFetch(`/api/v1/user/${userId}/profile`);
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
  const res = await apiFetch(`/api/v1/study-plan/generate`, {
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
  const res = await apiFetch(`/api/v1/study-plan/${planId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch study plan: ${res.statusText}`);
  }
  return res.json();
}

export async function getDefaultStudyPlan(topicKey: string = "greentech") {
  const res = await apiFetch(`/api/v1/study-plan/default/${topicKey}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch default study plan: ${res.statusText}`);
  }
  return res.json();
}

export async function completeRoadmapNode(planId: string, nodeId: string) {
  const res = await apiFetch(`/api/v1/study-plan/${planId}/complete-node`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ node_id: nodeId }),
  });
  if (!res.ok) {
    throw new Error(`Failed to complete node: ${res.statusText}`);
  }
  return res.json();
}

export function getWebSocketUrl(
  sessionId: string,
  topic?: string,
  lang?: string,
  level?: string,
  docId?: string
): string {
  const wsProto = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = process.env.NEXT_PUBLIC_WS_HOST || "localhost:8000";
  const params = new URLSearchParams();
  if (topic) params.set("topic", topic);
  if (lang) params.set("lang", lang);
  if (level) params.set("level", level);
  if (docId) params.set("doc_id", docId);
  const qs = params.toString();
  return `${wsProto}//${host}/ws/classroom/${sessionId}${qs ? `?${qs}` : ""}`;
}
