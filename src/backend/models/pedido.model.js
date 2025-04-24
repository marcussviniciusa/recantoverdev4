const mongoose = require('mongoose');

const itemPedidoSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ItemCardapio',
    required: true
  },
  nome: String, // Nome do item no momento do pedido (caso o cardápio mude)
  quantidade: {
    type: Number,
    required: true,
    min: [1, 'Quantidade mínima é 1']
  },
  preco: {
    type: Number,
    required: true
  },
  opcoes: [{
    nome: String,
    preco_adicional: Number
  }],
  observacoes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pendente', 'preparando', 'pronto', 'entregue', 'cancelado'],
    default: 'pendente'
  },
  tempoPreparo: {
    estimado: Number, // Em minutos
    inicioPreparo: Date,
    fimPreparo: Date
  }
});

const pedidoSchema = new mongoose.Schema({
  mesa: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mesa',
    required: true
  },
  garcom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pagante: {
    identificador: String, // Para identificar múltiplos pagantes na mesma mesa
    nome: String
  },
  itens: [itemPedidoSchema],
  status: {
    type: String,
    enum: ['aberto', 'parcial', 'fechado', 'pago', 'cancelado'],
    default: 'aberto'
  },
  valorTotal: {
    type: Number,
    default: 0
  },
  taxaServico: {
    type: Number,
    default: 0
  },
  desconto: {
    type: Number,
    default: 0
  },
  valorFinal: {
    type: Number,
    default: 0
  },
  metodoPagamento: {
    type: String,
    enum: ['', 'dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'outro'],
    default: ''
  },
  observacoes: {
    type: String,
    trim: true
  },
  comanda: {
    enviada: {
      type: Boolean,
      default: false
    },
    numeroPedido: String,
    linkComanda: String,
    dataEnvio: Date,
    telefoneCliente: String
  },
  tempoTotal: {
    type: Number // Em minutos, do momento do pedido até o pagamento
  },
  dataCriacao: {
    type: Date,
    default: Date.now
  },
  dataAtualizacao: {
    type: Date,
    default: Date.now
  },
  dataPagamento: Date,
  usuarioPagamento: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  historicoStatus: [{
    status: {
      type: String,
      enum: ['aberto', 'parcial', 'fechado', 'pago', 'cancelado', 'pagamento_cancelado']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    responsavel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    observacao: String
  }],
  // Campos para exclusão lógica do registro (remoção da lista)
  excluidoDaLista: {
    type: Boolean,
    default: false
  },
  excluidoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  dataExclusao: Date,
  
  // Campos para gerenciamento visual na página de pedidos
  ocultarDaLista: {
    type: Boolean,
    default: false
  },
  ocultadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  dataOcultacao: Date,
  
  concluidoVisualmente: {
    type: Boolean,
    default: false
  },
  concluidoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  dataConclusaoVisual: Date
}, {
  timestamps: true
});

// Middleware para calcular o valor total antes de salvar
pedidoSchema.pre('save', function(next) {
  // Calcular valor dos itens
  let subtotal = 0;
  for (let item of this.itens) {
    let itemTotal = item.preco * item.quantidade;
    
    // Adicionar valores de opções extras
    if (item.opcoes && item.opcoes.length > 0) {
      for (let opcao of item.opcoes) {
        itemTotal += (opcao.preco_adicional || 0) * item.quantidade;
      }
    }
    
    subtotal += itemTotal;
  }
  
  this.valorTotal = subtotal;
  
  // Calcular taxa de serviço (padrão 10%)
  this.taxaServico = subtotal * 0.1;
  
  // Calcular valor final
  this.valorFinal = this.valorTotal + this.taxaServico - this.desconto;
  
  // Atualizar data de modificação
  this.dataAtualizacao = new Date();
  
  next();
});

// Método para adicionar item ao pedido
pedidoSchema.methods.adicionarItem = function(item) {
  this.itens.push(item);
  this.status = 'aberto';
  return this.save();
};

// Método para atualizar status de um item
pedidoSchema.methods.atualizarStatusItem = function(itemId, novoStatus) {
  const item = this.itens.id(itemId);
  if (!item) throw new Error('Item não encontrado');
  
  item.status = novoStatus;
  
  if (novoStatus === 'preparando') {
    item.tempoPreparo.inicioPreparo = new Date();
  } else if (novoStatus === 'pronto') {
    item.tempoPreparo.fimPreparo = new Date();
  }
  
  return this.save();
};

// Método para fechar o pedido
pedidoSchema.methods.fecharPedido = function() {
  this.status = 'fechado';
  return this.save();
};

// Método para registrar pagamento
pedidoSchema.methods.registrarPagamento = function(metodoPagamento, usuarioId) {
  this.status = 'pago';
  this.metodoPagamento = metodoPagamento;
  this.dataPagamento = new Date();
  
  // Registrar usuário que finalizou o pagamento
  if (usuarioId) {
    this.usuarioPagamento = usuarioId;
  }
  
  // Calcular tempo total do pedido
  this.tempoTotal = Math.round((this.dataPagamento - this.dataCriacao) / (1000 * 60)); // Em minutos
  
  return this.save();
};

// Método para gerar e enviar comanda
pedidoSchema.methods.gerarComanda = function(telefoneCliente) {
  // Gerar número de pedido único baseado no ID e timestamp
  const timestamp = new Date().getTime();
  const numeroPedido = `${this._id.toString().substring(0, 6)}-${timestamp.toString().substring(8)}`;
  
  this.comanda = {
    enviada: true,
    numeroPedido: numeroPedido,
    dataEnvio: new Date(),
    telefoneCliente: telefoneCliente
  };
  
  return this.save();
};

const Pedido = mongoose.model('Pedido', pedidoSchema);

module.exports = Pedido;
