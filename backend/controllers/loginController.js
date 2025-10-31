const crypto = require('crypto');
const stateManager = require('../state/stateManager');

exports.handleLogin = (req, res) => {
  const { name, socketId, time, token } = req.body;

  if (token) {
    const player = stateManager.findPlayerByToken(token);
    if (player) {
      player.socketId = socketId;
      player.disconnected = false;

      const roomState = stateManager.getRoomState();
      if (roomState.isPlaying) {
        const elapsedTime = Math.floor((Date.now() - roomState.gameStartTime) / 1000);
        const remainingTime = roomState.time - elapsedTime;
        player.remainingTime = remainingTime > 0 ? remainingTime : 0;
      }

      const broadcastPlayerList = req.app.get('broadcastPlayerList');
      broadcastPlayerList();
      return res.status(200).json({ ...player, currentPage: player.currentPage });
    }
  }

  // 1. Comprobar si la partida ya ha empezado
  if (stateManager.getRoomState().isPlaying) {
    return res.status(423).json({ error: 'La partida ya ha comenzado. No puedes unirte ahora.' });
  }

  // 2. Comprobar si el nombre de usuario ya existe
  if (stateManager.findPlayerByName(name)) {
    return res.status(409).json({ error: `El nombre "${name}" ya está en uso.` });
  }

  // Si todo está en orden, proceder a añadir el jugador
  if (!name || !socketId) {
    return res.status(400).json({ error: 'Los campos "name" y "socketId" son requeridos.' });
  }

  const newPlayerToken = crypto.randomBytes(16).toString('hex');
  const newPlayer = stateManager.addPlayer(name, socketId, time, newPlayerToken);
  
  // Notificar a todos la nueva lista de jugadores
  const broadcastPlayerList = req.app.get('broadcastPlayerList');
  broadcastPlayerList();

  res.status(201).json(newPlayer); // 201 Created es más apropiado aquí
};
