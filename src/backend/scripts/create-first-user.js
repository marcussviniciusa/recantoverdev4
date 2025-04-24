/**
 * Script para criar o primeiro usuário superadmin do sistema Recanto Verde
 * Execute com: node scripts/create-first-user.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/usuario.model');

// Configurações do primeiro usuário
const primeiroUsuario = {
    nome: 'Administrador',
    email: 'admin@recantoverde.com',
    senha: 'Admin@123', // Altere esta senha antes de executar o script
    role: 'superadmin',
    status: 'ativo'
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

// Função para criar o primeiro usuário
const criarPrimeiroUsuario = async () => {
    try {
        // Verificar se já existe algum superadmin
        const superadminExistente = await Usuario.findOne({ role: 'superadmin' });
        
        if (superadminExistente) {
            console.log('Um usuário superadmin já existe:');
            console.log(`Nome: ${superadminExistente.nome}`);
            console.log(`Email: ${superadminExistente.email}`);
            return;
        }
        
        // Criptografar a senha
        const salt = await bcrypt.genSalt(10);
        const senhaCriptografada = await bcrypt.hash(primeiroUsuario.senha, salt);
        
        // Criar o novo usuário
        const novoUsuario = new Usuario({
            nome: primeiroUsuario.nome,
            email: primeiroUsuario.email,
            senha: senhaCriptografada,
            role: primeiroUsuario.role,
            status: primeiroUsuario.status,
            dataCriacao: new Date()
        });
        
        // Salvar no banco de dados
        await novoUsuario.save();
        
        console.log('Usuário superadmin criado com sucesso:');
        console.log(`Nome: ${primeiroUsuario.nome}`);
        console.log(`Email: ${primeiroUsuario.email}`);
        console.log(`Senha: ${primeiroUsuario.senha}`);
        console.log('\nATENÇÃO: Altere esta senha após o primeiro login!\n');
        
    } catch (erro) {
        console.error('Erro ao criar o primeiro usuário:', erro);
    }
};

// Executar o script
(async () => {
    console.log('Iniciando criação do primeiro usuário...');
    
    const conectado = await conectarBD();
    if (!conectado) {
        console.log('Abortando: Não foi possível conectar ao MongoDB.');
        process.exit(1);
    }
    
    await criarPrimeiroUsuario();
    
    // Desconectar do MongoDB
    await mongoose.disconnect();
    console.log('Desconectado do MongoDB');
    process.exit(0);
})();
