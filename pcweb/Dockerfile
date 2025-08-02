# React 빌드 단계
FROM node:20-alpine AS build

# 작업 디렉토리 설정
WORKDIR /workspace

# DNS 해결을 위한 강력한 설정
RUN echo 'nameserver 8.8.8.8' > /etc/resolv.conf && \
    echo 'nameserver 1.1.1.1' >> /etc/resolv.conf && \
    echo 'nameserver 208.67.222.222' >> /etc/resolv.conf

# 홈서버 환경을 위한 npm 설정 (더 관대한 설정)
ENV NPM_CONFIG_MAXSOCKETS=2
ENV NPM_CONFIG_TIMEOUT=900000
ENV NPM_CONFIG_REGISTRY=https://registry.npmjs.org/
ENV NPM_CONFIG_FETCH_RETRIES=15
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=60000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=900000
ENV NPM_CONFIG_CACHE_MAX=0
ENV NPM_CONFIG_PREFER_OFFLINE=false
ENV NPM_CONFIG_AUDIT=false
ENV NPM_CONFIG_FUND=false

# 네트워크 테스트 및 패키지 설치
RUN apk add --no-cache bind-tools curl iputils && \
    echo "=== DNS Test ===" && \
    nslookup registry.npmjs.org || echo "DNS lookup failed" && \
    ping -c 3 8.8.8.8 || echo "Ping failed" && \
    curl -I --connect-timeout 30 --max-time 60 https://registry.npmjs.org/ || echo "NPM registry check failed"

# shared 모듈 복사 및 설치
COPY shared/package*.json ./shared/
COPY shared/ ./shared/
WORKDIR /workspace/shared
RUN npm ci && npm run build

# pcweb 소스 복사 및 빌드
WORKDIR /workspace/pcweb
COPY pcweb/package*.json ./
RUN npm ci
COPY pcweb/ ./
RUN npm run build

# Nginx 단계
FROM nginx:1.25-alpine
# 빌드 결과물을 nginx 루트에 복사
COPY --from=build /workspace/pcweb/dist /usr/share/nginx/html

# React Router를 위한 nginx 설정
RUN echo 'server {' > /etc/nginx/conf.d/default.conf && \
    echo '    listen 80;' >> /etc/nginx/conf.d/default.conf && \
    echo '    server_name localhost;' >> /etc/nginx/conf.d/default.conf && \
    echo '    location / {' >> /etc/nginx/conf.d/default.conf && \
    echo '        root /usr/share/nginx/html;' >> /etc/nginx/conf.d/default.conf && \
    echo '        index index.html index.htm;' >> /etc/nginx/conf.d/default.conf && \
    echo '        try_files $uri $uri/ /index.html;' >> /etc/nginx/conf.d/default.conf && \
    echo '    }' >> /etc/nginx/conf.d/default.conf && \
    echo '}' >> /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
