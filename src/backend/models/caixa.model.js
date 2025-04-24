const mongoose = require('mongoose');

const CaixaSchema = new mongoose.Schema({
  dataAbertura: {
    type: Date,
    required: true,
    default: Date.now
  },
  dataFechamento: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['aberto', 'fechado'],
    default: 'aberto'
  },
  valorInicial: {
    type: Number,
    required: true,
    default: 0
  },
  valorFinal: {
    type: Number,
    default: 0
  },
  diferenca: {
    type: Number,
    default: 0
  },
  vendas: {
    total: { type: Number, default: 0 },
    quantidade: { type: Number, default: 0 }
  },
  pagamentos: {
    dinheiro: { type: Number, default: 0 },
    credito: { type: Number, default: 0 },
    debito: { type: Number, default: 0 },
    pix: { type: Number, default: 0 },
    vale: { type: Number, default: 0 },
    outros: { type: Number, default: 0 }
  },
  responsavelAbertura: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  responsavelFechamento: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  observacoes: {
    type: String,
    default: ''
  },
  pedidos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pedido'
  }],
  sangrias: [{
    valor: { type: Number, required: true },
    motivo: { type: String, required: true },
    data: { type: Date, default: Date.now },
    responsavel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  }],
  reforcos: [{
    valor: { type: Number, required: true },
    motivo: { type: String, required: true },
    data: { type: Date, default: Date.now },
    responsavel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  }]
}, { timestamps: true });

// Métodos do modelo
CaixaSchema.methods.fecharCaixa = async function(dadosFechamento) {
  const { valorFinal, responsavel, observacoes } = dadosFechamento;
  
  this.dataFechamento = new Date();
  this.status = 'fechado';
  this.valorFinal = valorFinal;
  this.responsavelFechamento = responsavel;
  
  if (observacoes) {
    this.observacoes = observacoes;
  }
  
  // Calcular diferença (sobra ou falta)
  const totalEsperado = this.valorInicial + this.vendas.total - 
    this.sangrias.reduce((total, sangria) => total + sangria.valor, 0) +
    this.reforcos.reduce((total, reforco) => total + reforco.valor, 0);
  
  this.diferenca = valorFinal - totalEsperado;
  
  return this.save();
};

CaixaSchema.methods.adicionarSangria = async function(dadosSangria) {
  if (this.status === 'fechado') {
    throw new Error('Não é possível adicionar sangria a um caixa fechado');
  }
  
  this.sangrias.push(dadosSangria);
  return this.save();
};

CaixaSchema.methods.adicionarReforco = async function(dadosReforco) {
  if (this.status === 'fechado') {
    throw new Error('Não é possível adicionar reforço a um caixa fechado');
  }
  
  this.reforcos.push(dadosReforco);
  return this.save();
};

CaixaSchema.methods.registrarVenda = async function(dadosVenda) {
  if (this.status === 'fechado') {
    throw new Error('Não é possível registrar venda em um caixa fechado');
  }
  
  const { valorTotal, pedidoId, metodoPagamento } = dadosVenda;
  
  // Adicionar ao total de vendas
  this.vendas.total += valorTotal;
  this.vendas.quantidade += 1;
  
  // Adicionar ao método de pagamento específico
  if (metodoPagamento === 'dinheiro') {
    this.pagamentos.dinheiro += valorTotal;
  } else if (metodoPagamento === 'credito') {
    this.pagamentos.credito += valorTotal;
  } else if (metodoPagamento === 'debito') {
    this.pagamentos.debito += valorTotal;
  } else if (metodoPagamento === 'pix') {
    this.pagamentos.pix += valorTotal;
  } else if (metodoPagamento === 'vale') {
    this.pagamentos.vale += valorTotal;
  } else {
    this.pagamentos.outros += valorTotal;
  }
  
  // Adicionar o pedido à lista
  if (pedidoId && !this.pedidos.includes(pedidoId)) {
    this.pedidos.push(pedidoId);
  }
  
  return this.save();
};

// Métodos estáticos
CaixaSchema.statics.getCaixaAtual = async function() {
  const caixaAberto = await this.findOne({ status: 'aberto' })
    .sort({ dataAbertura: -1 })
    .populate('responsavelAbertura', 'nome')
    .populate('pedidos');
  
  return caixaAberto;
};

CaixaSchema.statics.getRelatorioCaixa = async function(caixaId) {
  const caixa = await this.findById(caixaId)
    .populate('responsavelAbertura', 'nome')
    .populate('responsavelFechamento', 'nome')
    .populate({
      path: 'pedidos',
      select: 'valorTotal status pagamento dataCriacao',
      populate: {
        path: 'mesa',
        select: 'numero'
      }
    });
  
  if (!caixa) {
    throw new Error('Caixa não encontrado');
  }
  
  // Calcular estatísticas adicionais
  const tempoAberto = caixa.dataFechamento 
    ? new Date(caixa.dataFechamento) - new Date(caixa.dataAbertura) 
    : new Date() - new Date(caixa.dataAbertura);
  
  const horasAberto = Math.floor(tempoAberto / (1000 * 60 * 60));
  const minutosAberto = Math.floor((tempoAberto % (1000 * 60 * 60)) / (1000 * 60));
  
  const ticketMedio = caixa.vendas.quantidade > 0 
    ? caixa.vendas.total / caixa.vendas.quantidade 
    : 0;
  
  return {
    caixa,
    estatisticas: {
      tempoAberto: `${horasAberto}h ${minutosAberto}min`,
      ticketMedio,
      totalSangrias: caixa.sangrias.reduce((total, sangria) => total + sangria.valor, 0),
      totalReforcos: caixa.reforcos.reduce((total, reforco) => total + reforco.valor, 0)
    }
  };
};

const Caixa = mongoose.model('Caixa', CaixaSchema);

module.exports = Caixa;
