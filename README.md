# Type Racer Royale 🚀

¡Bienvenido a Type Racer Royale! Un juego multijugador en tiempo real donde compites contra otros jugadores para ver quién es el mecanógrafo más rápido de la galaxia. Pon a prueba tu velocidad y precisión de escritura en diferentes modos de juego, sube de nivel y demuestra que eres el mejor.

## 📜 Índice

- [Sobre el Proyecto](#-sobre-el-proyecto)
- [👥 Autores](#-autores)
- [✨ Características](#-características)
- [🛠️ Stack Tecnológico](#-stack-tecnológico)
- [📂 Estructura del Proyecto](#-estructura-del-proyecto)
- [🚀 Primeros Pasos](#-primeros-pasos)
  - [Prerrequisitos](#prerrequisitos)
  - [Instalación y Ejecución](#instalación-y-ejecución)
- [⚙️ Variables de Entorno](#-variables-de-entorno)
- [📄 Licencia](#-licencia)
- [📧 Contacto](#-contacto)

## 📖 Sobre el Proyecto

**Type Racer Royale** es una aplicación web full-stack que ofrece una experiencia de juego de mecanografía competitiva. Los jugadores pueden registrarse, iniciar sesión, unirse a salas públicas o crear las suyas propias y competir en tiempo real. La comunicación instantánea se logra a través de WebSockets, mientras que la lógica de negocio y la persistencia de datos son manejadas por un robusto backend.

El proyecto está completamente containerizado con Docker, lo que facilita enormemente su configuración y despliegue en diferentes entornos.

_(Sugerencia: ¡Añade aquí algunas capturas de pantalla de tu aplicación!)_

## 👥 Autores

Este proyecto ha sido desarrollado por:

- Pol Diaz
- Pol Molina
- Iker Lopez
- Izan de La Cruz
- Pol Donés

## ✨ Características

- **Autenticación de Usuarios**: Sistema completo de registro, inicio de sesión y sesión de invitado.
- **Salas de Juego**: Crea salas privadas o únete a salas públicas para competir.
- **Juego en Tiempo Real**: Competición de mecanografía en vivo contra otros jugadores gracias a Socket.IO.
- **Diversos Modos de Juego**:
  - **Cuenta Atrás Simple**: Termina el texto antes de que se acabe el tiempo.
  - **Muerte Súbita**: Un solo error y estás fuera.
  - **Power-Ups**: Modificadores que afectan el juego para darle más emoción.
- **Estadísticas de Jugador**: Revisa tu precisión (WPM), número de partidas jugadas y más.
- **Perfiles de Usuario**: Edita tu perfil y personaliza tu experiencia.

## 🛠️ Stack Tecnológico

El proyecto está dividido en un frontend, un backend y una infraestructura orquestada por Docker.

### Frontend

- **Vue.js (v3)**: Framework reactivo para construir la interfaz de usuario.
- **Vite**: Herramienta de desarrollo frontend ultrarrápida.
- **Pinia**: Para la gestión del estado global de la aplicación.
- **Vue Router**: Para la gestión de las rutas del lado del cliente.
- **Socket.IO Client**: Para la comunicación en tiempo real con el servidor.
- **Axios**: Cliente HTTP para realizar peticiones a la API.

### Backend

- **Node.js**: Entorno de ejecución para el servidor.
- **Express.js**: Framework para construir la API REST y gestionar las rutas.
- **Socket.IO**: Habilita la comunicación bidireccional y en tiempo real.
- **Sequelize**: ORM para interactuar con la base de datos SQL (MySQL).
- **Mongoose**: ODM para interactuar con la base de datos NoSQL (MongoDB).
- **JWT (JSON Web Tokens)**: Para la autenticación y autorización segura.
- **Nodemailer**: Para el envío de correos electrónicos (ej. verificación de cuenta).

### Infraestructura y Bases de Datos

- **Docker & Docker Compose**: Para la containerización y orquestación de todos los servicios.
- **Nginx**: Configurado como reverse proxy en producción.
- **MySQL**: Base de datos relacional principal (usuarios, puntuaciones).
- **MongoDB**: Base de datos NoSQL para datos no estructurados o específicos.
- **Adminer & Mongo Express**: Herramientas web para la gestión de las bases de datos.

## 📂 Estructura del Proyecto

El repositorio está organizado en las siguientes carpetas principales:

```
/
├── backend/        # Contiene todo el código del servidor (Node.js/Express)
├── frontend/       # Contiene el proyecto de Vue.js
├── doc/            # Documentación adicional y recursos
├── .github/        # Workflows de GitHub Actions para CI/CD
├── nginx.conf      # Fichero de configuración de Nginx para producción
└── docker-compose.*.yml # Ficheros para orquestar los contenedores
```

## 🚀 Primeros Pasos

Sigue estos pasos para poner en marcha el entorno de desarrollo local.

### Prerrequisitos

Asegúrate de tener instaladas las siguientes herramientas en tu sistema:

- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/products/docker-desktop/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Instalación y Ejecución

1. **Clona el repositorio:**

   ```sh
   git clone https://github.com/tu_usuario/tr1-type-racer-royale-grup3daw.git
   cd tr1-type-racer-royale-grup3daw
   ```

2. **Configura las variables de entorno:**

   - Crea un fichero `.env` dentro de la carpeta `backend/` a partir del ejemplo `backend/.env.example`.
   - Crea otro fichero `.env` dentro de `frontend/vue-project/` a partir de `frontend/vue-project/.env.example`.
   - Revisa y ajusta las variables si es necesario (ver sección de abajo).

3. **Levanta los contenedores con Docker Compose:**
   Utiliza el siguiente comando para construir las imágenes y arrancar todos los servicios en modo de desarrollo.

   ```sh
   docker compose -f docker-compose.dev.yml up --build
   ```

4. **¡Accede a la aplicación!**
   - **Frontend (Juego)**: [http://localhost:5173](http://localhost:5173)
   - **Backend API**: [http://localhost:3000](http://localhost:3000)
   - **Adminer (MySQL)**: [http://localhost:8080](http://localhost:8080)
   - **Mongo Express**: [http://localhost:8081](http://localhost:8081)

## ⚙️ Variables de Entorno

Este proyecto requiere ciertas variables de entorno para funcionar. A continuación se detallan las más importantes que debes configurar en los ficheros `.env`.

### `backend/.env`

```dotenv
# Base de datos MySQL
DB_HOST=mysql
DB_USER=user_dev
DB_PASSWORD=password_dev
DB_NAME=db_dev

# Base de datos MongoDB
MONGO_URI=mongodb://mongo:27017/db_dev

# Secretos para JWT y otros
JWT_SECRET=tu_secreto_muy_seguro

# Credenciales para el servicio de email (Nodemailer)
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_contraseña_de_aplicacion
```

### `frontend/vue-project/.env`

```dotenv
# URL donde se encuentra la API del backend
VITE_API_URL=http://localhost:3000
```

## 📄 Licencia

Este proyecto está distribuido bajo la Licencia MIT. Consulta el fichero `LICENSE` para más detalles.

## 📧 Contacto

- **a23izadelesp@inspedralbes.cat**


