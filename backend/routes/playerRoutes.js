const express = require('express');
const router = express.Router();
const playerController = require('../controllers/playerController');

router.post('/page', playerController.updatePlayerPage);

module.exports = router;
