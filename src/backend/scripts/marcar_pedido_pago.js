/**
 * Script para marcar um pedido específico como pago
 * Use: node scripts/marcar_pedido_pago.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Conectado ao MongoDB'))
  .catch(err => {
    console.error('Erro ao conectar ao MongoDB:', err);
    process.exit(1);
  });

// Modelo de Pedido (versão simplificada para o script)
const Pedido = require('../models/pedido.model');

async function marcarPedidoComoPago() {
  try {
    // ID do pedido que precisa ser marcado como pago
    const pedidoId = '680ab42fbb3839750ae2d47f';
    
    // Buscar o pedido para verificar se existe
    const pedido = await Pedido.findById(pedidoId);
    
    if (!pedido) {
      console.error(`Pedido com ID ${pedidoId} não encontrado`);
      process.exit(1);
    }
    
    console.log(`Pedido encontrado: ${pedido._id}`);
    console.log(`Status atual: ${pedido.status}`);
    console.log(`Valor total: ${pedido.valorTotal}`);
    console.log(`Pago: ${pedido.pago ? 'Sim' : 'Não'}`);
    
    // Atualizar o pedido para marcar como pago
    const resultado = await Pedido.findByIdAndUpdate(
      pedidoId,
      {
        $set: {
          pago: true,
          status: 'pago',
          dataPagamento: new Date(),
          metodoPagamento: 'pix' // Ajuste conforme necessário
        },
        $push: {
          historicoStatus: {
            status: 'pago',
            timestamp: new Date(),
            observacao: 'Pagamento registrado manualmente via script'
          }
        }
      },
      { new: true }
    );
    
    console.log('Pedido atualizado com sucesso:');
    console.log(`Status atualizado: ${resultado.status}`);
    console.log(`Pago: ${resultado.pago ? 'Sim' : 'Não'}`);
    console.log(`Data de Pagamento: ${resultado.dataPagamento}`);
    
    console.log('Operação concluída com sucesso!');
    
  } catch (error) {
    console.error('Erro ao marcar pedido como pago:', error);
  } finally {
    // Fechar conexão
    mongoose.connection.close();
  }
}

// Executar função
marcarPedidoComoPago();
