import { Router } from 'express';
import { computeResult, defaultInputSource } from '../service';
import { ensureUserId, getAssessment, insertAssessment } from '../repository';
import { validateAnswers } from '../validate';

const router = Router();

// POST /api/assessments — score + prioritize a fresh submission, persist it.
router.post('/', async (req, res, next) => {
  try {
    const v = validateAnswers(req.body);
    if (!v.ok) {
      res.status(400).json({ error: 'invalid_answers', details: v.errors });
      return;
    }
    const answers = v.answers;
    const result = await computeResult(answers);
    const requestedUserId = typeof req.body?.user_id === 'number' ? req.body.user_id : undefined;
    const userId = await ensureUserId(requestedUserId);
    const id = await insertAssessment({
      userId,
      answers,
      signalScores: result.signal_scores,
      inputSource: defaultInputSource(),
    });
    res.status(201).json({ assessment_id: id, user_id: userId, ...result });
  } catch (err) {
    next(err);
  }
});

// GET /api/assessments/:id — re-run the logic from stored answers (spec: re-run
// without re-asking). Returns the same shape as POST.
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'invalid_id' });
      return;
    }
    const stored = await getAssessment(id);
    if (!stored) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const result = await computeResult(stored.answers);
    res.json({
      assessment_id: stored.id,
      user_id: stored.user_id,
      created_at: stored.created_at,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
