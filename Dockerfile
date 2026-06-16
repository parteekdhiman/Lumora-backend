# Build Stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Install all dependencies including dev dependencies for testing
RUN npm install
COPY . .
# Run tests
RUN npm run test

# Production Stage
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
# Install only production dependencies
RUN npm install --omit=dev
# Copy source from builder
COPY --from=builder /app/src ./src

# Explicitly copy node_modules from builder? No, we installed prod only above.
EXPOSE 5000
CMD ["npm", "start"]
