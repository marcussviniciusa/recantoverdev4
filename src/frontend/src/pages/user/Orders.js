import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Badge from '@mui/material/Badge';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { 
  Receipt as ReceiptIcon,
  Restaurant as RestaurantIcon,
  CheckCircle as CheckCircleIcon,
  LocalDining as LocalDiningIcon,
  Person as PersonIcon,
  TableBar as TableIcon,
  AccessTime as AccessTimeIcon,
  ArrowForward as ArrowForwardIcon,
  Delete as DeleteIcon,
  Done as DoneIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import api from '../../services/api';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [actionLoading, setActionLoading] = useState(false); // Estado para controlar carregamento das ações
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    orderId: null,
    loading: false
  });
  const { currentUser } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    // Função para buscar pedidos da API
    const fetchPedidos = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/pedidos');
        if (response.data.success) {
          setOrders(response.data.data);
        } else {
          console.error('Erro ao buscar pedidos:', response.data.message);
        }
      } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPedidos();
  }, []);

  useEffect(() => {
    if (socket) {
      // Ouvir atualizações de pedidos
      socket.on('orderUpdated', (updatedOrder) => {
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === updatedOrder._id ? updatedOrder : order
          )
        );
      });

      socket.on('newOrder', (newOrder) => {
        setOrders(prevOrders => [...prevOrders, newOrder]);
      });

      return () => {
        socket.off('orderUpdated');
        socket.off('newOrder');
      };
    }
  }, [socket]);

  const handleChangeTab = (event, newValue) => {
    setActiveTab(newValue);
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pendente': return 'warning';
      case 'em_preparacao': return 'info';
      case 'pronto': return 'success';
      case 'entregue': return 'default';
      case 'cancelado': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'em_preparacao': return 'Em Preparação';
      case 'pronto': return 'Pronto para Entrega';
      case 'entregue': return 'Entregue';
      case 'cancelado': return 'Cancelado';
      default: return 'Desconhecido';
    }
  };

  const handleOrderClick = (orderId) => {
    // Navegar para detalhes do pedido
    navigate(`/orders/${orderId}`);
  };

  const filteredOrders = () => {
    if (activeTab === 0) {
      // Todos os pedidos ativos (não entregues/cancelados)
      return orders.filter(order => 
        !['entregue', 'cancelado'].includes(order.status)
      );
    } else if (activeTab === 1) {
      // Pedidos em preparação
      return orders.filter(order => order.status === 'em_preparacao');
    } else if (activeTab === 2) {
      // Pedidos prontos para entrega
      return orders.filter(order => order.status === 'pronto');
    } else {
      // Histórico (entregues/cancelados)
      return orders.filter(order => 
        ['entregue', 'cancelado'].includes(order.status)
      );
    }
  };

  // Função para mostrar snackbar
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  // Função para fechar snackbar
  const handleSnackbarClose = () => {
    setSnackbar(prev => ({
      ...prev,
      open: false
    }));
  };

  // Função para marcar pedido como concluído visualmente (apenas para organização)
  const handleConcluirVisual = async (orderId) => {
    try {
      setActionLoading(true);
      const response = await api.put(`/api/pedidos/${orderId}/concluir-visual`);
      
      if (response.data.success) {
        // Atualizar estado local
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === orderId ? { ...order, concluidoVisualmente: true } : order
          )
        );
        showSnackbar('Pedido marcado como concluído com sucesso', 'success');
      } else {
        showSnackbar(response.data.message || 'Erro ao concluir pedido', 'error');
      }
    } catch (error) {
      console.error('Erro ao marcar pedido como concluído:', error);
      showSnackbar('Erro ao concluir pedido. Tente novamente.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Função para abrir diálogo de confirmação de exclusão
  const handleConfirmExcluir = (orderId) => {
    setConfirmDialog({
      open: true,
      orderId,
      loading: false
    });
  };

  // Função para fechar diálogo de confirmação
  const handleCloseConfirmDialog = () => {
    setConfirmDialog({
      open: false,
      orderId: null,
      loading: false
    });
  };

  // Função para excluir pedido permanentemente
  const handleExcluirPedido = async () => {
    try {
      setConfirmDialog(prev => ({
        ...prev,
        loading: true
      }));
      
      const response = await api.delete(`/api/pedidos/${confirmDialog.orderId}/excluir-permanente`);
      
      if (response.data.success) {
        // Remover pedido da lista local
        setOrders(prevOrders => prevOrders.filter(order => order._id !== confirmDialog.orderId));
        showSnackbar('Pedido excluído permanentemente', 'success');
        handleCloseConfirmDialog();
      } else {
        showSnackbar(response.data.message || 'Erro ao excluir pedido', 'error');
      }
    } catch (error) {
      console.error('Erro ao excluir pedido:', error);
      showSnackbar('Erro ao excluir pedido. Tente novamente.', 'error');
    } finally {
      setConfirmDialog(prev => ({
        ...prev,
        loading: false
      }));
    }
  };

  const handleOrderStatusChange = (orderId, newStatus) => {
    // Este componente ainda não está totalmente implementado
    console.log(`Atualizando pedido ${orderId} para ${newStatus}`);
    
    // Simulação
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order._id === orderId ? {...order, status: newStatus} : order
      )
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" component="h1" sx={{ mb: 3 }}>
        Pedidos
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleChangeTab}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab 
            label={
              <Badge badgeContent={filteredOrders().length} color="primary">
                Ativos
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge 
                badgeContent={orders.filter(o => o.status === 'em_preparacao').length} 
                color="info"
              >
                Em Preparação
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge 
                badgeContent={orders.filter(o => o.status === 'pronto').length} 
                color="success"
              >
                Prontos
              </Badge>
            } 
          />
          <Tab label="Histórico" />
        </Tabs>
      </Paper>

      {filteredOrders().length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 5 }}>
          <ReceiptIcon color="disabled" sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Nenhum pedido {activeTab === 3 ? 'no histórico' : 'ativo'} no momento
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filteredOrders().map((order) => (
            <Grid item xs={12} md={6} key={order._id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <TableIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6">
                        Mesa {order.mesa.numero}
                      </Typography>
                    </Box>
                    <Chip 
                      label={getStatusText(order.status)} 
                      color={getStatusColor(order.status)} 
                      size="small"
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PersonIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {order.cliente}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AccessTimeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {formatDateTime(order.createdAt)}
                      {order.status === 'em_preparacao' && ` • Estimado: ${order.estimatedTime} min`}
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ my: 1.5 }} />
                  
                  <List dense disablePadding>
                    {order.itens.slice(0, 2).map((item) => (
                      <ListItem disablePadding key={item._id} sx={{ pb: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <RestaurantIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={`${item.quantidade}x ${item.nome}`} 
                          secondary={item.observacao || null}
                          primaryTypographyProps={{ variant: 'body2' }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItem>
                    ))}
                    {order.itens.length > 2 && (
                      <Typography variant="body2" color="text.secondary" sx={{ pl: 4.5, pt: 0.5 }}>
                        + {order.itens.length - 2} itens adicionais
                      </Typography>
                    )}
                  </List>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Typography variant="h6" color="primary">
                      R$ {(order.total || order.valorTotal || 0).toFixed(2)}
                    </Typography>
                  </Box>
                </CardContent>
                
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2, flexWrap: 'wrap', gap: 1 }}>
                  {/* Botões para status do pedido - funcionalidade original */}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {order.status === 'em_preparacao' && (
                      <Button 
                        variant="contained" 
                        color="success" 
                        size="small"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => handleOrderStatusChange(order._id, 'pronto')}
                      >
                        Marcar como Pronto
                      </Button>
                    )}
                    
                    {order.status === 'pronto' && (
                      <Button 
                        variant="contained" 
                        color="primary" 
                        size="small"
                        startIcon={<LocalDiningIcon />}
                        onClick={() => handleOrderStatusChange(order._id, 'entregue')}
                      >
                        Confirmar Entrega
                      </Button>
                    )}
                    
                    {(order.status === 'entregue' || order.status === 'cancelado') && (
                      <Button 
                        variant="outlined" 
                        size="small"
                        startIcon={<ReceiptIcon />}
                      >
                        Ver Detalhes
                      </Button>
                    )}
                    
                    {/* Botões organizacionais (não afetam o estado real do pedido) */}
                    <Button 
                      variant="outlined" 
                      color="warning" 
                      size="small"
                      startIcon={<DoneIcon />}
                      onClick={() => handleConcluirVisual(order._id)}
                      disabled={order.concluidoVisualmente || actionLoading}
                    >
                      Concluir
                    </Button>
                    
                    <Button 
                      variant="outlined" 
                      color="error" 
                      size="small"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleConfirmExcluir(order._id)}
                      disabled={actionLoading}
                    >
                      Excluir
                    </Button>
                  </Box>
                  
                  <IconButton 
                    color="primary" 
                    onClick={() => handleOrderClick(order._id)}
                  >
                    <ArrowForwardIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Diálogo de confirmação para exclusão permanente */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleCloseConfirmDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title" sx={{ bgcolor: 'error.main', color: 'white' }}>
          Confirmar Exclusão Permanente
        </DialogTitle>
        <DialogContent sx={{ pt: 2, mt: 2 }}>
          <Typography variant="body1" gutterBottom>
            Tem certeza que deseja excluir este pedido <strong>permanentemente</strong>?
          </Typography>
          <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>
            Esta ação não pode ser desfeita. O pedido será removido definitivamente do sistema.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDialog} color="primary">
            Cancelar
          </Button>
          <Button 
            onClick={handleExcluirPedido} 
            color="error" 
            variant="contained"
            disabled={confirmDialog.loading}
            startIcon={confirmDialog.loading ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
            autoFocus
          >
            {confirmDialog.loading ? 'Excluindo...' : 'Sim, excluir permanentemente'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Orders;
