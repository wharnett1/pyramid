import { useState } from 'react';
import {
  submitAssessment,
  type Answers,
  type AssessmentResponse,
  type Citation,
  type Note,
  type Recommendation,
  type Status,
} from './api';

// ---------------------------------------------------------------------------
// Survey definition
// ---------------------------------------------------------------------------
const STEPS = ['sleep', 'exercise', 'diet_protein', 'diet_produce', 'diet_upf', 'energy_balance'] as const;
type StepKey = (typeof STEPS)[number];

const CHOICE_OPTS: Record<string, [string, string][]> = {
  diet_protein: [
    ['none_rare', 'None or rare'],
    ['about_one', 'About one meal a day'],
    ['most', 'Most meals'],
  ],
  diet_produce: [
    ['zero', 'None/Rarely'],
    ['one_two', '1–2 servings'],
    ['three_plus', '3 or more servings'],
  ],
  diet_upf: [
    ['mostly_processed', 'Mostly processed foods / takeout'],
    ['mixed', 'A mix'],
    ['mostly_whole', 'Mostly whole foods'],
  ],
  energy_balance: [
    ['wrong_way', 'Moving the wrong way for my goal'],
    ['stable', 'Roughly stable'],
    ['right_way', 'Moving the right way / at my goal'],
  ],
};

const STEP_META: Record<StepKey, { title: string; help?: string }> = {
  sleep: { title: 'On average, how many hours do you sleep per night?' },
  exercise: {
    title: 'How many days per week do you do intentional physical activity?',
    help: 'Anything counts — walking, sport, or the gym.',
  },
  diet_protein: {
    title: 'How many meals per day include a real protein source?',
    help: 'A palm-sized portion of meat, fish, eggs, dairy or Greek yogurt, tofu, or beans/lentils — roughly 20–30g of protein. A splash of milk or a few nuts doesn’t count on its own.',
  },
  diet_produce: {
    title: 'On a typical day, how many servings of vegetables + fruit?',
    help: 'One serving ≈ a cupped handful: a piece of fruit, a handful of berries, or a few spoonfuls of cooked vegetables (about 80g).',
  },
  diet_upf: {
    title: 'What makes up the base of your daily calories?',
    help: 'Whole foods are close to their natural form — veg, fruit, meat, eggs, grains, beans, plain dairy. Processed/takeout means packaged snacks, fast food, sugary drinks, and ready meals.',
  },
  energy_balance: {
    title: 'How is your weight trending vs. your goal?',
    help: 'This is a cross-check on the diet answers, not a food question.',
  },
};

const SIGNAL_LABELS: Record<string, string> = {
  sleep: 'Sleep',
  exercise: 'Exercise',
  diet_protein: 'Protein',
  diet_produce: 'Produce',
  diet_upf: 'Whole-food base',
  energy_balance: 'Energy balance',
  exercise_resistance: 'Resistance training',
};

interface SurveyState {
  hours?: number;
  rested?: number;
  days?: number;
  resistance: boolean;
  diet_protein?: string;
  diet_produce?: string;
  diet_upf?: string;
  energy_balance?: string;
}

const INITIAL: SurveyState = { resistance: false };

function isAnswered(key: StepKey, s: SurveyState): boolean {
  if (key === 'sleep') return typeof s.hours === 'number' && s.hours >= 0 && s.hours <= 24;
  if (key === 'exercise') return typeof s.days === 'number' && s.days >= 0 && s.days <= 7;
  return Boolean(s[key]);
}

function buildAnswers(s: SurveyState): Answers {
  return {
    sleep: { hours: s.hours as number, ...(typeof s.rested === 'number' ? { rested: s.rested } : {}) },
    exercise: { days: s.days as number, resistance: s.resistance },
    diet_protein: { bucket: s.diet_protein as string },
    diet_produce: { bucket: s.diet_produce as string },
    diet_upf: { bucket: s.diet_upf as string },
    energy_balance: { bucket: s.energy_balance as string },
  };
}

// ---------------------------------------------------------------------------
// Results components (unchanged behaviour; three transparency layers, §4)
// ---------------------------------------------------------------------------
function GradeBadge({ grade }: { grade: string }) {
  return <span className={`grade grade-${grade}`}>evidence: {grade.replace('_', ' ')}</span>;
}

function Citations({ items }: { items: Citation[] }) {
  return (
    <ul className="cites">
      {items.map((c, i) => (
        <li key={i}>
          <a href={c.url} target="_blank" rel="noreferrer">
            {c.title}
          </a>{' '}
          <span className={`chip ${c.verified ? 'chip-ok' : 'chip-warn'}`}>
            {c.verified ? 'verified' : 'unverified'}
          </span>
        </li>
      ))}
    </ul>
  );
}

function RecCard({ rec }: { rec: Recommendation }) {
  return (
    <div className={`card rec ${rec.primary ? 'primary' : ''}`}>
      <div className="rank">
        #{rec.rank} · {rec.headline}
      </div>
      <h3>{SIGNAL_LABELS[rec.signal_key] ?? rec.signal_key}</h3>
      <div className="layer">
        <span className="layer-label">Recommendation</span>
        <p>{rec.message}</p>
      </div>
      <div className="layer">
        <span className="layer-label">Evidence quality</span>
        <p>
          <GradeBadge grade={rec.evidence_grade} /> · effect: {rec.effect_size} · effort: {rec.effort_cost}
        </p>
      </div>
      <div className="layer">
        <span className="layer-label">Evidence</span>
        <p className="claim">{rec.claim}</p>
        <Citations items={rec.citations} />
      </div>
    </div>
  );
}

function NoteCard({ note }: { note: Note }) {
  const title =
    note.kind === 'resistance'
      ? 'Secondary note'
      : note.kind === 'borderline'
        ? 'Close — worth watching'
        : 'Optional — your call';
  return (
    <div className="card note">
      <div className="rank note-kind">{title}</div>
      <h4>{SIGNAL_LABELS[note.signal_key] ?? note.signal_key}</h4>
      <p>{note.message}</p>
      <p className="claim">{note.claim}</p>
      <GradeBadge grade={note.evidence_grade} />
      <Citations items={note.citations} />
    </div>
  );
}

function ScoreGrid({ scores }: { scores: Record<string, Status> }) {
  return (
    <div className="scores">
      {Object.entries(scores).map(([sig, status]) => (
        <div key={sig} className={`score score-${status}`}>
          <div className="score-sig">{SIGNAL_LABELS[sig] ?? sig}</div>
          <div className="score-status">{status}</div>
        </div>
      ))}
    </div>
  );
}

function Results({ result, onRestart }: { result: AssessmentResponse; onRestart: () => void }) {
  return (
    <section className="results">
      <h2>{result.summary_state === 'basics_down' ? "You've got the basics down." : 'Start with this'}</h2>
      <ScoreGrid scores={result.signal_scores} />
      {result.summary_state === 'basics_down' && (
        <p className="basics">
          None of your basic needs are unmet. Keep doing what you're doing. More advanced interventions coming soon.
        </p>
      )}
      {result.recommendations.map((rec) => (
        <RecCard key={rec.signal_key} rec={rec} />
      ))}
      {result.notes.length > 0 && (
        <>
          <h3 className="notes-h">Secondary context</h3>
          {result.notes.map((n, i) => (
            <NoteCard key={`${n.kind}-${n.signal_key}-${i}`} note={n} />
          ))}
        </>
      )}
      <div className="nav">
        <button type="button" className="btn-secondary" onClick={onRestart}>
          Start over
        </button>
        <span className="aid">assessment #{result.assessment_id} · user #{result.user_id}</span>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// App: intro → one question per screen → results
// ---------------------------------------------------------------------------
type Phase = 'intro' | 'survey' | 'results';

export default function App() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [stepIndex, setStepIndex] = useState(0);
  const [s, setS] = useState<SurveyState>(INITIAL);
  const [result, setResult] = useState<AssessmentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepKey = STEPS[stepIndex]!;
  const meta = STEP_META[stepKey];
  const answered = isAnswered(stepKey, s);
  const isLast = stepIndex === STEPS.length - 1;

  function start() {
    setS(INITIAL);
    setStepIndex(0);
    setResult(null);
    setError(null);
    setPhase('survey');
  }

  function back() {
    setError(null);
    if (stepIndex === 0) setPhase('intro');
    else setStepIndex((i) => i - 1);
  }

  async function next() {
    if (!answered) return;
    setError(null);
    if (!isLast) {
      setStepIndex((i) => i + 1);
      return;
    }
    setLoading(true);
    try {
      const res = await submitAssessment(buildAnswers(s));
      setResult(res);
      setPhase('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function renderControl() {
    if (stepKey === 'sleep') {
      return (
        <div>
          <input
            className="num-big"
            type="number"
            min={0}
            max={24}
            step={0.5}
            autoFocus
            value={s.hours ?? ''}
            onChange={(e) =>
              setS((p) => ({ ...p, hours: e.target.value === '' ? undefined : Number(e.target.value) }))
            }
          />
          <span className="unit">hours</span>
          <label className="inline optional">
            How rested, on average, do you feel? (1–3, optional)
            <input
              type="number"
              min={1}
              max={3}
              value={s.rested ?? ''}
              onChange={(e) =>
                setS((p) => ({ ...p, rested: e.target.value === '' ? undefined : Number(e.target.value) }))
              }
              style={{ width: 56 }}
            />
          </label>
        </div>
      );
    }
    if (stepKey === 'exercise') {
      return (
        <div>
          <input
            className="num-big"
            type="number"
            min={0}
            max={7}
            step={1}
            autoFocus
            value={s.days ?? ''}
            onChange={(e) =>
              setS((p) => ({ ...p, days: e.target.value === '' ? undefined : Number(e.target.value) }))
            }
          />
          <span className="unit">days / week</span>
          <label className="inline optional">
            <input
              type="checkbox"
              checked={s.resistance}
              onChange={(e) => setS((p) => ({ ...p, resistance: e.target.checked }))}
            />
            I do some resistance / strength training
          </label>
        </div>
      );
    }
    const opts = CHOICE_OPTS[stepKey]!;
    const current = s[stepKey];
    return (
      <div className="choice-list">
        {opts.map(([val, text]) => (
          <label key={val} className={`choice ${current === val ? 'sel' : ''}`}>
            <input
              type="radio"
              name={stepKey}
              checked={current === val}
              onChange={() => setS((p) => ({ ...p, [stepKey]: val }))}
            />
            {text}
          </label>
        ))}
      </div>
    );
  }

  return (
    <div className="wrap">
      <header>
        <h1>Pyramid</h1>
        <p className="sub">Get the basics down first.</p>
      </header>

      {phase === 'intro' && (
        <section className="intro">
          <p>
            A quick six-question check-in on sleep, exercise, and diet. We score each one,
            then point you at the single highest-priority thing to fix — with the evidence
            shown, so you can judge it yourself.
          </p>
          <p>If your foundation is already solid, we'll say so instead of inventing advice.</p>
          <button type="button" className="start-btn" onClick={start}>
            Start
          </button>
        </section>
      )}

      {phase === 'survey' && (
        <section className="step">
          <div className="progress">
            <div className="progress-meta">
              Question {stepIndex + 1} of {STEPS.length}
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }} />
            </div>
          </div>

          <h2>{meta.title}</h2>
          {meta.help && <p className="help">{meta.help}</p>}

          {renderControl()}

          {error && <div className="error">Error: {error}</div>}

          <div className="nav">
            <button type="button" className="btn-secondary" onClick={back} disabled={loading}>
              Back
            </button>
            <button type="button" onClick={next} disabled={!answered || loading}>
              {loading ? 'Scoring…' : isLast ? 'See my results' : 'Next'}
            </button>
          </div>
        </section>
      )}

      {phase === 'results' && result && <Results result={result} onRestart={() => setPhase('intro')} />}
    </div>
  );
}
