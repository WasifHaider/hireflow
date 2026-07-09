# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite needs the API URL at BUILD TIME (it gets baked into the JS bundle)
# Pass it in as a build arg: docker build --build-arg VITE_API_URL=...
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build-only

# ── Stage 2: Serve with nginx ────────────────────────────────────────────────
FROM nginx:alpine AS production

# Copy built static files into nginx's serve directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config to handle Vue Router (history mode)
# Without this, refreshing on /dashboard returns 404
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
