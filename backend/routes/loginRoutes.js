const express = require('express');
const router = express.Router();
const loginController = require('../controllers/loginController');

// Ruta para "iniciar sesión" con el nombre de usuario
router.post('/', loginController.handleLogin);

module.exports = router;