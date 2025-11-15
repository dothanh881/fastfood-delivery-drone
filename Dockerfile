# Top-level Dockerfile to build and run the backend (so hosting platforms like Railway can detect and build the Java app)
# It performs a multi-stage build: compile with Maven using the files under ./backend, then produce a lightweight runtime image.

# ---- Build stage ----
FROM maven:3.9.6-eclipse-temurin-17 AS builder
WORKDIR /app/backend

# Copy only POM first to leverage layer caching for dependency download
COPY backend/pom.xml ./pom.xml

# Pre-download dependencies
RUN mvn -f pom.xml -B -DskipTests dependency:go-offline --no-transfer-progress

# Copy the rest of the backend code and build
COPY backend/ ./
RUN mvn -f pom.xml -B -DskipTests package --no-transfer-progress

# ---- Runtime stage: slim JRE image ----
FROM eclipse-temurin:17-jre
WORKDIR /app

# Copy built jar from builder stage
COPY --from=builder /app/backend/target/*.jar /app/app.jar

# Copy entrypoint script
COPY backend/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENV PORT=8080

EXPOSE 8080

# Use entrypoint script to unset Railway's JAVA_TOOL_OPTIONS
ENTRYPOINT ["/app/entrypoint.sh"]
