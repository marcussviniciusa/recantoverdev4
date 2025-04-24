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
  Avatar,
  Chip,
  Switch,
  FormControlLabel,
  CircularProgress,
  Tooltip,
  Snackbar,
  Alert,
  InputAdornment,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Tab,
  Tabs
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  PersonAdd as PersonAddIcon,
  Person as PersonIcon,
  SupervisorAccount as AdminIcon,
  Badge as BadgeIcon,
  Restaurant as RestaurantIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const UserManagement = () => {
  const { currentUser } = useAuth();
  
  // Estados
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' ou 'edit'
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [formValues, setFormValues] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    telefone: '',
    role: 'usuario',
    ativo: true
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Buscar usuários ao carregar componente
  useEffect(() => {
    fetchUsers();
  }, []);

  // Buscar usuários da API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/users');
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      showSnackbar('Erro ao carregar usuários', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Abrir diálogo para criar novo usuário
  const handleOpenCreateDialog = () => {
    setFormMode('create');
    setFormValues({
      nome: '',
      email: '',
      senha: '',
      confirmarSenha: '',
      telefone: '',
      role: 'usuario',
      ativo: true
    });
    setOpenDialog(true);
  };

  // Abrir diálogo para editar usuário existente
  const handleOpenEditDialog = (user) => {
    setFormMode('edit');
    setSelectedUser(user);
    setFormValues({
      nome: user.nome,
      email: user.email,
      senha: '',
      confirmarSenha: '',
      telefone: user.telefone || '',
      role: user.role,
      ativo: user.ativo
    });
    setOpenDialog(true);
  };

  // Fechar diálogo
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedUser(null);
    setShowPassword(false);
  };

  // Abrir diálogo de detalhes do usuário
  const handleOpenDetailsDialog = async (userId) => {
    try {
      setLoading(true);
      const response = await api.get(`/api/users/${userId}/performance`);
      if (response.data.success) {
        setUserDetails(response.data.data);
        setDetailsDialogOpen(true);
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes do usuário:', error);
      showSnackbar('Erro ao carregar detalhes do usuário', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fechar diálogo de detalhes
  const handleCloseDetailsDialog = () => {
    setDetailsDialogOpen(false);
    setUserDetails(null);
  };

  // Alterar aba
  const handleChangeTab = (event, newValue) => {
    setTabValue(newValue);
  };

  // Atualizar valores do formulário
  const handleFormChange = (e) => {
    const { name, value, checked } = e.target;
    
    if (name === 'ativo') {
      setFormValues(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormValues(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Salvar usuário (criar ou editar)
  const handleSaveUser = async () => {
    try {
      // Validar formulário
      if (!formValues.nome || !formValues.email) {
        showSnackbar('Preencha todos os campos obrigatórios', 'error');
        return;
      }

      if (formMode === 'create' && (!formValues.senha || formValues.senha !== formValues.confirmarSenha)) {
        showSnackbar('As senhas não coincidem ou estão em branco', 'error');
        return;
      }

      const userData = { ...formValues };
      delete userData.confirmarSenha; // Remover campo de confirmação

      if (formMode === 'create') {
        // Criar novo usuário
        const response = await api.post('/api/auth/register', userData);
        if (response.data.success) {
          fetchUsers(); // Recarregar lista após criar
          showSnackbar('Usuário criado com sucesso', 'success');
          handleCloseDialog();
        }
      } else {
        // Atualizar usuário existente
        // Se a senha estiver vazia, remover do objeto para não atualizar
        if (!userData.senha) {
          delete userData.senha;
        }
        
        const response = await api.put(`/api/users/${selectedUser._id}`, userData);
        if (response.data.success) {
          // Atualizar lista de usuários com os novos dados
          setUsers(prev => prev.map(user => 
            user._id === selectedUser._id ? response.data.data : user
          ));
          showSnackbar('Usuário atualizado com sucesso', 'success');
          handleCloseDialog();
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Ocorreu um erro ao salvar o usuário';
      showSnackbar(errorMessage, 'error');
    }
  };

  // Alternar status do usuário (ativo/inativo)
  const handleToggleStatus = async (user) => {
    try {
      // Não permitir desativar a si mesmo
      if (user._id === currentUser._id) {
        showSnackbar('Não é possível desativar seu próprio usuário', 'error');
        return;
      }

      const response = await api.put(`/api/users/${user._id}/status`, {
        ativo: !user.ativo
      });
      
      if (response.data.success) {
        setUsers(prev => prev.map(u => 
          u._id === user._id ? { ...u, ativo: !u.ativo } : u
        ));
        
        showSnackbar(`Usuário ${user.nome} ${!user.ativo ? 'ativado' : 'desativado'} com sucesso`, 'success');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Ocorreu um erro ao alterar o status do usuário';
      showSnackbar(errorMessage, 'error');
    }
  };

  // Alternar papel do usuário (admin/garçom)
  const handleToggleRole = async (user) => {
    try {
      // Não permitir alterar a si mesmo
      if (user._id === currentUser._id) {
        showSnackbar('Não é possível alterar sua própria função', 'error');
        return;
      }

      const newRole = user.role === 'superadmin' ? 'usuario' : 'superadmin';
      
      const response = await api.put(`/api/users/${user._id}/role`, {
        role: newRole
      });
      
      if (response.data.success) {
        setUsers(prev => prev.map(u => 
          u._id === user._id ? { ...u, role: newRole } : u
        ));
        
        showSnackbar(`Usuário ${user.nome} agora é ${newRole === 'superadmin' ? 'administrador' : 'garçom'}`, 'success');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Ocorreu um erro ao alterar a função do usuário';
      showSnackbar(errorMessage, 'error');
    }
  };

  // Excluir usuário (funcionalidade não implementada no backend)
  const handleDeleteUser = (userId) => {
    showSnackbar('A exclusão de usuários não é permitida. Desative o usuário em vez disso.', 'info');
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

  // Gerar avatar para usuário
  const generateAvatar = (user) => {
    if (user.foto) {
      return <Avatar src={user.foto} alt={user.nome} />;
    }
    return (
      <Avatar
        sx={{
          bgcolor: user.role === 'superadmin' ? 'primary.main' : 'secondary.main',
        }}
      >
        {user.nome.charAt(0).toUpperCase()}
      </Avatar>
    );
  };

  // Filtrar usuários com base na aba selecionada
  const getFilteredUsers = () => {
    switch (tabValue) {
      case 0: // Todos
        return users;
      case 1: // Administradores
        return users.filter(user => user.role === 'superadmin');
      case 2: // Garçons
        return users.filter(user => user.role === 'usuario');
      case 3: // Inativos
        return users.filter(user => !user.ativo);
      default:
        return users;
    }
  };

  if (loading && users.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const filteredUsers = getFilteredUsers();

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Gerenciamento de Usuários
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Adicione e gerencie os usuários do sistema, incluindo garçons e administradores.
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<PersonAddIcon />}
          onClick={handleOpenCreateDialog}
        >
          Novo Usuário
        </Button>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleChangeTab}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab label="Todos" />
          <Tab label="Administradores" />
          <Tab label="Garçons" />
          <Tab label="Inativos" />
        </Tabs>
      </Paper>

      {filteredUsers.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Nenhum usuário encontrado
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {tabValue === 0 
              ? 'Clique no botão "Novo Usuário" para adicionar usuários ao sistema.'
              : 'Não há usuários correspondentes ao filtro selecionado.'}
          </Typography>
          {tabValue === 0 && (
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<PersonAddIcon />}
              onClick={handleOpenCreateDialog}
            >
              Novo Usuário
            </Button>
          )}
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filteredUsers.map((user) => (
            <Grid item xs={12} sm={6} md={4} key={user._id}>
              <Card 
                elevation={2} 
                sx={{ 
                  height: '100%',
                  opacity: user.ativo ? 1 : 0.7,
                  borderLeft: '4px solid',
                  borderLeftColor: user.role === 'superadmin' ? 'primary.main' : 'secondary.main',
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {generateAvatar(user)}
                    <Box sx={{ ml: 2, flex: 1 }}>
                      <Typography variant="h6" component="div">
                        {user.nome}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {user.email}
                      </Typography>
                    </Box>
                    <Chip 
                      icon={user.role === 'superadmin' ? <AdminIcon /> : <BadgeIcon />}
                      label={user.role === 'superadmin' ? 'Admin' : 'Garçom'} 
                      color={user.role === 'superadmin' ? 'primary' : 'secondary'} 
                      size="small"
                    />
                  </Box>
                  
                  <Divider sx={{ my: 1 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 1 }}>
                    <Typography variant="body2">
                      Status
                    </Typography>
                    <Chip 
                      label={user.ativo ? 'Ativo' : 'Inativo'} 
                      color={user.ativo ? 'success' : 'error'} 
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                  
                  {user.ultimoAcesso && (
                    <Typography variant="body2" color="text.secondary" fontSize="small">
                      Último acesso: {new Date(user.ultimoAcesso).toLocaleString()}
                    </Typography>
                  )}
                </CardContent>
                
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Button 
                    size="small" 
                    onClick={() => handleOpenDetailsDialog(user._id)}
                    startIcon={<VisibilityIcon />}
                  >
                    Detalhes
                  </Button>
                  
                  <Box>
                    <Tooltip title="Editar Usuário">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleOpenEditDialog(user)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title={user.ativo ? 'Desativar' : 'Ativar'}>
                      <IconButton 
                        size="small" 
                        color={user.ativo ? 'error' : 'success'}
                        onClick={() => handleToggleStatus(user)}
                        disabled={user._id === currentUser._id}
                      >
                        {user.ativo ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title={user.role === 'superadmin' ? 'Tornar Garçom' : 'Tornar Admin'}>
                      <IconButton 
                        size="small" 
                        color="secondary"
                        onClick={() => handleToggleRole(user)}
                        disabled={user._id === currentUser._id}
                      >
                        {user.role === 'superadmin' ? <BadgeIcon /> : <AdminIcon />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Diálogo de criação/edição de usuário */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {formMode === 'create' ? 'Adicionar Novo Usuário' : 'Editar Usuário'}
        </DialogTitle>
        
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Nome Completo"
                name="nome"
                fullWidth
                value={formValues.nome}
                onChange={handleFormChange}
                margin="normal"
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Email"
                name="email"
                type="email"
                fullWidth
                value={formValues.email}
                onChange={handleFormChange}
                margin="normal"
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Telefone"
                name="telefone"
                fullWidth
                value={formValues.telefone}
                onChange={handleFormChange}
                margin="normal"
                placeholder="(99) 99999-9999"
              />
            </Grid>
            
            {formMode === 'create' && (
              <>
                <Grid item xs={12}>
                  <TextField
                    label="Senha"
                    name="senha"
                    type={showPassword ? 'text' : 'password'}
                    fullWidth
                    value={formValues.senha}
                    onChange={handleFormChange}
                    margin="normal"
                    required
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    label="Confirmar Senha"
                    name="confirmarSenha"
                    type={showPassword ? 'text' : 'password'}
                    fullWidth
                    value={formValues.confirmarSenha}
                    onChange={handleFormChange}
                    margin="normal"
                    required
                    error={formValues.senha !== formValues.confirmarSenha && formValues.confirmarSenha !== ''}
                    helperText={
                      formValues.senha !== formValues.confirmarSenha && formValues.confirmarSenha !== ''
                        ? 'As senhas não coincidem'
                        : ''
                    }
                  />
                </Grid>
              </>
            )}
            
            {formMode === 'edit' && (
              <Grid item xs={12}>
                <TextField
                  label="Nova Senha (deixe em branco para manter a atual)"
                  name="senha"
                  type={showPassword ? 'text' : 'password'}
                  fullWidth
                  value={formValues.senha}
                  onChange={handleFormChange}
                  margin="normal"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            )}
            
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Função</InputLabel>
                <Select
                  name="role"
                  value={formValues.role}
                  onChange={handleFormChange}
                  label="Função"
                >
                  <MenuItem value="usuario">Garçom</MenuItem>
                  <MenuItem value="superadmin">Administrador</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formValues.ativo}
                    onChange={handleFormChange}
                    name="ativo"
                    color="primary"
                  />
                }
                label="Usuário ativo"
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button 
            onClick={handleSaveUser} 
            variant="contained" 
            color="primary"
          >
            {formMode === 'create' ? 'Adicionar' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de detalhes do usuário */}
      <Dialog
        open={detailsDialogOpen}
        onClose={handleCloseDetailsDialog}
        maxWidth="sm"
        fullWidth
      >
        {userDetails ? (
          <>
            <DialogTitle>
              Detalhes do Usuário
            </DialogTitle>
            
            <DialogContent dividers>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar
                  sx={{
                    width: 56,
                    height: 56,
                    bgcolor: userDetails.usuario.role === 'superadmin' ? 'primary.main' : 'secondary.main',
                  }}
                >
                  {userDetails.usuario.nome.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ ml: 2 }}>
                  <Typography variant="h6">
                    {userDetails.usuario.nome}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {userDetails.usuario.role === 'superadmin' ? 'Administrador' : 'Garçom'}
                  </Typography>
                </Box>
              </Box>
              
              <Typography variant="subtitle1" gutterBottom>
                Estatísticas de Desempenho
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.light' }}>
                      <RestaurantIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Pedidos Atendidos"
                    secondary={userDetails.desempenho.pedidosAtendidos}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'success.light' }}>
                      <TableIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Mesas Atendidas"
                    secondary={userDetails.mesasAtendidas}
                  />
                </ListItem>
                
                {userDetails.desempenho.tempoMedioAtendimento > 0 && (
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'warning.light' }}>
                        <AccessTimeIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary="Tempo Médio de Atendimento"
                      secondary={`${userDetails.desempenho.tempoMedioAtendimento} minutos`}
                    />
                  </ListItem>
                )}
                
                {userDetails.desempenho.avaliacaoMedia > 0 && (
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'info.light' }}>
                        <StarIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary="Avaliação Média"
                      secondary={`${userDetails.desempenho.avaliacaoMedia.toFixed(1)} / 5.0`}
                    />
                  </ListItem>
                )}
              </List>
            </DialogContent>
            
            <DialogActions>
              <Button onClick={handleCloseDetailsDialog}>Fechar</Button>
            </DialogActions>
          </>
        ) : (
          <DialogContent>
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          </DialogContent>
        )}
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
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import StarIcon from '@mui/icons-material/Star';
import TableIcon from '@mui/icons-material/TableBar';

export default UserManagement;
