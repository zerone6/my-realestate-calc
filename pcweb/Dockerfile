# React 빌드 단계
FROM node:20-alpine AS build

# 작업 디렉토리 설정
WORKDIR /workspace

# 홈서버 환경을 위한 npm 설정
ENV NPM_CONFIG_MAXSOCKETS=5
ENV NPM_CONFIG_TIMEOUT=300000

# DNS 설정 추가
RUN echo "nameserver 8.8.8.8" > /etc/resolv.conf
RUN echo "nameserver 8.8.4.4" >> /etc/resolv.conf

# 네트워크 테스트
RUN apk add --no-cache curl && \
    curl -I https://registry.npmjs.org/ || echo "NPM registry check failed"

# shared 모듈 복사 및 설치
COPY shared/package*.json ./shared/
COPY shared/ ./shared/
WORKDIR /workspace/shared
RUN npm ci --registry=https://registry.npmjs.org/ \
    --fetch-retries=5 \
    --fetch-retry-mintimeout=20000 \
    --fetch-retry-maxtimeout=120000 \
    --maxsockets=5 && \
    npm run build

# pcweb 소스 복사 및 빌드
WORKDIR /workspace/pcweb
COPY pcweb/package*.json ./
RUN npm ci --registry=https://registry.npmjs.org/ \
    --fetch-retries=5 \
    --fetch-retry-mintimeout=20000 \
    --fetch-retry-maxtimeout=120000 \
    --maxsockets=5
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
