const express = require('express');
const router = express.Router();
const wordsController = require('../controllers/wordsController');

// Ruta para obtener el listado de palabras del juego
router.get('/', wordsController.getWords);

module.exports = router;