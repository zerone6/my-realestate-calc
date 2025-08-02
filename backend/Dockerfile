# Maven 빌드 스테이지
FROM maven:3.8-openjdk-17-slim AS build
WORKDIR /app

# 홈서버 환경을 위한 네트워크 설정
ENV MAVEN_OPTS="-Dmaven.repo.local=/root/.m2/repository -Dhttp.maxConnections=10 -Dhttp.socketTimeout=60000 -Dhttp.connectionTimeout=60000"

# 네트워크 테스트 및 패키지 설치
RUN apt-get update && apt-get install -y curl dnsutils && \
    curl -I https://repo.maven.apache.org/maven2/ || echo "Maven repo check failed"

# pom.xml과 소스 복사
COPY pom.xml .
COPY src ./src

# Maven 빌드 실행 (재시도 옵션 및 미러 서버 추가)
RUN mvn clean package -DskipTests --batch-mode --fail-at-end --show-version \
    -Dmaven.wagon.http.retryhandler.count=3 \
    -Dmaven.wagon.httpconnectionManager.ttlSeconds=120

# 실행 스테이지
FROM openjdk:17-jdk-slim
WORKDIR /app

# 빌드된 JAR 파일 복사
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
