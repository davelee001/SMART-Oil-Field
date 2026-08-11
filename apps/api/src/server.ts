import 'dotenv/config';
import { prisma } from '@smart-oil-field/database';
import { createApp } from './app';
import { jwtConfiguration } from './jwt';
import { runtimeConfiguration, validateProductionConfiguration } from './operations';

jwtConfiguration();
validateProductionConfiguration();
const { port, shutdownTimeoutMs } = runtimeConfiguration();

const server = createApp().listen(port, () => {
  console.log(`SMART Oil Field API listening on http://localhost:${port}`);
});

let shuttingDown = false;
const shutdown = (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}; draining HTTP connections`);
  const forcedExit = setTimeout(() => {
    console.error('Graceful shutdown timed out');
    process.exit(1);
  }, shutdownTimeoutMs);
  forcedExit.unref();
  server.close(async (error) => {
    try {
      await prisma.$disconnect();
    } finally {
      clearTimeout(forcedExit);
      process.exit(error ? 1 : 0);
    }
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception', error);
  shutdown('uncaughtException');
});
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection', error);
  shutdown('unhandledRejection');
});
