import 'dotenv/config';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import assessmentsRouter from './routes/assessments';
import interventionsRouter from './routes/interventions';

const app = express();
app.use(cors()); // permissive for local dev; the Vite frontend also proxies /api
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});
app.use('/api/assessments', assessmentsRouter);
app.use('/api/interventions', interventionsRouter);

// Central error handler.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // eslint-disable-next-line no-console
  console.error(err);
  const message = err instanceof Error ? err.message : String(err);
  res.status(500).json({ error: 'internal_error', message });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`pyramid-server listening on http://localhost:${port}`);
});
