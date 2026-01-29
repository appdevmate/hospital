# Angular + Docker: Development and Production

## Files (place in project root)
```
your-app/
├─ src/
├─ angular.json
├─ package.json
├─ Dockerfile.dev
├─ docker-compose.dev.yml
├─ .dockerignore
├─ proxy.conf.json           (optional, only if you proxy APIs)
├─ Dockerfile                (production)
├─ nginx.conf                (production)
├─ docker-compose.yml        (optional, production)
├─ README.md                 (this file)
```

## .dockerignore
```
node_modules
dist
.git
.gitignore
.vscode
.idea
*.log
```

## Dockerfile.dev  (dev container with live reload)
```dockerfile
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 4200
CMD ["npm", "run", "start", "--", "--host=0.0.0.0", "--port=4200", "--poll=2000"]
```

## docker-compose.dev.yml  (dev service)
```yaml
services:
  angular:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: angular-dev
    command: npm run start -- --host=0.0.0.0 --port=4200 --poll=2000
    ports:
      - "4200:4200"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - CHOKIDAR_USEPOLLING=true
```

## proxy.conf.json (optional, proxy backend to host)
```json
{
  "/api": {
    "target": "http://host.docker.internal:8081",
    "secure": false,
    "changeOrigin": true
  }
}
```
If you use the proxy, set the start script in `package.json`:
```json
"start": "ng serve --proxy-config proxy.conf.json"
```

## Dockerfile (production, static build served by Nginx)
```dockerfile
# ---- build ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

# ---- run ----
FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/dist/*/browser /usr/share/nginx/html
EXPOSE 80
```

## nginx.conf (SPA routing + caching)
```nginx
user nginx;
worker_processes auto;

events { worker_connections 1024; }

http {
  include       /etc/nginx/mime.types;
  default_type  application/octet-stream;
  sendfile      on;
  tcp_nopush    on;
  tcp_nodelay   on;

  gzip on;
  gzip_types text/plain text/css application/javascript application/json application/xml image/svg+xml;
  gzip_min_length 1024;

  map $uri $asset_cache {
    default "public, max-age=0, must-revalidate";
    ~*^/assets/           "public, max-age=31536000, immutable";
    ~*^/.*\.[0-9a-f]{8}\." "public, max-age=31536000, immutable";
  }

  server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header Referrer-Policy no-referrer-when-downgrade always;
    add_header Cache-Control $asset_cache;

    location / {
      try_files $uri $uri/ /index.html;
    }

    client_max_body_size 10m;
  }
}
```

## docker-compose.yml (optional, production)
```yaml
services:
  web:
    build: .
    image: my-angular:prod
    ports:
      - "8080:80"
    restart: unless-stopped
```
---

# Commands

## Development (live reload)
**Start**
```powershell
docker compose -f docker-compose.dev.yml up --build
```
Open: `http://localhost:4200`

**Stop**
```powershell
docker compose -f docker-compose.dev.yml down
```

**Stop and remove volumes**
```powershell
docker compose -f docker-compose.dev.yml down -v
```

**Install a new package in container**
```powershell
docker compose -f docker-compose.dev.yml exec angular npm i <pkg> --save
```

**Rebuild after package.json changes**
```powershell
docker compose -f docker-compose.dev.yml build --no-cache
docker compose -f docker-compose.dev.yml up
```

**Logs**
```powershell
docker compose -f docker-compose.dev.yml logs -f
```

**Backend on host without proxy**
Use `http://host.docker.internal:<port>` in Angular code.

## Production (static)
**Build image**
```powershell
docker build -t my-angular:prod .
```

**Run container**
```powershell
docker run --rm -p 8080:80 --name my-angular my-angular:prod
```

Open: `http://localhost:8080`

**Stop**
```powershell
docker stop my-angular
```

**Compose (optional)**
```powershell
docker compose up --build
docker compose down
```

---

# Notes
- Do not use `--open` in Docker.
- If your `dist` output is not `*/browser`, adjust the `COPY` path in the production `Dockerfile` to your real folder (e.g., `dist/verona-ng`).
- For subpath hosting, build with `--base-href=/sub/` and add a `location /sub/ { try_files ... /sub/index.html; }` block in Nginx.
- Keep secrets out of the frontend.
