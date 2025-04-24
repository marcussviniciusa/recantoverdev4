import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider,
  CircularProgress,
  Tooltip,
  Snackbar,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  RestaurantMenu as MenuIcon,
  Category as CategoryIcon,
  Fastfood as FastfoodIcon,
  AttachMoney as MoneyIcon,
  NavigateNext as NextIcon
} from '@mui/icons-material';
import api from '../../services/api';

const MenuManagement = () => {
  // Estados
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [categorias, setCategorias] = useState([]);
  const [itens, setItens] = useState([]);
  const [openCategoriaDialog, setOpenCategoriaDialog] = useState(false);
  const [openItemDialog, setOpenItemDialog] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [selectedCategoria, setSelectedCategoria] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formValuesCategoria, setFormValuesCategoria] = useState({
    nome: '',
    descricao: '',
    ordem: 0,
    ativa: true
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Buscar dados ao carregar componente
  useEffect(() => {
    fetchCategorias();
    fetchItens();
  }, []);

  // Buscar categorias da API
  const fetchCategorias = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/cardapio/categorias');
      if (response.data.success) {
        setCategorias(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      showSnackbar('Erro ao carregar categorias', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Buscar itens da API
  const fetchItens = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/cardapio/itens');
      if (response.data.success) {
        setItens(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar itens do cardápio:', error);
      showSnackbar('Erro ao carregar itens do cardápio', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Alterar aba
  const handleChangeTab = (event, newValue) => {
    setTabValue(newValue);
  };

  // ===== GESTÃO DE CATEGORIAS =====

  // Abrir diálogo para criar nova categoria
  const handleOpenCreateCategoriaDialog = () => {
    setFormMode('create');
    setFormValuesCategoria({
      nome: '',
      descricao: '',
      ordem: categorias.length + 1,
      ativa: true
    });
    setOpenCategoriaDialog(true);
  };

  // Abrir diálogo para editar categoria existente
  const handleOpenEditCategoriaDialog = (categoria) => {
    setFormMode('edit');
    setSelectedCategoria(categoria);
    setFormValuesCategoria({
      nome: categoria.nome,
      descricao: categoria.descricao || '',
      ordem: categoria.ordem,
      ativa: categoria.ativa
    });
    setOpenCategoriaDialog(true);
  };

  // Fechar diálogo de categoria
  const handleCloseCategoriaDialog = () => {
    setOpenCategoriaDialog(false);
    setSelectedCategoria(null);
  };

  // Atualizar valores do formulário de categoria
  const handleFormCategoriaChange = (e) => {
    const { name, value, checked } = e.target;
    
    if (name === 'ativa') {
      setFormValuesCategoria(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormValuesCategoria(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Salvar categoria (criar ou editar)
  const handleSaveCategoria = async () => {
    try {
      // Validar formulário
      if (!formValuesCategoria.nome) {
        showSnackbar('O nome da categoria é obrigatório', 'error');
        return;
      }

      if (formMode === 'create') {
        // Criar nova categoria
        const response = await api.post('/api/cardapio/categorias', formValuesCategoria);
        if (response.data.success) {
          setCategorias(prev => [...prev, response.data.data]);
          showSnackbar('Categoria criada com sucesso', 'success');
          handleCloseCategoriaDialog();
        }
      } else {
        // Atualizar categoria existente
        const response = await api.put(`/api/cardapio/categorias/${selectedCategoria._id}`, formValuesCategoria);
        if (response.data.success) {
          setCategorias(prev => prev.map(cat => 
            cat._id === selectedCategoria._id ? response.data.data : cat
          ));
          showSnackbar('Categoria atualizada com sucesso', 'success');
          handleCloseCategoriaDialog();
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Ocorreu um erro ao salvar a categoria';
      showSnackbar(errorMessage, 'error');
    }
  };

  // Excluir categoria
  const handleDeleteCategoria = async (categoriaId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta categoria? Esta ação não poderá ser desfeita.')) {
      return;
    }

    try {
      const response = await api.delete(`/api/cardapio/categorias/${categoriaId}`);
      if (response.data.success) {
        setCategorias(prev => prev.filter(cat => cat._id !== categoriaId));
        showSnackbar('Categoria excluída com sucesso', 'success');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Ocorreu um erro ao excluir a categoria';
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

  // Renderizar item da lista de categorias
  const renderCategoriaItem = (categoria) => {
    // Contar quantos itens existem nesta categoria
    const itemsCount = itens.filter(item => item.categoria?._id === categoria._id).length;

    return (
      <ListItem
        key={categoria._id}
        sx={{ 
          mb: 1, 
          borderRadius: 1, 
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: categoria.ativa ? 'background.paper' : 'action.hover',
          opacity: categoria.ativa ? 1 : 0.7
        }}
        secondaryAction={
          <Box>
            <Tooltip title="Editar Categoria">
              <IconButton 
                edge="end" 
                aria-label="edit"
                onClick={() => handleOpenEditCategoriaDialog(categoria)}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Excluir Categoria">
              <IconButton 
                edge="end" 
                aria-label="delete"
                onClick={() => handleDeleteCategoria(categoria._id)}
                disabled={itemsCount > 0}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        }
      >
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="subtitle1" fontWeight="medium">
                {categoria.nome}
              </Typography>
              {!categoria.ativa && (
                <Chip 
                  label="Inativa" 
                  color="error" 
                  size="small" 
                  sx={{ ml: 1 }}
                />
              )}
            </Box>
          }
          secondary={
            <>
              <Typography variant="body2" color="text.secondary">
                {categoria.descricao || "Sem descrição"}
              </Typography>
              <Typography variant="body2" color="primary">
                {itemsCount} {itemsCount === 1 ? 'item' : 'itens'}
              </Typography>
            </>
          }
        />
      </ListItem>
    );
  };

  if (loading && categorias.length === 0 && itens.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Gerenciamento de Cardápio
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Gerencie categorias e itens do cardápio do restaurante.
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleChangeTab}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab icon={<CategoryIcon />} label="Categorias" />
          <Tab icon={<FastfoodIcon />} label="Itens do Cardápio" />
        </Tabs>
      </Paper>

      {/* Painel Categorias */}
      {tabValue === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddIcon />}
              onClick={handleOpenCreateCategoriaDialog}
            >
              Nova Categoria
            </Button>
          </Box>

          {categorias.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Nenhuma categoria cadastrada
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Clique no botão "Nova Categoria" para adicionar categorias ao cardápio.
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<AddIcon />}
                onClick={handleOpenCreateCategoriaDialog}
              >
                Nova Categoria
              </Button>
            </Paper>
          ) : (
            <Paper sx={{ p: 2 }}>
              <List>
                {categorias
                  .sort((a, b) => a.ordem - b.ordem)
                  .map(renderCategoriaItem)}
              </List>
            </Paper>
          )}
        </Box>
      )}

      {/* Painel Itens do Cardápio */}
      {tabValue === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Implementação da gestão de itens do cardápio será adicionada a seguir...
          </Typography>
        </Box>
      )}

      {/* Diálogo de criação/edição de categoria */}
      <Dialog 
        open={openCategoriaDialog} 
        onClose={handleCloseCategoriaDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {formMode === 'create' ? 'Adicionar Nova Categoria' : 'Editar Categoria'}
        </DialogTitle>
        
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Nome da Categoria"
                name="nome"
                fullWidth
                value={formValuesCategoria.nome}
                onChange={handleFormCategoriaChange}
                margin="normal"
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Descrição"
                name="descricao"
                fullWidth
                value={formValuesCategoria.descricao}
                onChange={handleFormCategoriaChange}
                margin="normal"
                multiline
                rows={2}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Ordem de Exibição"
                name="ordem"
                type="number"
                fullWidth
                value={formValuesCategoria.ordem}
                onChange={handleFormCategoriaChange}
                margin="normal"
                InputProps={{ inputProps: { min: 0 } }}
                helperText="Determina a ordem de exibição no cardápio (menor número = primeiro)"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl component="fieldset" margin="normal">
                <FormControlLabel
                  control={
                    <Switch
                      checked={formValuesCategoria.ativa}
                      onChange={(e) => setFormValuesCategoria(prev => ({
                        ...prev,
                        ativa: e.target.checked
                      }))}
                      name="ativa"
                      color="primary"
                    />
                  }
                  label="Categoria ativa"
                />
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseCategoriaDialog}>Cancelar</Button>
          <Button 
            onClick={handleSaveCategoria} 
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

// Importação das dependências após o componente para evitar erros
import { FormControlLabel } from '@mui/material';

export default MenuManagement;
