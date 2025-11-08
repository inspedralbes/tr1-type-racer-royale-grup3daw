# Stage 1: Build the Vue.js application
FROM node:20 AS build-stage
WORKDIR /app
COPY frontend/vue-project/package.json ./
RUN npm install
COPY frontend/vue-project/ ./
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine
# Install apache2-utils for htpasswd command
RUN apk add --no-cache apache2-utils
# Copy the built assets from the build stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
# Remove default nginx configuration
RUN rm /etc/nginx/conf.d/default.conf
# Copy the nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy the entrypoint script
COPY nginx-entrypoint.sh /docker-entrypoint.sh
# Make the entrypoint script executable
RUN chmod +x /docker-entrypoint.sh
# Set the entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]