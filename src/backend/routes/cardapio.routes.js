const express = require('express');
const router = express.Router();
const cardapioController = require('../controllers/cardapio.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware.verificarToken);

// Rotas para Categorias
router.get('/categorias', cardapioController.getAllCategorias);
router.get('/categorias/:id', cardapioController.getCategoria);
router.get('/categorias/:id/itens', cardapioController.getItensByCategoria); // Nova rota para buscar itens por categoria
router.post('/categorias', authMiddleware.verificarSuperAdmin, cardapioController.createCategoria);
router.put('/categorias/:id', authMiddleware.verificarSuperAdmin, cardapioController.updateCategoria);
router.delete('/categorias/:id', authMiddleware.verificarSuperAdmin, cardapioController.deleteCategoria);

// Rotas para Itens do Cardápio
router.get('/itens', cardapioController.getAllItens);
router.get('/itens/populares', cardapioController.getItensMaisPopulares);
router.get('/itens/:id', cardapioController.getItem);
router.post('/itens', authMiddleware.verificarSuperAdmin, cardapioController.createItem);
router.put('/itens/:id', authMiddleware.verificarSuperAdmin, cardapioController.updateItem);
router.delete('/itens/:id', authMiddleware.verificarSuperAdmin, cardapioController.deleteItem);
router.put('/itens/:id/estatisticas', cardapioController.atualizarEstatisticas);

module.exports = router;
