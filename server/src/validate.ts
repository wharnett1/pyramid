// Validation for POST /api/assessments bodies. Returns clear, collected errors
// rather than throwing on the first problem.

import type { Answers } from './domain/types';

const PROTEIN = ['none_rare', 'about_one', 'most'];
const PRODUCE = ['zero', 'one_two', 'three_plus'];
const UPF = ['mostly_processed', 'mixed', 'mostly_whole'];
const ENERGY = ['wrong_way', 'stable', 'right_way'];

export type ValidateResult = { ok: true; answers: Answers } | { ok: false; errors: string[] };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function validateAnswers(body: unknown): ValidateResult {
  const errors: string[] = [];
  if (!isObject(body) || !isObject(body.answers)) {
    return { ok: false, errors: ['Request body must be an object with an `answers` object.'] };
  }
  const a = body.answers;

  // --- sleep ---
  const sleep = isObject(a.sleep) ? a.sleep : undefined;
  if (!sleep || typeof sleep.hours !== 'number' || Number.isNaN(sleep.hours)) {
    errors.push('answers.sleep.hours is required and must be a number (hours per night).');
  } else if (sleep.hours < 0 || sleep.hours > 24) {
    errors.push('answers.sleep.hours must be between 0 and 24.');
  }
  if (sleep && sleep.rested !== undefined) {
    if (typeof sleep.rested !== 'number' || sleep.rested < 1 || sleep.rested > 3) {
      errors.push('answers.sleep.rested, if provided, must be a number 1–3.');
    }
  }

  // --- exercise ---
  const exercise = isObject(a.exercise) ? a.exercise : undefined;
  if (!exercise || typeof exercise.days !== 'number' || Number.isNaN(exercise.days)) {
    errors.push('answers.exercise.days is required and must be a number (0–7).');
  } else if (exercise.days < 0 || exercise.days > 7) {
    errors.push('answers.exercise.days must be between 0 and 7.');
  }
  if (exercise && exercise.resistance !== undefined && typeof exercise.resistance !== 'boolean') {
    errors.push('answers.exercise.resistance, if provided, must be a boolean.');
  }

  // --- categorical diet + energy signals ---
  const checkBucket = (signal: string, allowed: string[]) => {
    const node = isObject(a[signal]) ? (a[signal] as Record<string, unknown>) : undefined;
    if (!node || typeof node.bucket !== 'string' || !allowed.includes(node.bucket)) {
      errors.push(`answers.${signal}.bucket is required and must be one of: ${allowed.join(', ')}.`);
    }
  };
  checkBucket('diet_protein', PROTEIN);
  checkBucket('diet_produce', PRODUCE);
  checkBucket('diet_upf', UPF);
  checkBucket('energy_balance', ENERGY);

  if (errors.length > 0) return { ok: false, errors };

  // Safe to assert now: every field validated above.
  const answers: Answers = {
    sleep: {
      hours: (sleep as Record<string, unknown>).hours as number,
      ...(sleep!.rested !== undefined ? { rested: sleep!.rested as number } : {}),
    },
    exercise: {
      days: (exercise as Record<string, unknown>).days as number,
      ...(exercise!.resistance !== undefined ? { resistance: exercise!.resistance as boolean } : {}),
    },
    diet_protein: { bucket: (a.diet_protein as Record<string, unknown>).bucket as Answers['diet_protein']['bucket'] },
    diet_produce: { bucket: (a.diet_produce as Record<string, unknown>).bucket as Answers['diet_produce']['bucket'] },
    diet_upf: { bucket: (a.diet_upf as Record<string, unknown>).bucket as Answers['diet_upf']['bucket'] },
    energy_balance: {
      bucket: (a.energy_balance as Record<string, unknown>).bucket as Answers['energy_balance']['bucket'],
    },
  };
  return { ok: true, answers };
}
