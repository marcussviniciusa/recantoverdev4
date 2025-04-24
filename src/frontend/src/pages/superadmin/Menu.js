import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
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
  Snackbar,
  Alert,
  Divider,
  FormHelperText,
  FormControlLabel,
  Switch
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Add as AddIcon,
  Restaurant as RestaurantIcon
} from '@mui/icons-material';
import api from '../../services/api';

const MenuManagement = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    preco: '',
    categoria: '',
    disponivel: true
  });
  const [categoryFormData, setCategoryFormData] = useState({
    nome: '',
    descricao: ''
  });

  useEffect(() => {
    fetchCategories();
    fetchMenuItems();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/cardapio/categorias');
      if (response.data.success) {
        setCategories(response.data.data);
      } else {
        setSnackbarMessage('Erro ao carregar categorias');
        setSnackbarSeverity('error');
        setOpenSnackbar(true);
      }
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      setSnackbarMessage('Erro ao carregar categorias do servidor');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const response = await api.get('/api/cardapio/itens');
      if (response.data.success) {
        setMenuItems(response.data.data);
      } else {
        setSnackbarMessage('Erro ao carregar itens do cardápio');
        setSnackbarSeverity('error');
        setOpenSnackbar(true);
      }
    } catch (error) {
      console.error('Erro ao buscar itens do cardápio:', error);
      setSnackbarMessage('Erro ao carregar itens do cardápio do servidor');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };

  const handleOpenDialog = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        nome: item.nome,
        descricao: item.descricao,
        preco: item.preco.toString(),
        categoria: item.categoria,
        disponivel: item.disponivel
      });
    } else {
      setEditingItem(null);
      setFormData({
        nome: '',
        descricao: '',
        preco: '',
        categoria: '',
        disponivel: true
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleOpenCategoryDialog = () => {
    setCategoryFormData({ nome: '', descricao: '' });
    setOpenCategoryDialog(true);
  };

  const handleCloseCategoryDialog = () => {
    setOpenCategoryDialog(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'disponivel' ? e.target.checked : value
    });
  };

  const handleCategoryInputChange = (e) => {
    const { name, value } = e.target;
    setCategoryFormData({
      ...categoryFormData,
      [name]: value
    });
  };

  const handleSubmit = async () => {
    try {
      // Validar campos obrigatórios
      if (!formData.nome || !formData.preco || !formData.categoria) {
        setSnackbarMessage('Preencha os campos obrigatórios: nome, preço e categoria');
        setSnackbarSeverity('error');
        setOpenSnackbar(true);
        return;
      }

      // Converter preço para número
      const itemData = {
        ...formData,
        preco: parseFloat(formData.preco)
      };

      let response;
      
      if (editingItem) {
        // Atualizar item existente
        response = await api.put(`/api/cardapio/itens/${editingItem._id}`, itemData);
      } else {
        // Criar novo item
        response = await api.post('/api/cardapio/itens', itemData);
      }
      
      if (response.data.success) {
        setSnackbarMessage(editingItem ? 'Item atualizado com sucesso!' : 'Item criado com sucesso!');
        setSnackbarSeverity('success');
        setOpenSnackbar(true);
        setOpenDialog(false);
        
        // Recarregar a lista de itens
        fetchMenuItems();
      } else {
        throw new Error(response.data.message || 'Erro ao salvar item');
      }
    } catch (error) {
      console.error('Erro ao salvar item:', error);
      setSnackbarMessage(error.message || 'Erro ao salvar item');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };

  const handleCategorySubmit = async () => {
    try {
      // Validar campos obrigatórios
      if (!categoryFormData.nome) {
        setSnackbarMessage('O nome da categoria é obrigatório');
        setSnackbarSeverity('error');
        setOpenSnackbar(true);
        return;
      }

      // Criar nova categoria
      const response = await api.post('/api/cardapio/categorias', categoryFormData);
      
      if (response.data.success) {
        setSnackbarMessage('Categoria criada com sucesso!');
        setSnackbarSeverity('success');
        setOpenSnackbar(true);
        setOpenCategoryDialog(false);
        
        // Recarregar a lista de categorias
        fetchCategories();
      } else {
        throw new Error(response.data.message || 'Erro ao criar categoria');
      }
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      setSnackbarMessage(error.message || 'Erro ao criar categoria');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };

  const handleDelete = async (itemId) => {
    try {
      const confirmDelete = window.confirm('Tem certeza que deseja excluir este item?');
      if (!confirmDelete) return;
      
      const response = await api.delete(`/api/cardapio/itens/${itemId}`);
      
      if (response.data.success) {
        setSnackbarMessage('Item excluído com sucesso!');
        setSnackbarSeverity('success');
        setOpenSnackbar(true);
        
        // Recarregar a lista de itens
        fetchMenuItems();
      } else {
        throw new Error(response.data.message || 'Erro ao excluir item');
      }
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      setSnackbarMessage(error.message || 'Erro ao excluir item');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      const confirmDelete = window.confirm('Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita e só será possível se não houver itens associados a ela.');
      if (!confirmDelete) return;
      
      const response = await api.delete(`/api/cardapio/categorias/${categoryId}`);
      
      if (response.data.success) {
        setSnackbarMessage('Categoria excluída com sucesso!');
        setSnackbarSeverity('success');
        setOpenSnackbar(true);
        
        // Recarregar a lista de categorias
        fetchCategories();
      } else {
        throw new Error(response.data.message || 'Erro ao excluir categoria');
      }
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      setSnackbarMessage(error.response?.data?.message || error.message || 'Erro ao excluir categoria. Verifique se não há itens associados a ela.');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c._id === categoryId);
    return category ? category.nome : 'Sem categoria';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Gerenciamento de Cardápio
        </Typography>
        <Box>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenCategoryDialog}
            sx={{ mr: 2 }}
          >
            Nova Categoria
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Novo Item
          </Button>
        </Box>
      </Box>

      {categories.map((category) => (
        <Box key={category._id} sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" component="h2">
              {category.nome}
            </Typography>
            <IconButton 
              onClick={() => handleDeleteCategory(category._id)}
              title="Excluir categoria"
              aria-label="Excluir categoria"
            >
              <DeleteIcon color="error" />
            </IconButton>
          </Box>
          <Grid container spacing={3}>
            {menuItems
              .filter(item => item.categoria === category._id || item.categoria._id === category._id)
              .map((item) => (
                <Grid item xs={12} sm={6} md={4} key={item._id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {item.imagem && (
                      <CardMedia
                        component="img"
                        height="140"
                        image={item.imagem}
                        alt={item.nome}
                      />
                    )}
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography gutterBottom variant="h6" component="div">
                        {item.nome}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.descricao}
                      </Typography>
                      <Typography variant="h6" color="primary" sx={{ mt: 2 }}>
                        R$ {item.preco.toFixed(2)}
                      </Typography>
                      {!item.disponivel && (
                        <Typography variant="caption" color="error">
                          Indisponível
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions>
                      <IconButton onClick={() => handleOpenDialog(item)}>
                        <EditIcon color="primary" />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(item._id)}>
                        <DeleteIcon color="error" />
                      </IconButton>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
          </Grid>
        </Box>
      ))}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingItem ? 'Editar Item' : 'Novo Item'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Nome"
              name="nome"
              value={formData.nome}
              onChange={handleInputChange}
            />
            <TextField
              fullWidth
              label="Descrição"
              name="descricao"
              multiline
              rows={3}
              value={formData.descricao}
              onChange={handleInputChange}
            />
            <TextField
              fullWidth
              label="Preço (R$)"
              name="preco"
              type="number"
              value={formData.preco}
              onChange={handleInputChange}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>R$</Typography>,
              }}
            />
            <FormControl fullWidth>
              <InputLabel>Categoria</InputLabel>
              <Select
                name="categoria"
                value={formData.categoria}
                label="Categoria"
                onChange={handleInputChange}
              >
                {categories.map((category) => (
                  <MenuItem key={category._id} value={category._id}>
                    {category.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.disponivel}
                  onChange={handleInputChange}
                  name="disponivel"
                  color="primary"
                />
              }
              label="Disponível"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editingItem ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openCategoryDialog} onClose={handleCloseCategoryDialog}>
        <DialogTitle>Nova Categoria</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Nome da Categoria"
              name="nome"
              value={categoryFormData.nome}
              onChange={handleCategoryInputChange}
            />
            <TextField
              fullWidth
              label="Descrição"
              name="descricao"
              multiline
              rows={2}
              value={categoryFormData.descricao}
              onChange={handleCategoryInputChange}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCategoryDialog}>Cancelar</Button>
          <Button onClick={handleCategorySubmit} variant="contained" color="primary">
            Criar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={() => setOpenSnackbar(false)}
      >
        <Alert
          onClose={() => setOpenSnackbar(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MenuManagement;
