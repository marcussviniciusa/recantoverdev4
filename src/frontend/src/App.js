import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';

// Contextos
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';

// Layouts
import SuperAdminLayout from './layouts/SuperAdminLayout';
import UserLayout from './layouts/UserLayout';
import AuthLayout from './layouts/AuthLayout';

// Páginas de Autenticação
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Páginas do Superadmin
import Dashboard from './pages/superadmin/Dashboard';
import Users from './pages/superadmin/Users';
import SuperAdminMenu from './pages/superadmin/Menu';
import TableManagement from './pages/superadmin/TableManagement';
import OrderManagement from './pages/superadmin/OrderManagement';
import Reports from './pages/superadmin/Reports';
import AdminPaymentHistory from './pages/superadmin/PaymentHistory';

// Páginas do Usuário (Garçom)
import Tables from './pages/user/Tables';
import Orders from './pages/user/Orders';
import Menu from './pages/user/Menu';
import TableDetail from './pages/user/TableDetail';
import NewOrder from './pages/user/NewOrder';
import Payment from './pages/user/Payment';
import PaymentHistory from './pages/user/PaymentHistory';

// Rotas protegidas
import ProtectedRoute from './components/ProtectedRoute';

// Tema personalizado
const theme = createTheme({
  palette: {
    primary: {
      main: '#2e7d32', // Verde
    },
    secondary: {
      main: '#f9a825', // Amarelo
    },
    error: {
      main: '#d32f2f', // Vermelho
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 500,
    },
    h2: {
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 'bold',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },
});

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulação de carregamento inicial
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          bgcolor: 'background.paper',
        }}
      >
        Carregando...
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastContainer position="top-right" autoClose={3000} />
      <AuthProvider>
        <SocketProvider>
          <Router>
            <Routes>
              {/* Rotas de autenticação */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
              </Route>

              {/* Rotas do Superadmin (Recepcionista) */}
              <Route element={<ProtectedRoute role="superadmin" />}>
                <Route element={<SuperAdminLayout />}>
                  <Route path="/admin/dashboard" element={<Dashboard />} />
                  <Route path="/admin/users" element={<Users />} />
                  <Route path="/admin/menu" element={<SuperAdminMenu />} />
                  <Route path="/admin/tables" element={<TableManagement />} />
                  <Route path="/admin/orders" element={<OrderManagement />} />
                  <Route path="/admin/reports" element={<Reports />} />
                  <Route path="/admin/payment-history" element={<AdminPaymentHistory />} />
                </Route>
              </Route>

              {/* Rotas do Usuário (Garçom) */}
              <Route element={<ProtectedRoute role="usuario" />}>
                <Route element={<UserLayout />}>
                  <Route path="/tables" element={<Tables />} />
                  <Route path="/tables/:id" element={<TableDetail />} />
                  <Route path="/tables/:id/new-order" element={<NewOrder />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/tables/:id/payment" element={<Payment />} />
                  <Route path="/payment-history" element={<PaymentHistory />} />
                  <Route path="/menu" element={<Menu />} />
                </Route>
              </Route>

              {/* Rota padrão para redirecionamento */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Router>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
