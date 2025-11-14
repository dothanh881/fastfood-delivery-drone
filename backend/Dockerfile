
# ---- Build stage: compile Spring Boot app ----
FROM maven:3.9.6-eclipse-temurin-17 AS builder
WORKDIR /app

# Copy pom and resolve dependencies first (better layer caching)
COPY pom.xml ./
RUN mvn -q -e -DskipTests dependency:go-offline

# Copy sources and build
COPY src ./src
RUN mvn -q -DskipTests package

# ---- Runtime stage: slim JRE image ----
FROM eclipse-temurin:17-jre
WORKDIR /app

# Copy built jar from builder stage
COPY --from=builder /app/target/*.jar /app/app.jar

# Default envs (can be overridden by docker-compose)
ENV PORT=8080 \
    SPRING_PROFILES_ACTIVE="" \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75.0 -XX:InitialRAMPercentage=20.0"

EXPOSE 8080

# Use sh -c so env variables expand in the command
CMD ["sh", "-c", "java -Dserver.port=${PORT} -Dspring.profiles.active=${SPRING_PROFILES_ACTIVE} -jar /app/app.jar"]
