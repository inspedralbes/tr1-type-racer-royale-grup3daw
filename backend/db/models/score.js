const mongoose = require('mongoose');

const ScoreSchema = new mongoose.Schema({
  playerName: {
    type: String,
    required: true,
  },
  playerEmail: {
    type: String,
    required: false, // Made optional
  },
  score: {
    type: Number,
    required: true,
  },
  wpm: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Score', ScoreSchema);