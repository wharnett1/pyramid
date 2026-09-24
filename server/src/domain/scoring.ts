// Step 1 of the loop (spec §3): score every signal → met / borderline / unmet.

import { CATEGORICAL_MAPS, NUMERIC_THRESHOLDS, type NumericThreshold } from '../config/thresholds';
import type { Answers, SignalScores, Status } from './types';

export function scoreNumeric(value: number, t: NumericThreshold): Status {
  if (value < t.unmetBelow) return 'unmet';
  if (value < t.borderlineBelow) return 'borderline';
  return 'met';
}

/** Score all six signals from the raw bucketed answers. Pure function. */
export function scoreSignals(answers: Answers): SignalScores {
  return {
    sleep: scoreNumeric(answers.sleep.hours, NUMERIC_THRESHOLDS.sleep),
    exercise: scoreNumeric(answers.exercise.days, NUMERIC_THRESHOLDS.exercise),
    diet_protein: CATEGORICAL_MAPS.diet_protein[answers.diet_protein.bucket],
    diet_produce: CATEGORICAL_MAPS.diet_produce[answers.diet_produce.bucket],
    diet_upf: CATEGORICAL_MAPS.diet_upf[answers.diet_upf.bucket],
    energy_balance: CATEGORICAL_MAPS.energy_balance[answers.energy_balance.bucket],
  };
}
