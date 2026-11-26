# One image that serves the API and the built React app.

# 1) Build the client
FROM node:20-alpine AS client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# 2) Server with production dependencies + the built client
FROM node:20-alpine
WORKDIR /app/server
ENV NODE_ENV=production
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=client /app/client/dist /app/client/dist
ENV SERVE_CLIENT=true \
    PORT=4000
EXPOSE 4000
# Apply the schema, optionally (re)seed the demo user, then start.
CMD ["sh", "-c", "node src/migrate.js && if [ \"$SEED_DEMO\" = \"true\" ]; then node src/seed.js; fi && exec node src/index.js"]
