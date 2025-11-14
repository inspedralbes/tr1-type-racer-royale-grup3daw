const stateManager = require('../state/stateManager');

const verifyHost = (req, res, next) => {
  const { roomId } = req.params;
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: 'No token provided.' });
  }

  const room = stateManager.getRoom(roomId);
  if (!room) {
    return res.status(404).json({ message: 'Room not found.' });
  }

  const player = room.players.find(p => p.token === token);
  if (!player) {
    return res.status(404).json({ message: 'Player not found in this room.' });
  }

  if (player.role !== 'admin') {
    return res.status(403).json({ message: 'Only the host can perform this action.' });
  }

  next();
};

module.exports = { verifyHost };
