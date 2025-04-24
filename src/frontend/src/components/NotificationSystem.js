import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Typography,
  Divider,
  Box,
  Button,
  Tooltip,
  Chip,
  Slide,
  Snackbar,
  Alert,
  useTheme
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon,
  LocalDining as DiningIcon,
  TableBar as TableIcon,
  AccessTime as TimeIcon,
  Visibility as VisibilityIcon,
  NotificationsActive as AlertIcon,
  NotificationsOff as NotificationOffIcon,
  Delete as DeleteIcon,
  DeleteSweep as ClearAllIcon
} from '@mui/icons-material';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const NotificationSystem = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { listen } = useSocket();
  
  // Estados
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [recentNotification, setRecentNotification] = useState(null);
  const [showSnackbar, setShowSnackbar] = useState(false);
  
  useEffect(() => {
    // Carregar notificações salvas do localStorage
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) {
      try {
        const parsedNotifications = JSON.parse(savedNotifications);
        setNotifications(parsedNotifications);
        updateUnreadCount(parsedNotifications);
      } catch (error) {
        console.error('Erro ao carregar notificações:', error);
      }
    }
    
    // Configurar listeners para eventos de notificação
    const unsubscribePedidoPronto = listen('pedido_pronto', handlePedidoPronto);
    const unsubscribeMesaAtualizada = listen('mesa_atualizada', handleMesaAtualizada);
    
    return () => {
      unsubscribePedidoPronto();
      unsubscribeMesaAtualizada();
    };
  }, [listen]);
  
  // Salvar notificações no localStorage quando mudarem
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
    updateUnreadCount(notifications);
  }, [notifications]);
  
  // Atualizar contador de não lidas
  const updateUnreadCount = (notifList) => {
    const unread = notifList.filter(notif => !notif.read).length;
    setUnreadCount(unread);
  };
  
  // Handler para notificação de pedido pronto
  const handlePedidoPronto = (data) => {
    // Verificar se o garçom atual é responsável por este pedido
    if (data.garcomId && data.garcomId !== currentUser._id) {
      return; // Não notificar se o pedido for de outro garçom
    }
    
    const newNotification = {
      id: `pedido_pronto_${data.pedidoId}_${Date.now()}`,
      type: 'pedido_pronto',
      title: 'Pedido Pronto',
      message: `O pedido #${data.numeroPedido} para a Mesa ${data.mesaNumero} está pronto para entrega.`,
      data: {
        pedidoId: data.pedidoId,
        mesaId: data.mesaId,
        mesaNumero: data.mesaNumero,
        numeroPedido: data.numeroPedido
      },
      timestamp: new Date().toISOString(),
      read: false,
      urgent: true
    };
    
    addNotification(newNotification);
    
    // Mostrar snackbar com notificação
    setRecentNotification(newNotification);
    setShowSnackbar(true);
    
    // Reproduzir som de notificação
    playNotificationSound();
  };
  
  // Handler para notificação de mesa atualizada
  const handleMesaAtualizada = (data) => {
    // Exemplo: notificar quando uma mesa for liberada
    if (data.status === 'disponivel' && data.statusAnterior === 'ocupada') {
      const newNotification = {
        id: `mesa_liberada_${data.id}_${Date.now()}`,
        type: 'mesa_liberada',
        title: 'Mesa Liberada',
        message: `A Mesa ${data.mesaNumero} foi liberada e está disponível.`,
        data: {
          mesaId: data.id,
          mesaNumero: data.mesaNumero
        },
        timestamp: new Date().toISOString(),
        read: false,
        urgent: false
      };
      
      addNotification(newNotification);
    }
  };
  
  // Adicionar nova notificação
  const addNotification = (notification) => {
    setNotifications(prev => {
      // Limitar a 50 notificações
      const updated = [notification, ...prev];
      if (updated.length > 50) {
        return updated.slice(0, 50);
      }
      return updated;
    });
  };
  
  // Marcar notificação como lida
  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };
  
  // Marcar todas as notificações como lidas
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };
  
  // Deletar uma notificação
  const deleteNotification = (notificationId) => {
    setNotifications(prev => 
      prev.filter(notif => notif.id !== notificationId)
    );
  };
  
  // Limpar todas as notificações
  const clearAllNotifications = () => {
    setNotifications([]);
  };
  
  // Navegar para a página relevante ao clicar na notificação
  const handleNotificationClick = (notification) => {
    // Marcar como lida
    markAsRead(notification.id);
    
    // Navegar com base no tipo de notificação
    if (notification.type === 'pedido_pronto' && notification.data?.mesaId) {
      navigate(`/tables/${notification.data.mesaId}`);
    } else if (notification.type === 'mesa_liberada' && notification.data?.mesaId) {
      navigate('/tables');
    }
    
    // Fechar o drawer após a navegação
    setOpenDrawer(false);
  };
  
  // Reproduzir som de notificação
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.play();
    } catch (error) {
      console.error('Erro ao reproduzir som de notificação:', error);
    }
  };
  
  // Formatar timestamp para exibição
  const formatTimestamp = (timestamp) => {
    try {
      const date = parseISO(timestamp);
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    } catch (error) {
      return '';
    }
  };
  
  // Renderizar ícone com base no tipo de notificação
  const renderNotificationIcon = (notification) => {
    switch (notification.type) {
      case 'pedido_pronto':
        return <DiningIcon color="success" />;
      case 'mesa_liberada':
        return <TableIcon color="primary" />;
      default:
        return <NotificationsIcon color="action" />;
    }
  };
  
  return (
    <>
      {/* Ícone de notificações na barra superior */}
      <Tooltip title="Notificações">
        <IconButton color="inherit" onClick={() => setOpenDrawer(true)}>
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      
      {/* Drawer de notificações */}
      <Drawer
        anchor="right"
        open={openDrawer}
        onClose={() => setOpenDrawer(false)}
      >
        <Box sx={{ width: 320, p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Notificações
            </Typography>
            
            <Box>
              <Tooltip title="Marcar todas como lidas">
                <IconButton 
                  size="small" 
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                >
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Limpar todas">
                <IconButton 
                  size="small" 
                  onClick={clearAllNotifications}
                  disabled={notifications.length === 0}
                >
                  <ClearAllIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          {notifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <NotificationOffIcon color="disabled" sx={{ fontSize: 48, mb: 2 }} />
              <Typography color="text.secondary">
                Nenhuma notificação disponível
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {notifications.map((notification) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    button
                    onClick={() => handleNotificationClick(notification)}
                    sx={{
                      bgcolor: notification.read ? 'transparent' : 'action.hover',
                      borderLeft: notification.urgent ? `4px solid ${theme.palette.error.main}` : 'none',
                      pl: notification.urgent ? 1.5 : 2
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {renderNotificationIcon(notification)}
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Typography variant="body1" fontWeight={notification.read ? 'normal' : 'bold'}>
                          {notification.title}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {notification.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            <TimeIcon fontSize="inherit" sx={{ verticalAlign: 'text-bottom', mr: 0.5 }} />
                            {formatTimestamp(notification.timestamp)}
                          </Typography>
                        </>
                      }
                    />
                    
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      </Drawer>
      
      {/* Snackbar para notificações em tempo real */}
      <Snackbar
        open={showSnackbar}
        autoHideDuration={6000}
        onClose={() => setShowSnackbar(false)}
        TransitionComponent={Slide}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          severity="success"
          variant="filled"
          icon={<AlertIcon />}
          action={
            <Button 
              color="inherit" 
              size="small"
              onClick={() => {
                if (recentNotification) {
                  handleNotificationClick(recentNotification);
                }
                setShowSnackbar(false);
              }}
            >
              Ver
            </Button>
          }
          onClose={() => setShowSnackbar(false)}
        >
          {recentNotification?.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default NotificationSystem;
