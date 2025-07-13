# Dockerfile

# 1. Install dependencies
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Use package-lock.json if it exists
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# 2. Build the app
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# The Genkit CLI needs to be available to build
RUN npm install -g genkit-cli

# Install project dependencies
RUN npm run build

# 3. Run the app
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts

USER node

EXPOSE 3000

ENV PORT 3000

CMD ["npm", "start"]
