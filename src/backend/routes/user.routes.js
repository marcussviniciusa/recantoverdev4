const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware.verificarToken);

// Rotas para gestão de usuários
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUser);
router.post('/', authMiddleware.verificarSuperAdmin, userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', authMiddleware.verificarSuperAdmin, userController.deleteUser);
router.put('/:id/status', authMiddleware.verificarSuperAdmin, userController.updateStatus);
router.put('/:id/role', authMiddleware.verificarSuperAdmin, userController.updateRole);
router.get('/:id/performance', userController.getPerformance);
router.put('/:id/performance', authMiddleware.verificarSuperAdmin, userController.updatePerformance);

module.exports = router;
