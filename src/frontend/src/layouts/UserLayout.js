import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  AppBar, 
  Box, 
  CssBaseline, 
  Drawer, 
  IconButton, 
  ListItemIcon, 
  Toolbar, 
  Typography, 
  Avatar, 
  Menu, 
  MenuItem, 
  Badge, 
  BottomNavigation, 
  BottomNavigationAction,
  Paper
} from '@mui/material';
import {
  Menu as MenuIcon,
  TableBar as TableBarIcon,
  RestaurantMenu as MenuIcon2,
  Receipt as ReceiptIcon,
  AccountCircle,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
  MonetizationOn as PaymentIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import NotificationSystem from '../components/NotificationSystem';

const UserLayout = () => {
  const { currentUser, logout } = useAuth();
  const { listen } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  // Determinar aba ativa para a navegação inferior
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.startsWith('/tables')) return 0;
    if (path.startsWith('/menu')) return 1;
    if (path.startsWith('/orders')) return 2;
    if (path.startsWith('/payment-history')) return 3;
    return 0;
  };

  // Menu do perfil
  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleProfileMenuClose();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <CssBaseline />
      <AppBar position="fixed">
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Recanto Verde
          </Typography>
          
          {/* Sistema de Notificações */}
          <NotificationSystem />
          
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-haspopup="true"
            onClick={handleProfileMenuOpen}
            color="inherit"
          >
            {currentUser?.foto ? (
              <Avatar src={currentUser.foto} alt={currentUser.nome} />
            ) : (
              <AccountCircle />
            )}
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={() => {
              navigate('/profile');
              handleProfileMenuClose();
            }}>
              Meu Perfil
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Sair
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 2,
          width: '100%',
          mt: '64px', // altura da AppBar
          mb: '56px', // altura da BottomNavigation
          overflow: 'auto'
        }}
      >
        <Outlet />
      </Box>

      {/* Navegação inferior para dispositivos móveis */}
      <Paper
        sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100 }}
        elevation={3}
      >
        <BottomNavigation
          showLabels
          value={getActiveTab()}
          onChange={(event, newValue) => {
            switch (newValue) {
              case 0:
                navigate('/tables');
                break;
              case 1:
                navigate('/menu');
                break;
              case 2:
                navigate('/orders');
                break;
              case 3:
                navigate('/payment-history');
                break;
              default:
                navigate('/tables');
            }
          }}
        >
          <BottomNavigationAction label="Mesas" icon={<TableBarIcon />} />
          <BottomNavigationAction label="Cardápio" icon={<MenuIcon2 />} />
          <BottomNavigationAction label="Pedidos" icon={<ReceiptIcon />} />
          <BottomNavigationAction label="Pagamentos" icon={<PaymentIcon />} />
        </BottomNavigation>
      </Paper>
    </Box>
  );
};

export default UserLayout;
