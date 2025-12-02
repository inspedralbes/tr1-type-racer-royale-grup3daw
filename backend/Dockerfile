FROM node:18

WORKDIR /usr/src/app


# Copia los package.json y package-lock.json
COPY package*.json ./

# Instala todas las dependencias, incluidas las de desarrollo (como nodemon)
RUN npm install --legacy-peer-deps


# Copia el resto de la aplicación
COPY . .

EXPOSE 3000
