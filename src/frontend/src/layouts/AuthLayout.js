import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Box, Container, Paper, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const AuthLayout = () => {
  const { isAuthenticated, currentUser } = useAuth();

  // Redirecionar usuário autenticado com base na role
  if (isAuthenticated) {
    return <Navigate to={currentUser.role === 'superadmin' ? '/admin/dashboard' : '/tables'} />;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'primary.main',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 2,
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom color="primary.main" fontWeight="bold">
            Sistema de Gerenciamento para Restaurante
          </Typography>
          <Outlet />
        </Paper>
      </Container>
      <Typography variant="body2" color="white" sx={{ mt: 4 }}>
        © {new Date().getFullYear()} Recanto Verde - Todos os direitos reservados
      </Typography>
    </Box>
  );
};

export default AuthLayout;
