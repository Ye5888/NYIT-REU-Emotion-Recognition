/**
 * Backend client. Definition endpoints are read-only from the app's side;
 * definitions are authored by Backend/seed.py, never by a participant.
 */
import type {
  AssessmentItem,
  CaseStudy,
  ProbeQuestion,
  Protocol,
  ResponseDoc,
  SessionDoc,
  TaskTrial,
} from './types';

export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE?.replace(/\/$/, '') ?? 'http://localhost:5000';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(body || res.statusText, res.status, path);
  }

  return res.json() as Promise<T>;
}

async function send<T>(method: 'POST' | 'PUT', path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(text || res.statusText, res.status, path);
  }

  return res.json() as Promise<T>;
}

export const api = {
  getProtocol: (version: string) => get<Protocol>(`/protocols/${version}`),
  getCaseStudy: (id: string) => get<CaseStudy>(`/caseStudies/${id}`),
  getCaseStudyTrials: (id: string) => get<TaskTrial[]>(`/caseStudies/${id}/trials`),
  getProbeQuestions: () => get<ProbeQuestion[]>('/probe_questions'),
  getAssessmentItems: () => get<AssessmentItem[]>('/assessmentItems'),

  // --- Run writes. Both take a client-chosen id and are idempotent: a retried
  // write overwrites its own document instead of leaving a duplicate run.
  createSession: (body: SessionDoc & { id: string }) =>
    send<{ id: string }>('POST', '/sessions', body),
  patchSession: (sessionId: string, patch: Partial<SessionDoc>) =>
    send<{ message: string }>('PUT', `/sessions/${sessionId}`, patch),
  putResponse: (sessionId: string, body: ResponseDoc & { id: string }) =>
    send<{ id: string }>('POST', `/sessions/${sessionId}/responses`, body),
};

export async function login(username: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(body || res.statusText, res.status, '/login');
  }

  const { token } = (await res.json()) as { token: string };
  setAuthToken(token);
  return token;
}
