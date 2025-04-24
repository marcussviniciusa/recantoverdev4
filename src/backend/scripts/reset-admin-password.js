/**
 * Script para resetar a senha do usuário administrador do sistema Recanto Verde
 * Execute com: node scripts/reset-admin-password.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/usuario.model');

// Nova senha do administrador
const novaSenha = 'Admin@123';

// Função para conectar ao MongoDB
const conectarBD = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/recantoverde';
    await mongoose.connect(uri);
    console.log('Conectado ao MongoDB');
    return true;
  } catch (erro) {
    console.error('Erro ao conectar ao MongoDB:', erro);
    return false;
  }
};

// Função para resetar a senha do administrador
const resetarSenhaAdmin = async () => {
  try {
    // Encontrar o usuário administrador
    const admin = await Usuario.findOne({ role: 'superadmin' });
    
    if (!admin) {
      console.log('Nenhum usuário administrador encontrado.');
      return;
    }
    
    // Gerar hash da nova senha
    const salt = await bcrypt.genSalt(10);
    const senhaCriptografada = await bcrypt.hash(novaSenha, salt);
    
    // Atualizar a senha
    admin.senha = senhaCriptografada;
    await admin.save();
    
    console.log('Senha do administrador resetada com sucesso:');
    console.log(`Email: ${admin.email}`);
    console.log(`Nova senha: ${novaSenha}`);
    console.log('\nATENÇÃO: Altere esta senha após o primeiro login!\n');
    
  } catch (erro) {
    console.error('Erro ao resetar a senha do administrador:', erro);
  }
};

// Executar o script
(async () => {
  console.log('Iniciando reset de senha do administrador...');
  
  const conectado = await conectarBD();
  if (!conectado) {
    console.log('Abortando: Não foi possível conectar ao MongoDB.');
    process.exit(1);
  }
  
  await resetarSenhaAdmin();
  
  // Desconectar do MongoDB
  await mongoose.disconnect();
  console.log('Desconectado do MongoDB');
  process.exit(0);
})();
