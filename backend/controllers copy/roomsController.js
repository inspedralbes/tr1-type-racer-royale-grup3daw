const stateManager = require('../state/stateManager');

// --- Controladores de Rutas HTTP ---

// GET /api/rooms - Devuelve la lista de jugadores en la sala
exports.getPlayersInRoom = (req, res) => {
  // Devolvemos solo los datos públicos de los jugadores
  const players = stateManager.getPlayers().map(p => ({ name: p.name, score: p.score, role: p.role }));
  res.status(200).json(players);
};

// POST /api/rooms/start - Inicia la partida
exports.startGame = (req, res) => {
  const broadcastRoomState = req.app.get('broadcastRoomState');
  
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