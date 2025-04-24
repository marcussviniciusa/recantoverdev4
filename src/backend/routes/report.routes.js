const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware.verificarToken);

// Verificar se o usuário é SuperAdmin usando o middleware verificarSuperAdmin
router.use(authMiddleware.verificarSuperAdmin);

// Rotas para relatórios
router.get('/sales', reportController.getSalesReport);
router.get('/tables', reportController.getTablesReport);
router.get('/menu', reportController.getMenuReport);

module.exports = router;
