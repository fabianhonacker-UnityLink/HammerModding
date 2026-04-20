import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { tebexRouter } from './routes/tebex.js';

dotenv.config();

const app = express();
const port = Number.parseInt(process.env.PORT || '8787', 10);
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';

app.set('trust proxy', true);
app.use(cors({ origin: allowedOrigin === '*' ? true : allowedOrigin }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'hammer-modding-tebex-backend' });
});

app.use('/api/tebex', tebexRouter);

app.use((err, _req, res, _next) => {
  console.error('[backend-error]', err);
  res.status(err.statusCode || 500).json({
    ok: false,
    error: err.publicMessage || 'Interner Serverfehler.'
  });
});

app.listen(port, () => {
  console.log(`[hammer-modding-backend] läuft auf http://127.0.0.1:${port}`);
});
