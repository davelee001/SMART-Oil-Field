import 'dotenv/config';
import { prisma } from '@smart-oil-field/database';
import { createApp } from './app';
import { jwtConfiguration } from './jwt';

const port = Number(process.env.API_PORT || 4000);
jwtConfiguration();

const server = createApp().listen(port, () => {
  console.log(`SMART Oil Field API listening on http://localhost:${port}`);
});

const shutdown = async () => {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
