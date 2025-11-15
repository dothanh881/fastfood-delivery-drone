#!/bin/sh
# Override Railway's JAVA_TOOL_OPTIONS by explicitly setting all JVM flags
# Note: Explicit flags take precedence over JAVA_TOOL_OPTIONS

# Use PORT from environment (Render/Railway) or default to 8080
PORT=${PORT:-8080}

exec java \
  -Dserver.port=$PORT \
  -Xmx180m \
  -Xms48m \
  -XX:MaxMetaspaceSize=90m \
  -XX:+UseSerialGC \
  -XX:MaxDirectMemorySize=10m \
  -XX:ReservedCodeCacheSize=32m \
  -XX:+TieredCompilation \
  -XX:TieredStopAtLevel=1 \
  -Djava.security.egd=file:/dev/./urandom \
  -Dspring.jmx.enabled=false \
  -Dspring.main.lazy-initialization=false \
  -jar /app/app.jar
