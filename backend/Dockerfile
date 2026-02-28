FROM eclipse-temurin:21-jdk AS builder
WORKDIR /app
COPY gradle/ gradle/
COPY gradlew .
COPY build.gradle settings.gradle gradle.properties ./
RUN chmod +x gradlew
# 의존성 캐싱
RUN ./gradlew dependencies --no-daemon || true
COPY src/ src/
RUN ./gradlew bootJar --no-daemon -x test

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
RUN mkdir -p /tmp/intellidocs/uploads
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]