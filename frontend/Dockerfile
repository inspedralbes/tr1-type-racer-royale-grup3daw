# Stage 1: Build the Vue application for production
FROM node:20-alpine as builder

WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY vue-project/package*.json ./

# Install production dependencies only (omit devDependencies)
RUN npm install --omit=dev

# Copy the rest of the application code
COPY vue-project/ .

# Build the Vue application for production
RUN npm run build

# Stage 2: Serve the production build with Nginx
FROM nginx:stable-alpine as production

# Copy the Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built Vue app from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 for Nginx
EXPOSE 80

# Command to start Nginx
CMD ["nginx", "-g", "daemon off;"]

# Stage 3: Development environment setup (used by docker-compose.dev.yml)
# This stage is primarily for installing node_modules.
# The actual source code will be mounted as a volume by docker-compose.dev.yml.
FROM node:20-alpine as development

WORKDIR /app

# Copy package.json and package-lock.json to install all dependencies
COPY vue-project/package*.json ./

# Install all dependencies (dev and prod) for development
RUN npm install

# Expose Vite's default development port
EXPOSE 5173

# Default command for development. This will be overridden by docker-compose.dev.yml
CMD ["npm", "run", "dev"]