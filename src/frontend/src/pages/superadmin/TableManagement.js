import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Card,
  CardContent,
  CardActions,
  Chip,
  CircularProgress,
  Tooltip,
  Snackbar,
  Alert,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useSocket } from '../../contexts/SocketContext';
import api from '../../services/api';

const TableManagement = () => {
  const { listen, emit } = useSocket();
  
  // Estados
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' ou 'edit'
  const [selectedMesa, setSelectedMesa] = useState(null);
  const [formValues, setFormValues] = useState({
    numero: '',
    capacidade: '',
    status: 'disponivel',
    localizacao: {
      x: 0,
      y: 0,
      area: 'interna'
    }
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

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

    // Limpar listener ao desmontar
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

  // Abrir diálogo para criar nova mesa
  const handleOpenCreateDialog = () => {
    setFormMode('create');
    setFormValues({
      numero: '',
      capacidade: '',
      status: 'disponivel',
      localizacao: {
        x: 0,
        y: 0,
        area: 'interna'
      }
    });
    setOpenDialog(true);
  };

  // Abrir diálogo para editar mesa existente
  const handleOpenEditDialog = (mesa) => {
    setFormMode('edit');
    setSelectedMesa(mesa);
    setFormValues({
      numero: mesa.numero,
      capacidade: mesa.capacidade,
      status: mesa.status,
      localizacao: {
        x: mesa.localizacao.x,
        y: mesa.localizacao.y,
        area: mesa.localizacao.area
      }
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
    
    if (name.startsWith('localizacao.')) {
      const field = name.split('.')[1];
      setFormValues(prev => ({
        ...prev,
        localizacao: {
          ...prev.localizacao,
          [field]: value
        }
      }));
    } else {
      setFormValues(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Salvar mesa (criar ou editar)
  const handleSaveMesa = async () => {
    try {
      // Validar formulário apenas para edição
      if (formMode === 'edit' && (!formValues.numero || !formValues.capacidade)) {
        showSnackbar('Preencha todos os campos obrigatórios', 'error');
        return;
      }

      if (formMode === 'create') {
        // Criar nova mesa
        const response = await api.post('/api/mesas', formValues);
        if (response.data.success) {
          setMesas(prev => [...prev, response.data.data]);
          showSnackbar('Mesa criada com sucesso', 'success');
          handleCloseDialog();
        }
      } else {
        // Atualizar mesa existente
        const response = await api.put(`/api/mesas/${selectedMesa._id}`, formValues);
        if (response.data.success) {
          setMesas(prev => prev.map(mesa => 
            mesa._id === selectedMesa._id ? response.data.data : mesa
          ));
          showSnackbar('Mesa atualizada com sucesso', 'success');
          handleCloseDialog();
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Ocorreu um erro ao salvar a mesa';
      showSnackbar(errorMessage, 'error');
    }
  };

  // Excluir mesa
  const handleDeleteMesa = async (mesaId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta mesa?')) {
      return;
    }

    try {
      const response = await api.delete(`/api/mesas/${mesaId}`);
      if (response.data.success) {
        setMesas(prev => prev.filter(mesa => mesa._id !== mesaId));
        showSnackbar('Mesa excluída com sucesso', 'success');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Ocorreu um erro ao excluir a mesa';
      showSnackbar(errorMessage, 'error');
    }
  };

  // Alternar status da mesa (disponível/manutenção)
  const handleToggleStatus = async (mesa) => {
    const novoStatus = mesa.status === 'disponivel' ? 'manutencao' : 'disponivel';
    
    try {
      const response = await api.put(`/api/mesas/${mesa._id}`, {
        status: novoStatus
      });
      
      if (response.data.success) {
        setMesas(prev => prev.map(m => 
          m._id === mesa._id ? response.data.data : m
        ));
        
        // Emitir evento de atualização para todos os clientes
        emit('mesa_atualizada', {
          id: mesa._id,
          status: novoStatus,
          statusAnterior: mesa.status
        });
        
        showSnackbar(`Mesa ${mesa.numero} ${novoStatus === 'disponivel' ? 'disponível' : 'em manutenção'}`, 'success');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Ocorreu um erro ao alterar o status da mesa';
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

  // Obter cor com base no status da mesa
  const getStatusColor = (status) => {
    switch (status) {
      case 'disponivel': return 'success';
      case 'ocupada': return 'warning';
      case 'reservada': return 'info';
      case 'manutencao': return 'error';
      default: return 'default';
    }
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
      case 'interna': return 'Área Interna';
      case 'externa': return 'Área Externa';
      case 'varanda': return 'Varanda';
      case 'privativa': return 'Sala Privativa';
      default: return area;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Gerenciamento de Mesas
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Adicione, edite e gerencie as mesas do restaurante.
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleOpenCreateDialog}
        >
          Nova Mesa
        </Button>
      </Box>

      {mesas.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Nenhuma mesa cadastrada
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Clique no botão "Nova Mesa" para adicionar mesas ao restaurante.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
          >
            Nova Mesa
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {mesas.map((mesa) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={mesa._id}>
              <Card 
                elevation={2} 
                sx={{ 
                  height: '100%',
                  borderLeft: `4px solid`,
                  borderLeftColor: `${getStatusColor(mesa.status)}.main`,
                  position: 'relative'
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h5" component="div" fontWeight="bold">
                      Mesa {mesa.numero}
                    </Typography>
                    <Chip 
                      label={getStatusText(mesa.status)} 
                      color={getStatusColor(mesa.status)} 
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Capacidade: {mesa.capacidade} pessoas
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">
                    Localização: {getAreaText(mesa.localizacao.area)}
                  </Typography>
                  
                  {mesa.status === 'ocupada' && (
                    <Box sx={{ mt: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PersonIcon fontSize="small" color="primary" />
                        Clientes: {mesa.ocupacaoAtual?.clientes || 0}
                      </Typography>
                      {mesa.ocupacaoAtual?.inicioAtendimento && (
                        <Typography variant="body2" color="text.secondary" fontSize="small">
                          Início: {new Date(mesa.ocupacaoAtual.inicioAtendimento).toLocaleTimeString()}
                        </Typography>
                      )}
                    </Box>
                  )}
                </CardContent>
                
                <CardActions sx={{ justifyContent: 'flex-end' }}>
                  {mesa.status !== 'ocupada' && (
                    <Tooltip title={mesa.status === 'disponivel' ? 'Em Manutenção' : 'Disponível'}>
                      <IconButton 
                        size="small" 
                        color={mesa.status === 'disponivel' ? 'error' : 'success'}
                        onClick={() => handleToggleStatus(mesa)}
                      >
                        {mesa.status === 'disponivel' ? <CancelIcon /> : <CheckCircleIcon />}
                      </IconButton>
                    </Tooltip>
                  )}
                  
                  <Tooltip title="Editar Mesa">
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={() => handleOpenEditDialog(mesa)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  
                  {mesa.status !== 'ocupada' && (
                    <Tooltip title="Excluir Mesa">
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteMesa(mesa._id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Diálogo de criação/edição de mesa */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {formMode === 'create' ? 'Adicionar Nova Mesa' : 'Editar Mesa'}
        </DialogTitle>
        
        <DialogContent dividers>
          <Grid container spacing={2}>
            {formMode === 'edit' ? (
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Número"
                  name="numero"
                  type="number"
                  fullWidth
                  value={formValues.numero}
                  onChange={handleFormChange}
                  margin="normal"
                  required
                />
              </Grid>
            ) : (
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Número (gerado automaticamente)"
                  name="numero"
                  type="number"
                  fullWidth
                  value={formValues.numero}
                  onChange={handleFormChange}
                  margin="normal"
                  disabled
                  helperText="O número será gerado automaticamente"
                />
              </Grid>
            )}
            
            {formMode === 'edit' ? (
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Capacidade"
                  name="capacidade"
                  type="number"
                  fullWidth
                  value={formValues.capacidade}
                  onChange={handleFormChange}
                  margin="normal"
                  required
                  InputProps={{ inputProps: { min: 1 } }}
                />
              </Grid>
            ) : (
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Capacidade (padrão: 4)"
                  name="capacidade"
                  type="number"
                  fullWidth
                  value={formValues.capacidade}
                  onChange={handleFormChange}
                  margin="normal"
                  helperText="Se não especificado, serão 4 lugares"
                  InputProps={{ inputProps: { min: 1 } }}
                />
              </Grid>
            )}
            
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={formValues.status}
                  onChange={handleFormChange}
                  label="Status"
                >
                  <MenuItem value="disponivel">Disponível</MenuItem>
                  <MenuItem value="manutencao">Em Manutenção</MenuItem>
                  <MenuItem value="reservada">Reservada</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Localização
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Posição X"
                name="localizacao.x"
                type="number"
                fullWidth
                value={formValues.localizacao.x}
                onChange={handleFormChange}
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Posição Y"
                name="localizacao.y"
                type="number"
                fullWidth
                value={formValues.localizacao.y}
                onChange={handleFormChange}
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Área</InputLabel>
                <Select
                  name="localizacao.area"
                  value={formValues.localizacao.area}
                  onChange={handleFormChange}
                  label="Área"
                >
                  <MenuItem value="interna">Área Interna</MenuItem>
                  <MenuItem value="externa">Área Externa</MenuItem>
                  <MenuItem value="varanda">Varanda</MenuItem>
                  <MenuItem value="privativa">Sala Privativa</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button 
            onClick={handleSaveMesa} 
            variant="contained" 
            color="primary"
          >
            {formMode === 'create' ? 'Adicionar' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para mensagens */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
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

export default TableManagement;
