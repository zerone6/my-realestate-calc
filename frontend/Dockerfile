# React 빌드 단계
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Nginx 단계
FROM nginx:latest
# 빌드 결과물을 /calc 하위에 복사
COPY --from=build /app/dist /usr/share/nginx/html/calc
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
