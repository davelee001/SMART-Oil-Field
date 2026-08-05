FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY src/frontend/package.json src/frontend/package.json
RUN npm install
COPY apps/api apps/api
COPY packages packages
RUN npm run db:generate && npm run build --workspace=@smart-oil-field/shared && npm run build --workspace=@smart-oil-field/database && npm run build --workspace=@smart-oil-field/api

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages/database/dist ./packages/database/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/database/prisma ./packages/database/prisma
COPY --from=build /app/packages/database/package.json ./packages/database/package.json
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
CMD ["sh", "-c", "npx prisma migrate deploy --schema packages/database/prisma/schema.prisma && npx tsx packages/database/prisma/seed.ts && node apps/api/dist/server.js"]
