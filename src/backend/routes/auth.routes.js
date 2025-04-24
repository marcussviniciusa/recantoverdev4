const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const tempAuthController = require('../controllers/temp-auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Rotas públicas
router.post('/register', authController.register);
router.post('/login', authController.login);
// Rota temporária desativada pois não é mais necessária
// router.post('/temp-login', tempAuthController.loginAdmin);

// Rotas protegidas
router.get('/me', authMiddleware.verificarToken, authController.getMe);
router.post('/change-password', authMiddleware.verificarToken, authController.changePassword);

module.exports = router;
