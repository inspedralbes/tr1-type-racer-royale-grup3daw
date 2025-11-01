const express = require('express');
const router = express.Router();
const scoresController = require('../controllers/scoresController');

router.post('/', scoresController.updateScore);

module.exports = router;