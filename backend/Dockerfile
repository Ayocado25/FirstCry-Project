FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init

# Dependencies
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production

# Production image
FROM base AS production
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p logs
EXPOSE 5000
USER node
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
