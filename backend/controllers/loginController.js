const crypto = require('crypto');
const stateManager = require('../state/stateManager');

exports.handleLogin = (req, res) => {
  const { name, socketId, token } = req.body;

  if (!name || !socketId) {
    return res.status(400).json({ error: 'Los campos "name" y "socketId" son requeridos.' });
  }

  if (token) {
    // Player is trying to reconnect with an existing token
    const player = stateManager.findRegisteredPlayerByToken(token);
    if (player) {
      // Player found with token, update socketId and return
      stateManager.updateRegisteredPlayerSocketId(token, socketId);
      // Busca si el jugador está en alguna sala para devolver el roomId
      const room = Object.values(stateManager.getRooms()).find(r => r.players.some(p => p.token === token));
      const roomId = room ? room.id : null;
      
      return res.status(200).json({ ...player, currentPage: player.currentPage, roomId: roomId });
    } else {
      // Token exists but player not found (e.g., server restarted, registeredPlayers cleared)
      // Re-register the player with the existing token and provided name/socketId
      // First, check if the name is already in use by another active player (not this token)
      const existingPlayerByName = Object.values(stateManager.registeredPlayers).find(p => p.name === name);
      if (existingPlayerByName) {
        // If name is in use by another player, it's a conflict
        return res.status(409).json({ error: `El nombre "${name}" ya está en uso por otro jugador.` });
      }
      // If name is not in use, re-register with the old token
      const reRegisteredPlayer = stateManager.addRegisteredPlayer(name, socketId, token);
      return res.status(200).json(reRegisteredPlayer);
    }
  }

  // If no token, or token was invalid and not re-registered, proceed as a new login
  // Check if name is already in use by a currently registered player
  const existingPlayer = Object.values(stateManager.registeredPlayers).find(p => p.name === name);
  if (existingPlayer) {
    return res.status(409).json({ error: `El nombre "${name}" ya está en uso.` });
  }

  const newPlayerToken = crypto.randomBytes(16).toString('hex');
  const newPlayer = stateManager.addRegisteredPlayer(name, socketId, newPlayerToken);

  res.status(201).json(newPlayer);
};