const Score = require('../db/models/score');

exports.getPlayerStats = async (req, res) => {
  try {
    const stats = await Score.aggregate([
      {
        $group: {
          _id: '$playerName',
          totalGames: { $sum: 1 },
          avgScore: { $avg: '$score' },
          maxScore: { $max: '$score' },
          avgWpm: { $avg: '$wpm' },
          maxWpm: { $max: '$wpm' },
        },
      },
      {
        $sort: { avgScore: -1 },
      },
    ]);

    res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching player stats:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener estadísticas.' });
  }
};