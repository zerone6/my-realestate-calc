# React 빌드 단계
FROM node:20-alpine as build

# 작업 디렉토리 설정
WORKDIR /workspace

# shared 모듈 복사 및 설치
COPY shared ./shared
WORKDIR /workspace/shared
RUN npm install && npm run build

# pcweb 소스 복사 및 빌드
WORKDIR /workspace/pcweb
COPY pcweb/package*.json ./
RUN npm install
COPY pcweb .
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
