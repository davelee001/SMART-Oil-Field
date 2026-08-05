import 'dotenv/config';
import compression from 'compression';
import connectPgSimple from 'connect-pg-simple';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import session from 'express-session';
import helmet from 'helmet';
import morgan from 'morgan';
import { Pool } from 'pg';
import { ZodError } from 'zod';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';

const app = express();
const port = Number(process.env.API_PORT || 4000);
const sessionDays = Number(process.env.SESSION_DAYS || 7);
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error('DATABASE_URL is required');
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must contain at least 32 characters');
}

const pool = new Pool({ connectionString: databaseUrl });
const PgStore = connectPgSimple(session);

app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : 0);
app.use(helmet());
app.use(compression());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(session({
  name: 'sof.sid',
  secret: process.env.SESSION_SECRET,
  store: new PgStore({ pool, tableName: 'user_sessions', createTableIfMissing: true }),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.SESSION_SECURE_COOKIES === 'true',
    maxAge: sessionDays * 24 * 60 * 60 * 1000,
  },
}));

app.get('/health', async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok', service: 'smart-oil-field-api' });
});
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ZodError) return res.status(400).json({ message: 'Validation failed', issues: error.issues });
  if ((error as { code?: string }).code === 'P2002') return res.status(409).json({ message: 'A record with that value already exists' });
  if ((error as { code?: string }).code === 'P2025') return res.status(404).json({ message: 'Record not found' });
  console.error(error);
  res.status(500).json({ message: 'Unexpected server error' });
});

app.listen(port, () => console.log(`SMART Oil Field API listening on http://localhost:${port}`));
