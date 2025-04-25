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
    
    // Buscar dados do pedido com populate completo para garantir dados precisos
    const pedido = await Pedido.findById(pedidoId)
      .populate({ path: 'itens.item', strictPopulate: false })
      // Removido populate de itens.produto que não existe no schema
      .populate({ path: 'mesa', strictPopulate: false })
      .populate({ path: 'garcom', select: 'nome', strictPopulate: false })
      .populate({ path: 'usuarioPagamento', select: 'nome', strictPopulate: false })
      .populate({ path: 'cliente', select: 'nome telefone email', strictPopulate: false });
    
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }
    
    // Verificação robusta do status de pagamento
    console.log(`[DEBUG] Pedido ID ${pedidoId} - Status: ${pedido.status}, Pago: ${pedido.pago}`);
    
    // Se o pedido estiver com status 'pago' mas o campo pago=false, vamos corrigir isso automaticamente
    if (pedido.status === 'pago' && !pedido.pago) {
      console.log(`[CORREÇÃO] Pedido ${pedidoId} está com status=pago mas campo pago=false. Corrigindo...`);
      // Forçar a atualização do campo pago
      pedido.pago = true;
      await pedido.save();
      console.log(`[CORREÇÃO] Campo pago atualizado com sucesso para o pedido ${pedidoId}`);
    }
    
    // Verificar se o pedido está pago (após possível correção)
    if (!pedido.pago) {
      return res.status(400).json({
        success: false,
        message: 'Este pedido ainda não foi pago'
      });
    }
    
    // Preparar dados completos e precisos para o comprovante
    let pagamento = null;
    
    // Verificar se existe informação de pagamento e obter os dados mais completos possíveis
    if (pedido.pagamento) {
      pagamento = pedido.pagamento;
    } else if (pedido.historicoPagamentos && pedido.historicoPagamentos.length > 0) {
      // Se não houver pagamento direto, usar o último registro no histórico
      pagamento = pedido.historicoPagamentos[pedido.historicoPagamentos.length - 1];
      console.log('[INFO] Usando dados do histórico de pagamentos para o comprovante');
    }
    
    // Priorizar dados do cliente vindos do pedido, com fallback para os dados adicionais
    const cliente = {
      nome: pedido.cliente?.nome || dadosAdicionais?.cliente?.nome || 'Cliente',
      telefone: pedido.cliente?.telefone || dadosAdicionais?.cliente?.telefone || '',
      email: pedido.cliente?.email || dadosAdicionais?.cliente?.email || ''
    };
    
    console.log('[DEBUG Comprovante] Dados do pedido:', {
      id: pedido._id,
      incluirTaxaServico: pedido.incluirTaxaServico,
      taxaServico: pedido.taxaServico,
      valorTotal: pedido.valorTotal,
      valorFinal: pedido.valorFinal
    });
    
    const dados = {
      pedido,
      pagamento,
      cliente,
      valorTotal: pedido.valorTotal || 0,
      metodoPagamento: pagamento?.metodo || (pagamento?.divisao && pagamento?.divisao.length > 0 ? 'dividido' : 'não especificado'),
      dataPagamento: pagamento?.data || pedido.dataAtualizacao || new Date()
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
    console.log('[DEBUG] Requisição recebida para enviar WhatsApp:', req.body);
    const { pedidoId, telefone, dadosAdicionais } = req.body;
    
    if (!pedidoId || !telefone) {
      return res.status(400).json({
        success: false,
        message: 'ID do pedido e telefone são obrigatórios'
      });
    }
    
    // Buscar dados do pedido com populate completo para garantir dados precisos
    const pedido = await Pedido.findById(pedidoId)
      .populate({ path: 'itens.item', strictPopulate: false })
      // Removido populate de itens.produto que não existe no schema
      .populate({ path: 'mesa', strictPopulate: false })
      .populate({ path: 'garcom', select: 'nome', strictPopulate: false })
      .populate({ path: 'usuarioPagamento', select: 'nome', strictPopulate: false })
      .populate({ path: 'cliente', select: 'nome telefone email', strictPopulate: false });
    
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }
    
    // Verificação robusta do status de pagamento
    console.log(`[DEBUG] Pedido ID ${pedidoId} - Status: ${pedido.status}, Pago: ${pedido.pago}`);
    
    // Se o pedido estiver com status 'pago' mas o campo pago=false, vamos corrigir isso automaticamente
    if (pedido.status === 'pago' && !pedido.pago) {
      console.log(`[CORREÇÃO] Pedido ${pedidoId} está com status=pago mas campo pago=false. Corrigindo...`);
      // Forçar a atualização do campo pago
      pedido.pago = true;
      await pedido.save();
      console.log(`[CORREÇÃO] Campo pago atualizado com sucesso para o pedido ${pedidoId}`);
    }
    
    // Verificar se o pedido está pago (após possível correção)
    if (!pedido.pago) {
      return res.status(400).json({
        success: false,
        message: 'Este pedido ainda não foi pago'
      });
    }
    
    // Preparar dados completos e precisos para o comprovante
    let pagamento = null;
    
    // Verificar se existe informação de pagamento e obter os dados mais completos possíveis
    if (pedido.pagamento) {
      pagamento = pedido.pagamento;
    } else if (pedido.historicoPagamentos && pedido.historicoPagamentos.length > 0) {
      // Se não houver pagamento direto, usar o último registro no histórico
      pagamento = pedido.historicoPagamentos[pedido.historicoPagamentos.length - 1];
      console.log('[INFO] Usando dados do histórico de pagamentos para o comprovante');
    }
    
    // Priorizar dados do cliente vindos do pedido, com fallback para os dados adicionais
    const cliente = {
      nome: pedido.cliente?.nome || dadosAdicionais?.cliente?.nome || 'Cliente',
      telefone: pedido.cliente?.telefone || dadosAdicionais?.cliente?.telefone || '',
      email: pedido.cliente?.email || dadosAdicionais?.cliente?.email || ''
    };
    
    console.log('[DEBUG Comprovante] Dados do pedido:', {
      id: pedido._id,
      incluirTaxaServico: pedido.incluirTaxaServico,
      taxaServico: pedido.taxaServico,
      valorTotal: pedido.valorTotal,
      valorFinal: pedido.valorFinal
    });
    
    const dados = {
      pedido,
      pagamento,
      cliente,
      valorTotal: pedido.valorTotal || 0,
      metodoPagamento: pagamento?.metodo || (pagamento?.divisao && pagamento?.divisao.length > 0 ? 'dividido' : 'não especificado'),
      dataPagamento: pagamento?.data || pedido.dataAtualizacao || new Date()
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
    
    // Buscar dados do pedido com populate completo para garantir dados precisos
    const pedido = await Pedido.findById(pedidoId)
      .populate({ path: 'itens.item', strictPopulate: false })
      // Removido populate de itens.produto que não existe no schema
      .populate({ path: 'mesa', strictPopulate: false })
      .populate({ path: 'garcom', select: 'nome', strictPopulate: false })
      .populate({ path: 'usuarioPagamento', select: 'nome', strictPopulate: false })
      .populate({ path: 'cliente', select: 'nome telefone email', strictPopulate: false });
    
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }
    
    // Verificação robusta do status de pagamento
    console.log(`[DEBUG] Pedido ID ${pedidoId} - Status: ${pedido.status}, Pago: ${pedido.pago}`);
    
    // Se o pedido estiver com status 'pago' mas o campo pago=false, vamos corrigir isso automaticamente
    if (pedido.status === 'pago' && !pedido.pago) {
      console.log(`[CORREÇÃO] Pedido ${pedidoId} está com status=pago mas campo pago=false. Corrigindo...`);
      // Forçar a atualização do campo pago
      pedido.pago = true;
      await pedido.save();
      console.log(`[CORREÇÃO] Campo pago atualizado com sucesso para o pedido ${pedidoId}`);
    }
    
    // Verificar se o pedido está pago (após possível correção)
    if (!pedido.pago) {
      return res.status(400).json({
        success: false,
        message: 'Este pedido ainda não foi pago'
      });
    }
    
    // Preparar dados completos e precisos para o comprovante
    let pagamento = null;
    
    // Verificar se existe informação de pagamento e obter os dados mais completos possíveis
    if (pedido.pagamento) {
      pagamento = pedido.pagamento;
    } else if (pedido.historicoPagamentos && pedido.historicoPagamentos.length > 0) {
      // Se não houver pagamento direto, usar o último registro no histórico
      pagamento = pedido.historicoPagamentos[pedido.historicoPagamentos.length - 1];
      console.log('[INFO] Usando dados do histórico de pagamentos para o comprovante');
    }
    
    // Priorizar dados do cliente vindos do pedido, com fallback para os dados adicionais
    const cliente = {
      nome: pedido.cliente?.nome || dadosAdicionais?.cliente?.nome || 'Cliente',
      telefone: pedido.cliente?.telefone || dadosAdicionais?.cliente?.telefone || '',
      email: pedido.cliente?.email || dadosAdicionais?.cliente?.email || ''
    };
    
    console.log('[DEBUG Comprovante] Dados do pedido:', {
      id: pedido._id,
      incluirTaxaServico: pedido.incluirTaxaServico,
      taxaServico: pedido.taxaServico,
      valorTotal: pedido.valorTotal,
      valorFinal: pedido.valorFinal
    });
    
    const dados = {
      pedido,
      pagamento,
      cliente,
      valorTotal: pedido.valorTotal || 0,
      metodoPagamento: pagamento?.metodo || (pagamento?.divisao && pagamento?.divisao.length > 0 ? 'dividido' : 'não especificado'),
      dataPagamento: pagamento?.data || pedido.dataAtualizacao || new Date()
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
