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
const { User } = require('../db/models');

const initializeSockets = (app) => {
  const io = app.get('io');

  // Función para emitir la lista de jugadores actualizada a todos los clientes de una sala.
  const broadcastPlayerList = async (roomId) => {
    const room = stateManager.getRoom(roomId);
    if (room) {
      console.log('Broadcasting player list (enriched):', room.players);
      // Enrich players with avatar/color from DB when available
      const enriched = await Promise.all((room.players || []).map(async (p) => {
        try {
          // If the registeredPlayers record marks this token as guest, skip DB lookup
          const reg = stateManager.registeredPlayers[p.token];
          if (reg && reg.isGuest) {
            return {
              ...p,
              avatar: 'noImage',
              color: undefined,
              isGuest: true,
            };
          }
          const dbUser = await User.findOne({ where: { username: p.name } });
          return {
            ...p,
            // If user isn't in DB, set avatar to 'noImage' so frontend can show placeholder
            avatar: dbUser ? dbUser.avatar : 'noImage',
            color: dbUser ? dbUser.color : undefined,
            isGuest: !dbUser,
          };
        } catch (e) {
          return {
            ...p,
            isGuest: true,
          };
        }
      }));
      io.to(roomId).emit('updatePlayerList', enriched);
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

    const token = socket.handshake.auth.token;
    if (token) {
      const player = stateManager.findRegisteredPlayerByToken(token);
      if (player) {
        console.log(`Jugador ${player.name} (re)conectado con socket ID: ${socket.id}`);
        stateManager.updateRegisteredPlayerSocketId(token, socket.id);
      }
    }

  socket.on('join-room', async (data) => {
      const { roomId, player } = data;
      if (!roomId || !player) {
        socket.emit('join-room-error', { message: 'Faltan datos para unirse a la sala.' });
        return;
      }
      const result = stateManager.addPlayerToRoom(roomId, player);
      if (result.error) {
        socket.emit('join-room-error', { message: result.error });
        return;
      }

      socket.join(roomId);
      socket.data.roomId = roomId;
      console.log(`Socket ${socket.id} se unió a la sala ${roomId}`);

      // Notificar a todos en la sala sobre el nuevo jugador (await enrichment)
      await broadcastPlayerList(roomId);
    });

    // Listener para cuando un cliente abandona una sala.
    socket.on('leave-room', async (roomId) => {
      socket.leave(roomId);
      console.log(`Socket ${socket.id} abandonó la sala ${roomId}`);
      delete socket.data.roomId;

      const result = stateManager.removePlayerFromRoom(roomId, socket.id);

      if (result.roomDeleted) {
        broadcastPublicRoomList();
      } else if (result.room) {
        await broadcastPlayerList(roomId);
      }
    });

    // Listener para cuando un jugador cambia su estado de "listo".
    socket.on('set-ready', async (data) => {
      const { roomId, isReady } = data;
      stateManager.setPlayerReadyStatusInRoom(roomId, socket.id, isReady);
      await broadcastPlayerList(roomId);
    });

    socket.on('powerUp', (data) => {
      const { roomId, powerUpType } = data;
      const senderSocketId = socket.id;

      const room = stateManager.getRoom(roomId);
      if (room && powerUpType) {
        console.log(`Power-up '${powerUpType}' activado en la sala ${roomId} por ${senderSocketId}`);
        
        // Itera sobre todos los jugadores en la sala
        room.players.forEach(player => {
          // Si el jugador no es el que activó el power-up, le envía el evento
          if (player.socketId !== senderSocketId) {
            io.to(player.socketId).emit('receivePowerUp', { powerUpType });
          }
        });
      }
    });

    socket.on('muerte-subita-word-correct', (data) => {
      const { roomId, difficulty } = data;
      const room = stateManager.getRoom(roomId);
      if (!room || room.gameMode !== 'MuerteSubita') return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (player && player.gameData && !player.gameData.isEliminated) {
          const timeToAdd = { 'facil': 3, 'normal': 2, 'dificil': 1 }[difficulty] || 1;
          player.gameData.time += timeToAdd;

          player.gameData.streak++;
          if (player.gameData.streak >= 5) {
              player.gameData.streak = 0; 

              room.players.forEach(opponent => {
                  if (opponent.socketId !== socket.id && opponent.gameData && !opponent.gameData.isEliminated) {
                      io.to(opponent.socketId).emit('apply-debuff', { type: 'INPUT_LOCK', duration: 3000 });
                  }
              });
          }
      }
    });

    // Listener para cuando un cliente se desconecta.
  socket.on('disconnect', async () => {
      console.log(`Cliente desconectado: ${socket.id}`);
      // Busca al jugador registrado asociado a este socket.id.
      const token = Object.keys(stateManager.registeredPlayers).find(
        key => stateManager.registeredPlayers[key].socketId === socket.id
      );

      if (token) {
        const player = stateManager.findRegisteredPlayerByToken(token);
        if (player) {
          if (player.roomId) {
            // CASO 1: El jugador estaba en una sala.
            // Lo marcamos como desconectado y le damos tiempo para reconectarse.
            console.log(`Jugador con token ${token} desconectado de la sala ${player.roomId}. Iniciando temporizador de reconexión.`);
            stateManager.setPlayerDisconnected(player.roomId, token, true);
            await broadcastPlayerList(player.roomId);

            const room = stateManager.getRoom(player.roomId);
            if (room && room.players.every(p => p.disconnected)) {
              stateManager.deleteRoom(player.roomId);
              broadcastPublicRoomList();
            }
  
            // Inicia un temporizador. Si el jugador no se ha reconectado cuando el temporizador
            // termine, será eliminado permanentemente de la sala y del registro.
            setTimeout(async () => {
              const roomAfterTimeout = stateManager.getRoom(player.roomId);
              if (roomAfterTimeout) {
                const playerAfterTimeout = roomAfterTimeout.players.find(p => p.token === token);
  
                // Si el jugador todavía existe y sigue desconectado, eliminarlo.
                  if (playerAfterTimeout && playerAfterTimeout.disconnected) {
                  console.log(`Tiempo de reconexión agotado para el jugador con token ${token}. Eliminando...`);
                  const result = stateManager.removePlayerFromRoomByToken(player.roomId, token);
                  stateManager.removeRegisteredPlayer(token); // Eliminar del registro global
  
                  if (result.roomDeleted) {
                    broadcastPublicRoomList();
                  } else if (result.room) {
                    await broadcastPlayerList(player.roomId);
                  }
                }
              }
            }, 30000); // 30 segundos de tiempo de gracia
          } else {
            // CASO 2: El jugador no estaba en ninguna sala (ej. en la pantalla de selección).
            // Lo eliminamos del registro inmediatamente.
            console.log(`Jugador con token ${token} desconectado (no estaba en una sala). Eliminando del registro.`);
            stateManager.removeRegisteredPlayer(token);
          }
        }
      }
    });


    // Listener para un logout explícito (ej. el usuario cierra sesión).
    socket.on('explicit-logout', async (token) => {
      console.log(`Jugador con token ${token} ha solicitado logout explícito.`);
      const player = stateManager.findRegisteredPlayerByToken(token);
      if (player && player.roomId) {
        const result = stateManager.removePlayerFromRoomByToken(player.roomId, token);
        if (result.roomDeleted) {
          broadcastPublicRoomList();
        } else if (result.room) {
          await broadcastPlayerList(player.roomId);
        }
      }
      stateManager.removeRegisteredPlayer(token);
    });
  });
};

const gameLoops = {};

function startMuerteSubitaGame(roomId, io) {
  const room = stateManager.getRoom(roomId);
  if (!room) return;

  console.log(`[startMuerteSubitaGame] Iniciando bucle de juego para la sala ${roomId}`);
  console.log(`Iniciando modo 'Muerte Súbita' para la sala ${roomId}`);

  room.players.forEach(player => {
    player.gameData = {
      time: 10,
      streak: 0,
      isEliminated: false
    };
  });

  if (gameLoops[roomId]) {
    clearInterval(gameLoops[roomId]);
  }

  gameLoops[roomId] = setInterval(() => {
    const currentRoom = stateManager.getRoom(roomId);
    if (!currentRoom) {
      clearInterval(gameLoops[roomId]);
      delete gameLoops[roomId];
      return;
    }

    let activePlayersCount = 0;
    currentRoom.players.forEach(player => {
      if (player.gameData && !player.gameData.isEliminated) {
        player.gameData.time -= 1;
        if (player.gameData.time <= 0) {
          player.gameData.isEliminated = true;
          io.to(roomId).emit('player-eliminated', { playerId: player.socketId });
        } else {
          activePlayersCount++;
        }
      }
    });
    
    const playersData = currentRoom.players.map(p => ({
      socketId: p.socketId,
      name: p.name,
      gameData: p.gameData
    }));

    io.to(roomId).emit('muerte-subita-state-update', { players: playersData });

    const totalPlayers = currentRoom.players.length;
    // El juego termina si queda 1 o 0 jugadores activos
    if (activePlayersCount <= 1 && totalPlayers > 1) {
      clearInterval(gameLoops[roomId]);
      delete gameLoops[roomId];
      
      const finalResults = currentRoom.players.map(p => ({
        nombre: p.name,
        // El ganador es el que no fue eliminado. Su puntuación es su tiempo restante.
        puntuacion: p.gameData.isEliminated ? 0 : p.gameData.time,
        wpm: 0,
        isEliminated: p.gameData.isEliminated,
      }));
      
      io.to(roomId).emit('game-over', { results: finalResults });
      console.log(`Juego 'Muerte Súbita' terminado en la sala ${roomId}. Resultados:`, finalResults);
    }
  }, 1000);
}

module.exports = { initializeSockets, startMuerteSubitaGame };
