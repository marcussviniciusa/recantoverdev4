const Caixa = require('../models/caixa.model');
const Pedido = require('../models/pedido.model');
const { isValidObjectId } = require('mongoose');
const { format, differenceInMinutes, parseISO, subDays } = require('date-fns');
const { ptBR } = require('date-fns/locale');

// Verificar se há caixa aberto e retornar
exports.getCaixaAtual = async (req, res) => {
  try {
    // Buscar caixa aberto
    const caixaAberto = await Caixa.findOne({ status: 'aberto' })
      .populate('responsavelAbertura', 'nome')
      .populate('responsavelFechamento', 'nome');
    
    if (!caixaAberto) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'Não há caixa aberto no momento'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: caixaAberto
    });
  } catch (error) {
    console.error('Erro ao buscar caixa atual:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar caixa atual'
    });
  }
};

// Abrir novo caixa
exports.abrirCaixa = async (req, res) => {
  try {
    // Verificar se já existe caixa aberto
    const caixaAberto = await Caixa.findOne({ status: 'aberto' });
    if (caixaAberto) {
      return res.status(400).json({
        success: false,
        message: 'Já existe um caixa aberto. Feche o caixa atual antes de abrir um novo.'
      });
    }
    
    const { valorInicial, observacoes } = req.body;
    
    if (valorInicial === undefined || valorInicial < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valor inicial inválido'
      });
    }
    
    // Criar novo caixa
    const novoCaixa = new Caixa({
      valorInicial,
      observacoes,
      dataAbertura: new Date(),
      responsavelAbertura: req.usuario._id,
      status: 'aberto',
      vendas: {
        total: 0,
        quantidade: 0
      },
      pagamentos: {
        dinheiro: 0,
        credito: 0,
        debito: 0,
        pix: 0,
        vale: 0,
        outros: 0
      }
    });
    
    await novoCaixa.save();
    
    return res.status(201).json({
      success: true,
      data: novoCaixa,
      message: 'Caixa aberto com sucesso'
    });
  } catch (error) {
    console.error('Erro ao abrir caixa:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao abrir caixa'
    });
  }
};

// Fechar caixa atual
exports.fecharCaixa = async (req, res) => {
  try {
    // Buscar caixa aberto
    const caixaAberto = await Caixa.findOne({ status: 'aberto' });
    
    if (!caixaAberto) {
      return res.status(400).json({
        success: false,
        message: 'Não há caixa aberto para fechar'
      });
    }
    
    const { valorFinal, observacoes } = req.body;
    
    if (valorFinal === undefined || valorFinal < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valor final inválido'
      });
    }
    
    // Calcular valor esperado no caixa
    const valorInicial = caixaAberto.valorInicial || 0;
    const vendas = caixaAberto.vendas?.total || 0;
    const sangrias = caixaAberto.sangrias?.reduce((total, s) => total + s.valor, 0) || 0;
    const reforcos = caixaAberto.reforcos?.reduce((total, r) => total + r.valor, 0) || 0;
    
    const valorEsperado = valorInicial + vendas - sangrias + reforcos;
    const diferenca = valorFinal - valorEsperado;
    
    // Atualizar caixa
    caixaAberto.valorFinal = valorFinal;
    caixaAberto.diferenca = diferenca;
    caixaAberto.status = 'fechado';
    caixaAberto.dataFechamento = new Date();
    caixaAberto.responsavelFechamento = req.usuario._id;
    
    if (observacoes) {
      caixaAberto.observacoes = observacoes;
    }
    
    await caixaAberto.save();
    
    return res.status(200).json({
      success: true,
      data: caixaAberto,
      message: 'Caixa fechado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao fechar caixa:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao fechar caixa'
    });
  }
};

// Registrar sangria
exports.registrarSangria = async (req, res) => {
  try {
    // Buscar caixa aberto
    const caixaAberto = await Caixa.findOne({ status: 'aberto' });
    
    if (!caixaAberto) {
      return res.status(400).json({
        success: false,
        message: 'Não há caixa aberto para registrar sangria'
      });
    }
    
    const { valor, motivo } = req.body;
    
    if (!valor || valor <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valor de sangria inválido'
      });
    }
    
    if (!motivo) {
      return res.status(400).json({
        success: false,
        message: 'Motivo da sangria é obrigatório'
      });
    }
    
    // Registrar sangria
    const sangria = {
      valor,
      motivo,
      data: new Date(),
      responsavel: req.usuario._id
    };
    
    caixaAberto.sangrias.push(sangria);
    await caixaAberto.save();
    
    return res.status(200).json({
      success: true,
      data: caixaAberto,
      message: 'Sangria registrada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao registrar sangria:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao registrar sangria'
    });
  }
};

// Registrar reforço de caixa
exports.registrarReforco = async (req, res) => {
  try {
    // Buscar caixa aberto
    const caixaAberto = await Caixa.findOne({ status: 'aberto' });
    
    if (!caixaAberto) {
      return res.status(400).json({
        success: false,
        message: 'Não há caixa aberto para registrar reforço'
      });
    }
    
    const { valor, motivo } = req.body;
    
    if (!valor || valor <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valor de reforço inválido'
      });
    }
    
    if (!motivo) {
      return res.status(400).json({
        success: false,
        message: 'Motivo do reforço é obrigatório'
      });
    }
    
    // Registrar reforço
    const reforco = {
      valor,
      motivo,
      data: new Date(),
      responsavel: req.usuario._id
    };
    
    caixaAberto.reforcos.push(reforco);
    await caixaAberto.save();
    
    return res.status(200).json({
      success: true,
      data: caixaAberto,
      message: 'Reforço registrado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao registrar reforço:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao registrar reforço'
    });
  }
};

// Listar histórico de caixas com paginação e filtros
exports.listarHistorico = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, dataInicio, dataFim } = req.query;
    
    const query = {};
    
    // Aplicar filtros
    if (status && ['aberto', 'fechado'].includes(status)) {
      query.status = status;
    }
    
    if (dataInicio && dataFim) {
      query.dataAbertura = {
        $gte: new Date(dataInicio),
        $lte: new Date(dataFim + 'T23:59:59.999Z')
      };
    }
    
    // Total de documentos
    const total = await Caixa.countDocuments(query);
    
    // Buscar caixas com paginação
    const caixas = await Caixa.find(query)
      .populate('responsavelAbertura', 'nome')
      .populate('responsavelFechamento', 'nome')
      .sort({ dataAbertura: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    return res.status(200).json({
      success: true,
      data: caixas,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Erro ao listar histórico de caixas:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao listar histórico de caixas'
    });
  }
};

// Obter detalhes de um caixa específico
exports.getCaixaById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de caixa inválido'
      });
    }
    
    const caixa = await Caixa.findById(id)
      .populate('responsavelAbertura', 'nome')
      .populate('responsavelFechamento', 'nome');
    
    if (!caixa) {
      return res.status(404).json({
        success: false,
        message: 'Caixa não encontrado'
      });
    }
    
    // Calcular estatísticas adicionais
    const tempoAberto = calcularTempoAberto(caixa);
    const ticketMedio = caixa.vendas?.quantidade > 0 
      ? caixa.vendas.total / caixa.vendas.quantidade 
      : 0;
    const totalSangrias = caixa.sangrias?.reduce((total, s) => total + s.valor, 0) || 0;
    const totalReforcos = caixa.reforcos?.reduce((total, r) => total + r.valor, 0) || 0;
    
    return res.status(200).json({
      success: true,
      data: {
        caixa,
        estatisticas: {
          tempoAberto,
          ticketMedio,
          totalSangrias,
          totalReforcos
        }
      }
    });
  } catch (error) {
    console.error('Erro ao buscar detalhes do caixa:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar detalhes do caixa'
    });
  }
};

// Gerar relatório de caixa
exports.gerarRelatorio = async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;
    
    if (!dataInicio || !dataFim) {
      return res.status(400).json({
        success: false,
        message: 'Data inicial e final são obrigatórias'
      });
    }
    
    const dataInicioObj = new Date(dataInicio);
    const dataFimObj = new Date(dataFim + 'T23:59:59.999Z');
    
    // Buscar caixas no período
    const caixas = await Caixa.find({
      dataAbertura: { $gte: dataInicioObj, $lte: dataFimObj }
    })
    .populate('responsavelAbertura', 'nome')
    .populate('responsavelFechamento', 'nome')
    .sort({ dataAbertura: 1 });
    
    if (caixas.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          totalVendas: 0,
          quantidadeVendas: 0,
          ticketMedio: 0,
          totalSangrias: 0,
          totalReforcos: 0,
          diferencaTotal: 0,
          pagamentos: {
            dinheiro: 0,
            credito: 0,
            debito: 0,
            pix: 0,
            vale: 0,
            outros: 0
          },
          faturamentoDiario: [],
          historicoResumo: []
        },
        message: 'Nenhum caixa encontrado no período'
      });
    }
    
    // Calcular totais
    let totalVendas = 0;
    let quantidadeVendas = 0;
    let totalSangrias = 0;
    let totalReforcos = 0;
    let diferencaTotal = 0;
    
    // Totais por método de pagamento
    const pagamentos = {
      dinheiro: 0,
      credito: 0,
      debito: 0,
      pix: 0,
      vale: 0,
      outros: 0
    };
    
    // Mapear faturamento por dia
    const faturamentoPorDia = {};
    
    // Processar cada caixa
    caixas.forEach(caixa => {
      // Somar vendas
      totalVendas += caixa.vendas?.total || 0;
      quantidadeVendas += caixa.vendas?.quantidade || 0;
      
      // Somar sangrias e reforços
      const caixaSangrias = caixa.sangrias?.reduce((total, s) => total + s.valor, 0) || 0;
      const caixaReforcos = caixa.reforcos?.reduce((total, r) => total + r.valor, 0) || 0;
      
      totalSangrias += caixaSangrias;
      totalReforcos += caixaReforcos;
      
      // Somar diferença se o caixa estiver fechado
      if (caixa.status === 'fechado' && caixa.diferenca !== undefined) {
        diferencaTotal += caixa.diferenca;
      }
      
      // Somar pagamentos por método
      Object.keys(pagamentos).forEach(metodo => {
        pagamentos[metodo] += caixa.pagamentos?.[metodo] || 0;
      });
      
      // Agrupar faturamento por dia
      if (caixa.vendas?.total > 0) {
        const dataStr = format(caixa.dataAbertura, 'yyyy-MM-dd');
        if (!faturamentoPorDia[dataStr]) {
          faturamentoPorDia[dataStr] = 0;
        }
        faturamentoPorDia[dataStr] += caixa.vendas.total;
      }
    });
    
    // Converter faturamento por dia em array para o gráfico
    const faturamentoDiario = Object.keys(faturamentoPorDia).map(data => ({
      data,
      valor: faturamentoPorDia[data]
    })).sort((a, b) => new Date(a.data) - new Date(b.data));
    
    // Gerar resumo para histórico
    const historicoResumo = caixas.map(caixa => ({
      _id: caixa._id,
      dataAbertura: caixa.dataAbertura,
      dataFechamento: caixa.dataFechamento,
      responsavelAbertura: caixa.responsavelAbertura,
      responsavelFechamento: caixa.responsavelFechamento,
      valorInicial: caixa.valorInicial,
      valorFinal: caixa.valorFinal,
      status: caixa.status,
      vendas: caixa.vendas,
      diferenca: caixa.diferenca,
      totalSangrias: caixa.sangrias?.reduce((total, s) => total + s.valor, 0) || 0,
      totalReforcos: caixa.reforcos?.reduce((total, r) => total + r.valor, 0) || 0
    }));
    
    // Calcular ticket médio
    const ticketMedio = quantidadeVendas > 0 ? totalVendas / quantidadeVendas : 0;
    
    // Retornar relatório
    return res.status(200).json({
      success: true,
      data: {
        totalVendas,
        quantidadeVendas,
        ticketMedio,
        totalSangrias,
        totalReforcos,
        diferencaTotal,
        pagamentos,
        faturamentoDiario,
        historicoResumo
      }
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de caixa:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao gerar relatório de caixa'
    });
  }
};

// Registrar venda no caixa atual
exports.registrarVenda = async (req, res) => {
  try {
    const { pedidoId, valor, metodoPagamento } = req.body;
    
    if (!pedidoId || !isValidObjectId(pedidoId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de pedido inválido'
      });
    }
    
    if (!valor || valor <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valor de venda inválido'
      });
    }
    
    if (!metodoPagamento || !['dinheiro', 'credito', 'debito', 'pix', 'vale', 'outros'].includes(metodoPagamento)) {
      return res.status(400).json({
        success: false,
        message: 'Método de pagamento inválido'
      });
    }
    
    // Buscar caixa aberto
    const caixaAberto = await Caixa.findOne({ status: 'aberto' });
    
    if (!caixaAberto) {
      return res.status(400).json({
        success: false,
        message: 'Não há caixa aberto para registrar venda'
      });
    }
    
    // Atualizar valores do caixa
    caixaAberto.vendas.total += valor;
    caixaAberto.vendas.quantidade += 1;
    caixaAberto.pagamentos[metodoPagamento] += valor;
    
    // Adicionar referência ao pedido
    if (!caixaAberto.pedidos) {
      caixaAberto.pedidos = [];
    }
    
    caixaAberto.pedidos.push(pedidoId);
    
    await caixaAberto.save();
    
    return res.status(200).json({
      success: true,
      data: caixaAberto,
      message: 'Venda registrada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao registrar venda:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao registrar venda'
    });
  }
};

// Função auxiliar para calcular tempo que o caixa ficou aberto
const calcularTempoAberto = (caixa) => {
  if (!caixa.dataAbertura) {
    return 'Indisponível';
  }
  
  const inicio = new Date(caixa.dataAbertura);
  const fim = caixa.dataFechamento ? new Date(caixa.dataFechamento) : new Date();
  
  const minutos = differenceInMinutes(fim, inicio);
  
  if (minutos < 60) {
    return `${minutos} minutos`;
  }
  
  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;
  
  if (horas < 24) {
    return `${horas}h ${minutosRestantes}min`;
  }
  
  const dias = Math.floor(horas / 24);
  const horasRestantes = horas % 24;
  
  return `${dias} dias, ${horasRestantes}h ${minutosRestantes}min`;
};
