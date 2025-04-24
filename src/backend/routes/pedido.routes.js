const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/pedido.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware.verificarToken);

// Rotas para pedidos
router.get('/', pedidoController.getAllPedidos);
router.get('/:id', pedidoController.getPedido);
router.post('/', pedidoController.createPedido);
router.put('/:id/item-status', pedidoController.updateItemStatus);
router.put('/:id/status', pedidoController.updatePedidoStatus);
router.put('/:id/fechar', pedidoController.fecharPedido);
router.put('/:id/pagar', pedidoController.registrarPagamento);
router.post('/mesa/:mesaId/pagar-dividido', pedidoController.registrarPagamentoDividido);
router.put('/:id/cancelar', pedidoController.cancelarPedido);
router.put('/:id/cancelar-pagamento', pedidoController.cancelarPagamento);
router.delete('/:id/excluir-registro', pedidoController.excluirRegistroPagamento);
router.post('/:id/enviar-comanda', pedidoController.enviarComandaWhatsApp);

// Rotas para organização de pedidos
router.delete('/:id/excluir-permanente', pedidoController.excluirPedidoPermanente);
router.put('/:id/concluir-visual', pedidoController.concluirVisualPedido);
router.get('/mesa/:mesaId', pedidoController.getPedidosByMesa);

module.exports = router;
