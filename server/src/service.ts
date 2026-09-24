// Orchestration: raw answers → scored + prioritized result. Shared by the POST
// (fresh) and GET/:id (re-run from stored answers) routes.

import { prioritize } from './domain/prioritize';
import { scoreSignals } from './domain/scoring';
import { SCORED_SIGNALS, type Answers, type AssessmentResult, type InputSource } from './domain/types';
import { buildInterventionMaps, loadInterventions } from './repository';

export async function computeResult(answers: Answers): Promise<AssessmentResult> {
  const interventions = await loadInterventions();
  const { bySignal, resistance } = buildInterventionMaps(interventions);
  const scores = scoreSignals(answers);
  return prioritize({
    scores,
    interventionsBySignal: bySignal,
    resistanceIntervention: resistance,
    resistancePresent: answers.exercise.resistance,
  });
}

/** v1 default: everything self-reported. The `wearable` option is a v2 hook. */
export function defaultInputSource(): InputSource {
  const src = {} as InputSource;
  for (const s of SCORED_SIGNALS) src[s] = 'self_report';
  return src;
}
