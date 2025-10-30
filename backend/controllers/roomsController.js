const stateManager = require('../state/stateManager');

// --- Controladores de Rutas HTTP ---

// GET /api/rooms - Devuelve la lista de jugadores en la sala
exports.getPlayersInRoom = (req, res) => {
  // Devolvemos solo los datos públicos de los jugadores
  const players = stateManager.getPlayers().map(p => ({ name: p.name, score: p.score, role: p.role, socketId: p.socketId }));
  res.status(200).json(players);
};

// POST /api/rooms/start - Inicia la partida
exports.startGame = (req, res) => {
  const broadcastRoomState = req.app.get('broadcastRoomState');
  
  if (!stateManager.areAllPlayersReady()) {
    return res.status(403).json({ message: 'No todos los jugadores están listos.' });
  }

  stateManager.startGame();
  
  // Notificamos a todos los clientes que la partida ha empezado
  broadcastRoomState();
  
  res.status(200).json({ message: 'La partida ha comenzado.' });
};

// DELETE /api/rooms - Vacía y resetea la sala
exports.deleteRoom = (req, res) => {
  const broadcastPlayerList = req.app.get('broadcastPlayerList');
  const broadcastRoomState = req.app.get('broadcastRoomState');

  stateManager.clearPlayers();

  // Notificamos a los clientes que la sala se ha vaciado y reseteado
  broadcastPlayerList();
  broadcastRoomState();
  
  res.status(200).json({ message: 'La sala ha sido vaciada.' });
};

// DELETE /api/rooms/player/:socketId - Elimina un jugador de la sala
exports.removePlayer = (req, res) => {
  const broadcastPlayerList = req.app.get('broadcastPlayerList');
  const playerToRemoveSocketId = req.params.socketId;
  const hostSocketId = req.body.hostSocketId; // Asumimos que el hostSocketId viene en el body

  console.log('removePlayer: playerToRemoveSocketId:', playerToRemoveSocketId);
  console.log('removePlayer: hostSocketId:', hostSocketId);

  const hostPlayer = stateManager.getPlayers().find(p => p.socketId === hostSocketId);

  if (!hostPlayer || hostPlayer.role !== 'admin') {
    return res.status(403).json({ message: 'Solo el host puede eliminar jugadores.' });
  }

  const playerRemoved = stateManager.removePlayerBySocketId(playerToRemoveSocketId);

  if (playerRemoved) {
    broadcastPlayerList();
    // Notificar al jugador eliminado que ha sido expulsado
    const io = req.app.get('io');
    io.to(playerToRemoveSocketId).emit('player-removed');
    res.status(200).json({ message: `Jugador con socketId ${playerToRemoveSocketId} eliminado.` });
  } else {
    res.status(404).json({ message: `Jugador con socketId ${playerToRemoveSocketId} no encontrado.` });
  }
};

// POST /api/rooms/make-host - Hace a otro jugador el host
exports.makeHost = (req, res) => {
  const broadcastPlayerList = req.app.get('broadcastPlayerList');
  const { currentHostSocketId, targetPlayerSocketId } = req.body;

  console.log('makeHost: currentHostSocketId:', currentHostSocketId);
  console.log('makeHost: targetPlayerSocketId:', targetPlayerSocketId);

  const currentHost = stateManager.getPlayers().find(p => p.socketId === currentHostSocketId);

  if (!currentHost || currentHost.role !== 'admin') {
    return res.status(403).json({ message: 'Solo el host actual puede transferir el rol de host.' });
  }

  const success = stateManager.makeHost(currentHostSocketId, targetPlayerSocketId);

  if (success) {
    broadcastPlayerList();
    res.status(200).json({ message: `Jugador con socketId ${targetPlayerSocketId} es ahora el host.` });
  } else {
    res.status(400).json({ message: 'No se pudo transferir el rol de host.' });
  }
};

// POST /api/rooms/reset-ready-status - Resetea el estado de listo de los jugadores
exports.resetReadyStatus = (req, res) => {
  const broadcastPlayerList = req.app.get('broadcastPlayerList');
  const broadcastRoomState = req.app.get('broadcastRoomState');

  stateManager.resetGame(); // Esto también resetea el isReady de los jugadores

  broadcastPlayerList();
  broadcastRoomState();

  res.status(200).json({ message: 'Estado de listo de jugadores reseteado.' });
};