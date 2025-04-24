const { Categoria, ItemCardapio } = require('../models/cardapio.model');

// ===== CONTROLLERS PARA CATEGORIAS =====

// Obter todas as categorias
exports.getAllCategorias = async (req, res) => {
  try {
    const categorias = await Categoria.find().sort({ ordem: 1 });
    
    res.status(200).json({
      success: true,
      count: categorias.length,
      data: categorias
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar categorias',
      error: error.message
    });
  }
};

// Obter uma categoria específica
exports.getCategoria = async (req, res) => {
  try {
    const categoria = await Categoria.findById(req.params.id);
    
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoria não encontrada'
      });
    }
    
    res.status(200).json({
      success: true,
      data: categoria
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar categoria',
      error: error.message
    });
  }
};

// Criar nova categoria
exports.createCategoria = async (req, res) => {
  try {
    const { nome, descricao, ordem, ativa } = req.body;
    
    // Verificar se já existe categoria com esse nome
    const categoriaExistente = await Categoria.findOne({ nome });
    if (categoriaExistente) {
      return res.status(400).json({
        success: false,
        message: `Já existe uma categoria com o nome "${nome}"`
      });
    }
    
    const categoria = await Categoria.create({
      nome,
      descricao,
      ordem: ordem || 0,
      ativa: ativa !== undefined ? ativa : true
    });
    
    res.status(201).json({
      success: true,
      message: 'Categoria criada com sucesso',
      data: categoria
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar categoria',
      error: error.message
    });
  }
};

// Atualizar categoria
exports.updateCategoria = async (req, res) => {
  try {
    const { nome, descricao, ordem, ativa } = req.body;
    
    let categoria = await Categoria.findById(req.params.id);
    
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoria não encontrada'
      });
    }
    
    // Se estiver alterando o nome, verificar se já existe
    if (nome && nome !== categoria.nome) {
      const categoriaExistente = await Categoria.findOne({ nome });
      if (categoriaExistente) {
        return res.status(400).json({
          success: false,
          message: `Já existe uma categoria com o nome "${nome}"`
        });
      }
    }
    
    // Atualizar campos
    if (nome) categoria.nome = nome;
    if (descricao !== undefined) categoria.descricao = descricao;
    if (ordem !== undefined) categoria.ordem = ordem;
    if (ativa !== undefined) categoria.ativa = ativa;
    
    await categoria.save();
    
    res.status(200).json({
      success: true,
      message: 'Categoria atualizada com sucesso',
      data: categoria
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar categoria',
      error: error.message
    });
  }
};

// Excluir categoria
exports.deleteCategoria = async (req, res) => {
  try {
    const categoria = await Categoria.findById(req.params.id);
    
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoria não encontrada'
      });
    }
    
    // Verificar se existem itens associados a esta categoria
    const itensAssociados = await ItemCardapio.countDocuments({ categoria: req.params.id });
    
    if (itensAssociados > 0) {
      return res.status(400).json({
        success: false,
        message: `Não é possível excluir esta categoria pois existem ${itensAssociados} itens associados a ela`
      });
    }
    
    await Categoria.deleteOne({ _id: req.params.id });
    
    res.status(200).json({
      success: true,
      message: 'Categoria excluída com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir categoria',
      error: error.message
    });
  }
};

// ===== CONTROLLERS PARA ITENS DO CARDÁPIO =====

// Obter itens por categoria
exports.getItensByCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Buscando itens para categoria ID: ${id}`);
    
    // Verificar se a categoria existe
    const categoriaExiste = await Categoria.findById(id);
    if (!categoriaExiste) {
      console.log(`Categoria ID ${id} não encontrada`);
      return res.status(404).json({
        success: false,
        message: 'Categoria não encontrada'
      });
    }
    
    console.log(`Categoria encontrada: ${categoriaExiste.nome}`);
    
    // Buscar todos os itens da categoria e popular os detalhes da categoria
    const itens = await ItemCardapio.find({ categoria: id, disponivel: true })
      .populate('categoria', 'nome descricao') // Popula os detalhes da categoria
      .sort({ nome: 1 });
    
    console.log(`Itens encontrados: ${itens.length}`);
    if (itens.length > 0) {
      console.log(`Nomes dos itens: ${itens.map(item => item.nome).join(', ')}`);
    }
    
    res.status(200).json({
      success: true,
      count: itens.length,
      data: itens
    });
  } catch (error) {
    console.error(`Erro ao buscar itens da categoria: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar itens da categoria',
      error: error.message
    });
  }
};

// Obter todos os itens do cardápio
exports.getAllItens = async (req, res) => {
  try {
    // Filtros opcionais
    const { categoria, disponivel, destaque } = req.query;
    
    // Construir objeto de filtro
    const filtro = {};
    if (categoria) filtro.categoria = categoria;
    if (disponivel !== undefined) filtro.disponivel = disponivel === 'true';
    if (destaque !== undefined) filtro.destaque = destaque === 'true';
    
    const itens = await ItemCardapio.find(filtro)
      .populate('categoria', 'nome')
      .sort({ 'categoria.ordem': 1, nome: 1 });
    
    res.status(200).json({
      success: true,
      count: itens.length,
      data: itens
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar itens do cardápio',
      error: error.message
    });
  }
};

// Obter um item específico do cardápio
exports.getItem = async (req, res) => {
  try {
    const item = await ItemCardapio.findById(req.params.id)
      .populate('categoria', 'nome');
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item não encontrado'
      });
    }
    
    res.status(200).json({
      success: true,
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar item do cardápio',
      error: error.message
    });
  }
};

// Criar novo item do cardápio
exports.createItem = async (req, res) => {
  try {
    const {
      nome,
      descricao,
      categoria,
      preco,
      imagem,
      disponivel,
      destaque,
      ingredientes,
      tempo_preparo,
      opcoes,
      alergenos,
      informacao_nutricional
    } = req.body;
    
    // Verificar se a categoria existe
    const categoriaExistente = await Categoria.findById(categoria);
    if (!categoriaExistente) {
      return res.status(404).json({
        success: false,
        message: 'Categoria não encontrada'
      });
    }
    
    const item = await ItemCardapio.create({
      nome,
      descricao,
      categoria,
      preco,
      imagem,
      disponivel: disponivel !== undefined ? disponivel : true,
      destaque: destaque !== undefined ? destaque : false,
      ingredientes: ingredientes || [],
      tempo_preparo: tempo_preparo || 15,
      opcoes: opcoes || [],
      alergenos: alergenos || [],
      informacao_nutricional: informacao_nutricional || {}
    });
    
    res.status(201).json({
      success: true,
      message: 'Item criado com sucesso',
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar item do cardápio',
      error: error.message
    });
  }
};

// Atualizar item do cardápio
exports.updateItem = async (req, res) => {
  try {
    const {
      nome,
      descricao,
      categoria,
      preco,
      imagem,
      disponivel,
      destaque,
      ingredientes,
      tempo_preparo,
      opcoes,
      alergenos,
      informacao_nutricional
    } = req.body;
    
    let item = await ItemCardapio.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item não encontrado'
      });
    }
    
    // Se estiver alterando a categoria, verificar se ela existe
    if (categoria && categoria !== item.categoria.toString()) {
      const categoriaExistente = await Categoria.findById(categoria);
      if (!categoriaExistente) {
        return res.status(404).json({
          success: false,
          message: 'Categoria não encontrada'
        });
      }
    }
    
    // Atualizar campos
    if (nome) item.nome = nome;
    if (descricao !== undefined) item.descricao = descricao;
    if (categoria) item.categoria = categoria;
    if (preco !== undefined) item.preco = preco;
    if (imagem) item.imagem = imagem;
    if (disponivel !== undefined) item.disponivel = disponivel;
    if (destaque !== undefined) item.destaque = destaque;
    if (ingredientes) item.ingredientes = ingredientes;
    if (tempo_preparo) item.tempo_preparo = tempo_preparo;
    if (opcoes) item.opcoes = opcoes;
    if (alergenos) item.alergenos = alergenos;
    if (informacao_nutricional) item.informacao_nutricional = informacao_nutricional;
    
    await item.save();
    
    res.status(200).json({
      success: true,
      message: 'Item atualizado com sucesso',
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar item do cardápio',
      error: error.message
    });
  }
};

// Excluir item do cardápio
exports.deleteItem = async (req, res) => {
  try {
    const item = await ItemCardapio.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item não encontrado'
      });
    }
    
    await ItemCardapio.deleteOne({ _id: req.params.id });
    
    res.status(200).json({
      success: true,
      message: 'Item excluído com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir item do cardápio',
      error: error.message
    });
  }
};

// Atualizar estatísticas de um item
exports.atualizarEstatisticas = async (req, res) => {
  try {
    const { quantidade, avaliacao } = req.body;
    
    const item = await ItemCardapio.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item não encontrado'
      });
    }
    
    await item.atualizarEstatisticas(quantidade, avaliacao);
    
    res.status(200).json({
      success: true,
      message: 'Estatísticas atualizadas com sucesso',
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar estatísticas',
      error: error.message
    });
  }
};

// Obter itens mais populares
exports.getItensMaisPopulares = async (req, res) => {
  try {
    const { limite = 10 } = req.query;
    
    const itens = await ItemCardapio.find({ disponivel: true })
      .sort({ 'estatisticas.popularidade': -1 })
      .limit(parseInt(limite))
      .populate('categoria', 'nome');
    
    res.status(200).json({
      success: true,
      count: itens.length,
      data: itens
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar itens mais populares',
      error: error.message
    });
  }
};
