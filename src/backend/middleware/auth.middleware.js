const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

exports.verifyToken = async (req, res, next) => {
  try {
    // Obter o token do cabeçalho Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticação não fornecido'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar se o usuário ainda existe
    const usuario = await User.findById(decoded.id);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    // Verificar se o usuário está ativo
    if (!usuario.ativo) {
      return res.status(403).json({
        success: false,
        message: 'Usuário desativado'
      });
    }
    
    // Adicionar ID do usuário e role à requisição
    req.userId = decoded.id;
    req.userRole = decoded.role;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar token',
      error: error.message
    });
  }
};

// Middleware para verificar se o usuário é superadmin
exports.isSuperAdmin = (req, res, next) => {
  if (req.userRole !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Acesso restrito a administradores'
    });
  }
  
  next();
};

// Middleware para verificar se o usuário é o dono do recurso ou um superadmin
exports.isOwnerOrSuperAdmin = (ownerId) => {
  return (req, res, next) => {
    if (req.userRole === 'superadmin' || req.userId === ownerId) {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Você não tem permissão para acessar este recurso'
    });
  };
};
