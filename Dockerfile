# Stage 1: Build the Spring Boot application using Maven and Temurin JDK 17
FROM maven:3.9.6-eclipse-temurin-17 AS builder
WORKDIR /app

# Cache Maven dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B || true

# Copy source code and compile production JAR
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Ultra-lightweight JRE container for production runtime on Render
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Run as non-privileged spring user for security
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copy built executable JAR
COPY --from=builder /app/target/*.jar app.jar

# Dynamic PORT assigned by Render platform ($PORT)
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-Dserver.port=${PORT}", "-jar", "app.jar"]
