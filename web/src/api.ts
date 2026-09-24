// Types mirror the backend response shape (server/src/domain/types.ts).

export type Status = 'unmet' | 'borderline' | 'met';
export type SummaryState = 'has_recommendations' | 'basics_down';

export interface Citation {
  title: string;
  url: string;
  verified: boolean;
}

export interface Recommendation {
  rank: number;
  primary: boolean;
  signal_key: string;
  status: Status;
  headline: string;
  message: string;
  claim: string;
  effect_size: string;
  evidence_grade: string;
  effort_cost: string;
  citations: Citation[];
}

export interface Note {
  kind: 'borderline' | 'resistance' | 'optional';
  signal_key: string;
  message: string;
  claim: string;
  evidence_grade: string;
  citations: Citation[];
}

export interface AssessmentResponse {
  assessment_id: number;
  user_id: number;
  signal_scores: Record<string, Status>;
  summary_state: SummaryState;
  recommendations: Recommendation[];
  notes: Note[];
}

export interface Answers {
  sleep: { hours: number; rested?: number };
  exercise: { days: number; resistance?: boolean };
  diet_protein: { bucket: string };
  diet_produce: { bucket: string };
  diet_upf: { bucket: string };
  energy_balance: { bucket: string };
}

export async function submitAssessment(answers: Answers): Promise<AssessmentResponse> {
  const res = await fetch('/api/assessments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(body.details) ? body.details.join('; ') : body.error ?? `HTTP ${res.status}`;
    throw new Error(detail);
  }
  return body as AssessmentResponse;
}
