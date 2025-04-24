import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ role }) => {
  const { currentUser, loading, isAuthenticated } = useAuth();

  // Se ainda estiver carregando, mostrar indicador de carregamento
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Se não estiver autenticado, redirecionar para login
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Se um papel específico for necessário, verificar se o usuário tem esse papel
  if (role && currentUser.role !== role) {
    // Redirecionar com base no papel do usuário
    return <Navigate to={currentUser.role === 'superadmin' ? '/admin/dashboard' : '/tables'} />;
  }

  // Renderizar o conteúdo da rota protegida
  return <Outlet />;
};

export default ProtectedRoute;
