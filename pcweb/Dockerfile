# Multi-stage build for React application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for shared module
COPY shared/package*.json ./shared/

# Install shared dependencies
WORKDIR /app/shared
RUN npm ci

# Copy shared source and build
COPY shared/ ./
RUN npm run build

# Copy package files for pcweb
WORKDIR /app/pcweb
COPY pcweb/package*.json ./

# Install pcweb dependencies
RUN npm ci

# Copy pcweb source code
COPY pcweb/ ./

# Build the application
RUN npm run build

# Production stage - use Nginx to serve static files
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/pcweb/dist /usr/share/nginx/html/realestate

# Copy custom nginx config
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
