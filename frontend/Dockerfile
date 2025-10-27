# stage 1
FROM node:20 as build-stage

WORKDIR /app

COPY vue-project/package*.json ./

RUN npm install

COPY vue-project/. .

RUN npm run build

# stage 2
FROM nginx:stable-alpine as production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
