/**
 * Controlador temporário para login administrativo
 * Este arquivo deve ser removido após a correção do sistema de autenticação
 */

const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario.model');

// Login administrativo temporário
exports.loginAdmin = async (req, res) => {
  try {
    const { email, senha } = req.body;
    
    // Verificar se é um email de admin válido
    if (email !== 'admin@recantoverde.com' && email !== 'admin2@recantoverde.com') {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }
    
    // Verificar senha temporária fixa
    if (senha !== 'Admin@123') {
      return res.status(401).json({
        success: false,
        message: 'Senha incorreta'
      });
    }
    
    // Buscar usuário no banco
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    // Gerar token JWT
    const token = jwt.sign(
      { id: usuario._id, role: usuario.role },
      process.env.JWT_SECRET || 'recantoverde-secret-key',
      { expiresIn: process.env.JWT_EXPIRATION || '24h' }
    );
    
    // Atualizar último acesso
    usuario.ultimoAcesso = Date.now();
    await usuario.save();
    
    // Retornar dados do usuário sem a senha
    const usuarioSemSenha = { ...usuario.toObject() };
    delete usuarioSemSenha.senha;
    
    res.status(200).json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        token,
        usuario: usuarioSemSenha
      }
    });
  } catch (error) {
    console.error('Erro no login temporário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao fazer login',
      error: error.message
    });
  }
};
