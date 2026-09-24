import { Router } from 'express';
import { loadInterventions } from '../repository';

const router = Router();

// GET /api/interventions — the full evidence database, for inspection and for
// the frontend to render claims/citations/grades.
router.get('/', async (_req, res, next) => {
  try {
    res.json({ interventions: await loadInterventions() });
  } catch (err) {
    next(err);
  }
});

export default router;
