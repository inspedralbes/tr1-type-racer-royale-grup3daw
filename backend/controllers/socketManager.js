const stateManager = require('../state/stateManager');

// Función centralizada para notificar a todos los clientes sobre cambios en la lista de jugadores.
const broadcastPlayerList = (io) => {
  // Al transmitir, no incluimos el socketId por seguridad y para no exponer datos internos.
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

    // Ya no se usa el evento 'register'. La asociación se hace en el login HTTP.

    socket.on('disconnect', () => {
      console.log(`Cliente desconectado: ${socket.id}`);
      // Intentamos eliminar al jugador usando su socket.id.
      // Si un jugador con ese socket.id existía, será eliminado.
      stateManager.removePlayerBySocketId(socket.id);

      // Notificamos a los clientes restantes la lista actualizada.
      broadcastPlayerList(io);
    });
  });
};

module.exports = { initializeSockets, broadcastPlayerList };
