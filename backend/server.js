const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// Importadores de rutas y sockets
const loginRoutes = require('./routes/loginRoutes');
const roomsRoutes = require('./routes/roomsRoutes');
const scoresRoutes = require('./routes/scoresRoutes');
const wordsRoutes = require('./routes/wordsRoutes');
const { initializeSockets } = require('./controllers/socketManager');

const app = express();
const server = http.createServer(app);

// Configuración de CORS para Express y Socket.IO
app.use(cors());

// Middleware para parsear JSON en las peticiones
app.use(express.json());

const nodeEnv = process.env.NODE_ENV;

let port;

if (nodeEnv === 'production') {
  console.log('Running in production mode');
  // Configuración para Producción (desde .env)
  port = process.env.PORT || 3000;
} else {
  console.log('Running in development mode');
  // Configuración para Desarrollo (hardcodeada)
  port = 3000;
}

// Configuración de Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*", // Permitir cualquier origen (ajustar en producción)
    methods: ["GET", "POST"]
  }
});

// Hacemos que el objeto 'io' sea accesible desde las rutas/controladores
app.set('io', io);

// Inicializa la lógica de los sockets
initializeSockets(app);

// Carga de las rutas de la API
app.use('/api/login', loginRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/scores', scoresRoutes);
app.use('/api/words', wordsRoutes);

server.listen(port, () => {
  console.log(`Backend listening at http://localhost:${port}`);
});
