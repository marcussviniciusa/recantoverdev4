const Pedido = require('../models/pedido.model');
const comprovanteService = require('../services/comprovante.service');

/**
 * Gerar comprovante de pagamento
 * @route POST /api/comprovantes/gerar
 */
exports.gerarComprovante = async (req, res) => {
  try {
    const { pedidoId, dadosAdicionais } = req.body;
    
    if (!pedidoId) {
      return res.status(400).json({
        success: false,
        message: 'ID do pedido é obrigatório'
      });
    }
    
    // Buscar dados do pedido
    const pedido = await Pedido.findById(pedidoId)
      .populate('itens.item')
      .populate('mesa')
      .populate('atendente', 'nome');
    
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }
    
    if (!pedido.pago) {
      return res.status(400).json({
        success: false,
        message: 'Este pedido ainda não foi pago'
      });
    }
    
    // Preparar dados para o comprovante
    const dados = {
      pedido,
      pagamento: pedido.pagamento,
      cliente: dadosAdicionais?.cliente || null
    };
    
    // Gerar o PDF do comprovante
    const comprovante = await comprovanteService.gerarComprovantePDF(dados);
    
    return res.status(200).json({
      success: true,
      data: comprovante,
      message: 'Comprovante gerado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao gerar comprovante:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao gerar comprovante',
      error: error.message
    });
  }
};

/**
 * Enviar comprovante via WhatsApp
 * @route POST /api/comprovantes/enviar-whatsapp
 */
exports.enviarWhatsApp = async (req, res) => {
  try {
    const { pedidoId, telefone, dadosAdicionais } = req.body;
    
    if (!pedidoId || !telefone) {
      return res.status(400).json({
        success: false,
        message: 'ID do pedido e telefone são obrigatórios'
      });
    }
    
    // Buscar dados do pedido
    const pedido = await Pedido.findById(pedidoId)
      .populate('itens.item')
      .populate('mesa')
      .populate('atendente', 'nome');
    
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }
    
    if (!pedido.pago) {
      return res.status(400).json({
        success: false,
        message: 'Este pedido ainda não foi pago'
      });
    }
    
    // Preparar dados para o comprovante
    const dados = {
      pedido,
      pagamento: pedido.pagamento,
      cliente: dadosAdicionais?.cliente || null
    };
    
    // Gerar o PDF do comprovante
    const comprovante = await comprovanteService.gerarComprovantePDF(dados);
    
    // Enviar por WhatsApp
    const resultado = await comprovanteService.enviarComprovanteWhatsApp(
      telefone,
      comprovante.caminho,
      dados
    );
    
    if (!resultado.success) {
      return res.status(400).json(resultado);
    }
    
    return res.status(200).json({
      ...resultado,
      comprovante
    });
    
  } catch (error) {
    console.error('Erro ao enviar comprovante por WhatsApp:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao enviar comprovante por WhatsApp',
      error: error.message
    });
  }
};

/**
 * Preparar comprovante para impressão
 * @route POST /api/comprovantes/imprimir
 */
exports.prepararImpressao = async (req, res) => {
  try {
    const { pedidoId, dadosAdicionais } = req.body;
    
    if (!pedidoId) {
      return res.status(400).json({
        success: false,
        message: 'ID do pedido é obrigatório'
      });
    }
    
    // Buscar dados do pedido
    const pedido = await Pedido.findById(pedidoId)
      .populate('itens.item')
      .populate('mesa')
      .populate('atendente', 'nome');
    
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }
    
    if (!pedido.pago) {
      return res.status(400).json({
        success: false,
        message: 'Este pedido ainda não foi pago'
      });
    }
    
    // Preparar dados para o comprovante
    const dados = {
      pedido,
      pagamento: pedido.pagamento,
      cliente: dadosAdicionais?.cliente || null
    };
    
    // Preparar para impressão
    const resultado = await comprovanteService.prepararImpressao(dados);
    
    return res.status(200).json(resultado);
    
  } catch (error) {
    console.error('Erro ao preparar impressão:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao preparar impressão',
      error: error.message
    });
  }
};
