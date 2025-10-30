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

const nodeEnv = process.env.NODE_ENV;
let port;

// Define la configuración de CORS basada en el entorno
const corsOptions = {
  methods: ["GET", "POST","PUT", "DELETE"],
};

if (nodeEnv === 'production') {
  console.log('Running in production mode');
  port = process.env.PORT || 8000;
  // En producción, solo permite peticiones desde la URL del frontend definida en .env
  corsOptions.origin = process.env.FRONTEND_URL;
} else {
  console.log('Running in development mode');
  port = 3000;
  // En desarrollo, permite cualquier origen
  corsOptions.origin = "*";
}

// Aplica la configuración de CORS a Express
app.use(cors(corsOptions));

// Middleware para parsear JSON en las peticiones
app.use(express.json());

// Configuración de Socket.IO con las mismas opciones de CORS
const io = new Server(server, {
  cors: corsOptions,
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
