const stateManager = require('../state/stateManager');

// Notifica a todos los clientes la lista de jugadores actualizada.
const broadcastPlayerList = (io) => {
  const playerList = stateManager.getPlayers().map(p => ({ name: p.name, score: p.score, role: p.role }));
  io.to('game-room').emit('updatePlayerList', playerList);
};

// Notifica a todos los clientes el estado de la sala actualizado.
const broadcastRoomState = (io) => {
  const roomState = stateManager.getRoomState();
  io.to('game-room').emit('updateRoomState', roomState);
};

const initializeSockets = (app) => {
  const io = app.get('io');
  const mainRoom = 'game-room';
  
  // Hacemos las funciones de broadcast accesibles para otros módulos a través de `app`.
  app.set('broadcastPlayerList', () => broadcastPlayerList(io));
  app.set('broadcastRoomState', () => broadcastRoomState(io));

  io.on('connection', (socket) => {
    console.log(`Nuevo cliente conectado: ${socket.id}`);
    socket.join(mainRoom);

    // Al conectar, envía el estado actual de la sala y jugadores solo a este cliente.
    socket.emit('updateRoomState', stateManager.getRoomState());
    socket.emit('updatePlayerList', stateManager.getPlayers().map(p => ({ name: p.name, score: p.score, role: p.role })));

    socket.on('disconnect', () => {
      console.log(`Cliente desconectado: ${socket.id}`);
      stateManager.removePlayerBySocketId(socket.id);
      // Notificamos a los clientes restantes la lista y el estado actualizados.
      broadcastPlayerList(io);
      broadcastRoomState(io);
    });
  });
};

module.exports = { initializeSockets };