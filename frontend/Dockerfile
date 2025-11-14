# Frontend Dockerfile: build React app and serve with nginx
FROM node:18-alpine AS build
WORKDIR /app

# Build-time environment for React app
ARG REACT_APP_API_BASE_URL=/api
ARG REACT_APP_WS_URL=/ws
ENV REACT_APP_API_BASE_URL=${REACT_APP_API_BASE_URL}
ENV REACT_APP_WS_URL=${REACT_APP_WS_URL}

# Install dependencies
COPY package*.json ./
RUN npm install --silent

# Copy source and build
COPY . .
RUN npm run build

# Production image
FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html
# Custom nginx config to support SPA routing and proxy /api to backend
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["/bin/sh", "-c", "nginx -g 'daemon off;'"]
## Frontend Dockerfile (React build + Nginx) aligned with docker-compose


