const stateManager = require('../state/stateManager');

const initializeSockets = (app) => {
  const io = app.get('io');

  // Las funciones de broadcast ahora son específicas de la sala y se llaman desde los controladores
  const broadcastPlayerList = (roomId) => {
    const room = stateManager.getRoom(roomId);
    if (room) {
      console.log('Broadcasting player list:', room.players);
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

    socket.on('join-room', (data) => {
      const { roomId, player } = data;
      if (!roomId || !player) {
        return;
      }
      socket.join(roomId);
      socket.data.roomId = roomId; // Almacenamos el roomId en el objeto socket
      console.log(`Socket ${socket.id} se unió a la sala ${roomId}`);

      // Añadir jugador a la sala y notificar
      const result = stateManager.addPlayerToRoom(roomId, player);
      if (!result.error) {
        broadcastPlayerList(roomId);
      }
    });

    socket.on('leave-room', (roomId) => {
      socket.leave(roomId);
      console.log(`Socket ${socket.id} abandonó la sala ${roomId}`);
      delete socket.data.roomId;

      const result = stateManager.removePlayerFromRoom(roomId, socket.id);

      if (result.roomDeleted) {
        broadcastPublicRoomList();
      } else if (result.room) {
        broadcastPlayerList(roomId);
      }
    });

    socket.on('set-ready', (data) => {
      const { roomId, isReady } = data;
      stateManager.setPlayerReadyStatusInRoom(roomId, socket.id, isReady);
      broadcastPlayerList(roomId);
    });

    socket.on('disconnect', () => {
      console.log(`Cliente desconectado: ${socket.id}`);
      const playerRoomId = socket.data.roomId;

      // Si el jugador estaba en una sala, lo eliminamos de ella.
      if (playerRoomId) {
        const result = stateManager.removePlayerFromRoom(playerRoomId, socket.id);

        if (result.roomDeleted) {
          broadcastPublicRoomList();
        } else if (result.room) {
          broadcastPlayerList(playerRoomId);
        }
      }
      // También eliminamos al jugador del registro global si es necesario.
      stateManager.removeRegisteredPlayerBySocketId(socket.id);
    });
  });
};

module.exports = { initializeSockets };
