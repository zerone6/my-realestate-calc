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

# Install pcweb dependencies (npm install since no package-lock.json)
RUN npm install

# Copy pcweb source code
COPY pcweb/ ./

# Build the application
RUN npm run build

# Production stage - lightweight nginx for static files only
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/pcweb/dist /usr/share/nginx/html

# Simple nginx config for static files only (no proxying)
RUN echo 'server {' > /etc/nginx/conf.d/default.conf && \
    echo '    listen 80;' >> /etc/nginx/conf.d/default.conf && \
    echo '    server_name localhost;' >> /etc/nginx/conf.d/default.conf && \
    echo '' >> /etc/nginx/conf.d/default.conf && \
    echo '    location / {' >> /etc/nginx/conf.d/default.conf && \
    echo '        root /usr/share/nginx/html;' >> /etc/nginx/conf.d/default.conf && \
    echo '        index index.html;' >> /etc/nginx/conf.d/default.conf && \
    echo '        try_files $uri $uri/ /index.html;' >> /etc/nginx/conf.d/default.conf && \
    echo '    }' >> /etc/nginx/conf.d/default.conf && \
    echo '' >> /etc/nginx/conf.d/default.conf && \
    echo '    # Cache static assets' >> /etc/nginx/conf.d/default.conf && \
    echo '    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {' >> /etc/nginx/conf.d/default.conf && \
    echo '        expires 1y;' >> /etc/nginx/conf.d/default.conf && \
    echo '        add_header Cache-Control "public, immutable";' >> /etc/nginx/conf.d/default.conf && \
    echo '    }' >> /etc/nginx/conf.d/default.conf && \
    echo '}' >> /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
