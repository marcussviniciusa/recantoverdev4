const Pedido = require('../models/pedido.model');
const { ItemCardapio } = require('../models/cardapio.model');
const Mesa = require('../models/mesa.model');
const axios = require('axios');

// Obter todos os pedidos
exports.getAllPedidos = async (req, res) => {
  try {
    // Filtros opcionais
    const { mesa, garcom, status, data } = req.query;
    
    // Construir objeto de filtro
    const filtro = {};
    if (mesa) filtro.mesa = mesa;
    if (garcom) filtro.garcom = garcom;
    if (status) filtro.status = status;
    
    // Tratar filtro de registros excluídos
    const excluidoDaLista = req.query.excluidoDaLista;
    if (excluidoDaLista === 'false') {
      filtro.excluidoDaLista = { $ne: true }; // Retornar apenas não excluídos
    } else if (excluidoDaLista === 'true') {
      filtro.excluidoDaLista = true; // Retornar apenas excluídos
    }
    
    // Verificar se deve agrupar por mesa (para histórico de pagamentos)
    const agruparPorMesa = req.query.agruparPorMesa === 'true';
    
    // Filtro por data
    if (data) {
      const dataInicio = new Date(data);
      dataInicio.setHours(0, 0, 0, 0);
      
      const dataFim = new Date(data);
      dataFim.setHours(23, 59, 59, 999);
      
      filtro.dataCriacao = {
        $gte: dataInicio,
        $lte: dataFim
      };
    }
    
    // Verificar se deve popular campos adicionais
    const populate = req.query.populate ? req.query.populate.split(',') : [];
    
    let query = Pedido.find(filtro)
      .populate('mesa', 'numero')
      .populate('garcom', 'nome')
      .populate('itens.item', 'nome categoria')
      .sort({ dataCriacao: -1 });
    
    // Adicionar populações adicionais conforme solicitado
    if (populate.includes('usuarioPagamento')) {
      query = query.populate('usuarioPagamento', 'nome email');
    }
    
    // Executar a consulta
    const pedidos = await query.exec();
    
    // Se solicitado para agrupar por mesa (para histórico de pagamentos)
    if (agruparPorMesa && status === 'pago') {
      // Agrupar pedidos por mesa e data (mesmo dia)
      const pedidosAgrupados = [];
      const mesasProcessadas = new Map(); // Map para rastrear mesas já processadas
      
      // Primeiro, vamos agrupar por mesa e data
      for (const pedido of pedidos) {
        // Pular pedidos sem mesa
        if (!pedido.mesa) continue;
        
        const mesaId = pedido.mesa._id.toString();
        const dataPagamento = pedido.dataPagamento;
        const dataStr = dataPagamento ? new Date(dataPagamento).toISOString().split('T')[0] : 'sem-data';
        const chave = `${mesaId}-${dataStr}`;
        
        if (!mesasProcessadas.has(chave)) {
          // Esta é a primeira ocorrência desta mesa nesta data
          mesasProcessadas.set(chave, {
            indice: pedidosAgrupados.length,
            total: pedido.valorTotal || 0,
            pedidosIds: [pedido._id],
            pedido: pedido
          });
          
          // Adicionar ao array de pedidos agrupados
          pedidosAgrupados.push(pedido);
        } else {
          // Esta mesa já foi processada para esta data
          const dadosMesa = mesasProcessadas.get(chave);
          
          // Atualizar valor total
          dadosMesa.total += pedido.valorTotal || 0;
          dadosMesa.pedidosIds.push(pedido._id);
          
          // Atualizar o pedido agrupado com o valor total
          const pedidoAgrupado = pedidosAgrupados[dadosMesa.indice];
          pedidoAgrupado.valorTotal = dadosMesa.total;
          pedidoAgrupado._pedidosAgrupados = dadosMesa.pedidosIds;
        }
      }
      
      // Retornar os pedidos agrupados
      res.status(200).json({
        success: true,
        count: pedidosAgrupados.length,
        data: pedidosAgrupados,
        agrupados: true
      });
    } else {
      // Comportamento padrão - retornar sem agrupar
      res.status(200).json({
        success: true,
        count: pedidos.length,
        data: pedidos,
        agrupados: false
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar pedidos',
      error: error.message
    });
  }
};

// Obter um pedido específico
exports.getPedido = async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id)
      .populate('mesa', 'numero')
      .populate('garcom', 'nome')
      .populate('itens.item', 'nome categoria preco');
    
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }
    
    res.status(200).json({
      success: true,
      data: pedido
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar pedido',
      error: error.message
    });
  }
};

// Criar novo pedido
exports.createPedido = async (req, res) => {
  try {
    console.log('Recebido pedido:', req.body);
    console.log('Usuário da requisição:', req.usuario ? req.usuario._id : 'Não disponível');
    
    const { mesa: mesaId, itens, observacao, pagante } = req.body;
    
    // Verificar se a mesa existe
    const mesa = await Mesa.findById(mesaId);
    if (!mesa) {
      return res.status(404).json({
        success: false,
        message: 'Mesa não encontrada'
      });
    }
    
    // Verificar se a mesa está ocupada
    if (mesa.status !== 'ocupada') {
      return res.status(400).json({
        success: false,
        message: 'A mesa precisa estar ocupada para fazer um pedido'
      });
    }
    
    // Verificar se os itens do cardápio existem e calcular valor total
    let valorTotal = 0;
    const itensValidados = [];
    
    for (const item of itens) {
      const itemCardapio = await ItemCardapio.findById(item.itemId);
      if (!itemCardapio) {
        return res.status(404).json({
          success: false,
          message: `Item ${item.itemId} não encontrado no cardápio`
        });
      }
      
      const valorItem = itemCardapio.preco * item.quantidade;
      valorTotal += valorItem;
      
      itensValidados.push({
        item: itemCardapio._id,
        nome: itemCardapio.nome,
        quantidade: item.quantidade,
        preco: itemCardapio.preco, // This is the required field in the Pedido model
        valorUnitario: itemCardapio.preco,
        valorTotal: valorItem,
        observacao: item.observacao || '',
        status: 'pendente'
      });
    }
    
    // Criar o pedido
    const pedido = new Pedido({
      mesa: mesaId,
      garcom: req.usuario._id,
      itens: itensValidados,
      valorTotal,
      observacao: observacao || '',
      status: 'aberto'
    });
    
    // Se houver pagante especificado, adicionar o pedido a ele na mesa
    if (pagante && pagante.identificador) {
      // Verificar se o pagante existe na mesa
      const paganteExistente = mesa.pagantes.find(p => p.identificador === pagante.identificador);
      
      if (paganteExistente) {
        // Adicionar o pedido ao pagante existente
        paganteExistente.pedidos.push(pedido._id);
      } else {
        // Criar novo pagante e adicionar o pedido
        mesa.pagantes.push({
          nome: pagante.nome || `Pagante ${mesa.pagantes.length + 1}`,
          identificador: pagante.identificador,
          pedidos: [pedido._id]
        });
      }
      
      await mesa.save();
    }
    
    // Salvar o pedido
    await pedido.save();
    
    // Buscar o pedido com as relações populadas para retornar
    const pedidoPopulado = await Pedido.findById(pedido._id)
      .populate('mesa', 'numero')
      .populate('garcom', 'nome')
      .populate('itens.item', 'nome categoria');
    
    res.status(201).json({
      success: true,
      message: 'Pedido criado com sucesso',
      data: pedidoPopulado
    });
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar pedido',
      error: error.message,
      stack: error.stack // Incluir stack trace para debug
    });
  }
};

// Atualizar status de um item do pedido
exports.updateItemStatus = async (req, res) => {
  try {
    const { itemId, status } = req.body;
    
    const pedido = await Pedido.findById(req.params.id);
    
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }
    
    // Atualizar status do item
    await pedido.atualizarStatusItem(itemId, status);
    
    // Verificar se todos os itens estão prontos ou entregues para atualizar o status do pedido
    const todosItensFinalizados = pedido.itens.every(item => 
      item.status === 'pronto' || item.status === 'entregue'
    );
    
    const todosItensEntregues = pedido.itens.every(item => 
      item.status === 'entregue'
    );
    
    if (todosItensEntregues && pedido.status === 'aberto') {
      pedido.status = 'parcial';
      await pedido.save();
    } else if (todosItensFinalizados && pedido.status === 'parcial') {
      pedido.status = 'fechado';
      await pedido.save();
    }
    
    res.status(200).json({
      success: true,
      message: 'Status do item atualizado com sucesso',
      data: pedido
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar status do item',
      error: error.message
    });
  }
};

// Fechar pedido
exports.fecharPedido = async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id);
    
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }
    
    if (pedido.status === 'pago' || pedido.status === 'cancelado') {
      return res.status(400).json({
        success: false,
        message: `Pedido já está ${pedido.status}`
      });
    }
    
    await pedido.fecharPedido();
    
    res.status(200).json({
      success: true,
      message: 'Pedido fechado com sucesso',
      data: pedido
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao fechar pedido',
      error: error.message
    });
  }
};

// Registrar pagamento
exports.registrarPagamento = async (req, res) => {
  try {
    const { metodoPagamento } = req.body;
    
    const pedido = await Pedido.findById(req.params.id);
    
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }
    
    if (pedido.status === 'pago') {
      return res.status(400).json({
        success: false,
        message: 'Pedido já foi pago'
      });
    }
    
    if (pedido.status === 'cancelado') {
      return res.status(400).json({
        success: false,
        message: 'Não é possível pagar um pedido cancelado'
      });
    }
    
    // Registrar o usuário que está finalizando o pagamento
    const usuarioId = req.usuario?._id;
    await pedido.registrarPagamento(metodoPagamento, usuarioId);
    
    res.status(200).json({
      success: true,
      message: 'Pagamento registrado com sucesso',
      data: pedido
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar pagamento',
      error: error.message
    });
  }
};

// Cancelar pedido
exports.cancelarPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    
    const pedido = await Pedido.findById(id);
    
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }
    
    // Não permitir cancelar pedidos já pagos
    if (pedido.status === 'pago') {
      return res.status(400).json({
        success: false,
        message: 'Não é possível cancelar um pedido que já foi pago'
      });
    }
    
    pedido.status = 'cancelado';
    pedido.observacoes = motivo || 'Pedido cancelado pelo usuário';
    
    // Adicionar ao histórico
    pedido.historicoStatus.push({
      status: 'cancelado',
      timestamp: new Date(),
      responsavel: req.usuario._id,
      observacao: motivo || 'Pedido cancelado pelo usuário'
    });
    
    await pedido.save();
    
    res.status(200).json({
      success: true,
      message: 'Pedido cancelado com sucesso',
      data: pedido
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao cancelar pedido',
      error: error.message
    });
  }
};

// Cancelar pagamento
exports.cancelarPagamento = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    
    const pedido = await Pedido.findById(id);
    
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }
    
    // Verificar se o pedido está pago
    if (pedido.status !== 'pago') {
      return res.status(400).json({
        success: false,
        message: 'Apenas pedidos pagos podem ter o pagamento cancelado'
      });
    }
    
    // Restaurar status anterior
    pedido.status = 'fechado';
    pedido.metodoPagamento = '';
    pedido.dataPagamento = null;
    pedido.usuarioPagamento = null;
    
    // Adicionar ao histórico
    pedido.historicoStatus.push({
      status: 'pagamento_cancelado',
      timestamp: new Date(),
      responsavel: req.usuario._id,
      observacao: motivo || 'Pagamento cancelado pelo usuário'
    });
    
    await pedido.save();
    
    // Se pedido faz parte de uma mesa, verificar se a mesa precisa ser reaberta
    if (pedido.mesa) {
      const mesa = await Mesa.findById(pedido.mesa);
      if (mesa && mesa.status === 'disponivel') {
        mesa.status = 'ocupada';
        await mesa.save();
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Pagamento cancelado com sucesso',
      data: pedido
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao cancelar pagamento',
      error: error.message
    });
  }
};

// Excluir registro de pagamento da lista (sem afetar o estado da mesa)
exports.excluirRegistroPagamento = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar o pedido para identificar a mesa
    const pedidoOriginal = await Pedido.findById(id);
    
    if (!pedidoOriginal) {
      return res.status(404).json({
        success: false,
        message: 'Registro de pagamento não encontrado'
      });
    }
    
    // Verificar se o pedido original tem mesa
    const mesaId = pedidoOriginal.mesa;
    const dataPagamento = pedidoOriginal.dataPagamento;
    
    let resultado;
    
    // Se tiver mesa, excluir todos os pedidos da mesma mesa pagos na mesma data 
    if (mesaId && dataPagamento) {
      // Calcular o início e fim do dia do pagamento
      const dataInicio = new Date(dataPagamento);
      dataInicio.setHours(0, 0, 0, 0);
      
      const dataFim = new Date(dataPagamento);
      dataFim.setHours(23, 59, 59, 999);
      
      // Buscar e marcar como excluídos todos os pedidos da mesma mesa e do mesmo dia
      resultado = await Pedido.updateMany(
        { 
          mesa: mesaId,
          status: 'pago',
          dataPagamento: { $gte: dataInicio, $lte: dataFim }
        },
        {
          $set: {
            excluidoDaLista: true,
            excluidoPor: req.usuario?._id,
            dataExclusao: new Date()
          }
        }
      );
      
      return res.status(200).json({
        success: true,
        message: `Todos os registros de pagamento desta mesa foram excluídos da lista com sucesso`,
        data: {
          excluidos: resultado.modifiedCount,
          mesa: mesaId
        }
      });
    } else {
      // Caso não tenha mesa, excluir apenas o pedido individual
      resultado = await Pedido.findByIdAndUpdate(id, {
        $set: {
          excluidoDaLista: true,
          excluidoPor: req.usuario?._id,
          dataExclusao: new Date()
        }
      }, { new: true });
      
      return res.status(200).json({
        success: true,
        message: 'Registro de pagamento excluído da lista com sucesso',
        data: resultado
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir registro de pagamento',
      error: error.message
    });
  }
};

// Excluir pedido permanentemente do banco de dados
exports.excluirPedidoPermanente = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verifica se o pedido existe
    const pedido = await Pedido.findById(id);
    
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }
    
    // Exclui permanentemente o pedido
    await Pedido.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'Pedido excluído permanentemente',
      data: { id }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir pedido',
      error: error.message
    });
  }
};

// Concluir pedido visualmente (apenas organizacional, não afeta o estado real do pedido)
exports.concluirVisualPedido = async (req, res) => {
  try {
    const { id } = req.params;
    
    const pedido = await Pedido.findByIdAndUpdate(id, {
      $set: {
        concluidoVisualmente: true,  // Campo apenas visual
        concluidoPor: req.usuario?._id,
        dataConclusaoVisual: new Date()
      }
    }, { new: true });
    
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Pedido marcado como concluído visualmente (não afeta seu estado real)',
      data: pedido
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao concluir visualmente o pedido',
      error: error.message
    });
  }
};

// Enviar comanda por WhatsApp
exports.enviarComandaWhatsApp = async (req, res) => {
  try {
    const { telefone, linkImagem } = req.body;
    
    if (!telefone) {
      return res.status(400).json({
        success: false,
        message: 'Número de telefone é obrigatório'
      });
    }
    
    const pedido = await Pedido.findById(req.params.id);
    
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }
    
    // Gerar comanda no sistema
    await pedido.gerarComanda(telefone);
    
    // Configurar a API de WhatsApp
    const apiDomain = process.env.WHATSAPP_API_DOMAIN;
    const apiKey = process.env.WHATSAPP_API_KEY;
    const instancia = process.env.WHATSAPP_INSTANCE;
    
    // Formatar o número do telefone (remover caracteres não numéricos)
    const numeroFormatado = telefone.replace(/\D/g, '');
    
    // Preparar payload para a API
    const payload = {
      number: numeroFormatado,
      mediatype: "image",
      mimetype: "image/jpeg",
      media: linkImagem || "https://api.rhaizaamaral.com.br/public/5/2952cab1-b0ed-44e2-ab87-57ea7847599e.jpeg",
      fileName: `Comanda-${pedido.comanda.numeroPedido}.jpeg`
    };
    
    // Configurar cabeçalhos da requisição
    const headers = {
      'Content-Type': 'application/json',
      'apikey': apiKey
    };
    
    // Enviar requisição para a API de WhatsApp
    const response = await axios.post(
      `https://${apiDomain}/message/sendMedia/${instancia}`,
      payload,
      { headers }
    );
    
    // Salvar link da comanda
    pedido.comanda.linkComanda = linkImagem;
    await pedido.save();
    
    res.status(200).json({
      success: true,
      message: 'Comanda enviada com sucesso',
      data: {
        pedido,
        whatsappResponse: response.data
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao enviar comanda por WhatsApp',
      error: error.message
    });
  }
};

// Obter pedidos por mesa
exports.getPedidosByMesa = async (req, res) => {
  try {
    const { mesaId } = req.params;
    
    const pedidos = await Pedido.find({ 
      mesa: mesaId,
      status: { $in: ['aberto', 'parcial', 'fechado'] }
    })
      .populate('garcom', 'nome')
      .populate('itens.item', 'nome categoria')
      .sort({ dataCriacao: -1 });
    
    res.status(200).json({
      success: true,
      count: pedidos.length,
      data: pedidos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar pedidos da mesa',
      error: error.message
    });
  }
};

// Atualizar status do pedido
exports.updatePedidoStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, observacao } = req.body;
    
    // Validar o status
    const statusValidos = ['pendente', 'em_preparo', 'pronto', 'entregue', 'pago', 'cancelado'];
    if (!statusValidos.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status inválido. Status válidos são: ${statusValidos.join(', ')}`
      });
    }
    
    const pedido = await Pedido.findById(id)
      .populate('mesa', 'numero')
      .populate('garcom', 'nome _id')
      .populate('itens.item', 'nome');
    
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }
    
    // Não permitir alteração de pedidos já pagos ou cancelados
    if (pedido.status === 'pago' || pedido.status === 'cancelado') {
      return res.status(400).json({
        success: false,
        message: `Não é possível alterar o status de um pedido ${pedido.status}`
      });
    }
    
    // Atualizar o status e adicionar ao histórico
    const statusAnterior = pedido.status;
    pedido.status = status;
    
    // Adicionar registro ao histórico
    pedido.historicoStatus.push({
      status,
      timestamp: new Date(),
      responsavel: req.usuario._id,
      observacao: observacao || ''
    });
    
    // Se estiver marcando como pronto, registrar tempo de preparo
    if (status === 'pronto' && statusAnterior === 'em_preparo') {
      const inicioPreparoRegistro = pedido.historicoStatus.find(h => h.status === 'em_preparo');
      if (inicioPreparoRegistro) {
        const tempoPreparo = new Date() - new Date(inicioPreparoRegistro.timestamp);
        const tempoPreparoMinutos = Math.floor(tempoPreparo / 1000 / 60);
        pedido.tempoPreparo = tempoPreparoMinutos;
      }
    }
    
    // Salvar o pedido atualizado
    await pedido.save();
    
    // Emitir evento em tempo real através do Socket.IO
    // O io é injetado no objeto req pelo middleware de Socket.IO
    if (req.io) {
      // Evento geral de atualização de pedido
      req.io.emit('pedido_atualizado', {
        pedidoId: pedido._id,
        status,
        statusAnterior,
        mesaId: pedido.mesa._id,
        mesaNumero: pedido.mesa.numero
      });
      
      // Evento específico para notificar garçons quando um pedido estiver pronto
      if (status === 'pronto') {
        req.io.emit('pedido_pronto', {
          pedidoId: pedido._id,
          mesaId: pedido.mesa._id,
          mesaNumero: pedido.mesa.numero,
          numeroPedido: pedido.numeroPedido || id.substr(-4),
          garcomId: pedido.garcom?._id || null,
          garcomNome: pedido.garcom?.nome || 'Não definido'
        });
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Status do pedido atualizado para ${status}`,
      data: pedido
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar status do pedido',
      error: error.message
    });
  }
};

// Registrar pagamento dividido
exports.registrarPagamentoDividido = async (req, res) => {
  try {
    const { mesaId } = req.params;
    const { pagantes, pedidos: pedidosIds } = req.body;
    
    // Validar pagantes
    if (!pagantes || !Array.isArray(pagantes) || pagantes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'É necessário informar pelo menos um pagante'
      });
    }
    
    // Verificar se a mesa existe
    const mesa = await Mesa.findById(mesaId);
    if (!mesa) {
      return res.status(404).json({
        success: false,
        message: 'Mesa não encontrada'
      });
    }
    
    // Buscar pedidos da mesa
    let pedidosFiltrados = [];
    if (pedidosIds && Array.isArray(pedidosIds) && pedidosIds.length > 0) {
      pedidosFiltrados = await Pedido.find({
        _id: { $in: pedidosIds },
        mesa: mesaId,
        status: { $nin: ['pago', 'cancelado'] }
      }).populate('itens.item', 'nome categoria preco');
    } else {
      pedidosFiltrados = await Pedido.find({
        mesa: mesaId,
        status: { $nin: ['pago', 'cancelado'] }
      }).populate('itens.item', 'nome categoria preco');
    }
    
    if (pedidosFiltrados.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Não foram encontrados pedidos para pagamento'
      });
    }
    
    // Calcular valor total dos pedidos
    const valorTotal = pedidosFiltrados.reduce((total, pedido) => {
      return total + pedido.itens.reduce((subtotal, item) => {
        return subtotal + (item.preco * item.quantidade);
      }, 0);
    }, 0);
    
    // Verificar se o valor total dos pagantes corresponde ao valor total dos pedidos
    const valorTotalPagantes = pagantes.reduce((total, pagante) => {
      return total + parseFloat(pagante.valor || 0);
    }, 0);
    
    // Permitir uma pequena discrepância devido a arredondamentos (1 centavo)
    if (Math.abs(valorTotal - valorTotalPagantes) > 0.01) {
      return res.status(400).json({
        success: false,
        message: `O valor total dos pagantes (R$ ${valorTotalPagantes.toFixed(2)}) não corresponde ao valor total dos pedidos (R$ ${valorTotal.toFixed(2)})`
      });
    }
    
    // Registrar os pagamentos
    const registros = [];
    
    for (const pagante of pagantes) {
      const registro = {
        nome: pagante.nome,
        metodo: pagante.metodo,
        valor: parseFloat(pagante.valor),
        timestamp: new Date(),
        responsavel: req.usuario._id
      };
      
      // Se houve pagamento em dinheiro, calcular o troco
      if (pagante.metodo === 'dinheiro' && pagante.valorPago > pagante.valor) {
        registro.valorPago = parseFloat(pagante.valorPago);
        registro.troco = parseFloat(pagante.valorPago) - parseFloat(pagante.valor);
      }
      
      registros.push(registro);
    }
    
    // Atualizar todos os pedidos
    const atualizacoes = pedidosFiltrados.map(async (pedido) => {
      pedido.status = 'pago';
      
      // Adicionar informações de pagamento
      if (!pedido.pagamento) {
        pedido.pagamento = {
          status: 'pago',
          metodos: [],
          registros: [],
          valorTotal: 0
        };
      }
      
      pedido.pagamento.status = 'pago';
      pedido.pagamento.valorTotal = valorTotal;
      pedido.pagamento.registros = [...(pedido.pagamento.registros || []), ...registros];
      
      // Registrar métodos utilizados
      const metodos = [...new Set(pagantes.map(p => p.metodo))];
      pedido.pagamento.metodos = Array.from(new Set([...(pedido.pagamento.metodos || []), ...metodos]));
      
      // Adicionar ao histórico
      pedido.historicoStatus.push({
        status: 'pago',
        timestamp: new Date(),
        responsavel: req.usuario._id,
        observacao: `Pagamento dividido entre ${pagantes.length} pagantes`
      });
      
      // Registrar o usuário que finalizou o pagamento
      pedido.usuarioPagamento = req.usuario._id;
      pedido.dataPagamento = new Date();
      pedido.metodoPagamento = pagantes.map(p => p.metodo).join(', ');
      
      return pedido.save();
    });
    
    await Promise.all(atualizacoes);
    
    // Se todos os pedidos da mesa foram pagos, verificar se pode liberar a mesa
    const pedidosNaoPagos = await Pedido.countDocuments({
      mesa: mesaId,
      status: { $nin: ['pago', 'cancelado'] }
    });
    
    // Se não houver mais pedidos não pagos, perguntar se deseja liberar a mesa
    let mesaLiberada = false;
    if (pedidosNaoPagos === 0) {
      // Opcional: liberar a mesa automaticamente
      // mesa.status = 'disponivel';
      // mesa.ocupantes = [];
      // mesa.horarioOcupacao = null;
      // await mesa.save();
      // mesaLiberada = true;
    }
    
    // Notificar via Socket.IO
    if (req.io) {
      // Evento de pagamento
      req.io.emit('pagamento_registrado', {
        mesaId: mesa._id,
        mesaNumero: mesa.numero,
        valorTotal,
        pedidosIds: pedidosFiltrados.map(p => p._id)
      });
      
      // Se a mesa foi liberada
      if (mesaLiberada) {
        req.io.emit('mesa_atualizada', {
          mesaId: mesa._id,
          mesaNumero: mesa.numero,
          status: 'disponivel'
        });
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Pagamento dividido registrado com sucesso',
      data: {
        pedidos: pedidosFiltrados,
        registros,
        valorTotal,
        mesaLiberada
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar pagamento dividido',
      error: error.message
    });
  }
};
