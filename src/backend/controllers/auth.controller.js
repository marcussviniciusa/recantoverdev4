const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario.model');

// Registrar novo usuário
exports.register = async (req, res) => {
  try {
    const { nome, email, senha, role, telefone } = req.body;

    // Verificar se o e-mail já está em uso
    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email já está em uso' 
      });
    }

    // Criar novo usuário
    const usuario = new Usuario({
      nome,
      email,
      senha,
      role: role || 'usuario', // Default para garçom se não especificado
      telefone
    });

    await usuario.save();

    // Gerar token JWT
    const token = jwt.sign(
      { id: usuario._id, role: usuario.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    // Atualizar último acesso
    usuario.ultimoAcesso = Date.now();
    await usuario.save();

    // Retornar dados do usuário sem a senha
    const usuarioSemSenha = { ...usuario.toObject() };
    delete usuarioSemSenha.senha;

    res.status(201).json({
      success: true,
      message: 'Usuário registrado com sucesso',
      data: {
        token,
        usuario: usuarioSemSenha
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar usuário',
      error: error.message
    });
  }
};

// Login de usuário
exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Verificar se o usuário existe
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Verificar se a conta está ativa
    if (!usuario.ativo) {
      return res.status(403).json({
        success: false,
        message: 'Esta conta está desativada. Entre em contato com o administrador.'
      });
    }

    // Verificar senha
    const senhaCorreta = await usuario.compararSenha(senha);
    if (!senhaCorreta) {
      return res.status(401).json({
        success: false,
        message: 'Senha incorreta'
      });
    }

    // Gerar token JWT
    const token = jwt.sign(
      { id: usuario._id, role: usuario.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
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
    res.status(500).json({
      success: false,
      message: 'Erro ao fazer login',
      error: error.message
    });
  }
};

// Recuperar informações do usuário logado
exports.getMe = async (req, res) => {
  try {
    // Usar o req.usuario que é definido pelo middleware verificarToken
    const usuario = await Usuario.findById(req.usuario._id).select('-senha');
    
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: usuario
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao recuperar dados do usuário',
      error: error.message
    });
  }
};

// Alterar senha
exports.changePassword = async (req, res) => {
  try {
    const { senhaAtual, novaSenha } = req.body;
    const usuario = await Usuario.findById(req.usuario._id);

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Verificar senha atual
    const senhaCorreta = await usuario.compararSenha(senhaAtual);
    if (!senhaCorreta) {
      return res.status(401).json({
        success: false,
        message: 'Senha atual incorreta'
      });
    }

    // Atualizar senha
    usuario.senha = novaSenha;
    await usuario.save();

    res.status(200).json({
      success: true,
      message: 'Senha alterada com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao alterar senha',
      error: error.message
    });
  }
};
