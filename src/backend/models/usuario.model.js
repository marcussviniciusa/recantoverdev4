const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const usuarioSchema = new mongoose.Schema({
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
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  senha: {
    type: String,
    required: [true, 'Senha é obrigatória'],
    minlength: [6, 'Senha deve ter pelo menos 6 caracteres']
  },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'usuario'],
    default: 'usuario'
  },
  foto: {
    type: String,
    default: null
  },
  telefone: {
    type: String,
    default: null
  },
  ativo: {
    type: Boolean,
    default: true
  },
  ultimoAcesso: {
    type: Date,
    default: null
  },
  dataCriacao: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Método para comparar senha com hash
usuarioSchema.methods.compararSenha = async function(senha) {
  return await bcrypt.compare(senha, this.senha);
};

// Middleware para hash de senha antes de salvar
usuarioSchema.pre('save', async function(next) {
  if (!this.isModified('senha')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.senha = await bcrypt.hash(this.senha, salt);
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Usuario', usuarioSchema);
