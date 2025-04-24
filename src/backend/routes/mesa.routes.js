const express = require('express');
const router = express.Router();
const mesaController = require('../controllers/mesa.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware.verificarToken);

// Rotas para operações CRUD básicas
router.get('/', mesaController.getAllMesas);
router.get('/:id', mesaController.getMesa);
router.post('/', authMiddleware.verificarSuperAdmin, mesaController.createMesa);
router.put('/:id', authMiddleware.verificarSuperAdmin, mesaController.updateMesa);
router.delete('/:id', authMiddleware.verificarSuperAdmin, mesaController.deleteMesa);

// Rotas para operações específicas de mesas
router.post('/:id/ocupar', mesaController.ocuparMesa);
router.post('/:id/liberar', mesaController.liberarMesa);
router.post('/:id/unir', mesaController.unirMesas);
router.post('/:id/pagante', mesaController.adicionarPagante);

module.exports = router;
