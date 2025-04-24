import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  InputAdornment,
  Tooltip,
  Snackbar,
  Alert,
  useTheme
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  LocalDining as DiningIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  History as HistoryIcon,
  TableRestaurant as TableIcon,
  Person as PersonIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const OrderManagement = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { emit, listen } = useSocket();
  
  // Estados para filtros e busca
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [ordenacao, setOrdenacao] = useState({ campo: 'createdAt', direcao: 'desc' });
  
  // Estados para paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Estados para dados
  const [pedidos, setPedidos] = useState([]);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [totalPedidos, setTotalPedidos] = useState(0);
  const [resumoDiario, setResumoDiario] = useState({
    pendentes: 0,
    emPreparo: 0,
    prontos: 0,
    entregues: 0,
    pagos: 0,
    cancelados: 0,
    total: 0,
    valorTotal: 0
  });
  
  // Estados para UI
  const [loading, setLoading] = useState(true);
  const [openDetalhesDialog, setOpenDetalhesDialog] = useState(false);
  const [openCancelarDialog, setOpenCancelarDialog] = useState(false);
  const [observacaoCancelamento, setObservacaoCancelamento] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  useEffect(() => {
    fetchPedidos();
    fetchResumoDiario();
    
    // Configurar ouvinte de atualização em tempo real
    const unsubscribe = listen('pedido_atualizado', (data) => {
      fetchPedidos();
      fetchResumoDiario();
    });
    
    return () => unsubscribe();
  }, [filtroStatus, ordenacao, page, rowsPerPage]);
  
  // Funções para carregar dados
  const fetchPedidos = async () => {
    try {
      setLoading(true);
      
      // Montar parâmetros de filtro
      const params = {
        status: filtroStatus !== 'todos' ? filtroStatus : undefined,
        page: page + 1,
        limit: rowsPerPage,
        sort: `${ordenacao.direcao === 'desc' ? '-' : ''}${ordenacao.campo}`,
        search: searchQuery || undefined
      };
      
      const response = await api.get('/api/pedidos', { params });
      
      if (response.data.success) {
        setPedidos(response.data.data);
        setTotalPedidos(response.data.meta?.total || response.data.data.length);
      }
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      showSnackbar('Erro ao carregar pedidos', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchResumoDiario = async () => {
    try {
      const response = await api.get('/api/pedidos/resumo-diario');
      
      if (response.data.success) {
        setResumoDiario(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar resumo diário:', error);
    }
  };
  
  // Funções para manipulação de pedidos
  const atualizarStatusPedido = async (pedidoId, novoStatus, observacao = '') => {
    try {
      const response = await api.put(`/api/pedidos/${pedidoId}/status`, {
        status: novoStatus,
        observacao
      });
      
      if (response.data.success) {
        // Atualizar pedido na lista local
        setPedidos(prev => prev.map(pedido => 
          pedido._id === pedidoId ? response.data.data : pedido
        ));
        
        // Emitir evento para atualização em tempo real
        emit('pedido_atualizado', {
          pedidoId,
          status: novoStatus,
          mesaId: response.data.data.mesa
        });
        
        showSnackbar(`Status do pedido atualizado para ${traduzirStatus(novoStatus)}`, 'success');
        fetchResumoDiario(); // Atualizar resumo
      }
    } catch (error) {
      console.error('Erro ao atualizar status do pedido:', error);
      showSnackbar('Erro ao atualizar status', 'error');
    }
  };
  
  const handleCancelarPedido = async () => {
    if (!pedidoSelecionado) return;
    
    try {
      await atualizarStatusPedido(pedidoSelecionado._id, 'cancelado', observacaoCancelamento);
      setOpenCancelarDialog(false);
      setObservacaoCancelamento('');
      
      // Se o pedido estava em detalhes, fechar esse diálogo também
      if (openDetalhesDialog) {
        setOpenDetalhesDialog(false);
      }
    } catch (error) {
      console.error('Erro ao cancelar pedido:', error);
    }
  };
  
  // Funções auxiliares
  const traduzirStatus = (status) => {
    const statusMap = {
      'pendente': 'Pendente',
      'em_preparo': 'Em Preparo',
      'pronto': 'Pronto',
      'entregue': 'Entregue',
      'pago': 'Pago',
      'cancelado': 'Cancelado'
    };
    
    return statusMap[status] || status;
  };
  
  const getStatusColor = (status) => {
    const statusColors = {
      'pendente': theme.palette.info.main,
      'em_preparo': theme.palette.warning.main,
      'pronto': theme.palette.success.main,
      'entregue': theme.palette.success.dark,
      'pago': theme.palette.primary.main,
      'cancelado': theme.palette.error.main
    };
    
    return statusColors[status] || theme.palette.grey[500];
  };
  
  const calcularTempoDecorrido = (dataString) => {
    if (!dataString) return '';
    
    try {
      const data = parseISO(dataString);
      return formatDistanceToNow(data, { addSuffix: true, locale: ptBR });
    } catch (error) {
      return '';
    }
  };
  
  const formatarData = (dataString, formatoDesejado = 'dd/MM/yyyy HH:mm') => {
    if (!dataString) return '';
    
    try {
      const data = parseISO(dataString);
      return format(data, formatoDesejado, { locale: ptBR });
    } catch (error) {
      return '';
    }
  };
  
  const calcularTotalPedido = (pedido) => {
    if (!pedido || !pedido.itens || pedido.itens.length === 0) return 0;
    
    return pedido.itens.reduce((total, item) => {
      return total + (item.preco * item.quantidade);
    }, 0);
  };
  
  const handleSort = (campo) => {
    setOrdenacao(prev => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === 'asc' ? 'desc' : 'asc'
    }));
  };
  
  const handleOpenDetalhes = (pedido) => {
    setPedidoSelecionado(pedido);
    setOpenDetalhesDialog(true);
  };
  
  const handleOpenCancelar = (pedido) => {
    setPedidoSelecionado(pedido);
    setOpenCancelarDialog(true);
  };
  
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({
      ...prev,
      open: false
    }));
  };
  
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };
  
  const applySearch = () => {
    setPage(0);
    fetchPedidos();
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1">
          Gerenciamento de Pedidos
        </Typography>
        
        <Button 
          variant="contained" 
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={() => {
            fetchPedidos();
            fetchResumoDiario();
          }}
        >
          Atualizar
        </Button>
      </Box>
      
      {/* Resumo diário */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light' }}>
            <Typography variant="h4" fontWeight="bold" color="info.dark">
              {resumoDiario.pendentes + resumoDiario.emPreparo + resumoDiario.prontos}
            </Typography>
            <Typography variant="body2" color="info.dark">
              Pedidos em andamento
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light' }}>
            <Typography variant="h4" fontWeight="bold" color="success.dark">
              {resumoDiario.pagos}
            </Typography>
            <Typography variant="body2" color="success.dark">
              Pedidos finalizados
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light' }}>
            <Typography variant="h4" fontWeight="bold" color="error.dark">
              {resumoDiario.cancelados}
            </Typography>
            <Typography variant="body2" color="error.dark">
              Pedidos cancelados
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light' }}>
            <Typography variant="h4" fontWeight="bold" color="primary.dark">
              R$ {resumoDiario.valorTotal?.toFixed(2) || '0.00'}
            </Typography>
            <Typography variant="body2" color="primary.dark">
              Total do dia
            </Typography>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Filtros e busca */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            placeholder="Buscar pedido..."
            value={searchQuery}
            onChange={handleSearch}
            onKeyPress={(e) => e.key === 'Enter' && applySearch()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => {
                    setSearchQuery('');
                    if (searchQuery) applySearch();
                  }}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={filtroStatus}
              label="Status"
              onChange={(e) => {
                setFiltroStatus(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="todos">Todos</MenuItem>
              <MenuItem value="pendente">Pendente</MenuItem>
              <MenuItem value="em_preparo">Em Preparo</MenuItem>
              <MenuItem value="pronto">Pronto</MenuItem>
              <MenuItem value="entregue">Entregue</MenuItem>
              <MenuItem value="pago">Pago</MenuItem>
              <MenuItem value="cancelado">Cancelado</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={applySearch}
          >
            Aplicar Filtros
          </Button>
        </Grid>
      </Grid>
      
      {/* Tabela de pedidos */}
      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell>Nº Pedido</TableCell>
              <TableCell>
                <Box 
                  sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => handleSort('createdAt')}
                >
                  Data/Hora
                  {ordenacao.campo === 'createdAt' && (
                    ordenacao.direcao === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell>Mesa</TableCell>
              <TableCell>Itens</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Valor</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress size={30} sx={{ my: 3 }} />
                </TableCell>
              </TableRow>
            ) : pedidos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body1" color="text.secondary" sx={{ py: 3 }}>
                    Nenhum pedido encontrado
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              pedidos.map((pedido) => (
                <TableRow key={pedido._id} hover>
                  <TableCell>#{pedido.numeroPedido || '?'}</TableCell>
                  <TableCell>
                    {formatarData(pedido.createdAt)}
                    <Typography variant="caption" color="text.secondary" display="block">
                      {calcularTempoDecorrido(pedido.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      icon={<TableIcon fontSize="small" />}
                      label={`Mesa ${pedido.mesa?.numero || '?'}`}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {pedido.itens?.length || 0} {pedido.itens?.length === 1 ? 'item' : 'itens'}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={traduzirStatus(pedido.status)}
                      size="small"
                      sx={{ 
                        bgcolor: getStatusColor(pedido.status),
                        color: 'white',
                        fontWeight: 'medium'
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    R$ {calcularTotalPedido(pedido).toFixed(2)}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Ver detalhes">
                      <IconButton 
                        size="small"
                        onClick={() => handleOpenDetalhes(pedido)}
                      >
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {pedido.status === 'pendente' && (
                      <Tooltip title="Iniciar preparo">
                        <IconButton 
                          size="small" 
                          color="warning"
                          onClick={() => atualizarStatusPedido(pedido._id, 'em_preparo')}
                        >
                          <DiningIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {pedido.status === 'em_preparo' && (
                      <Tooltip title="Marcar como pronto">
                        <IconButton 
                          size="small" 
                          color="success"
                          onClick={() => atualizarStatusPedido(pedido._id, 'pronto')}
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {['pendente', 'em_preparo'].includes(pedido.status) && (
                      <Tooltip title="Cancelar pedido">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleOpenCancelar(pedido)}
                        >
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Paginação */}
      <TablePagination 
        component="div"
        count={totalPedidos}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        labelRowsPerPage="Itens por página:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
      />
      
      {/* Diálogo de detalhes do pedido */}
      <Dialog
        open={openDetalhesDialog}
        onClose={() => setOpenDetalhesDialog(false)}
        maxWidth="md"
        fullWidth
      >
        {pedidoSelecionado && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  Detalhes do Pedido #{pedidoSelecionado.numeroPedido || '?'}
                </Typography>
                <Chip 
                  label={traduzirStatus(pedidoSelecionado.status)}
                  size="small"
                  sx={{ 
                    bgcolor: getStatusColor(pedidoSelecionado.status),
                    color: 'white',
                    fontWeight: 'medium'
                  }}
                />
              </Box>
            </DialogTitle>
            
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Informações do Pedido
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Data/Hora
                    </Typography>
                    <Typography variant="body1">
                      {formatarData(pedidoSelecionado.createdAt)}
                      <Typography variant="caption" color="text.secondary" display="block">
                        {calcularTempoDecorrido(pedidoSelecionado.createdAt)}
                      </Typography>
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Mesa
                    </Typography>
                    <Typography variant="body1" display="flex" alignItems="center" gap={0.5}>
                      <TableIcon fontSize="small" color="primary" />
                      Mesa {pedidoSelecionado.mesa?.numero || '?'}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Atendente
                    </Typography>
                    <Typography variant="body1" display="flex" alignItems="center" gap={0.5}>
                      <PersonIcon fontSize="small" color="primary" />
                      {pedidoSelecionado.atendente?.nome || 'Não especificado'}
                    </Typography>
                  </Box>
                  
                  {pedidoSelecionado.observacao && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Observação
                      </Typography>
                      <Typography variant="body1">
                        {pedidoSelecionado.observacao}
                      </Typography>
                    </Box>
                  )}
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Histórico de Status
                  </Typography>
                  
                  <List dense disablePadding>
                    {pedidoSelecionado.historicoStatus?.map((historico, index) => (
                      <ListItem key={index} disablePadding sx={{ mb: 1 }}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip 
                                label={traduzirStatus(historico.status)}
                                size="small"
                                sx={{ 
                                  bgcolor: getStatusColor(historico.status),
                                  color: 'white',
                                  fontWeight: 'medium'
                                }}
                              />
                              <Typography variant="caption">
                                {formatarData(historico.timestamp)}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            historico.observacao && (
                              <Typography variant="body2" color="text.secondary">
                                {historico.observacao}
                              </Typography>
                            )
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ mb: 2, mt: 1 }} />
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Itens do Pedido
                  </Typography>
                  
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Item</TableCell>
                          <TableCell>Quantidade</TableCell>
                          <TableCell>Valor Unitário</TableCell>
                          <TableCell align="right">Subtotal</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pedidoSelecionado.itens?.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Typography variant="body2">
                                {item.nome}
                              </Typography>
                              {item.observacao && (
                                <Typography variant="caption" color="text.secondary">
                                  Obs: {item.observacao}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>{item.quantidade}</TableCell>
                            <TableCell>R$ {item.preco.toFixed(2)}</TableCell>
                            <TableCell align="right">
                              R$ {(item.quantidade * item.preco).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Total: R$ {calcularTotalPedido(pedidoSelecionado).toFixed(2)}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            
            <DialogActions>
              <Button onClick={() => setOpenDetalhesDialog(false)}>
                Fechar
              </Button>
              
              {pedidoSelecionado.status === 'pendente' && (
                <Button 
                  variant="contained" 
                  color="warning"
                  onClick={() => {
                    atualizarStatusPedido(pedidoSelecionado._id, 'em_preparo');
                    setOpenDetalhesDialog(false);
                  }}
                >
                  Iniciar Preparo
                </Button>
              )}
              
              {pedidoSelecionado.status === 'em_preparo' && (
                <Button 
                  variant="contained" 
                  color="success"
                  onClick={() => {
                    atualizarStatusPedido(pedidoSelecionado._id, 'pronto');
                    setOpenDetalhesDialog(false);
                  }}
                >
                  Marcar como Pronto
                </Button>
              )}
              
              {['pendente', 'em_preparo'].includes(pedidoSelecionado.status) && (
                <Button 
                  variant="outlined" 
                  color="error"
                  onClick={() => {
                    handleOpenCancelar(pedidoSelecionado);
                    setOpenDetalhesDialog(false);
                  }}
                >
                  Cancelar Pedido
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
      
      {/* Diálogo de cancelamento de pedido */}
      <Dialog
        open={openCancelarDialog}
        onClose={() => setOpenCancelarDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Cancelar Pedido
        </DialogTitle>
        
        <DialogContent dividers>
          <Typography variant="body1" paragraph>
            Tem certeza que deseja cancelar o pedido #{pedidoSelecionado?.numeroPedido || '?'}?
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Esta ação não pode ser desfeita.
          </Typography>
          
          <TextField
            label="Motivo do cancelamento"
            multiline
            rows={3}
            fullWidth
            value={observacaoCancelamento}
            onChange={(e) => setObservacaoCancelamento(e.target.value)}
            placeholder="Ex: solicitado pelo cliente, item indisponível, etc."
          />
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setOpenCancelarDialog(false)}>
            Voltar
          </Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={handleCancelarPedido}
          >
            Confirmar Cancelamento
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar para mensagens */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OrderManagement;
