# React 빌드 단계
FROM node:20-alpine AS build

# 작업 디렉토리 설정
WORKDIR /workspace

# 홈서버 환경을 위한 npm 설정 (더 관대한 설정)
ENV NPM_CONFIG_MAXSOCKETS=3
ENV NPM_CONFIG_TIMEOUT=600000
ENV NPM_CONFIG_REGISTRY=https://registry.npmjs.org/
ENV NPM_CONFIG_FETCH_RETRIES=10
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=30000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=300000

# 네트워크 테스트 및 패키지 설치
RUN apk add --no-cache curl bind-tools && \
    curl -I https://registry.npmjs.org/ || echo "NPM registry check failed"

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
