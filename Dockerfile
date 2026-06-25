# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build the app
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled assets and server code from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Copy flag.txt as it's required by the CTF challenge
COPY flag.txt ./flag.txt

# Expose port (Render/Cloud Run will override this with PORT env var, but 3000 is default)
EXPOSE 3000

# Start the full-stack server
CMD ["npm", "start"]
