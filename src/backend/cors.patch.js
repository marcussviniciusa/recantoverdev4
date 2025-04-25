// Arquivo para modificar diretamente as configurações CORS no ambiente de produção

// Exporta uma função middleware que substitui as configurações CORS
module.exports = function setupCors(app, io) {
  // Lista de origens permitidas
  const allowedOrigins = [
    'http://localhost:3000',              // Desenvolvimento local
    'https://recantoverde.marcussviniciusa.cloud', // Produção
    process.env.CLIENT_URL               // Configuração via variável de ambiente
  ].filter(Boolean); // Remove itens vazios
  
  console.log('[CORS] Origens permitidas:', allowedOrigins);
  
  // Configuração do CORS para Express
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // Se a origem da requisição estiver na lista de permitidas ou em modo de desenvolvimento
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      // Em produção, pode-se optar por ser mais restritivo
      // ou aceitar todas as origens com *
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    // Cabeçalhos e métodos permitidos
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Requisições preflight OPTIONS
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  });
  
  // Configuração do CORS para Socket.IO
  if (io) {
    io.origins((origin, callback) => {
      // Permitir conexões de qualquer origem em desenvolvimento
      // ou apenas de origens específicas em produção
      if (allowedOrigins.includes(origin) || origin === '*' || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        console.log(`[CORS] Origem bloqueada para Socket.IO: ${origin}`);
        callback('Origem não permitida', false);
      }
    });
  }
};
