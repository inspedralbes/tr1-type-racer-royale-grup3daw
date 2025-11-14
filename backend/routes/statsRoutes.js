const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

router.get('/player', statsController.getPlayerStats);
router.post('/game', statsController.saveGameStats);

module.exports = router;