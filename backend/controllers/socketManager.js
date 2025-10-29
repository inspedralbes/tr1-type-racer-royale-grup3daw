const stateManager = require('../state/stateManager');

// Función centralizada para notificar a todos los clientes sobre cambios en la lista de jugadores.
const broadcastPlayerList = (io) => {
  const playerList = stateManager.getPlayers().map(p => ({ name: p.name, score: p.score, role: p.role }));
  io.to('game-room').emit('updatePlayerList', playerList);
};

const initializeSockets = (app) => {
  const io = app.get('io');

  // De momento, solo hay una sala global para todos.
  const mainRoom = 'game-room';
  
  // Hacemos la función de broadcast accesible para otros módulos a través de `app`.
  app.set('broadcastPlayerList', () => broadcastPlayerList(io));
  io.on('connection', (socket) => {
    console.log(`Nuevo cliente conectado: ${socket.id}`);
    // Unir al cliente a la sala principal automáticamente
    socket.join(mainRoom);

    // El cliente debe registrarse con su nombre para asociarlo al socket
    socket.on('register', (playerName) => {
      socket.playerName = playerName;
      console.log(`Socket ${socket.id} registrado para el jugador: ${playerName}`);
    });

    socket.on('disconnect', () => {
      // Si el socket estaba registrado a un jugador, lo eliminamos de la sala
      if (socket.playerName) {
        console.log(`Jugador ${socket.playerName} desconectado.`);
        stateManager.removePlayer(socket.playerName);

        // Usamos la función centralizada para notificar a los clientes restantes.
        broadcastPlayerList(io);
      } else {
        console.log(`Cliente no registrado desconectado: ${socket.id}`);
      }
    });
  });
};

module.exports = { initializeSockets, broadcastPlayerList };
