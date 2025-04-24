const express = require('express');
const router = express.Router();
const comprovanteController = require('../controllers/comprovante.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// Aplicar middleware de autenticação para todas as rotas
router.use(verificarToken);

// Rotas para comprovantes
router.post('/gerar', comprovanteController.gerarComprovante);
router.post('/enviar-whatsapp', comprovanteController.enviarWhatsApp);
router.post('/imprimir', comprovanteController.prepararImpressao);

module.exports = router;
