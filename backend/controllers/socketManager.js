const stateManager = require('../state/stateManager');

// Notifica a todos los clientes la lista de jugadores actualizada.
const broadcastPlayerList = (io) => {
  const playerList = stateManager.getPlayers().map(p => ({ name: p.name, score: p.score, role: p.role, socketId: p.socketId, isReady: p.isReady }));
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
    console.log(`Nuevo player conectado: ${socket.id}`);
    socket.join(mainRoom);

    // Al conectar, envía el estado actual de la sala y jugadores solo a este cliente.
    socket.emit('updateRoomState', stateManager.getRoomState());
    socket.emit('updatePlayerList', stateManager.getPlayers().map(p => ({ name: p.name, score: p.score, role: p.role, socketId: p.socketId, isReady: p.isReady })));

    socket.on('set-ready', (isReady) => {
      console.log(`set-ready event received from ${socket.id}. isReady: ${isReady}`);
      stateManager.setPlayerReadyStatus(socket.id, isReady);
      broadcastPlayerList(io);
    });

    socket.on('disconnect', () => {
      console.log(`Cliente desconectado: ${socket.id}`);
      const player = stateManager.disconnectPlayerBySocketId(socket.id);

      if (player && player.role === 'admin') {
        const players = stateManager.getPlayers();
        const newAdmin = players.find(p => p.token !== player.token && !p.disconnected);
        if (newAdmin) {
          stateManager.makeHost(player.socketId, newAdmin.socketId);
        }
      }

      if (player) {
        setTimeout(() => {
          const stillDisconnected = stateManager.getPlayers().find(p => p.token === player.token && p.disconnected);
          if (stillDisconnected) {
            stateManager.removePlayerByToken(player.token);
            broadcastPlayerList(io);
          }
        }, 10000); // 10 seconds to reconnect
      }

      broadcastPlayerList(io);
    });
  });
};

module.exports = { initializeSockets };