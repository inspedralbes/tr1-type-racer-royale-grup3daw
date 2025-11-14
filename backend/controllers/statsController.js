const Score = require('../db/models/score');

exports.getPlayerStats = async (req, res) => {
  try {
    const { gameMode } = req.query;
    const pipeline = [];

    if (gameMode) {
      pipeline.push({ $match: { gameMode: gameMode } });
    }

    let groupStage;
    if (gameMode === 'MuerteSubita') {
      groupStage = {
        _id: '$playerName',
        totalGames: { $sum: 1 },
        avgSurvivalTime: { $avg: '$survivalTime' },
        maxSurvivalTime: { $max: '$survivalTime' },
        avgWpm: { $avg: '$wpm' },
        maxWpm: { $max: '$wpm' },
      };
      pipeline.push({ $group: groupStage }, { $sort: { avgSurvivalTime: -1 } });
    } else {
      groupStage = {
        _id: '$playerName',
        totalGames: { $sum: 1 },
        avgScore: { $avg: '$score' },
        maxScore: { $max: '$score' },
        avgWpm: { $avg: '$wpm' },
        maxWpm: { $max: '$wpm' },
      };
      pipeline.push({ $group: groupStage }, { $sort: { avgScore: -1 } });
    }

    const stats = await Score.aggregate(pipeline);

    res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching player stats:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener estadísticas.' });
  }
};

exports.saveGameStats = async (req, res) => {
  try {
    const { playerName, words, score, gameMode, errors, wpm, survivalTime } = req.body;

    // Basic validation
    if (!playerName || !score) {
      return res.status(400).json({ message: 'Player name and score are required.' });
    }

    const newScore = new Score({
      playerName,
      score,
      words,
      gameMode,
      totalErrors: errors,
      wpm: wpm || 0,
      survivalTime: survivalTime || null,
    });

    await newScore.save();

    res.status(201).json({ message: 'Game stats saved successfully.' });
  } catch (error) {
    console.error('Error saving game stats:', error);
    res.status(500).json({ error: 'Internal server error while saving game stats.' });
  }
};