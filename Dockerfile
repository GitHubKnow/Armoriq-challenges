# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build the app
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Install python3, flask, and requests for the CTF challenges
RUN apk add --no-cache python3 py3-flask py3-requests

# Copy compiled assets and server code from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Copy flag.txt as it's required by the CTF challenge
COPY flag.txt ./flag.txt

# Copy Python challenges and startup script
COPY rogue_chatbot*.py ./
COPY start.sh ./

# Expose port (Render/Cloud Run will override this with PORT env var, but 3000 is default)
EXPOSE 3000

# Start everything via start.sh
CMD ["sh", "start.sh"]
