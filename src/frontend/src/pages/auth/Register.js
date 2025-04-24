import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { 
  TextField, 
  Button, 
  Typography, 
  Box, 
  InputAdornment, 
  IconButton,
  CircularProgress,
  Link,
  Grid,
  FormControl,
  FormHelperText
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    telefone: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validar nome
    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }
    
    // Validar email
    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    
    // Validar senha
    if (!formData.senha) {
      newErrors.senha = 'Senha é obrigatória';
    } else if (formData.senha.length < 6) {
      newErrors.senha = 'A senha deve ter pelo menos 6 caracteres';
    }
    
    // Validar confirmação de senha
    if (formData.senha !== formData.confirmarSenha) {
      newErrors.confirmarSenha = 'As senhas não coincidem';
    }
    
    // Validar telefone (opcional, mas se fornecido deve ser válido)
    if (formData.telefone && !/^\(\d{2}\) \d{5}-\d{4}$/.test(formData.telefone)) {
      newErrors.telefone = 'Formato inválido. Use (99) 99999-9999';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Por padrão, registrar como usuário (garçom)
      const userData = {
        nome: formData.nome,
        email: formData.email,
        senha: formData.senha,
        telefone: formData.telefone,
        role: 'usuario' // Padrão é garçom, superadmin deve ser concedido manualmente
      };
      
      const result = await register(userData);
      
      if (result.success) {
        // Redirecionar para a página apropriada com base na role
        navigate(result.role === 'superadmin' ? '/admin/dashboard' : '/tables');
      } else {
        setErrors({ general: result.message || 'Erro ao registrar. Tente novamente.' });
      }
    } catch (error) {
      setErrors({ general: 'Erro ao conectar ao servidor. Tente novamente mais tarde.' });
      console.error('Erro no registro:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography component="h1" variant="h5" gutterBottom>
          Novo Cadastro
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Preencha o formulário para solicitar acesso ao sistema
        </Typography>
      </Box>

      {errors.general && (
        <Typography color="error" sx={{ mb: 2, textAlign: 'center' }}>
          {errors.general}
        </Typography>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            required
            fullWidth
            id="nome"
            label="Nome Completo"
            name="nome"
            autoComplete="name"
            value={formData.nome}
            onChange={handleChange}
            error={!!errors.nome}
            helperText={errors.nome}
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            required
            fullWidth
            id="email"
            label="Email"
            name="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            error={!!errors.email}
            helperText={errors.email}
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            required
            fullWidth
            id="telefone"
            label="Telefone"
            name="telefone"
            placeholder="(99) 99999-9999"
            value={formData.telefone}
            onChange={handleChange}
            error={!!errors.telefone}
            helperText={errors.telefone || "Formato: (99) 99999-9999"}
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            required
            fullWidth
            name="senha"
            label="Senha"
            type={showPassword ? 'text' : 'password'}
            id="senha"
            value={formData.senha}
            onChange={handleChange}
            error={!!errors.senha}
            helperText={errors.senha}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            required
            fullWidth
            name="confirmarSenha"
            label="Confirmar Senha"
            type={showPassword ? 'text' : 'password'}
            id="confirmarSenha"
            value={formData.confirmarSenha}
            onChange={handleChange}
            error={!!errors.confirmarSenha}
            helperText={errors.confirmarSenha}
          />
        </Grid>
      </Grid>

      <Button
        type="submit"
        fullWidth
        variant="contained"
        color="primary"
        size="large"
        sx={{ mt: 3, mb: 2, py: 1.5 }}
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} /> : 'Cadastrar'}
      </Button>

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Já tem uma conta?{' '}
          <Link component={RouterLink} to="/login" variant="body2">
            Faça login
          </Link>
        </Typography>
      </Box>
    </Box>
  );
};

export default Register;
