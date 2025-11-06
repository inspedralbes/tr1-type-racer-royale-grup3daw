/**
 * Fichero: server.js
 * Descripción: Este es el punto de entrada principal para el servidor backend de la aplicación.
 * Se encarga de configurar y lanzar un servidor Express, inicializar Socket.IO para la comunicación
 * en tiempo real, definir la configuración de CORS según el entorno (desarrollo o producción),
 * y registrar todas las rutas de la API. También hace que el objeto `io` de Socket.IO sea
 * accesible para los controladores para que puedan emitir eventos a los clientes.
 */
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// Importadores de rutas y sockets
const loginRoutes = require('./routes/loginRoutes');
const roomsRoutes = require('./routes/roomsRoutes');
const scoresRoutes = require('./routes/scoresRoutes');
const wordsRoutes = require('./routes/wordsRoutes');
const playerRoutes = require('./routes/playerRoutes');
const userRoutes = require('./routes/userRoutes');
const { initializeSockets } = require('./controllers/socketManager');
const connectDB = require('./db/mongo');

// Creación de la aplicación Express y el servidor HTTP.
const app = express();
const server = http.createServer(app);

// Conectar a la base de datos MongoDB
connectDB();

const nodeEnv = process.env.NODE_ENV;
let port;

// Define la configuración de CORS (Cross-Origin Resource Sharing) basada en el entorno.
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

// Aplica el middleware de CORS a la aplicación Express.
app.use(cors(corsOptions));

// Middleware para parsear el cuerpo de las peticiones entrantes en formato JSON.
app.use(express.json());

// Configuración de Socket.IO, adjuntándolo al servidor HTTP y usando las mismas opciones de CORS.
const io = new Server(server, {
  cors: corsOptions,
});

// Hacemos que el objeto 'io' sea accesible globalmente en la aplicación Express.
// Esto permite que los controladores de las rutas puedan acceder a `io` para emitir eventos.
app.set('io', io);

// Inicializa la lógica de los sockets
initializeSockets(app);

// Carga de las rutas de la API
app.use('/api/login', loginRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/scores', scoresRoutes);
app.use('/api/words', wordsRoutes);
app.use('/api/player', playerRoutes);
app.use('/api/user', userRoutes);

// Middleware de depuración temporal para las rutas de jugador.
app.use('/api/player', (req, res, next) => {
  console.log(`[DEBUG] Player Route Hit: ${req.method} ${req.originalUrl}`);
  next();
}, playerRoutes);

// Inicia el servidor para que escuche en el puerto configurado.
server.listen(port, () => {
  console.log(`Backend listening at http://localhost:${port}`);
});
