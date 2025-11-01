const crypto = require('crypto');
const stateManager = require('../state/stateManager');

exports.handleLogin = (req, res) => {
  const { name, socketId, token } = req.body;

  if (token) {
    // Player is trying to reconnect with an existing token
    const player = stateManager.findRegisteredPlayerByToken(token);
    if (player) {
      stateManager.updateRegisteredPlayerSocketId(token, socketId);
      return res.status(200).json({ ...player, currentPage: player.currentPage });
    } else {
      // Token exists but is invalid (e.g., server restarted).
      // Fall through to create a new player, but don't allow using an old token with a new name.
      // The client should ideally clear the invalid token, but we proceed as a new login.
    }
  }

  // If no valid token or new player, create a new registered player
  if (!name || !socketId) {
    return res.status(400).json({ error: 'Los campos "name" y "socketId" son requeridos.' });
  }

  // Check if name is already in use by a currently registered player
  // This is a basic check, more robust handling might be needed for unique names across all rooms
  const existingPlayer = Object.values(stateManager.registeredPlayers).find(p => p.name === name);
  if (existingPlayer) {
    return res.status(409).json({ error: `El nombre "${name}" ya está en uso.` });
  }

  const newPlayerToken = crypto.randomBytes(16).toString('hex');
  const newPlayer = stateManager.addRegisteredPlayer(name, socketId, newPlayerToken);

  res.status(201).json(newPlayer);
};