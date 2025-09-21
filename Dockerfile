# Stage 1: Build the Angular application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the Angular app for production
RUN npm run build -- --configuration=production

# Debug: List the contents of dist folder
RUN ls -la /app/dist && ls -la /app/dist/verona-ng || ls -la /app/dist/

# Stage 2: Serve the application with nginx
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy the built Angular app from the builder stage
# For Angular 17+ with SSR, use /browser subfolder
# For Angular 16 and below, remove /browser
COPY --from=builder /app/dist/verona-ng/browser /usr/share/nginx/html

# If the above doesn't work, try one of these:
# COPY --from=builder /app/dist/verona-ng /usr/share/nginx/html
# COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]