const mongoose = require('mongoose');

const WordStatSchema = new mongoose.Schema({
  paraula: { type: String, required: true },
  errors: { type: Number, required: true },
}, { _id: false });

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
    required: false, // WPM might not always be calculated
  },
  words: {
    type: [WordStatSchema],
    required: false,
  },
  gameMode: {
    type: String,
    required: false,
  },
  totalErrors: {
    type: Number,
    required: false,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Score', ScoreSchema);