const stateManager = require('../state/stateManager');

exports.updatePlayerPage = (req, res) => {
  const { token, page } = req.body;

  if (!token || !page) {
    return res.status(400).json({ error: 'Token and page are required.' });
  }

  const player = stateManager.findPlayerByToken(token);

  if (player) {
    player.currentPage = page;
    res.status(200).json({ message: 'Page updated.' });
  } else {
    res.status(404).json({ error: 'Player not found.' });
  }
};
