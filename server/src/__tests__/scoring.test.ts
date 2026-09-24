import { describe, expect, it } from 'vitest';
import { scoreSignals } from '../domain/scoring';
import type { Answers } from '../domain/types';

function answers(overrides: Partial<Answers> = {}): Answers {
  return {
    sleep: { hours: 8 },
    exercise: { days: 4 },
    diet_protein: { bucket: 'most' },
    diet_produce: { bucket: 'three_plus' },
    diet_upf: { bucket: 'mostly_whole' },
    energy_balance: { bucket: 'right_way' },
    ...overrides,
  };
}

describe('scoreSignals — sleep boundaries (§2: <6 unmet · 6–7 borderline · 7+ met)', () => {
  it.each([
    [5, 'unmet'],
    [5.9, 'unmet'],
    [6, 'borderline'],
    [6.9, 'borderline'],
    [7, 'met'],
    [8.5, 'met'],
  ])('sleep %d hours → %s', (hours, expected) => {
    expect(scoreSignals(answers({ sleep: { hours } })).sleep).toBe(expected);
  });
});

describe('scoreSignals — exercise boundaries (§2: 0–1 unmet · 2 borderline · 3+ met)', () => {
  it.each([
    [0, 'unmet'],
    [1, 'unmet'],
    [2, 'borderline'],
    [3, 'met'],
    [6, 'met'],
  ])('exercise %d days → %s', (days, expected) => {
    expect(scoreSignals(answers({ exercise: { days } })).exercise).toBe(expected);
  });
});

describe('scoreSignals — categorical buckets map directly (§2)', () => {
  it('protein buckets', () => {
    expect(scoreSignals(answers({ diet_protein: { bucket: 'none_rare' } })).diet_protein).toBe('unmet');
    expect(scoreSignals(answers({ diet_protein: { bucket: 'about_one' } })).diet_protein).toBe('borderline');
    expect(scoreSignals(answers({ diet_protein: { bucket: 'most' } })).diet_protein).toBe('met');
  });

  it('produce buckets', () => {
    expect(scoreSignals(answers({ diet_produce: { bucket: 'zero' } })).diet_produce).toBe('unmet');
    expect(scoreSignals(answers({ diet_produce: { bucket: 'one_two' } })).diet_produce).toBe('borderline');
    expect(scoreSignals(answers({ diet_produce: { bucket: 'three_plus' } })).diet_produce).toBe('met');
  });

  it('upf buckets', () => {
    expect(scoreSignals(answers({ diet_upf: { bucket: 'mostly_processed' } })).diet_upf).toBe('unmet');
    expect(scoreSignals(answers({ diet_upf: { bucket: 'mixed' } })).diet_upf).toBe('borderline');
    expect(scoreSignals(answers({ diet_upf: { bucket: 'mostly_whole' } })).diet_upf).toBe('met');
  });

  it('energy_balance buckets', () => {
    expect(scoreSignals(answers({ energy_balance: { bucket: 'wrong_way' } })).energy_balance).toBe('unmet');
    expect(scoreSignals(answers({ energy_balance: { bucket: 'stable' } })).energy_balance).toBe('borderline');
    expect(scoreSignals(answers({ energy_balance: { bucket: 'right_way' } })).energy_balance).toBe('met');
  });
});
