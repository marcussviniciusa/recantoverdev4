import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  CircularProgress,
  Tooltip,
  useTheme,
  Divider,
  IconButton
} from '@mui/material';
import {
  TableBar as TableIcon,
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
  AccessTime as AccessTimeIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const Tables = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { listen, emit } = useSocket();
  
  // Estados
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedMesa, setSelectedMesa] = useState(null);
  const [formValues, setFormValues] = useState({
    numClientes: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [filter, setFilter] = useState({
    status: 'all',
    area: 'all'
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Cores para status das mesas
  const mesaStatusColors = {
    disponivel: theme.palette.success.main,
    ocupada: theme.palette.warning.main,
    reservada: theme.palette.info.main,
    manutencao: theme.palette.error.main
  };

  // Obter texto legível para o status
  const getStatusText = (status) => {
    switch (status) {
      case 'disponivel': return 'Disponível';
      case 'ocupada': return 'Ocupada';
      case 'reservada': return 'Reservada';
      case 'manutencao': return 'Manutenção';
      default: return status;
    }
  };

  // Obter texto para área de localização
  const getAreaText = (area) => {
    switch (area) {
      case 'interna': return 'Interna';
      case 'externa': return 'Externa';
      case 'varanda': return 'Varanda';
      case 'privativa': return 'Privativa';
      default: return area;
    }
  };

  // Buscar mesas ao carregar componente
  useEffect(() => {
    fetchMesas();

    // Configurar listener para atualizações em tempo real
    const unsubscribe = listen('atualizar_mesa', (data) => {
      setMesas(current => {
        const index = current.findIndex(mesa => mesa._id === data.id);
        if (index !== -1) {
          const updatedMesas = [...current];
          updatedMesas[index] = {
            ...updatedMesas[index],
            status: data.status,
            ocupacaoAtual: data.ocupacaoAtual
          };
          return updatedMesas;
        }
        return current;
      });
    });

    return () => unsubscribe();
  }, [listen]);

  // Buscar mesas da API
  const fetchMesas = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/mesas');
      if (response.data.success) {
        setMesas(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar mesas:', error);
      showSnackbar('Erro ao carregar mesas', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Abrir diálogo para ocupar mesa
  const handleOpenOcuparDialog = (mesa) => {
    setSelectedMesa(mesa);
    setFormValues({
      numClientes: ''
    });
    setOpenDialog(true);
  };

  // Fechar diálogo
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedMesa(null);
  };

  // Atualizar valores do formulário
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Ocupar mesa
  const handleOcuparMesa = async () => {
    try {
      // Validar formulário
      if (!formValues.numClientes || formValues.numClientes <= 0) {
        showSnackbar('Informe um número válido de clientes', 'error');
        return;
      }

      const response = await api.post(`/api/mesas/${selectedMesa._id}/ocupar`, {
        numClientes: parseInt(formValues.numClientes)
      });

      if (response.data.success) {
        // Atualizar mesa na lista
        setMesas(prev => prev.map(mesa => 
          mesa._id === selectedMesa._id ? response.data.data : mesa
        ));

        // Emitir evento de atualização para todos os clientes
        emit('mesa_atualizada', {
          id: selectedMesa._id,
          status: 'ocupada',
          statusAnterior: 'disponivel',
          ocupacaoAtual: {
            clientes: parseInt(formValues.numClientes),
            inicioAtendimento: new Date()
          }
        });

        showSnackbar(`Mesa ${selectedMesa.numero} ocupada com sucesso`, 'success');
        handleCloseDialog();

        // Redirecionar para a página de detalhes da mesa
        navigate(`/tables/${selectedMesa._id}`);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Ocorreu um erro ao ocupar a mesa';
      showSnackbar(errorMessage, 'error');
    }
  };

  // Exibir snackbar com mensagem
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  // Fechar snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({
      ...prev,
      open: false
    }));
  };

  // Filtrar mesas
  const filteredMesas = mesas.filter(mesa => {
    // Filtro por texto de pesquisa
    const matchesSearch = searchQuery === '' || 
      mesa.numero.toString().includes(searchQuery);
    
    // Filtro por status
    const matchesStatus = filter.status === 'all' || 
      mesa.status === filter.status;
    
    // Filtro por área
    const matchesArea = filter.area === 'all' || 
      mesa.localizacao.area === filter.area;
    
    return matchesSearch && matchesStatus && matchesArea;
  });

  // Ordenar mesas por número
  const sortedMesas = [...filteredMesas].sort((a, b) => a.numero - b.numero);

  // Dividir mesas por status para visualização agrupada
  const mesasDisponiveis = sortedMesas.filter(mesa => mesa.status === 'disponivel');
  const mesasOcupadas = sortedMesas.filter(mesa => mesa.status === 'ocupada');
  const mesasOutras = sortedMesas.filter(mesa => 
    mesa.status !== 'disponivel' && mesa.status !== 'ocupada'
  );

  // Contar mesas por status
  const contarMesas = {
    disponiveis: mesasDisponiveis.length,
    ocupadas: mesasOcupadas.length,
    total: mesas.length
  };

  // Renderizar card da mesa
  const renderMesaCard = (mesa) => (
    <Box key={mesa._id} sx={{ width: { xs: '50%', sm: '33.33%', md: '25%' }, padding: 1 }}>
      <Card 
        elevation={2} 
        sx={{ 
          height: '100%', 
          border: '2px solid',
          borderColor: mesaStatusColors[mesa.status] || 'grey.300',
          opacity: mesa.status === 'manutencao' ? 0.7 : 1
        }}
      >
        <CardActionArea
          onClick={() => mesa.status === 'disponivel' 
            ? handleOpenOcuparDialog(mesa) 
            : navigate(`/tables/${mesa._id}`)
          }
          disabled={mesa.status === 'manutencao'}
          sx={{ height: '100%' }}
        >
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" component="div" fontWeight="bold" color={mesaStatusColors[mesa.status]}>
              {mesa.numero}
            </Typography>
            
            <Chip 
              label={getStatusText(mesa.status)} 
              sx={{ 
                bgcolor: mesaStatusColors[mesa.status],
                color: 'white',
                fontWeight: 'bold',
                my: 1
              }}
              size="small"
            />
            
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Capacidade: {mesa.capacidade} pessoas
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                {getAreaText(mesa.localizacao.area)}
              </Typography>
            </Box>
            
            {mesa.status === 'ocupada' && (
              <Box sx={{ mt: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                  <PeopleIcon fontSize="small" color="primary" />
                  {mesa.ocupacaoAtual?.clientes || 0} pessoas
                </Typography>
                
                {mesa.ocupacaoAtual?.inicioAtendimento && (
                  <Typography variant="body2" color="text.secondary" fontSize="small" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                    <AccessTimeIcon fontSize="small" color="action" />
                    {new Date(mesa.ocupacaoAtual.inicioAtendimento).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </Typography>
                )}
              </Box>
            )}
          </CardContent>
        </CardActionArea>
      </Card>
    </Box>
  );

  if (loading && mesas.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, pb: 7 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Mesas do Restaurante
      </Typography>

      {/* Estatísticas */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={4}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light' }}>
            <Typography variant="h5" fontWeight="bold" color="success.dark">
              {contarMesas.disponiveis}
            </Typography>
            <Typography variant="body2" color="success.dark">
              Disponíveis
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={4}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light' }}>
            <Typography variant="h5" fontWeight="bold" color="warning.dark">
              {contarMesas.ocupadas}
            </Typography>
            <Typography variant="body2" color="warning.dark">
              Ocupadas
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={4}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.100' }}>
            <Typography variant="h5" fontWeight="bold" color="text.secondary">
              {contarMesas.total}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Barra de pesquisa e filtros */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Paper sx={{ p: 1, flexGrow: 1, display: 'flex', alignItems: 'center' }}>
          <IconButton size="small" sx={{ mr: 1 }}>
            <SearchIcon />
          </IconButton>
          <TextField
            variant="standard"
            placeholder="Buscar mesa por número..."
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              disableUnderline: true,
            }}
          />
          {searchQuery && (
            <IconButton size="small" onClick={() => setSearchQuery('')}>
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Paper>
        
        <Tooltip title="Filtros">
          <IconButton 
            color="primary" 
            onClick={() => setShowFilterDialog(true)}
            sx={{ bgcolor: 'action.hover' }}
          >
            <FilterIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {sortedMesas.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Nenhuma mesa encontrada
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Não há mesas correspondentes aos filtros aplicados.
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Mesas Disponíveis */}
          {mesasDisponiveis.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TableIcon /> Mesas Disponíveis
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {mesasDisponiveis.map(renderMesaCard)}
              </Grid>
            </Box>
          )}
          
          {/* Mesas Ocupadas */}
          {mesasOcupadas.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom color="warning.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TableIcon /> Mesas Ocupadas
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {mesasOcupadas.map(renderMesaCard)}
              </Grid>
            </Box>
          )}
          
          {/* Outras Mesas */}
          {mesasOutras.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TableIcon /> Outras Mesas
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {mesasOutras.map(renderMesaCard)}
              </Grid>
            </Box>
          )}
        </>
      )}

      {/* Diálogo para ocupar mesa */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Ocupar Mesa {selectedMesa?.numero}
        </DialogTitle>
        
        <DialogContent dividers>
          <Typography variant="body2" paragraph>
            Informe o número de clientes para ocupar esta mesa.
          </Typography>
          
          <TextField
            label="Número de Clientes"
            name="numClientes"
            type="number"
            fullWidth
            value={formValues.numClientes}
            onChange={handleFormChange}
            margin="normal"
            required
            InputProps={{ inputProps: { min: 1, max: selectedMesa?.capacidade || 10 } }}
            helperText={`Esta mesa tem capacidade para ${selectedMesa?.capacidade || '?'} pessoas`}
          />
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button 
            onClick={handleOcuparMesa} 
            variant="contained" 
            color="primary"
            startIcon={<PersonAddIcon />}
          >
            Ocupar Mesa
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de filtros */}
      <Dialog
        open={showFilterDialog}
        onClose={() => setShowFilterDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Filtrar Mesas</DialogTitle>
        
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Status
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={3}>
                <Button
                  variant={filter.status === 'all' ? "contained" : "outlined"}
                  color="primary"
                  size="small"
                  fullWidth
                  onClick={() => setFilter(prev => ({ ...prev, status: 'all' }))}
                >
                  Todos
                </Button>
              </Grid>
              <Grid item xs={3}>
                <Button
                  variant={filter.status === 'disponivel' ? "contained" : "outlined"}
                  color="success"
                  size="small"
                  fullWidth
                  onClick={() => setFilter(prev => ({ ...prev, status: 'disponivel' }))}
                >
                  Livre
                </Button>
              </Grid>
              <Grid item xs={3}>
                <Button
                  variant={filter.status === 'ocupada' ? "contained" : "outlined"}
                  color="warning"
                  size="small"
                  fullWidth
                  onClick={() => setFilter(prev => ({ ...prev, status: 'ocupada' }))}
                >
                  Ocupada
                </Button>
              </Grid>
              <Grid item xs={3}>
                <Button
                  variant={filter.status === 'reservada' ? "contained" : "outlined"}
                  color="info"
                  size="small"
                  fullWidth
                  onClick={() => setFilter(prev => ({ ...prev, status: 'reservada' }))}
                >
                  Reservada
                </Button>
              </Grid>
            </Grid>
          </Box>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Área
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Button
                  variant={filter.area === 'all' ? "contained" : "outlined"}
                  color="primary"
                  size="small"
                  fullWidth
                  onClick={() => setFilter(prev => ({ ...prev, area: 'all' }))}
                >
                  Todas
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  variant={filter.area === 'interna' ? "contained" : "outlined"}
                  color="primary"
                  size="small"
                  fullWidth
                  onClick={() => setFilter(prev => ({ ...prev, area: 'interna' }))}
                >
                  Interna
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  variant={filter.area === 'externa' ? "contained" : "outlined"}
                  color="primary"
                  size="small"
                  fullWidth
                  onClick={() => setFilter(prev => ({ ...prev, area: 'externa' }))}
                >
                  Externa
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  variant={filter.area === 'varanda' ? "contained" : "outlined"}
                  color="primary"
                  size="small"
                  fullWidth
                  onClick={() => setFilter(prev => ({ ...prev, area: 'varanda' }))}
                >
                  Varanda
                </Button>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={() => {
              setFilter({ status: 'all', area: 'all' });
              setShowFilterDialog(false);
            }}
          >
            Limpar Filtros
          </Button>
          <Button 
            variant="contained"
            onClick={() => setShowFilterDialog(false)}
          >
            Aplicar
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

export default Tables;
