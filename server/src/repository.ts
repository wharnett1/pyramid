// Thin data-access layer over the `pyramid` database.

import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from './db';
import {
  isScoredSignal,
  type Answers,
  type InputSource,
  type Intervention,
  type ScoredSignal,
  type SignalScores,
} from './domain/types';

/** Load every intervention row (JSON columns already parsed by mysql2). */
export async function loadInterventions(): Promise<Intervention[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, signal_key, tier, claim, effect_size, evidence_grade, effort_cost,
            prereq_of, citations, msg_unmet, msg_borderline, msg_met
       FROM interventions`
  );
  return rows as unknown as Intervention[];
}

export interface InterventionMaps {
  bySignal: Record<ScoredSignal, Intervention>;
  resistance?: Intervention;
}

/** Group interventions into one primary row per scored signal, plus the
 *  standalone `exercise_resistance` row. Throws if a scored signal is missing. */
export function buildInterventionMaps(interventions: Intervention[]): InterventionMaps {
  const bySignal = {} as Record<ScoredSignal, Intervention>;
  let resistance: Intervention | undefined;

  for (const iv of interventions) {
    if (iv.signal_key === 'exercise_resistance') {
      resistance = iv;
    } else if (isScoredSignal(iv.signal_key)) {
      bySignal[iv.signal_key] = iv;
    }
  }

  const missing = (['sleep', 'exercise', 'diet_protein', 'diet_produce', 'diet_upf', 'energy_balance'] as ScoredSignal[]).filter(
    (s) => !bySignal[s]
  );
  if (missing.length > 0) {
    throw new Error(`interventions table is missing rows for: ${missing.join(', ')}. Did you run db/seed.sql?`);
  }

  return { bySignal, resistance };
}

/** Return the demo user's id, creating one if the table is empty (no auth in v1). */
export async function ensureUserId(requested?: number): Promise<number> {
  if (typeof requested === 'number' && Number.isInteger(requested)) {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE id = ?', [requested]);
    if (rows.length > 0) return requested;
  }
  const [rows] = await pool.query<RowDataPacket[]>('SELECT id FROM users ORDER BY id LIMIT 1');
  if (rows.length > 0) return rows[0]!.id as number;

  const [res] = await pool.query<ResultSetHeader>('INSERT INTO users (label) VALUES (?)', ['demo user']);
  return res.insertId;
}

export async function insertAssessment(params: {
  userId: number;
  answers: Answers;
  signalScores: SignalScores;
  inputSource: InputSource;
}): Promise<number> {
  const [res] = await pool.query<ResultSetHeader>(
    `INSERT INTO user_assessments (user_id, answers, signal_scores, input_source)
     VALUES (?, ?, ?, ?)`,
    [
      params.userId,
      JSON.stringify(params.answers),
      JSON.stringify(params.signalScores),
      JSON.stringify(params.inputSource),
    ]
  );
  return res.insertId;
}

export interface StoredAssessment {
  id: number;
  user_id: number;
  created_at: string;
  answers: Answers;
  signal_scores: SignalScores;
  input_source: InputSource;
}

export async function getAssessment(id: number): Promise<StoredAssessment | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, user_id, created_at, answers, signal_scores, input_source
       FROM user_assessments WHERE id = ?`,
    [id]
  );
  if (rows.length === 0) return null;
  return rows[0] as unknown as StoredAssessment;
}
