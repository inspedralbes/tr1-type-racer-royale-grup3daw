const express = require('express');
const router = express.Router();
const scoresController = require('../controllers/scoresController');

router.post('/', scoresController.updateScore);
router.post('/save', scoresController.saveScore);

module.exports = router;