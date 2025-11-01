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
        socket.emit('join-room-error', { message: 'Faltan datos para unirse a la sala.' });
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
      broadcastRoomState(roomId); // Notificar también el cambio de estado de la sala
    });

    socket.on('disconnect', () => {
      console.log(`Cliente desconectado: ${socket.id}`);
      const token = Object.keys(stateManager.registeredPlayers).find(
        key => stateManager.registeredPlayers[key].socketId === socket.id
      );

      if (token) {
        const player = stateManager.findRegisteredPlayerByToken(token);
        if (player && player.roomId) {
          // Marcar como desconectado en lugar de eliminarlo inmediatamente
          const { room } = stateManager.setPlayerDisconnected(player.roomId, token, true);
          broadcastPlayerList(player.roomId);

          // Iniciar un temporizador para eliminar al jugador si no se reconecta
          setTimeout(() => {
            const roomAfterTimeout = stateManager.getRoom(player.roomId);
            if (roomAfterTimeout) {
              const playerAfterTimeout = roomAfterTimeout.players.find(p => p.token === token);

              // Si el jugador todavía existe y sigue desconectado, eliminarlo
              if (playerAfterTimeout && playerAfterTimeout.disconnected) {
                console.log(`Tiempo de reconexión agotado para el jugador con token ${token}. Eliminando...`);
                const result = stateManager.removePlayerFromRoomByToken(player.roomId, token);
                stateManager.removeRegisteredPlayer(token); // Eliminar del registro global

                if (result.roomDeleted) {
                  broadcastPublicRoomList();
                } else if (result.room) {
                  broadcastPlayerList(player.roomId);
                }
              }
            }
          }, 30000); // 30 segundos de tiempo de gracia
        }
      }
      // Ya no eliminamos al jugador inmediatamente. La lógica de reconexión o un temporizador de limpieza se encargará de ello.
      // stateManager.removeRegisteredPlayerBySocketId(socket.id);
    });

    socket.on('explicit-logout', (token) => {
      console.log(`Jugador con token ${token} ha solicitado logout explícito.`);
      stateManager.removeRegisteredPlayer(token);
    });
  });
};

module.exports = { initializeSockets };
