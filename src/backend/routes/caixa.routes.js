const express = require('express');
const router = express.Router();
const caixaController = require('../controllers/caixa.controller');
const { verificarToken, verificarRole } = require('../middlewares/auth.middleware');

// Aplicar middleware de autenticação para todas as rotas de caixa
router.use(verificarToken);

// Rotas básicas
router.get('/atual', caixaController.getCaixaAtual);
router.get('/', caixaController.listarHistorico);
router.get('/relatorio', caixaController.gerarRelatorio);
router.get('/:id', caixaController.getCaixaById);

// Rotas de operações de caixa
router.post('/abrir', verificarRole(['superadmin', 'admin']), caixaController.abrirCaixa);
router.put('/fechar', verificarRole(['superadmin', 'admin']), caixaController.fecharCaixa);
router.post('/sangria', verificarRole(['superadmin', 'admin']), caixaController.registrarSangria);
router.post('/reforco', verificarRole(['superadmin', 'admin']), caixaController.registrarReforco);
router.post('/venda', caixaController.registrarVenda);

module.exports = router;
