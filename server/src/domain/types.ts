// Core domain types for the scoring + prioritization engine (spec §2–§3).

export type Status = 'unmet' | 'borderline' | 'met';
export type EffectSize = 'large' | 'moderate' | 'small';
export type EvidenceGrade = 'high' | 'moderate' | 'low' | 'very_low'; // GRADE, simplified
export type EffortCost = 'low' | 'moderate' | 'high';

/** The six signals that are scored and prioritized in v1. */
export const SCORED_SIGNALS = [
  'sleep',
  'exercise',
  'diet_protein',
  'diet_produce',
  'diet_upf',
  'energy_balance',
] as const;
export type ScoredSignal = (typeof SCORED_SIGNALS)[number];

export function isScoredSignal(key: string): key is ScoredSignal {
  return (SCORED_SIGNALS as readonly string[]).includes(key);
}

// Categorical answer buckets (§2).
export type ProteinBucket = 'none_rare' | 'about_one' | 'most';
export type ProduceBucket = 'zero' | 'one_two' | 'three_plus';
export type UpfBucket = 'mostly_processed' | 'mixed' | 'mostly_whole';
export type EnergyBucket = 'wrong_way' | 'stable' | 'right_way';

/** Raw bucketed inputs, keyed by signal (stored in user_assessments.answers). */
export interface Answers {
  sleep: { hours: number; rested?: number };
  exercise: { days: number; resistance?: boolean };
  diet_protein: { bucket: ProteinBucket };
  diet_produce: { bucket: ProduceBucket };
  diet_upf: { bucket: UpfBucket };
  energy_balance: { bucket: EnergyBucket };
}

export type InputSourceKind = 'self_report' | 'wearable'; // wearable is a v2 hook
export type InputSource = Record<ScoredSignal, InputSourceKind>;

export interface Citation {
  title: string;
  url: string;
  verified: boolean;
}

/** A row of the `interventions` table (JSON columns already parsed). */
export interface Intervention {
  id: number;
  signal_key: string;
  tier: number;
  claim: string;
  effect_size: EffectSize;
  evidence_grade: EvidenceGrade;
  effort_cost: EffortCost;
  prereq_of: string[];
  citations: Citation[];
  msg_unmet: string;
  msg_borderline: string;
  msg_met: string;
}

export type SignalScores = Record<ScoredSignal, Status>;

/** A ranked, recommended action. The three transparency layers (spec §4) are
 *  kept as separate fields: recommendation (headline/message), evidence quality
 *  (evidence_grade), and evidence (claim + citations). */
export interface Recommendation {
  rank: number; // 1 = start here
  primary: boolean; // rank === 1
  signal_key: ScoredSignal;
  status: Status; // always 'unmet' for a recommendation
  headline: string; // "Start here" / "Then address"
  message: string; // intervention.msg_unmet
  claim: string;
  effect_size: EffectSize;
  evidence_grade: EvidenceGrade;
  effort_cost: EffortCost;
  citations: Citation[];
}

/** Secondary context that is deliberately NOT a ranked recommendation:
 *  borderline signals, the resistance-training note, or a small-effect signal
 *  demoted to "your call" by the effect threshold (§3.4). */
export interface Note {
  kind: 'borderline' | 'resistance' | 'optional';
  signal_key: string;
  message: string;
  claim: string;
  evidence_grade: EvidenceGrade;
  citations: Citation[];
}

export type SummaryState = 'has_recommendations' | 'basics_down';

export interface AssessmentResult {
  signal_scores: SignalScores;
  summary_state: SummaryState;
  recommendations: Recommendation[];
  notes: Note[];
}
