const Mesa = require('../models/mesa.model');
const Usuario = require('../models/usuario.model');

/**
 * Calcula as coordenadas para uma nova mesa baseado nas mesas existentes
 * @param {Array} mesasExistentes - Lista de mesas na mesma área
 * @param {String} area - Área da mesa (interna, externa, varanda, privativa)
 * @param {Number} capacidade - Capacidade da mesa, influencia no tamanho
 * @returns {Object} - Coordenadas x e y para posicionamento
 */
const calcularCoordenadas = (mesasExistentes, area, capacidade) => {
  // Definições de limites de área para cada tipo
  const limites = {
    'interna': { minX: 50, maxX: 450, minY: 50, maxY: 350, spacingFactor: 1.5 },
    'externa': { minX: 500, maxX: 900, minY: 50, maxY: 350, spacingFactor: 2 },
    'varanda': { minX: 50, maxX: 450, minY: 400, maxY: 700, spacingFactor: 1.8 },
    'privativa': { minX: 500, maxX: 900, minY: 400, maxY: 700, spacingFactor: 2.5 }
  };
  
  // Se não existem mesas na área, posicionar no centro
  if (mesasExistentes.length === 0) {
    const areaConfig = limites[area] || limites['interna'];
    return {
      x: Math.floor((areaConfig.minX + areaConfig.maxX) / 2),
      y: Math.floor((areaConfig.minY + areaConfig.maxY) / 2)
    };
  }
  
  // Calcular o tamanho da mesa com base na capacidade (maior capacidade = mesa maior)
  const tamanhoMesa = 30 + (capacidade * 5); // 30px base + 5px por pessoa
  
  // Obter limites da área atual
  const areaConfig = limites[area] || limites['interna'];
  const { minX, maxX, minY, maxY, spacingFactor } = areaConfig;
  const espacamento = tamanhoMesa * spacingFactor;
  
  // Calcular grid de disposição baseado no tamanho da área e espaçamento
  const gridWidth = maxX - minX;
  const gridHeight = maxY - minY;
  const colsDisponiveis = Math.floor(gridWidth / espacamento);
  const rowsDisponiveis = Math.floor(gridHeight / espacamento);
  
  // Tentar encontrar um espaço não ocupado no grid
  let melhorPosicao = null;
  let menorColisao = Infinity;
  
  // Testar diferentes posições no grid para encontrar a melhor
  for (let row = 0; row < rowsDisponiveis; row++) {
    for (let col = 0; col < colsDisponiveis; col++) {
      const x = minX + (col * espacamento) + (espacamento / 2);
      const y = minY + (row * espacamento) + (espacamento / 2);
      
      // Calcular colisões totais com outras mesas nesta posição
      let colisaoTotal = 0;
      for (const mesa of mesasExistentes) {
        const distancia = Math.sqrt(
          Math.pow(x - mesa.localizacao.x, 2) + 
          Math.pow(y - mesa.localizacao.y, 2)
        );
        
        // Se a distância é menor que o espaçamento, há colisão
        if (distancia < espacamento) {
          colisaoTotal += (espacamento - distancia);
        }
      }
      
      // Se encontrou uma posição com menos colisões, atualizar melhor posição
      if (colisaoTotal < menorColisao) {
        menorColisao = colisaoTotal;
        melhorPosicao = { x, y };
        
        // Se não houver colisão, é uma posição perfeita
        if (colisaoTotal === 0) break;
      }
    }
    
    // Se já encontrou uma posição sem colisão, sair do loop
    if (menorColisao === 0) break;
  }
  
  // Se por algum motivo não encontrou uma posição boa, usar uma posição randômica na área
  if (!melhorPosicao) {
    melhorPosicao = {
      x: Math.floor(minX + Math.random() * (maxX - minX)),
      y: Math.floor(minY + Math.random() * (maxY - minY))
    };
  }
  
  return melhorPosicao;
};

// Obter todas as mesas
exports.getAllMesas = async (req, res) => {
  try {
    const mesas = await Mesa.find()
      .populate('atendidaPor.garcom', 'nome')
      .populate('uniaoMesas');
    
    res.status(200).json({
      success: true,
      count: mesas.length,
      data: mesas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar mesas',
      error: error.message
    });
  }
};

// Obter uma mesa específica
exports.getMesa = async (req, res) => {
  try {
    const mesa = await Mesa.findById(req.params.id)
      .populate('atendidaPor.garcom', 'nome')
      .populate('uniaoMesas')
      .populate('pagantes.pedidos');
    
    if (!mesa) {
      return res.status(404).json({
        success: false,
        message: 'Mesa não encontrada'
      });
    }
    
    res.status(200).json({
      success: true,
      data: mesa
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar mesa',
      error: error.message
    });
  }
};

// Criar nova mesa
exports.createMesa = async (req, res) => {
  try {
    let { numero, capacidade, localizacao } = req.body;
    
    // Definir capacidade padrão de 4 pessoas se não especificada
    if (!capacidade) {
      capacidade = 4;
    }
    
    // Gerar numero automaticamente se não fornecido
    if (!numero) {
      // Buscar o maior número de mesa existente
      const ultimaMesa = await Mesa.findOne().sort({ numero: -1 });
      const proximoNumero = ultimaMesa ? ultimaMesa.numero + 1 : 1;
      numero = proximoNumero;
    }
    
    // Verificar se já existe mesa com esse número
    const mesaExistente = await Mesa.findOne({ numero });
    if (mesaExistente) {
      return res.status(400).json({
        success: false,
        message: `Já existe uma mesa com o número ${numero}`
      });
    }

    // Verificar ou criar localização com distribuição automática
    let localizacaoFinal = {};
    
    // Se não forneceu localização ou coordenadas x,y, distribui automaticamente
    if (!localizacao || !localizacao.x || !localizacao.y) {
      // Define a área padrão se não tiver sido fornecida
      const area = (localizacao && localizacao.area) ? localizacao.area : 'interna';
      
      // Buscar todas as mesas da mesma área para calcular posicionamento
      const mesasArea = await Mesa.find({'localizacao.area': area});
      
      // Calcular coordenadas baseadas na disposição atual das mesas
      const novasCoordenadas = calcularCoordenadas(mesasArea, area, capacidade);
      
      localizacaoFinal = {
        x: novasCoordenadas.x,
        y: novasCoordenadas.y,
        area
      };
    } else {
      // Usar as coordenadas fornecidas
      localizacaoFinal = {
        x: localizacao.x,
        y: localizacao.y,
        area: localizacao.area || 'interna'
      };
    }
    
    const mesa = await Mesa.create({
      numero,
      capacidade,
      localizacao: localizacaoFinal,
      status: 'disponivel'
    });
    
    res.status(201).json({
      success: true,
      message: 'Mesa criada com sucesso',
      data: mesa
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar mesa',
      error: error.message
    });
  }
};

// Atualizar mesa
exports.updateMesa = async (req, res) => {
  try {
    const { numero, capacidade, localizacao, status } = req.body;
    
    let mesa = await Mesa.findById(req.params.id);
    
    if (!mesa) {
      return res.status(404).json({
        success: false,
        message: 'Mesa não encontrada'
      });
    }
    
    // Se estiver alterando o número, verificar se já existe
    if (numero && numero !== mesa.numero) {
      const mesaExistente = await Mesa.findOne({ numero });
      if (mesaExistente) {
        return res.status(400).json({
          success: false,
          message: `Já existe uma mesa com o número ${numero}`
        });
      }
    }
    
    // Atualizar campos
    if (numero) mesa.numero = numero;
    if (capacidade) mesa.capacidade = capacidade;
    if (localizacao) mesa.localizacao = localizacao;
    if (status) mesa.status = status;
    
    await mesa.save();
    
    res.status(200).json({
      success: true,
      message: 'Mesa atualizada com sucesso',
      data: mesa
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar mesa',
      error: error.message
    });
  }
};

// Excluir mesa
exports.deleteMesa = async (req, res) => {
  try {
    const mesa = await Mesa.findById(req.params.id);
    
    if (!mesa) {
      return res.status(404).json({
        success: false,
        message: 'Mesa não encontrada'
      });
    }
    
    // Verificar se a mesa está ocupada
    if (mesa.status === 'ocupada') {
      return res.status(400).json({
        success: false,
        message: 'Não é possível excluir uma mesa ocupada'
      });
    }
    
    await Mesa.deleteOne({ _id: req.params.id });
    
    res.status(200).json({
      success: true,
      message: 'Mesa excluída com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir mesa',
      error: error.message
    });
  }
};

// Ocupar mesa
exports.ocuparMesa = async (req, res) => {
  try {
    // Aceitar tanto 'clientes' quanto 'numClientes' para compatibilidade
    const clientesValue = req.body.clientes || req.body.numClientes;
    const numClientes = parseInt(clientesValue);
    
    if (isNaN(numClientes) || numClientes <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Número de clientes inválido'
      });
    }
    
    const mesa = await Mesa.findById(req.params.id);
    
    if (!mesa) {
      return res.status(404).json({
        success: false,
        message: 'Mesa não encontrada'
      });
    }
    
    if (mesa.status === 'ocupada') {
      return res.status(400).json({
        success: false,
        message: 'Mesa já está ocupada'
      });
    }
    
    if (mesa.status === 'manutencao') {
      return res.status(400).json({
        success: false,
        message: 'Mesa em manutenção'
      });
    }
    
    // Verificar se req.usuario existe antes de usar seu _id
    const garcomId = req.usuario ? req.usuario._id : null;
    await mesa.ocupar(numClientes, garcomId);
    
    // Notificar outros usuários via socket (se o io estiver disponível)
    if (req.io) {
      req.io.emit('atualizar_mesa', {
        id: req.usuario ? req.usuario._id : null,
        numero: mesa.numero,
        status: 'ocupada',
        statusAnterior: 'disponivel',
        ocupacaoAtual: mesa.ocupacaoAtual
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Mesa ocupada com sucesso',
      data: mesa
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao ocupar mesa',
      error: error.message
    });
  }
};

// Liberar mesa
exports.liberarMesa = async (req, res) => {
  try {
    // Definir valorConsumido como 0 se não for fornecido
    const valorConsumido = req.body.valorConsumido || 0;
    const mesa = await Mesa.findById(req.params.id);
    
    if (!mesa) {
      return res.status(404).json({
        success: false,
        message: 'Mesa não encontrada'
      });
    }
    
    // Verificar se a mesa está ocupada
    if (mesa.status !== 'ocupada') {
      return res.status(400).json({
        success: false,
        message: 'Mesa não está ocupada'
      });
    }
    
    // Liberar mesa
    await mesa.liberar(valorConsumido);
    
    // Remover mesa dos garçons que a atendiam
    for (const atendimento of mesa.atendidaPor) {
      // Verificar se o garçom existe antes de tentar atualizá-lo
      if (atendimento.garcom) {
        await Usuario.findByIdAndUpdate(
          atendimento.garcom,
          { $pull: { mesasAtendidas: mesa._id } }
        );
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Mesa liberada com sucesso',
      data: mesa
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao liberar mesa',
      error: error.message
    });
  }
};

// Unir mesas
exports.unirMesas = async (req, res) => {
  try {
    const { mesasIds } = req.body;
    const mesaPrincipal = await Mesa.findById(req.params.id);
    
    if (!mesaPrincipal) {
      return res.status(404).json({
        success: false,
        message: 'Mesa principal não encontrada'
      });
    }
    
    // Verificar se a mesa principal está ocupada
    if (mesaPrincipal.status !== 'ocupada') {
      return res.status(400).json({
        success: false,
        message: 'A mesa principal deve estar ocupada para unir com outras'
      });
    }
    
    // Verificar se as mesas secundárias existem e estão disponíveis
    for (const mesaId of mesasIds) {
      const mesa = await Mesa.findById(mesaId);
      
      if (!mesa) {
        return res.status(404).json({
          success: false,
          message: `Mesa ${mesaId} não encontrada`
        });
      }
      
      if (mesa.status !== 'disponivel') {
        return res.status(400).json({
          success: false,
          message: `Mesa ${mesa.numero} não está disponível para união`
        });
      }
      
      // Marcar mesa secundária como em manutenção para evitar uso
      mesa.status = 'manutencao';
      await mesa.save();
    }
    
    // Unir mesas
    await mesaPrincipal.unir(mesasIds);
    
    res.status(200).json({
      success: true,
      message: 'Mesas unidas com sucesso',
      data: mesaPrincipal
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao unir mesas',
      error: error.message
    });
  }
};

// Adicionar pagante a uma mesa
exports.adicionarPagante = async (req, res) => {
  try {
    const { nome, identificador } = req.body;
    const mesa = await Mesa.findById(req.params.id);
    
    if (!mesa) {
      return res.status(404).json({
        success: false,
        message: 'Mesa não encontrada'
      });
    }
    
    // Verificar se a mesa está ocupada
    if (mesa.status !== 'ocupada') {
      return res.status(400).json({
        success: false,
        message: 'Mesa não está ocupada'
      });
    }
    
    // Verificar se já existe pagante com esse identificador
    const paganteDuplicado = mesa.pagantes.find(p => p.identificador === identificador);
    if (paganteDuplicado) {
      return res.status(400).json({
        success: false,
        message: 'Já existe um pagante com esse identificador'
      });
    }
    
    // Adicionar pagante
    mesa.pagantes.push({
      nome,
      identificador,
      pedidos: []
    });
    
    await mesa.save();
    
    res.status(200).json({
      success: true,
      message: 'Pagante adicionado com sucesso',
      data: mesa
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao adicionar pagante',
      error: error.message
    });
  }
};
