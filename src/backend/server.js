const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Carregar variáveis de ambiente
dotenv.config();

// Inicializar o app Express
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
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
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/caixa', caixaRoutes);
app.use('/api/comprovantes', comprovanteRoutes);

// Servir arquivos estáticos de uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rota raiz
app.get('/', (req, res) => {
  res.json({ message: 'API do Sistema de Gerenciamento para Restaurante' });
});

// Iniciar o servidor
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// Exportar para testes
module.exports = { app, server, io };
