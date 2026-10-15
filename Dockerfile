# Multi-stage Docker build for Spring Boot Backend in /backend
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Copy pom.xml and source code from backend directory
COPY backend/pom.xml .
COPY backend/src ./src

# Build JAR package (skipping tests for rapid container packaging)
RUN mvn clean package -DskipTests

# Lightweight JRE runtime container
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Copy compiled executable JAR from build stage
COPY --from=build /app/target/*.jar app.jar

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
