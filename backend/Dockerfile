# Maven 빌드 스테이지
FROM maven:3.8-openjdk-17-slim AS build
WORKDIR /app

# 홈서버 환경을 위한 네트워크 설정 (더 강화된 설정)
ENV MAVEN_OPTS="-Dmaven.repo.local=/root/.m2/repository -Dhttp.maxConnections=5 -Dhttp.socketTimeout=120000 -Dhttp.connectionTimeout=120000 -Djava.net.useSystemProxies=true"

# 네트워크 테스트 및 패키지 설치
RUN apt-get update && apt-get install -y curl dnsutils iputils-ping && \
    echo "=== Network Test ===" && \
    curl -I --connect-timeout 30 --max-time 60 https://repo.maven.apache.org/maven2/ || echo "Maven repo check failed"

# Maven 설정 파일 생성 (미러 서버 추가)
RUN mkdir -p /root/.m2 && \
    echo '<?xml version="1.0" encoding="UTF-8"?>' > /root/.m2/settings.xml && \
    echo '<settings>' >> /root/.m2/settings.xml && \
    echo '  <mirrors>' >> /root/.m2/settings.xml && \
    echo '    <mirror>' >> /root/.m2/settings.xml && \
    echo '      <id>central-mirror</id>' >> /root/.m2/settings.xml && \
    echo '      <mirrorOf>central</mirrorOf>' >> /root/.m2/settings.xml && \
    echo '      <url>https://repo.maven.apache.org/maven2</url>' >> /root/.m2/settings.xml && \
    echo '    </mirror>' >> /root/.m2/settings.xml && \
    echo '  </mirrors>' >> /root/.m2/settings.xml && \
    echo '</settings>' >> /root/.m2/settings.xml

# pom.xml과 소스 복사
COPY pom.xml .
COPY src ./src

# Maven 빌드 실행 (더 강화된 재시도 옵션)
RUN mvn clean package -DskipTests --batch-mode --fail-at-end --show-version \
    -Dmaven.wagon.http.retryhandler.count=5 \
    -Dmaven.wagon.httpconnectionManager.ttlSeconds=300 \
    -Dmaven.wagon.http.connectionTimeout=120000 \
    -Dmaven.wagon.http.readTimeout=120000 \
    -Dmaven.resolver.transport=wagon

# 실행 스테이지
FROM openjdk:17-jdk-slim
WORKDIR /app

# 빌드된 JAR 파일 복사
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
