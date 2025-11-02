# ---------- Stage 1: Build Angular ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy lockfiles first for better caching
COPY package*.json ./
RUN npm ci

# Copy source and build for production
COPY . .
# If you use Angular SSR, this still builds the browser bundle under /browser
RUN npm run build -- --configuration=production

# Optional debug listings (safe on Alpine)
RUN ls -la /app/dist || true
RUN ls -la /app/dist/verona-ng || true
RUN ls -la /app/dist/verona-ng/browser || true


# ---------- Stage 2: Nginx static host ----------
FROM nginx:alpine

# Labels (optional)
LABEL org.opencontainers.image.title="verona-ng" \
    org.opencontainers.image.description="Angular + Nginx with API base injection" \
    org.opencontainers.image.vendor="you"

# Copy custom nginx config (must include SPA fallback to index.html)
# If you don't have one, keep your existing nginx.conf that you already mentioned.
COPY nginx.conf /etc/nginx/nginx.conf

# Copy the built Angular app
# For Angular 17+ default builder with SSR layout: /browser
# If you are CSR-only, switch to the commented copy lines below.
COPY --from=builder /app/dist/verona-ng/browser /usr/share/nginx/html
# COPY --from=builder /app/dist/verona-ng /usr/share/nginx/html
# COPY --from=builder /app/dist /usr/share/nginx/html

# Create a default api-base.txt placeholder so the app can start
# This file can be overwritten at runtime via env var API_BASE
RUN printf "http://localhost:4566/restapis/REPLACE/dev/_user_request_\n" > /usr/share/nginx/html/api-base.txt

# Lightweight entrypoint to inject API base at container start on Windows
# Usage (Compose or docker run):
#   -e API_BASE=http://localhost:4566/restapis/xxxx/dev/_user_request_
ENV API_BASE=""
RUN printf '#!/bin/sh\n' \
    'set -e\n' \
    'if [ -n "$API_BASE" ]; then echo "$API_BASE" > /usr/share/nginx/html/api-base.txt; fi\n' \
    'exec nginx -g "daemon off;"\n' \
    > /docker-entrypoint.sh \
    && chmod +x /docker-entrypoint.sh

EXPOSE 80
CMD ["/docker-entrypoint.sh"]
