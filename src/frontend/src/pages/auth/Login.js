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
  Link
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validação simples
    if (!email.trim() || !senha.trim()) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const result = await login(email, senha);
      
      if (result.success) {
        // Redirecionar com base na role do usuário
        if (result.role === 'superadmin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/tables');
        }
      } else {
        setError(result.message || 'Erro ao realizar login. Verifique suas credenciais.');
      }
    } catch (error) {
      setError('Erro ao conectar ao servidor. Tente novamente mais tarde.');
      console.error('Erro no login:', error);
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
          Acesso ao Sistema
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Faça login para acessar o sistema de gerenciamento
        </Typography>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2, textAlign: 'center' }}>
          {error}
        </Typography>
      )}

      <TextField
        margin="normal"
        required
        fullWidth
        id="email"
        label="Email"
        name="email"
        autoComplete="email"
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={!!error}
      />
      
      <TextField
        margin="normal"
        required
        fullWidth
        name="senha"
        label="Senha"
        type={showPassword ? 'text' : 'password'}
        id="senha"
        autoComplete="current-password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        error={!!error}
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

      <Button
        type="submit"
        fullWidth
        variant="contained"
        color="primary"
        size="large"
        sx={{ mt: 3, mb: 2, py: 1.5 }}
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} /> : 'Entrar'}
      </Button>

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Novo no sistema?{' '}
          <Link component={RouterLink} to="/register" variant="body2">
            Solicite seu acesso
          </Link>
        </Typography>
      </Box>
    </Box>
  );
};

export default Login;
