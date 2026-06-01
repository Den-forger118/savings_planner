# ─── Stage 1: Build the React app ────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build React app for production
RUN npm run build

# ─── Stage 2: Serve with Nginx ───────────────────────────────
# Nginx is a lightweight web server perfect for serving static files
FROM nginx:alpine

# Copy the built React files to Nginx's serving directory
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]