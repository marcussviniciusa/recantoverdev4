const mongoose = require('mongoose');

const categoriaSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'Nome da categoria é obrigatório'],
    trim: true,
    unique: true
  },
  descricao: {
    type: String,
    trim: true
  },
  ordem: {
    type: Number,
    default: 0
  },
  ativa: {
    type: Boolean,
    default: true
  }
});

const itemCardapioSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'Nome do item é obrigatório'],
    trim: true
  },
  descricao: {
    type: String,
    trim: true
  },
  categoria: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Categoria',
    required: [true, 'Categoria é obrigatória']
  },
  preco: {
    type: Number,
    required: [true, 'Preço é obrigatório'],
    min: [0, 'Preço não pode ser negativo']
  },
  imagem: {
    type: String
  },
  disponivel: {
    type: Boolean,
    default: true
  },
  destaque: {
    type: Boolean,
    default: false
  },
  ingredientes: [{
    type: String,
    trim: true
  }],
  tempo_preparo: {
    type: Number, // Em minutos
    default: 15
  },
  opcoes: [{
    nome: String,
    preco_adicional: {
      type: Number,
      default: 0
    }
  }],
  alergenos: [{
    type: String,
    trim: true
  }],
  informacao_nutricional: {
    calorias: Number,
    proteinas: Number,
    carboidratos: Number,
    gorduras: Number
  },
  estatisticas: {
    popularidade: {
      type: Number,
      default: 0
    },
    totalVendas: {
      type: Number,
      default: 0
    },
    avaliacaoMedia: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Método para atualizar estatísticas do item
itemCardapioSchema.methods.atualizarEstatisticas = function(quantidade, avaliacao) {
  this.estatisticas.totalVendas += quantidade || 1;
  
  // Cálculo de popularidade baseado em vendas recentes
  this.estatisticas.popularidade = Math.min(
    10, 
    (this.estatisticas.totalVendas / 100) * 10
  );
  
  // Atualizar avaliação média se uma nova avaliação for fornecida
  if (avaliacao) {
    const avaliacoesAnteriores = this.estatisticas.avaliacaoMedia * (this.estatisticas.totalVendas - 1);
    this.estatisticas.avaliacaoMedia = (avaliacoesAnteriores + avaliacao) / this.estatisticas.totalVendas;
  }
  
  return this.save();
};

// Crie os modelos
const Categoria = mongoose.model('Categoria', categoriaSchema);
const ItemCardapio = mongoose.model('ItemCardapio', itemCardapioSchema);

module.exports = {
  Categoria,
  ItemCardapio
};
