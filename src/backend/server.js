const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Carregar variáveis de ambiente
dotenv.config();

// Forçar o CLIENT_URL para produção se estivermos em produção
if (process.env.NODE_ENV === 'production') {
  process.env.CLIENT_URL = 'https://recantoverde.marcussviniciusa.cloud';
  console.log(`CLIENT_URL forçado para: ${process.env.CLIENT_URL}`);
}

// Inicializar o app Express
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*', // Permitir todas as origens
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
// Configuração de CORS permissiva
app.use(cors({
  origin: '*', // Permitir todas as origens
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middleware adicional de CORS para garantia dupla
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Lidar automaticamente com requisições preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conexão com o banco de dados
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurante')
  .then(() => console.log('Conexão com MongoDB estabelecida'))
  .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Configuração de Socket.IO
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });

  // Eventos para atualização de status de mesas
  socket.on('mesa_atualizada', (data) => {
    io.emit('atualizar_mesa', data);
  });

  // Eventos para novos pedidos
  socket.on('novo_pedido', (data) => {
    io.emit('atualizar_pedidos', data);
  });
});

// Importar rotas
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const mesaRoutes = require('./routes/mesa.routes');
const cardapioRoutes = require('./routes/cardapio.routes');
const pedidoRoutes = require('./routes/pedido.routes');
const reportRoutes = require('./routes/report.routes');
const caixaRoutes = require('./routes/caixa.routes');
const comprovanteRoutes = require('./routes/comprovante.routes');

// Definir rotas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/mesas', mesaRoutes);
app.use('/api/cardapio', cardapioRoutes);
app.use('/api/categorias', cardapioRoutes); // Alias para categorias
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/estatisticas', reportRoutes); // Alias para estatísticas
app.use('/api/caixa', caixaRoutes);
app.use('/api/comprovantes', comprovanteRoutes);

// Rota para testar CORS
app.get('/api/test-cors', (req, res) => {
  res.status(200).json({
    message: 'CORS funcionando corretamente',
    headers: req.headers,
    origin: req.headers.origin || 'Sem origem'
  });
});

// Servir arquivos estáticos de uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rota raiz
app.get('/', (req, res) => {
  res.json({ message: 'API do Sistema de Gerenciamento para Restaurante' });
});

// Rota de saúde
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', environment: process.env.NODE_ENV });
});

// Iniciar o servidor
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT} com CORS para todas as origens`);
  console.log(`Em ambiente: ${process.env.NODE_ENV}`);
});

// Exportar para testes
module.exports = { app, server, io };
