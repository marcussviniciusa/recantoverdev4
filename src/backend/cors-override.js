// Módulo para adicionar CORS a todas as respostas
const cors = require('cors');

// Exportar uma função middleware para uso em qualquer lugar
module.exports = function applyCors(app) {
  if (!app) {
    console.error('Aplicativo Express não fornecido para o middleware CORS');
    return;
  }

  console.log('Aplicando configurações CORS ao Express...');
  
  // Adicionar middleware CORS a todas as solicitações
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));
  
  // Adicionar cabeçalhos CORS manualmente para garantir
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
  });
  
  // Adicionar rota de teste CORS
  app.get('/api/test-cors', (req, res) => {
    res.status(200).json({
      message: 'CORS funcionando corretamente',
      headers: req.headers,
      origin: req.headers.origin
    });
  });
  
  console.log('Configurações CORS aplicadas com sucesso');
  
  return app;
};
