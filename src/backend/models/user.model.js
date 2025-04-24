const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'Nome é obrigatório'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email é obrigatório'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Por favor, informe um email válido']
  },
  senha: {
    type: String,
    required: [true, 'Senha é obrigatória'],
    minlength: [6, 'A senha deve ter no mínimo 6 caracteres']
  },
  role: {
    type: String,
    enum: ['superadmin', 'usuario'],
    default: 'usuario'
  },
  ativo: {
    type: Boolean,
    default: true
  },
  foto: {
    type: String,
    default: ''
  },
  telefone: {
    type: String,
    trim: true
  },
  dataCriacao: {
    type: Date,
    default: Date.now
  },
  ultimoAcesso: {
    type: Date
  },
  mesasAtendidas: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mesa'
  }],
  desempenho: {
    pedidosAtendidos: {
      type: Number,
      default: 0
    },
    tempoMedioAtendimento: {
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

// Método para hash da senha antes de salvar
userSchema.pre('save', async function(next) {
  if (!this.isModified('senha')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.senha = await bcrypt.hash(this.senha, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar senha
userSchema.methods.verificarSenha = async function(senhaInformada) {
  return await bcrypt.compare(senhaInformada, this.senha);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
