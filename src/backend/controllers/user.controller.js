const Usuario = require('../models/usuario.model');

// Criar um novo usuário
exports.createUser = async (req, res) => {
  try {
    const { nome, email, senha, role } = req.body;
    
    // Validar campos obrigatórios
    if (!nome || !email || !senha) {
      return res.status(400).json({
        success: false,
        message: 'Nome, email e senha são campos obrigatórios'
      });
    }
    
    // Verificar se email já existe
    const emailExistente = await Usuario.findOne({ email });
    if (emailExistente) {
      return res.status(400).json({
        success: false,
        message: 'Email já está em uso'
      });
    }
    
    // Criar novo usuário
    const novoUsuario = new Usuario({
      nome,
      email,
      senha,
      role: role || 'usuario' // Padrão é 'usuario' (garçom)
    });
    
    await novoUsuario.save(); // O middleware pre-save irá fazer o hash da senha
    
    // Remover senha da resposta
    const usuario = novoUsuario.toObject();
    delete usuario.senha;
    
    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      data: usuario
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar usuário',
      error: error.message
    });
  }
};

// Excluir usuário
exports.deleteUser = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id);
    
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    // Verificar se é o único superadmin
    if (usuario.role === 'superadmin') {
      const countSuperadmins = await Usuario.countDocuments({ role: 'superadmin' });
      if (countSuperadmins <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Não é possível excluir o único administrador do sistema'
        });
      }
    }
    
    await Usuario.deleteOne({ _id: req.params.id });
    
    res.status(200).json({
      success: true,
      message: 'Usuário excluído com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir usuário',
      error: error.message
    });
  }
};

// Obter todos os usuários
exports.getAllUsers = async (req, res) => {
  try {
    // Filtros opcionais
    const { role, ativo } = req.query;
    
    // Construir objeto de filtro
    const filtro = {};
    if (role) filtro.role = role;
    if (ativo !== undefined) filtro.ativo = ativo === 'true';
    
    // Se não for admin, restringir acesso
    if (req.userRole !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Acesso não autorizado a esta funcionalidade'
      });
    }
    
    const usuarios = await Usuario.find(filtro)
      .select('-senha')
      .sort({ nome: 1 });
    
    res.status(200).json({
      success: true,
      count: usuarios.length,
      data: usuarios
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar usuários',
      error: error.message
    });
  }
};

// Obter um usuário específico
exports.getUser = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id).select('-senha');
    
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    // Se não for admin nem o próprio usuário, restringir acesso
    if (req.userRole !== 'superadmin' && req.usuario._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Acesso não autorizado a este usuário'
      });
    }
    
    res.status(200).json({
      success: true,
      data: usuario
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar usuário',
      error: error.message
    });
  }
};

// Atualizar usuário
exports.updateUser = async (req, res) => {
  try {
    const { nome, email, telefone, foto, senha, role } = req.body;
    
    let usuario = await Usuario.findById(req.params.id);
    
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    // Se não for admin nem o próprio usuário, restringir acesso
    if (req.userRole !== 'superadmin' && req.usuario._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Acesso não autorizado para atualizar este usuário'
      });
    }
    
    // Se estiver alterando o email, verificar se já existe
    if (email && email !== usuario.email) {
      const emailExistente = await Usuario.findOne({ email });
      if (emailExistente) {
        return res.status(400).json({
          success: false,
          message: 'Email já está em uso'
        });
      }
    }
    
    // Atualizar dados do usuário
    usuario.nome = nome || usuario.nome;
    usuario.email = email || usuario.email;
    usuario.telefone = telefone !== undefined ? telefone : usuario.telefone;
    usuario.foto = foto !== undefined ? foto : usuario.foto;
    
    // Apenas atualizar a senha se fornecida
    if (senha) {
      usuario.senha = senha; // O middleware pre-save irá fazer o hash da senha
    }
    
    // Apenas administradores podem alterar a role
    if (role && req.userRole === 'superadmin') {
      usuario.role = role;
    }
    
    await usuario.save();
    
    // Retornar usuário sem a senha
    const usuarioAtualizado = await Usuario.findById(req.params.id).select('-senha');
    
    res.status(200).json({
      success: true,
      message: 'Usuário atualizado com sucesso',
      data: usuarioAtualizado
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar usuário',
      error: error.message
    });
  }
};

// Atualizar status (ativar/desativar)
exports.updateStatus = async (req, res) => {
  try {
    const { ativo } = req.body;
    
    // Apenas admin pode alterar status
    if (req.userRole !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Apenas administradores podem ativar/desativar usuários'
      });
    }
    
    let usuario = await Usuario.findById(req.params.id);
    
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    // Não permitir desativar o próprio usuário
    if (req.usuario._id.toString() === req.params.id && ativo === false) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível desativar seu próprio usuário'
      });
    }
    
    usuario.ativo = ativo;
    await usuario.save();
    
    res.status(200).json({
      success: true,
      message: `Usuário ${ativo ? 'ativado' : 'desativado'} com sucesso`,
      data: {
        id: usuario._id,
        nome: usuario.nome,
        ativo: usuario.ativo
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar status do usuário',
      error: error.message
    });
  }
};

// Alterar função (role)
exports.updateRole = async (req, res) => {
  try {
    const { role } = req.body;
    
    // Apenas admin pode alterar roles
    if (req.userRole !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Apenas administradores podem alterar funções de usuários'
      });
    }
    
    let usuario = await Usuario.findById(req.params.id);
    
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    // Não permitir alterar a própria role
    if (req.usuario._id.toString() === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível alterar sua própria função'
      });
    }
    
    // Verificar se a role é válida
    if (!['superadmin', 'usuario'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Função inválida. Deve ser "superadmin" ou "usuario"'
      });
    }
    
    usuario.role = role;
    await usuario.save();
    
    res.status(200).json({
      success: true,
      message: 'Função do usuário alterada com sucesso',
      data: {
        id: usuario._id,
        nome: usuario.nome,
        role: usuario.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao alterar função do usuário',
      error: error.message
    });
  }
};

// Obter estatísticas de desempenho
exports.getPerformance = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id).select('-senha');
    
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    // Se não for admin nem o próprio usuário, restringir acesso
    if (req.userRole !== 'superadmin' && req.usuario._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Acesso não autorizado a estas estatísticas'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        usuario: {
          id: usuario._id,
          nome: usuario.nome,
          role: usuario.role
        },
        desempenho: usuario.desempenho,
        mesasAtendidas: usuario.mesasAtendidas.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar estatísticas de desempenho',
      error: error.message
    });
  }
};

// Atualizar estatísticas de desempenho
exports.updatePerformance = async (req, res) => {
  try {
    const { pedidosAtendidos, tempoMedioAtendimento, avaliacaoMedia } = req.body;
    
    // Apenas admin pode atualizar estatísticas
    if (req.userRole !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Apenas administradores podem atualizar estatísticas de desempenho'
      });
    }
    
    let usuario = await Usuario.findById(req.params.id);
    
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    // Atualizar estatísticas
    if (pedidosAtendidos !== undefined) usuario.desempenho.pedidosAtendidos = pedidosAtendidos;
    if (tempoMedioAtendimento !== undefined) usuario.desempenho.tempoMedioAtendimento = tempoMedioAtendimento;
    if (avaliacaoMedia !== undefined) usuario.desempenho.avaliacaoMedia = avaliacaoMedia;
    
    await usuario.save();
    
    res.status(200).json({
      success: true,
      message: 'Estatísticas de desempenho atualizadas com sucesso',
      data: {
        usuario: {
          id: usuario._id,
          nome: usuario.nome
        },
        desempenho: usuario.desempenho
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar estatísticas de desempenho',
      error: error.message
    });
  }
};
