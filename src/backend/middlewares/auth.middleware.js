const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario.model');

// Middleware para verificar token de autenticação
exports.verificarToken = async (req, res, next) => {
  try {
    console.log('Verificando token de autenticação');
    console.log('Headers recebidos:', req.headers);
    
    // Verificar se o token está presente no header
    const token = req.headers.authorization?.split(' ')[1];
    console.log('Token extraído:', token ? 'Token presente' : 'Token ausente');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Acesso negado. Token não fornecido.'
      });
    }

    // Verificar e decodificar o token
    console.log('Tentando verificar token com JWT_SECRET');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decodificado:', decoded);
    
    // Buscar usuário no banco de dados
    console.log('Buscando usuário com ID:', decoded.id);
    const usuario = await Usuario.findById(decoded.id);
    console.log('Usuário encontrado:', usuario ? 'Sim' : 'Não');
    
    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado ou token inválido'
      });
    }

    // Adicionar informações do usuário à requisição
    req.usuario = usuario;
    req.userRole = usuario.role;
    console.log('Usuário adicionado à requisição:', req.usuario._id);
    console.log('Role do usuário:', req.userRole);
    
    next();
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado. Faça login novamente.'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Token inválido ou não autorizado'
    });
  }
};

// Middleware para verificar role do usuário
exports.verificarRole = (roles) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    if (roles.includes(req.usuario.role)) {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: 'Acesso não autorizado para este recurso'
      });
    }
  };
};

// Middleware para verificar se o usuário é superadmin
exports.verificarSuperAdmin = (req, res, next) => {
  if (!req.usuario) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não autenticado'
    });
  }

  if (req.usuario.role === 'superadmin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Apenas superadmins podem acessar este recurso'
    });
  }
};
