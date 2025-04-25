// script bootstrap para adicionar CORS antes de carregar o servidor original
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config();

// Informações de ambiente
console.log('===== INFORMAÇÕES DO AMBIENTE =====');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`MONGODB_URI: ${process.env.MONGODB_URI ? '(configurado)' : '(não configurado)'}`);
console.log(`CLIENT_URL: ${process.env.CLIENT_URL || '(não configurado)'}`);
console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? '(configurado)' : '(não configurado)'}`);
console.log(`WHATSAPP_API_DOMAIN: ${process.env.WHATSAPP_API_DOMAIN || '(não configurado)'}`);
console.log('=================================');

// Modificar as variáveis globais Express antes de carregar o servidor
console.log('Modificando configurações globais Express para CORS...');

// Forçar a configuração do CLIENT_URL para o domínio de produção
if (process.env.NODE_ENV === 'production') {
  process.env.CLIENT_URL = 'https://recantoverde.marcussviniciusa.cloud';
  console.log(`CLIENT_URL forçado para: ${process.env.CLIENT_URL}`);
}

// Sobrescrever o módulo cors com uma versão mais permissiva
process.env.CORS_ORIGIN = '*';
console.log('CORS configurado para aceitar todas as origens');

// Iniciar o servidor normal (que já tem todas as rotas configuradas)
console.log('Iniciando servidor original...');
require('./server');
