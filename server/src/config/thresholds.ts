// Scoring thresholds (spec §2) and the effect threshold (§3.4).
//
// These are STARTING GUESSES to be corrected by research (spec §4.2), which is
// exactly why they live here in one editable module rather than in the schema.

import type {
  EffectSize,
  EnergyBucket,
  ProduceBucket,
  ProteinBucket,
  Status,
  UpfBucket,
} from '../domain/types';

/** Numeric signals: value < unmetBelow → unmet; < borderlineBelow → borderline; else met. */
export interface NumericThreshold {
  unmetBelow: number;
  borderlineBelow: number;
}

export const NUMERIC_THRESHOLDS: Record<'sleep' | 'exercise', NumericThreshold> = {
  // <6h unmet · 6–7h borderline · 7h+ met
  sleep: { unmetBelow: 6, borderlineBelow: 7 },
  // 0–1 days unmet · 2 days borderline · 3+ met
  exercise: { unmetBelow: 2, borderlineBelow: 3 },
};

/** Categorical signals map their bucket directly to a status (§2). */
export const CATEGORICAL_MAPS: {
  diet_protein: Record<ProteinBucket, Status>;
  diet_produce: Record<ProduceBucket, Status>;
  diet_upf: Record<UpfBucket, Status>;
  energy_balance: Record<EnergyBucket, Status>;
} = {
  diet_protein: { none_rare: 'unmet', about_one: 'borderline', most: 'met' },
  diet_produce: { zero: 'unmet', one_two: 'borderline', three_plus: 'met' },
  diet_upf: { mostly_processed: 'unmet', mixed: 'borderline', mostly_whole: 'met' },
  energy_balance: { wrong_way: 'unmet', stable: 'borderline', right_way: 'met' },
};

/**
 * Effect threshold (spec §3.4): an unmet signal is only recommended if its effect
 * is big enough to justify the effort. In v1 all tier-1 signals are large/moderate,
 * so nothing is demoted yet — but the rule exists and is tested. A `small`-effect
 * unmet signal becomes an "optional / your call" note instead of a recommendation.
 */
export function clearsEffectThreshold(effect: EffectSize): boolean {
  return effect !== 'small';
}
