#!/bin/sh
# Entrypoint script to unset Railway's JAVA_TOOL_OPTIONS and use our own memory settings
unset JAVA_TOOL_OPTIONS
exec java -Xmx180m -Xms48m -XX:MaxMetaspaceSize=90m -XX:+UseSerialGC -XX:MaxDirectMemorySize=10m -Djava.security.egd=file:/dev/./urandom -jar /app/app.jar

