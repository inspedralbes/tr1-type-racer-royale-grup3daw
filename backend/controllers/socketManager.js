/**
 * Fichero: socketManager.js
 * Descripción: Gestiona toda la lógica de comunicación en tiempo real a través de Socket.IO.
 * Se encarga de:
 * - Inicializar los listeners para eventos de conexión de nuevos clientes.
 * - Definir funciones de "broadcast" que emiten eventos a todos los clientes en una sala
 *   o a todos los clientes en general (ej. `updatePlayerList`, `updateRoomState`).
 * - Registrar estas funciones de broadcast en la aplicación Express para que puedan ser
 *   utilizadas desde los controladores de las rutas REST.
 * - Manejar los eventos emitidos por los clientes, como unirse/salir de una sala,
 *   cambiar el estado de "listo", y la desconexión.
 * - Implementar la lógica de reconexión, marcando a los jugadores como desconectados
 *   y dándoles un tiempo de gracia para volver a conectarse antes de eliminarlos.
 */
const stateManager = require('../state/stateManager');

const initializeSockets = (app) => {
  const io = app.get('io');

  // Función para emitir la lista de jugadores actualizada a todos los clientes de una sala.
  const broadcastPlayerList = (roomId) => {
    const room = stateManager.getRoom(roomId);
    if (room) {
      console.log('Broadcasting player list:', room.players);
      io.to(roomId).emit('updatePlayerList', room.players);
    }
  };

  // Función para emitir el estado actualizado de la sala a todos sus miembros.
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

  // Función para emitir la lista de salas públicas a todos los clientes conectados.
  const broadcastPublicRoomList = () => {
    const publicRooms = stateManager.getPublicRooms();
    io.emit('updatePublicRoomList', publicRooms);
  };

  // Registra las funciones de broadcast en la app de Express para que sean accesibles
  // desde los controladores de las rutas.
  app.set('broadcastPlayerList', broadcastPlayerList);
  app.set('broadcastRoomState', broadcastRoomState);
  app.set('broadcastPublicRoomList', broadcastPublicRoomList);

  io.on('connection', (socket) => {
    // Listener para cuando un nuevo cliente se conecta.
    console.log(`Nuevo player conectado: ${socket.id}`);

    socket.on('join-room', (data) => {
      const { roomId, player } = data;
      if (!roomId || !player) {
        socket.emit('join-room-error', { message: 'Faltan datos para unirse a la sala.' });
        return;
      }
      socket.join(roomId);
      socket.data.roomId = roomId; // Almacenamos el roomId en el objeto socket para fácil acceso.
      console.log(`Socket ${socket.id} se unió a la sala ${roomId}`);

      // Añadir jugador a la sala y notificar
      const result = stateManager.addPlayerToRoom(roomId, player);
      if (!result.error) {
        broadcastPlayerList(roomId);
      }
    });

    // Listener para cuando un cliente abandona una sala.
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

    // Listener para cuando un jugador cambia su estado de "listo".
    socket.on('set-ready', (data) => {
      const { roomId, isReady } = data;
      stateManager.setPlayerReadyStatusInRoom(roomId, socket.id, isReady);
      broadcastPlayerList(roomId);
      broadcastRoomState(roomId); // Notificar también el cambio de estado de la sala
    });

    // Listener para cuando un cliente se desconecta.
    socket.on('disconnect', () => {
      console.log(`Cliente desconectado: ${socket.id}`);
      // Busca al jugador registrado asociado a este socket.id.
      const token = Object.keys(stateManager.registeredPlayers).find(
        key => stateManager.registeredPlayers[key].socketId === socket.id
      );

      if (token) {
        const player = stateManager.findRegisteredPlayerByToken(token);
        if (player && player.roomId) {
          // En lugar de eliminarlo inmediatamente, lo marca como desconectado.
          const { room } = stateManager.setPlayerDisconnected(player.roomId, token, true);
          broadcastPlayerList(player.roomId);

          // Inicia un temporizador. Si el jugador no se ha reconectado cuando el temporizador
          // termine, será eliminado permanentemente de la sala y del registro.
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
    });

    // Listener para un logout explícito (ej. el usuario cierra sesión).
    socket.on('explicit-logout', (token) => {
      // Elimina al jugador del registro global inmediatamente.
      console.log(`Jugador con token ${token} ha solicitado logout explícito.`);
      stateManager.removeRegisteredPlayer(token);
    });
  });
};

module.exports = { initializeSockets };
