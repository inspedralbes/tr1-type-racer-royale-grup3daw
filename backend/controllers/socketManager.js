const stateManager = require('../state/stateManager');

const initializeSockets = (app) => {
  const io = app.get('io');

  // Las funciones de broadcast ahora son específicas de la sala y se llaman desde los controladores
  const broadcastPlayerList = (roomId) => {
    const room = stateManager.getRoom(roomId);
    if (room) {
      io.to(roomId).emit('updatePlayerList', room.players);
    }
  };

  const broadcastRoomState = (roomId) => {
    const room = stateManager.getRoom(roomId);
    if (room) {
      io.to(roomId).emit('updateRoomState', {
        isPlaying: room.isPlaying,
        gameStartTime: room.gameStartTime,
        time: room.time,
        gameMode: room.gameMode,
      });
    }
  };

  const broadcastPublicRoomList = () => {
    const publicRooms = stateManager.getPublicRooms();
    io.emit('updatePublicRoomList', publicRooms);
  };

  app.set('broadcastPlayerList', broadcastPlayerList);
  app.set('broadcastRoomState', broadcastRoomState);
  app.set('broadcastPublicRoomList', broadcastPublicRoomList);

  io.on('connection', (socket) => {
    console.log(`Nuevo player conectado: ${socket.id}`);

    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} se unió a la sala ${roomId}`);
      // Opcional: notificar a otros en la sala que un nuevo jugador se ha unido
    });

    socket.on('leave-room', (roomId) => {
      socket.leave(roomId);
      console.log(`Socket ${socket.id} abandonó la sala ${roomId}`);
    });

    socket.on('set-ready', (data) => {
      const { roomId, isReady } = data;
      stateManager.setPlayerReadyStatusInRoom(roomId, socket.id, isReady);
      broadcastPlayerList(roomId);
    });

    socket.on('disconnect', () => {
      console.log(`Cliente desconectado: ${socket.id}`);

      // Find the player in registeredPlayers
      let disconnectedPlayerToken = null;
      for (const token in stateManager.registeredPlayers) {
        if (stateManager.registeredPlayers[token].socketId === socket.id) {
          disconnectedPlayerToken = token;
          break;
        }
      }

      if (disconnectedPlayerToken) {
        const disconnectedPlayer = stateManager.removeRegisteredPlayer(disconnectedPlayerToken);

        // Find the room the player was in
        let playerRoomId = null;
        for (const roomId in stateManager.rooms) {
          const room = stateManager.rooms[roomId];
          if (room.players.some(p => p.socketId === socket.id)) {
            playerRoomId = roomId;
            break;
          }
        }

        if (playerRoomId) {
          const result = stateManager.removePlayerFromRoom(playerRoomId, socket.id);

          if (result.roomDeleted) {
            broadcastPublicRoomList();
          } else {
            broadcastPlayerList(playerRoomId);
          }
          socket.leave(playerRoomId);
        }
      }
    });
  });
};

module.exports = { initializeSockets };
