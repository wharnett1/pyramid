// Steps 2–6 of the loop (spec §3): take scored signals + the intervention
// evidence and return 1–3 ranked recommendations, framed sequentially.

import { clearsEffectThreshold } from '../config/thresholds';
import {
  SCORED_SIGNALS,
  type AssessmentResult,
  type EffectSize,
  type EffortCost,
  type Intervention,
  type Note,
  type Recommendation,
  type ScoredSignal,
  type SignalScores,
  type SummaryState,
} from './types';

// Lower rank number = higher priority.
const EFFECT_ORDER: Record<EffectSize, number> = { large: 0, moderate: 1, small: 2 };
const EFFORT_ORDER: Record<EffortCost, number> = { low: 0, moderate: 1, high: 2 };

export interface PrioritizeInput {
  scores: SignalScores;
  /** Exactly one primary intervention per scored signal. */
  interventionsBySignal: Record<ScoredSignal, Intervention>;
  /** The `exercise_resistance` row (the 7th intervention), if present. */
  resistanceIntervention?: Intervention;
  /** Whether the user reported doing resistance training. */
  resistancePresent?: boolean;
}

export function prioritize(input: PrioritizeInput): AssessmentResult {
  const { scores, interventionsBySignal, resistanceIntervention, resistancePresent } = input;

  const unmet = SCORED_SIGNALS.filter((s) => scores[s] === 'unmet');

  // §3.3a — prerequisite position: how many *other unmet* signals is this one
  // upstream of? Encoded in interventions.prereq_of. This puts sleep ahead of its
  // dependents and diet_upf ahead of the other diet signals (the within-diet rule),
  // with no special cases.
  const prereqScore = (s: ScoredSignal): number => {
    const prereqOf = interventionsBySignal[s].prereq_of;
    return prereqOf.filter((dep) => (unmet as string[]).includes(dep)).length;
  };

  // §3.4 — split unmet by the effect threshold.
  const recommendable = unmet.filter((s) => clearsEffectThreshold(interventionsBySignal[s].effect_size));
  const optional = unmet.filter((s) => !clearsEffectThreshold(interventionsBySignal[s].effect_size));

  // §3.3 — order: prereq position, then effect size, then effort (low wins).
  recommendable.sort((a, b) => {
    const byPrereq = prereqScore(b) - prereqScore(a);
    if (byPrereq !== 0) return byPrereq;
    const byEffect =
      EFFECT_ORDER[interventionsBySignal[a].effect_size] - EFFECT_ORDER[interventionsBySignal[b].effect_size];
    if (byEffect !== 0) return byEffect;
    return EFFORT_ORDER[interventionsBySignal[a].effort_cost] - EFFORT_ORDER[interventionsBySignal[b].effort_cost];
  });

  // §3.5 — top 1–3, framed sequentially.
  const recommendations: Recommendation[] = recommendable.slice(0, 3).map((s, i) => {
    const iv = interventionsBySignal[s];
    return {
      rank: i + 1,
      primary: i === 0,
      signal_key: s,
      status: 'unmet',
      headline: i === 0 ? 'Start here' : 'Then address',
      message: iv.msg_unmet,
      claim: iv.claim,
      effect_size: iv.effect_size,
      evidence_grade: iv.evidence_grade,
      effort_cost: iv.effort_cost,
      citations: iv.citations,
    };
  });

  const notes: Note[] = [];

  // Small-effect unmet signals → "your call" (§3.4). Dormant with the v1 seed.
  for (const s of optional) {
    const iv = interventionsBySignal[s];
    notes.push({
      kind: 'optional',
      signal_key: s,
      message: `Optional — the expected benefit here is small relative to the effort, so this is your call rather than a priority. ${iv.msg_unmet}`,
      claim: iv.claim,
      evidence_grade: iv.evidence_grade,
      citations: iv.citations,
    });
  }

  // Borderline signals → gentle "you're close" context (not a recommendation, so
  // we never manufacture marginal recs to fill space, §3.6).
  for (const s of SCORED_SIGNALS) {
    if (scores[s] === 'borderline') {
      const iv = interventionsBySignal[s];
      notes.push({
        kind: 'borderline',
        signal_key: s,
        message: iv.msg_borderline,
        claim: iv.claim,
        evidence_grade: iv.evidence_grade,
        citations: iv.citations,
      });
    }
  }

  // Resistance-training secondary note — only once the movement basics are in
  // place (exercise not unmet). Fixing the foundation first is the whole thesis;
  // piling "also lift weights" onto someone who isn't moving yet would violate it.
  if (resistanceIntervention && resistancePresent === false && scores.exercise !== 'unmet') {
    notes.push({
      kind: 'resistance',
      signal_key: resistanceIntervention.signal_key,
      message: resistanceIntervention.msg_unmet,
      claim: resistanceIntervention.claim,
      evidence_grade: resistanceIntervention.evidence_grade,
      citations: resistanceIntervention.citations,
    });
  }

  // §3.6 — if nothing clears the threshold, say so honestly.
  const summary_state: SummaryState = recommendations.length > 0 ? 'has_recommendations' : 'basics_down';

  return { signal_scores: scores, summary_state, recommendations, notes };
}
