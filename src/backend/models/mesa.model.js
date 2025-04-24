const mongoose = require('mongoose');

const mesaSchema = new mongoose.Schema({
  numero: {
    type: Number,
    required: [true, 'Número da mesa é obrigatório'],
    unique: true
  },
  capacidade: {
    type: Number,
    required: [true, 'Capacidade da mesa é obrigatória'],
    min: [1, 'A capacidade mínima é 1 pessoa']
  },
  status: {
    type: String,
    enum: ['disponivel', 'ocupada', 'reservada', 'manutencao'],
    default: 'disponivel'
  },
  localizacao: {
    x: {
      type: Number, // Coordenada X para posicionamento no mapa
      required: true
    },
    y: {
      type: Number, // Coordenada Y para posicionamento no mapa
      required: true
    },
    area: {
      type: String,
      enum: ['interna', 'externa', 'varanda', 'privativa'],
      default: 'interna'
    }
  },
  ocupacaoAtual: {
    inicioAtendimento: Date,
    clientes: {
      type: Number,
      default: 0
    },
    tempoEstimado: {
      type: Number, // Em minutos
      default: 0
    }
  },
  atendidaPor: [{
    garcom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  uniaoMesas: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mesa'
  }],
  pagantes: [{
    nome: String,
    identificador: String, // Pode ser usado para identificar múltiplos pagantes na mesma mesa
    pedidos: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pedido'
    }]
  }],
  historico: [{
    data: {
      type: Date,
      default: Date.now
    },
    status: String,
    garcom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    duracao: Number, // Em minutos
    valorConsumido: Number
  }]
}, {
  timestamps: true
});

// Método para verificar se a mesa está disponível
mesaSchema.methods.estaDisponivel = function() {
  return this.status === 'disponivel';
};

// Método para ocupar mesa
mesaSchema.methods.ocupar = function(numClientes, garcomId) {
  if (!this.estaDisponivel()) {
    throw new Error('Mesa não está disponível');
  }
  
  this.status = 'ocupada';
  this.ocupacaoAtual.inicioAtendimento = new Date();
  this.ocupacaoAtual.clientes = numClientes;
  
  if (garcomId) {
    this.atendidaPor.push({
      garcom: garcomId,
      timestamp: new Date()
    });
  }
  
  return this.save();
};

// Método para liberar mesa
mesaSchema.methods.liberar = function(valorConsumido) {
  if (this.status !== 'ocupada') {
    throw new Error('Mesa não está ocupada');
  }
  
  const inicioAtendimento = this.ocupacaoAtual?.inicioAtendimento || new Date();
  const now = new Date();
  // Calcular duração segura, evitando erros de datas
  let duracao = 0;
  try {
    duracao = Math.round((now - new Date(inicioAtendimento)) / (1000 * 60)) || 0; // Em minutos
  } catch (error) {
    console.error('Erro ao calcular duração:', error);
    // Usar valor padrão em caso de erro
    duracao = 0;
  }
  
  this.historico.push({
    data: now,
    status: this.status,
    garcom: this.atendidaPor?.length > 0 ? this.atendidaPor[0].garcom : null,
    duracao: duracao,
    valorConsumido: valorConsumido || 0
  });
  
  this.status = 'disponivel';
  this.ocupacaoAtual = {
    inicioAtendimento: null,
    clientes: 0,
    tempoEstimado: 0
  };
  this.atendidaPor = [];
  this.pagantes = [];
  this.uniaoMesas = [];
  
  return this.save();
};

// Método para unir mesas
mesaSchema.methods.unir = function(mesaIds) {
  if (this.status !== 'ocupada') {
    throw new Error('A mesa principal deve estar ocupada para unir com outras');
  }
  
  this.uniaoMesas = mesaIds;
  return this.save();
};

const Mesa = mongoose.model('Mesa', mesaSchema);

module.exports = Mesa;
