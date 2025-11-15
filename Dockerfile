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

ENV PORT=8080 \
    SPRING_PROFILES_ACTIVE="" \
    JAVA_TOOL_OPTIONS="-Xmx256m -Xms128m -XX:MaxMetaspaceSize=128m -XX:+UseSerialGC -Djava.security.egd=file:/dev/./urandom"

EXPOSE 8080

CMD ["sh", "-c", "java -Dserver.port=${PORT} -Dspring.profiles.active=${SPRING_PROFILES_ACTIVE} -jar /app/app.jar"]
