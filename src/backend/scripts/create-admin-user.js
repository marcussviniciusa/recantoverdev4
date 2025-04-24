/**
 * Script para criar um novo usuário administrador do sistema Recanto Verde
 * Execute com: node scripts/create-admin-user.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/usuario.model');

// Configurações do administrador
const novoAdmin = {
    nome: 'Administrador Novo',
    email: 'admin2@recantoverde.com',
    senha: 'Admin@123',
    role: 'superadmin'
};

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

// Função para criar o administrador
const criarAdmin = async () => {
  try {
    // Verificar se o e-mail já existe
    const usuarioExistente = await Usuario.findOne({ email: novoAdmin.email });
    if (usuarioExistente) {
      console.log(`Usuário com email ${novoAdmin.email} já existe.`);
      return;
    }
    
    // Criptografar a senha
    const salt = await bcrypt.genSalt(10);
    const senhaCriptografada = await bcrypt.hash(novoAdmin.senha, salt);
    
    // Criar o novo usuário
    const usuario = new Usuario({
      nome: novoAdmin.nome,
      email: novoAdmin.email,
      senha: senhaCriptografada,
      role: novoAdmin.role,
      ativo: true,
      dataCriacao: new Date()
    });
    
    // Salvar no banco de dados
    await usuario.save();
    
    // Verificar se foi salvo corretamente
    const usuarioCriado = await Usuario.findOne({ email: novoAdmin.email });
    const senhaValida = await bcrypt.compare(novoAdmin.senha, usuarioCriado.senha);
    
    console.log('Usuário administrador criado com sucesso:');
    console.log(`Nome: ${novoAdmin.nome}`);
    console.log(`Email: ${novoAdmin.email}`);
    console.log(`Senha: ${novoAdmin.senha}`);
    console.log(`Senha válida: ${senhaValida ? 'Sim' : 'Não'}`);
    console.log('\nATENÇÃO: Altere esta senha após o primeiro login!\n');
    
  } catch (erro) {
    console.error('Erro ao criar administrador:', erro);
  }
};

// Executar o script
(async () => {
  console.log('Iniciando criação do administrador...');
  
  const conectado = await conectarBD();
  if (!conectado) {
    console.log('Abortando: Não foi possível conectar ao MongoDB.');
    process.exit(1);
  }
  
  await criarAdmin();
  
  // Desconectar do MongoDB
  await mongoose.disconnect();
  console.log('Desconectado do MongoDB');
  process.exit(0);
})();
