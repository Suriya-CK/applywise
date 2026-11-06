# ---- Stage 1: build TypeScript -> JavaScript ----
FROM node:22-alpine AS build
WORKDIR /app
# Copy package files first so Docker can cache "npm ci" when only code changes
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Stage 2: small production image ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# schema.sql is not TypeScript, so tsc doesn't copy it - copy it ourselves
COPY src/db/schema.sql ./dist/db/schema.sql
# Don't run as root inside the container (security best practice)
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:4000/health || exit 1
# Apply the schema, then start the API
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/index.js"]
