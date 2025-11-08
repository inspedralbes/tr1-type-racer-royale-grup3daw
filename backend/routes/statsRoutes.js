const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

router.get('/player', statsController.getPlayerStats);

module.exports = router;