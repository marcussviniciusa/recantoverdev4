const Pedido = require('../models/pedido.model');
const Mesa = require('../models/mesa.model');
const { ItemCardapio, Categoria } = require('../models/cardapio.model');
const User = require('../models/user.model');

// Relatório de vendas
exports.getSalesReport = async (req, res) => {
  try {
    // Extrair parâmetros da query
    const { startDate, endDate } = req.query;
    
    // Validar datas
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'É necessário informar as datas de início e fim'
      });
    }
    
    // Converter strings para objetos Date
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    // Buscar pedidos no intervalo de datas
    const pedidos = await Pedido.find({
      dataCriacao: { $gte: start, $lte: end },
      status: { $in: ['pago', 'fechado'] } // Apenas pedidos pagos ou fechados
    }).populate('itens.item', 'nome categoria preco');
    
    // Calcular estatísticas
    const totalSales = pedidos.reduce((sum, pedido) => sum + (pedido.valorTotal || 0), 0);
    const totalOrders = pedidos.length;
    const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
    
    // Buscar vendas diárias
    const dailySales = [];
    const dailyMap = new Map();
    
    pedidos.forEach(pedido => {
      const date = new Date(pedido.dataCriacao).toISOString().split('T')[0];
      
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { date, sales: 0, orders: 0 });
      }
      
      const dayStats = dailyMap.get(date);
      dayStats.sales += pedido.valorTotal || 0;
      dayStats.orders += 1;
    });
    
    // Ordenar por data
    dailyMap.forEach(value => dailySales.push(value));
    dailySales.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Buscar itens mais vendidos
    const itemMap = new Map();
    
    pedidos.forEach(pedido => {
      pedido.itens.forEach(item => {
        const itemId = item.item?._id?.toString() || item.item;
        if (!itemId) return;
        
        if (!itemMap.has(itemId)) {
          itemMap.set(itemId, {
            id: itemId,
            name: item.nome || item.item?.nome || `Item #${itemId.substring(0, 4)}`,
            quantity: 0,
            totalSales: 0
          });
        }
        
        const itemStats = itemMap.get(itemId);
        itemStats.quantity += item.quantidade || 1;
        itemStats.totalSales += (item.preco || item.item?.preco || 0) * (item.quantidade || 1);
      });
    });
    
    // Transformar em array e ordenar por quantidade
    const topSellingItems = Array.from(itemMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10); // Top 10
    
    res.status(200).json({
      success: true,
      totalSales,
      totalOrders,
      averageTicket,
      dailySales,
      topSellingItems
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de vendas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar relatório de vendas',
      error: error.message
    });
  }
};

// Relatório de mesas
exports.getTablesReport = async (req, res) => {
  try {
    // Extrair parâmetros da query
    const { startDate, endDate } = req.query;
    
    // Validar datas
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'É necessário informar as datas de início e fim'
      });
    }
    
    // Converter strings para objetos Date
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    // Buscar todas as mesas
    const mesas = await Mesa.find();
    
    // Buscar pedidos por mesa no intervalo
    const pedidos = await Pedido.find({
      dataCriacao: { $gte: start, $lte: end }
    }).populate('mesa', 'numero');
    
    // Calcular estatísticas de ocupação
    const mesasMap = new Map();
    mesas.forEach(mesa => {
      mesasMap.set(mesa._id.toString(), {
        id: mesa._id,
        number: mesa.numero,
        occupationCount: 0,
        totalTime: 0,
        averageTime: 0,
        usage: 0
      });
    });
    
    // Calcular tempos e ocupação
    let totalOccupationCount = 0;
    
    pedidos.forEach(pedido => {
      if (!pedido.mesa) return;
      
      const mesaId = pedido.mesa._id?.toString();
      if (!mesaId || !mesasMap.has(mesaId)) return;
      
      const mesaStats = mesasMap.get(mesaId);
      mesaStats.occupationCount++;
      totalOccupationCount++;
      
      // Se tiver informações de tempo de ocupação
      if (pedido.tempoOcupacao) {
        mesaStats.totalTime += pedido.tempoOcupacao;
      }
    });
    
    // Calcular médias e percentuais
    let totalTime = 0;
    let mesasComDados = 0;
    
    mesasMap.forEach(mesa => {
      if (mesa.occupationCount > 0) {
        mesa.averageTime = mesa.totalTime / mesa.occupationCount;
        mesa.usage = (mesa.occupationCount / (totalOccupationCount || 1)) * 100;
        totalTime += mesa.averageTime;
        mesasComDados++;
      }
    });
    
    // Transformar em array e ordenar por uso
    const tableUsage = Array.from(mesasMap.values())
      .filter(mesa => mesa.occupationCount > 0)
      .sort((a, b) => b.usage - a.usage);
    
    // Taxa de ocupação (estimativa)
    const totalMesas = mesas.length;
    const totalDias = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const occupancyRate = (totalOccupationCount / (totalMesas * totalDias || 1)) * 100;
    
    // Tempo médio geral
    const averageTime = mesasComDados > 0 ? totalTime / mesasComDados : 0;
    
    // Encontrar horas de pico (simplificado)
    const hourCounts = new Array(24).fill(0);
    
    pedidos.forEach(pedido => {
      const hour = new Date(pedido.dataCriacao).getHours();
      hourCounts[hour]++;
    });
    
    const peakHours = hourCounts
      .map((count, hour) => ({ hour: `${hour}:00`, occupancy: (count / (totalDias || 1)) * 100 }))
      .filter(hour => hour.occupancy > 0)
      .sort((a, b) => b.occupancy - a.occupancy)
      .slice(0, 5); // Top 5 horas
    
    res.status(200).json({
      success: true,
      occupancyRate,
      averageTime,
      peakHours,
      tableUsage
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de mesas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar relatório de mesas',
      error: error.message
    });
  }
};

// Relatório de cardápio
exports.getMenuReport = async (req, res) => {
  try {
    // Extrair parâmetros da query
    const { startDate, endDate } = req.query;
    
    // Validar datas
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'É necessário informar as datas de início e fim'
      });
    }
    
    // Converter strings para objetos Date
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    // Buscar todos os itens do cardápio
    const itens = await ItemCardapio.find().populate('categoria', 'nome');
    
    // Buscar pedidos no intervalo
    const pedidos = await Pedido.find({
      dataCriacao: { $gte: start, $lte: end },
      status: { $in: ['pago', 'fechado', 'entregue'] }
    }).populate('itens.item', 'nome categoria preco custo');
    
    // Mapear vendas por categorias
    const categoriaMap = new Map();
    
    // Mapear vendas por itens
    const itemMap = new Map();
    itens.forEach(item => {
      const catName = item.categoria?.nome || 'Sem categoria';
      
      if (!categoriaMap.has(catName)) {
        categoriaMap.set(catName, {
          name: catName,
          sales: 0,
          percentage: 0,
          itemCount: 0
        });
      }
      
      const cat = categoriaMap.get(catName);
      cat.itemCount++;
      
      itemMap.set(item._id.toString(), {
        id: item._id,
        name: item.nome,
        category: catName,
        sales: 0,
        revenue: 0,
        cost: 0,
        profitMargin: 0
      });
    });
    
    // Processar vendas
    let totalSales = 0;
    
    pedidos.forEach(pedido => {
      pedido.itens.forEach(item => {
        const itemId = item.item?._id?.toString();
        if (!itemId || !itemMap.has(itemId)) return;
        
        const itemStats = itemMap.get(itemId);
        const quantity = item.quantidade || 1;
        const price = item.preco || item.item?.preco || 0;
        const cost = item.item?.custo || price * 0.5; // Custo padrão de 50% se não estiver definido
        const revenue = price * quantity;
        
        itemStats.sales += quantity;
        itemStats.revenue += revenue;
        itemStats.cost += cost * quantity;
        
        const categoria = item.item?.categoria?.nome || 'Sem categoria';
        if (categoriaMap.has(categoria)) {
          categoriaMap.get(categoria).sales += revenue;
        }
        
        totalSales += revenue;
      });
    });
    
    // Calcular margens e percentuais
    itemMap.forEach(item => {
      item.profitMargin = item.revenue > 0 ? ((item.revenue - item.cost) / item.revenue) * 100 : 0;
    });
    
    categoriaMap.forEach(cat => {
      cat.percentage = totalSales > 0 ? (cat.sales / totalSales) * 100 : 0;
    });
    
    // Transformar em arrays e ordenar
    const categoryPerformance = Array.from(categoriaMap.values())
      .filter(cat => cat.sales > 0)
      .sort((a, b) => b.sales - a.sales);
    
    const itemPerformance = Array.from(itemMap.values())
      .filter(item => item.sales > 0);
    
    const topItems = [...itemPerformance]
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10); // Top 10
    
    const lowPerformers = [...itemPerformance]
      .sort((a, b) => a.sales - b.sales)
      .slice(0, 10); // Bottom 10
    
    res.status(200).json({
      success: true,
      categoryPerformance,
      topItems,
      lowPerformers,
      itemPerformance
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de cardápio:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar relatório de cardápio',
      error: error.message
    });
  }
};
