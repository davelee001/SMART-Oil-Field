FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY src/frontend/package.json src/frontend/package.json
RUN npm ci
COPY src/frontend/public src/frontend/public
COPY src/frontend/src src/frontend/src
COPY src/frontend/webpack.config.js src/frontend/webpack.config.js
COPY src/frontend/tsconfig.json src/frontend/tsconfig.json
RUN npm run build --workspace=smart-oil-field-dashboard

FROM nginx:1.27-alpine
COPY src/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/src/frontend/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
