import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { tebexRouter } from './routes/tebex.js';
import { discordRouter } from './routes/discord.js';

dotenv.config();

const app = express();
const port = Number.parseInt(process.env.PORT || '8787', 10);

function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

function buildAllowedOrigins() {
  const envOrigins = String(process.env.ALLOWED_ORIGIN || '')
    .split(',')
    .map((entry) => normalizeOrigin(entry))
    .filter(Boolean);

  const defaults = [
    'https://hammermodding.pages.dev',
    'https://hammer-modding.de',
    'https://www.hammer-modding.de',
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    'http://127.0.0.1:3000',
    'http://localhost:3000',
  ];

  return [...new Set([...envOrigins, ...defaults].map((entry) => normalizeOrigin(entry)).filter(Boolean))];
}

const allowAllOrigins = normalizeOrigin(process.env.ALLOWED_ORIGIN) === '*';
const allowedOrigins = buildAllowedOrigins();

app.set('trust proxy', true);
app.use(cors({
  origin(origin, callback) {
    if (allowAllOrigins || !origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = normalizeOrigin(origin);
    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'hammer-modding-tebex-backend', allowedOrigins });
});

app.use('/api/tebex', tebexRouter);
app.use('/api/discord', discordRouter);

app.use((err, _req, res, _next) => {
  console.error('[backend-error]', err);
  res.status(err.statusCode || 500).json({
    ok: false,
    error: err.publicMessage || 'Interner Serverfehler.'
  });
});

app.listen(port, () => {
  console.log(`[hammer-modding-backend] läuft auf http://127.0.0.1:${port}`);
  console.log('[hammer-modding-backend] erlaubte Origins:', allowAllOrigins ? '*' : allowedOrigins.join(', '));
});
