import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
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
  Alert
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import api from '../../services/api';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    role: 'usuario',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/users');
      if (response.data.success) {
        setUsers(response.data.data);
      } else {
        setSnackbarMessage('Erro ao carregar usuários');
        setSnackbarSeverity('error');
        setOpenSnackbar(true);
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setSnackbarMessage('Erro ao carregar usuários do servidor');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleOpenDialog = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        nome: user.nome,
        email: user.email,
        senha: '',
        role: user.role
      });
    } else {
      setEditingUser(null);
      setFormData({
        nome: '',
        email: '',
        senha: '',
        role: 'usuario'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async () => {
    try {
      // Validar campos obrigatórios
      if (!formData.nome) {
        setSnackbarMessage('Nome é obrigatório');
        setSnackbarSeverity('error');
        setOpenSnackbar(true);
        return;
      }
      if (!formData.email) {
        setSnackbarMessage('Email é obrigatório');
        setSnackbarSeverity('error');
        setOpenSnackbar(true);
        return;
      }
      if (!editingUser && !formData.senha) {
        setSnackbarMessage('Senha é obrigatória para novos usuários');
        setSnackbarSeverity('error');
        setOpenSnackbar(true);
        return;
      }

      let response;
      if (editingUser) {
        // Se não houver senha, enviar sem o campo senha
        const userData = formData.senha
          ? formData
          : {
              nome: formData.nome,
              email: formData.email,
              role: formData.role
            };

        response = await api.put(`/api/users/${editingUser._id}`, userData);
      } else {
        response = await api.post('/api/users', formData);
      }

      if (response.data.success) {
        setSnackbarMessage(editingUser ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!');
        setSnackbarSeverity('success');
        setOpenSnackbar(true);
        setOpenDialog(false);
        // Recarregar a lista de usuários
        fetchUsers();
      } else {
        throw new Error(response.data.message || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      setSnackbarMessage(error.response?.data?.message || error.message || 'Erro ao salvar usuário');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };

  const handleDelete = async (userId) => {
    try {
      const confirmDelete = window.confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.');
      if (!confirmDelete) return;
      
      const response = await api.delete(`/api/users/${userId}`);
      
      if (response.data.success) {
        setSnackbarMessage('Usuário excluído com sucesso!');
        setSnackbarSeverity('success');
        setOpenSnackbar(true);
        
        // Recarregar a lista de usuários
        fetchUsers();
      } else {
        throw new Error(response.data.message || 'Erro ao excluir usuário');
      }
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      setSnackbarMessage(error.response?.data?.message || error.message || 'Erro ao excluir usuário');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Gerenciamento de Usuários
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Novo Usuário
        </Button>
      </Box>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader aria-label="sticky table">
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Função</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((user) => (
                  <TableRow hover role="checkbox" tabIndex={-1} key={user._id}>
                    <TableCell>{user.nome}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.role === 'superadmin' ? 'Administrador' : 'Garçom'}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => handleOpenDialog(user)}>
                        <EditIcon color="primary" />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(user._id)}>
                        <DeleteIcon color="error" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 100]}
          component="div"
          count={users.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Linhas por página"
        />
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
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
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
            />
            <TextField
              fullWidth
              label="Senha"
              name="senha"
              type="password"
              value={formData.senha}
              onChange={handleInputChange}
              helperText={editingUser ? "Deixe em branco para manter a senha atual" : ""}
            />
            <FormControl fullWidth>
              <InputLabel>Função</InputLabel>
              <Select
                name="role"
                value={formData.role}
                label="Função"
                onChange={handleInputChange}
              >
                <MenuItem value="usuario">Garçom</MenuItem>
                <MenuItem value="superadmin">Administrador</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editingUser ? 'Atualizar' : 'Criar'}
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

export default Users;
