import { describe, expect, it } from 'vitest';
import { prioritize } from '../domain/prioritize';
import type {
  EffectSize,
  EffortCost,
  Intervention,
  ScoredSignal,
  SignalScores,
} from '../domain/types';

// Fixture mirroring the v1 seed's prioritization-relevant attributes.
function iv(
  signal_key: string,
  effect_size: EffectSize,
  effort_cost: EffortCost,
  prereq_of: string[]
): Intervention {
  return {
    id: 0,
    signal_key,
    tier: 1,
    claim: `${signal_key} claim`,
    effect_size,
    evidence_grade: 'moderate',
    effort_cost,
    prereq_of,
    citations: [{ title: 't', url: 'u', verified: false }],
    msg_unmet: `${signal_key} unmet`,
    msg_borderline: `${signal_key} borderline`,
    msg_met: `${signal_key} met`,
  };
}

function seedMaps() {
  const bySignal: Record<ScoredSignal, Intervention> = {
    sleep: iv('sleep', 'large', 'moderate', ['exercise', 'diet_protein', 'diet_produce', 'diet_upf']),
    exercise: iv('exercise', 'large', 'moderate', []),
    diet_protein: iv('diet_protein', 'large', 'low', []),
    diet_produce: iv('diet_produce', 'moderate', 'moderate', []),
    diet_upf: iv('diet_upf', 'moderate', 'moderate', ['diet_protein', 'diet_produce', 'energy_balance']),
    energy_balance: iv('energy_balance', 'moderate', 'high', []),
  };
  const resistance = iv('exercise_resistance', 'moderate', 'moderate', []);
  return { bySignal, resistance };
}

const ALL: SignalScores = {
  sleep: 'met',
  exercise: 'met',
  diet_protein: 'met',
  diet_produce: 'met',
  diet_upf: 'met',
  energy_balance: 'met',
};

describe('prioritize — §3 ordering', () => {
  it('all signals unmet → sleep is #1 (prerequisite position wins)', () => {
    const { bySignal, resistance } = seedMaps();
    const scores: SignalScores = {
      sleep: 'unmet',
      exercise: 'unmet',
      diet_protein: 'unmet',
      diet_produce: 'unmet',
      diet_upf: 'unmet',
      energy_balance: 'unmet',
    };
    const r = prioritize({ scores, interventionsBySignal: bySignal, resistanceIntervention: resistance });

    expect(r.summary_state).toBe('has_recommendations');
    expect(r.recommendations).toHaveLength(3); // top 1–3 only
    expect(r.recommendations[0]!.signal_key).toBe('sleep');
    expect(r.recommendations[0]!.primary).toBe(true);
    expect(r.recommendations[0]!.headline).toBe('Start here');
    // sleep (upstream of 4) > diet_upf (upstream of 3) > diet_protein (large, low effort)
    expect(r.recommendations.map((x) => x.signal_key)).toEqual(['sleep', 'diet_upf', 'diet_protein']);
  });

  it('multiple diet signals unmet → diet_upf surfaces before protein/produce (within-diet rule)', () => {
    const { bySignal } = seedMaps();
    const scores: SignalScores = {
      ...ALL,
      diet_protein: 'unmet',
      diet_produce: 'unmet',
      diet_upf: 'unmet',
    };
    const r = prioritize({ scores, interventionsBySignal: bySignal });
    expect(r.recommendations.map((x) => x.signal_key)).toEqual(['diet_upf', 'diet_protein', 'diet_produce']);
  });

  it('two unmet, no prereq relation → larger effect, then lower effort, wins', () => {
    const { bySignal } = seedMaps();
    // exercise (large) vs energy_balance (moderate), no prereq edges between them
    const scores: SignalScores = { ...ALL, exercise: 'unmet', energy_balance: 'unmet' };
    const r = prioritize({ scores, interventionsBySignal: bySignal });
    expect(r.recommendations.map((x) => x.signal_key)).toEqual(['exercise', 'energy_balance']);
  });
});

describe('prioritize — §3.6 basics-down and §3.4 threshold', () => {
  it('all signals met → basics_down with zero recommendations', () => {
    const { bySignal, resistance } = seedMaps();
    const r = prioritize({ scores: { ...ALL }, interventionsBySignal: bySignal, resistanceIntervention: resistance });
    expect(r.summary_state).toBe('basics_down');
    expect(r.recommendations).toHaveLength(0);
    expect(r.notes).toHaveLength(0);
  });

  it('small-effect unmet signal → optional note, not a recommendation', () => {
    const { bySignal } = seedMaps();
    bySignal.diet_produce = iv('diet_produce', 'small', 'moderate', []); // demote effect
    const scores: SignalScores = { ...ALL, diet_produce: 'unmet' };
    const r = prioritize({ scores, interventionsBySignal: bySignal });

    expect(r.summary_state).toBe('basics_down');
    expect(r.recommendations).toHaveLength(0);
    expect(r.notes).toHaveLength(1);
    expect(r.notes[0]!.kind).toBe('optional');
    expect(r.notes[0]!.signal_key).toBe('diet_produce');
  });
});

describe('prioritize — notes: borderline + resistance', () => {
  it('borderline signal → borderline note, not a recommendation', () => {
    const { bySignal } = seedMaps();
    const scores: SignalScores = { ...ALL, diet_protein: 'borderline' };
    const r = prioritize({ scores, interventionsBySignal: bySignal });
    expect(r.recommendations).toHaveLength(0);
    expect(r.notes.filter((n) => n.kind === 'borderline').map((n) => n.signal_key)).toEqual(['diet_protein']);
  });

  it('resistance absent + exercise NOT unmet → resistance note appears', () => {
    const { bySignal, resistance } = seedMaps();
    const scores: SignalScores = { ...ALL, exercise: 'met' };
    const r = prioritize({
      scores,
      interventionsBySignal: bySignal,
      resistanceIntervention: resistance,
      resistancePresent: false,
    });
    expect(r.notes.some((n) => n.kind === 'resistance')).toBe(true);
  });

  it('resistance absent but exercise UNMET → resistance note suppressed (fix basics first)', () => {
    const { bySignal, resistance } = seedMaps();
    const scores: SignalScores = { ...ALL, exercise: 'unmet' };
    const r = prioritize({
      scores,
      interventionsBySignal: bySignal,
      resistanceIntervention: resistance,
      resistancePresent: false,
    });
    expect(r.notes.some((n) => n.kind === 'resistance')).toBe(false);
  });
});
