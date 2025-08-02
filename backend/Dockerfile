# Maven 빌드 스테이지
FROM maven:3.8-openjdk-17-slim AS build
WORKDIR /app

# DNS 설정 추가
RUN echo "nameserver 8.8.8.8" > /etc/resolv.conf
RUN echo "nameserver 8.8.4.4" >> /etc/resolv.conf

# pom.xml과 소스 복사
COPY pom.xml .
COPY src ./src

# Maven 빌드 실행 (재시도 옵션 추가)
RUN mvn clean package -DskipTests --batch-mode --fail-at-end --show-version

# 실행 스테이지
FROM openjdk:17-jdk-slim
WORKDIR /app

# 빌드된 JAR 파일 복사
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
