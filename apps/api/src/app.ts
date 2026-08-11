import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { Prisma } from '@prisma/client';
import { prisma } from '@smart-oil-field/database';
import { ZodError } from 'zod';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import projectRoutes from './routes/projects';
import financeRoutes from './routes/finance';
import complianceRoutes from './routes/compliance';
import supplyChainRoutes from './routes/supplyChain';
import kpiRoutes from './routes/kpis';
import trainingRoutes from './routes/training';
import reportRoutes from './routes/reports';
import { createAuthenticationRateLimiter, requestContext } from './operations';

export const createApp = () => {
  const app = express();
  const origins = (process.env.FRONTEND_ORIGIN || 'http://localhost:3001').split(',').map((origin) => origin.trim());

  app.disable('x-powered-by');
  app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : 0);
  app.use(requestContext);
  app.use(helmet());
  app.use(compression());
  app.use(cors({ origin: origins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  if (process.env.NODE_ENV !== 'test') app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.get('/health/live', (_req, res) => res.json({ status: 'ok', service: 'smart-oil-field-api' }));
  const readiness = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return res.json({ status: 'ready', service: 'smart-oil-field-api', database: 'available' });
    } catch (error) {
      return next(error);
    }
  };
  app.get('/health', readiness);
  app.get('/health/ready', readiness);
  const authenticationRateLimiter = createAuthenticationRateLimiter();
  app.use('/api/auth/login', authenticationRateLimiter);
  app.use('/api/auth/register', authenticationRateLimiter);
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/finance', financeRoutes);
  app.use('/api/compliance', complianceRoutes);
  app.use('/api/supply-chain', supplyChainRoutes);
  app.use('/api/kpis', kpiRoutes);
  app.use('/api/training', trainingRoutes);
  app.use('/api/reports', reportRoutes);

  app.use((req, res) => res.status(404).json({ message: 'Route not found', requestId: res.locals.requestId }));

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ZodError) return res.status(400).json({ message: 'Validation failed', issues: error.issues });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ message: 'A record with that value already exists' });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ message: 'Record not found' });
    }
    console.error(error);
    return res.status(500).json({ message: 'Unexpected server error' });
  });

  return app;
};
