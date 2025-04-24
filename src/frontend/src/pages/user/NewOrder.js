import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress,
  Badge,
  Avatar,
  Tabs,
  Tab,
  InputBase,
  Collapse,
  useTheme
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ShoppingCart as CartIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  LocalOffer as TagIcon,
  Star as StarIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Close as CloseIcon,
  Restaurant as MenuIcon
} from '@mui/icons-material';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const NewOrder = () => {
  const { mesaId } = useParams();
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { emit } = useSocket();
  
  // Estados
  const [mesa, setMesa] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [itens, setItens] = useState([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [carregandoCategorias, setCarregandoCategorias] = useState(true);
  const [carregandoItens, setCarregandoItens] = useState(false);
  const [carrinho, setCarrinho] = useState([]);
  const [itemEmEdicao, setItemEmEdicao] = useState(null);
  const [openEdicaoDialog, setOpenEdicaoDialog] = useState(false);
  const [openConfirmacaoDialog, setOpenConfirmacaoDialog] = useState(false);
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const [observacaoPedido, setObservacaoPedido] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    fetchMesaDetails();
    fetchCategorias();
  }, [mesaId]);

  // Buscar detalhes da mesa
  const fetchMesaDetails = async () => {
    try {
      const response = await api.get(`/api/mesas/${mesaId}`);
      if (response.data.success) {
        setMesa(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes da mesa:', error);
      showSnackbar('Erro ao carregar dados da mesa', 'error');
    }
  };

  // Buscar categorias do cardápio
  const fetchCategorias = async () => {
    try {
      setCarregandoCategorias(true);
      const response = await api.get('/api/cardapio/categorias');
      if (response.data.success) {
        const categoriasData = response.data.data;
        setCategorias(categoriasData);
        
        // Definir a primeira categoria como ativa
        if (categoriasData.length > 0) {
          setCategoriaAtiva(categoriasData[0]._id);
          fetchItensByCategoria(categoriasData[0]._id);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      showSnackbar('Erro ao carregar categorias do cardápio', 'error');
    } finally {
      setCarregandoCategorias(false);
    }
  };

  // Buscar itens por categoria
  const fetchItensByCategoria = async (categoriaId) => {
    try {
      setCarregandoItens(true);
      const response = await api.get(`/api/cardapio/categorias/${categoriaId}/itens`);
      if (response.data.success) {
        setItens(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar itens:', error);
      showSnackbar('Erro ao carregar itens do cardápio', 'error');
    } finally {
      setCarregandoItens(false);
    }
  };

  // Buscar todos os itens para pesquisa
  const fetchAllItens = async () => {
    try {
      setCarregandoItens(true);
      const response = await api.get('/api/cardapio/itens');
      if (response.data.success) {
        setItens(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar todos os itens:', error);
      showSnackbar('Erro ao carregar itens para pesquisa', 'error');
    } finally {
      setCarregandoItens(false);
    }
  };

  // Mudar categoria ativa
  const handleCategoriaChange = (categoriaId) => {
    setCategoriaAtiva(categoriaId);
    setSearchQuery('');
    fetchItensByCategoria(categoriaId);
  };

  // Buscar itens por termo de pesquisa
  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.length > 2) {
      // Buscar todos os itens e filtrar no cliente
      fetchAllItens();
      setCategoriaAtiva('');
    } else if (query.length === 0 && categoriaAtiva) {
      // Voltar para a categoria anterior se a busca for limpa
      fetchItensByCategoria(categoriaAtiva);
    }
  };

  // Adicionar item ao carrinho
  const adicionarAoCarrinho = (item) => {
    setCarrinho(currentCart => {
      // Verificar se o item já existe no carrinho
      const itemExistente = currentCart.findIndex(cartItem => cartItem.itemId === item._id);
      
      if (itemExistente !== -1) {
        // Aumentar quantidade se já existir
        const newCart = [...currentCart];
        newCart[itemExistente].quantidade += 1;
        return newCart;
      } else {
        // Adicionar novo item
        return [...currentCart, {
          itemId: item._id,
          nome: item.nome,
          preco: item.preco,
          quantidade: 1,
          observacao: '',
          categoria: item.categoria.nome
        }];
      }
    });
    
    showSnackbar(`${item.nome} adicionado ao carrinho`);
  };

  // Remover item do carrinho
  const removerDoCarrinho = (index) => {
    setCarrinho(currentCart => {
      const newCart = [...currentCart];
      const item = newCart[index];
      
      if (item.quantidade > 1) {
        // Diminuir quantidade
        newCart[index].quantidade -= 1;
        return newCart;
      } else {
        // Remover item completamente
        return newCart.filter((_, i) => i !== index);
      }
    });
  };

  // Abrir diálogo para editar observação do item
  const handleEditarItem = (index) => {
    setItemEmEdicao({
      index,
      ...carrinho[index]
    });
    setOpenEdicaoDialog(true);
  };

  // Salvar edição de item
  const salvarEdicaoItem = () => {
    setCarrinho(currentCart => {
      const newCart = [...currentCart];
      newCart[itemEmEdicao.index] = {
        ...newCart[itemEmEdicao.index],
        observacao: itemEmEdicao.observacao,
        quantidade: itemEmEdicao.quantidade
      };
      return newCart;
    });
    
    setOpenEdicaoDialog(false);
    setItemEmEdicao(null);
  };

  // Excluir item do carrinho
  const excluirItemCarrinho = (index) => {
    setCarrinho(currentCart => currentCart.filter((_, i) => i !== index));
  };

  // Limpar carrinho completamente
  const limparCarrinho = () => {
    setCarrinho([]);
    setObservacaoPedido('');
  };

  // Abrir diálogo de confirmação
  const confirmarPedido = () => {
    if (carrinho.length === 0) {
      showSnackbar('Adicione pelo menos um item ao pedido', 'error');
      return;
    }
    setOpenConfirmacaoDialog(true);
  };

  // Enviar pedido para API
  const enviarPedido = async () => {
    try {
      setEnviandoPedido(true);
      
      const itensPedido = carrinho.map(item => ({
        itemId: item.itemId,
        quantidade: item.quantidade,
        observacao: item.observacao
      }));
      
      const response = await api.post('/api/pedidos', {
        mesaId,
        itens: itensPedido,
        observacao: observacaoPedido
      });
      
      if (response.data.success) {
        // Atualizar em tempo real
        emit('pedido_criado', {
          mesaId,
          pedidoId: response.data.data._id
        });
        
        showSnackbar('Pedido registrado com sucesso', 'success');
        
        // Aguardar um pouco para mostrar a mensagem de sucesso
        setTimeout(() => {
          navigate(`/tables/${mesaId}`);
        }, 1500);
      }
    } catch (error) {
      console.error('Erro ao enviar pedido:', error);
      const errorMessage = error.response?.data?.message || 'Ocorreu um erro ao registrar o pedido';
      showSnackbar(errorMessage, 'error');
    } finally {
      setEnviandoPedido(false);
      setOpenConfirmacaoDialog(false);
    }
  };

  // Calcular valor total do carrinho
  const calcularTotal = () => {
    return carrinho.reduce((total, item) => total + (item.preco * item.quantidade), 0);
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

  // Filtrar itens por pesquisa
  const itensFiltrados = searchQuery.length > 2
    ? itens.filter(item => 
        item.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.descricao?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : itens;

  return (
    <Box sx={{ p: 2, pb: 7 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton edge="start" sx={{ mr: 1 }} onClick={() => navigate(`/tables/${mesaId}`)}>
          <ArrowBackIcon />
        </IconButton>
        
        <Typography variant="h6" component="h1">
          Novo Pedido
        </Typography>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Badge 
          badgeContent={carrinho.reduce((sum, item) => sum + item.quantidade, 0)} 
          color="primary"
          sx={{ mr: 1 }}
        >
          <CartIcon />
        </Badge>
        
        <Typography variant="body1" fontWeight="bold">
          R$ {calcularTotal().toFixed(2)}
        </Typography>
      </Box>
      
      {/* Informações da mesa */}
      {mesa && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="body1" fontWeight="medium">
            Mesa {mesa.numero}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Clientes: {mesa.ocupacaoAtual?.clientes || 0} • Garçom: {currentUser?.nome || 'Não definido'}
          </Typography>
        </Paper>
      )}
      
      {/* Barra de pesquisa */}
      <Paper sx={{ p: 1, mb: 2, display: 'flex', alignItems: 'center' }}>
        <IconButton size="small" sx={{ mr: 1 }}>
          <SearchIcon />
        </IconButton>
        
        <InputBase
          placeholder="Buscar no cardápio..."
          fullWidth
          value={searchQuery}
          onChange={handleSearch}
        />
        
        {searchQuery && (
          <IconButton size="small" onClick={() => {
            setSearchQuery('');
            if (categoriaAtiva) {
              fetchItensByCategoria(categoriaAtiva);
            }
          }}>
            <ClearIcon fontSize="small" />
          </IconButton>
        )}
      </Paper>
      
      {/* Tabs de categorias */}
      {!searchQuery && (
        <Paper sx={{ mb: 2, overflow: 'auto' }}>
          <Tabs
            value={categoriaAtiva}
            onChange={(e, newValue) => handleCategoriaChange(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            textColor="primary"
            indicatorColor="primary"
          >
            {categorias.map((categoria) => (
              <Tab 
                key={categoria._id} 
                label={categoria.nome} 
                value={categoria._id}
                icon={<MenuIcon />}
                iconPosition="start"
              />
            ))}
          </Tabs>
        </Paper>
      )}
      
      {/* Lista de itens */}
      <Box sx={{ mb: 4 }}>
        {carregandoItens ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress size={40} />
          </Box>
        ) : itensFiltrados.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Nenhum item encontrado
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchQuery 
                ? "Tente outro termo de pesquisa."
                : "Esta categoria não possui itens cadastrados."}
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {itensFiltrados.map((item) => (
              <Grid item xs={12} sm={6} md={4} key={item._id}>
                <Card>
                  <CardActionArea onClick={() => adicionarAoCarrinho(item)}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                          {item.nome}
                        </Typography>
                        
                        <Typography variant="subtitle1" fontWeight="bold" color="primary">
                          R$ {item.preco.toFixed(2)}
                        </Typography>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {item.descricao || "Sem descrição"}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', mt: 1, alignItems: 'center' }}>
                        {item.destaque && (
                          <Chip 
                            icon={<StarIcon fontSize="small" />} 
                            label="Destaque" 
                            size="small" 
                            color="warning"
                            sx={{ mr: 1 }}
                          />
                        )}
                        
                        <Chip 
                          icon={<TagIcon fontSize="small" />} 
                          label={item.categoria?.nome || "Sem categoria"} 
                          size="small" 
                          color="default"
                          variant="outlined"
                        />
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
      
      {/* Carrinho */}
      <Box sx={{ mb: 2 }}>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              <CartIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
              Itens do Pedido
            </Typography>
            
            {carrinho.length > 0 && (
              <Button
                size="small"
                color="error"
                startIcon={<ClearIcon />}
                onClick={limparCarrinho}
              >
                Limpar
              </Button>
            )}
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          {carrinho.length === 0 ? (
            <Box sx={{ py: 2, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                Carrinho vazio
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Selecione itens do cardápio para adicionar
              </Typography>
            </Box>
          ) : (
            <>
              <List disablePadding>
                {carrinho.map((item, index) => (
                  <React.Fragment key={index}>
                    <ListItem
                      disablePadding
                      sx={{ py: 1 }}
                      secondaryAction={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <IconButton
                            size="small"
                            edge="end"
                            onClick={() => removerDoCarrinho(index)}
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          
                          <Typography variant="body2" sx={{ mx: 1, minWidth: '20px', textAlign: 'center' }}>
                            {item.quantidade}
                          </Typography>
                          
                          <IconButton
                            size="small"
                            edge="end"
                            onClick={() => adicionarAoCarrinho({ _id: item.itemId, nome: item.nome, preco: item.preco, categoria: { nome: item.categoria } })}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                          
                          <Box sx={{ width: '12px' }} />
                          
                          <IconButton
                            size="small"
                            edge="end"
                            onClick={() => handleEditarItem(index)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          
                          <IconButton
                            size="small"
                            edge="end"
                            color="error"
                            onClick={() => excluirItemCarrinho(index)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      }
                    >
                      <ListItemText
                        primary={item.nome}
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.primary">
                              R$ {(item.preco * item.quantidade).toFixed(2)}
                            </Typography>
                            {' — '}
                            <Typography component="span" variant="body2" color="text.secondary">
                              {item.quantidade} x R$ {item.preco.toFixed(2)}
                            </Typography>
                            {item.observacao && (
                              <Typography variant="caption" component="p" color="text.secondary" sx={{ mt: 0.5 }}>
                                <InfoIcon fontSize="inherit" sx={{ verticalAlign: 'text-bottom', mr: 0.5 }} />
                                {item.observacao}
                              </Typography>
                            )}
                          </>
                        }
                      />
                    </ListItem>
                    {index < carrinho.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
              </List>
              
              <Divider sx={{ my: 2 }} />
              
              <TextField
                label="Observação geral do pedido"
                multiline
                rows={2}
                fullWidth
                variant="outlined"
                placeholder="Ex: Mesas unidas, cliente com alergia a lactose, etc."
                value={observacaoPedido}
                onChange={(e) => setObservacaoPedido(e.target.value)}
                sx={{ mb: 2 }}
              />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight="bold">
                  Total
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="primary">
                  R$ {calcularTotal().toFixed(2)}
                </Typography>
              </Box>
              
              <Button
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                startIcon={<SendIcon />}
                onClick={confirmarPedido}
                sx={{ mt: 2 }}
              >
                Enviar Pedido
              </Button>
            </>
          )}
        </Paper>
      </Box>
      
      {/* Diálogo de edição de item */}
      <Dialog
        open={openEdicaoDialog}
        onClose={() => setOpenEdicaoDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Editar Item
        </DialogTitle>
        
        <DialogContent dividers>
          <Typography variant="subtitle1" gutterBottom>
            {itemEmEdicao?.nome}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="body1" sx={{ mr: 2 }}>
              Quantidade:
            </Typography>
            
            <IconButton
              size="small"
              onClick={() => setItemEmEdicao(prev => ({ 
                ...prev, 
                quantidade: Math.max(1, prev.quantidade - 1) 
              }))}
            >
              <RemoveIcon fontSize="small" />
            </IconButton>
            
            <Typography variant="body1" sx={{ mx: 2 }}>
              {itemEmEdicao?.quantidade || 1}
            </Typography>
            
            <IconButton
              size="small"
              onClick={() => setItemEmEdicao(prev => ({ 
                ...prev, 
                quantidade: prev.quantidade + 1 
              }))}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Box>
          
          <TextField
            label="Observação"
            multiline
            rows={3}
            fullWidth
            variant="outlined"
            placeholder="Ex: sem cebola, molho à parte, etc."
            value={itemEmEdicao?.observacao || ''}
            onChange={(e) => setItemEmEdicao(prev => ({ ...prev, observacao: e.target.value }))}
          />
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setOpenEdicaoDialog(false)}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={salvarEdicaoItem}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo de confirmação */}
      <Dialog
        open={openConfirmacaoDialog}
        onClose={() => !enviandoPedido && setOpenConfirmacaoDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Confirmar Pedido
        </DialogTitle>
        
        <DialogContent dividers>
          <Typography variant="body1" paragraph>
            Deseja confirmar o pedido para a Mesa {mesa?.numero}?
          </Typography>
          
          <Typography variant="body2">
            Total de itens: {carrinho.reduce((sum, item) => sum + item.quantidade, 0)}
          </Typography>
          
          <Typography variant="body2" fontWeight="bold" color="primary">
            Valor total: R$ {calcularTotal().toFixed(2)}
          </Typography>
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={() => setOpenConfirmacaoDialog(false)}
            disabled={enviandoPedido}
          >
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={enviarPedido}
            disabled={enviandoPedido}
            startIcon={enviandoPedido ? <CircularProgress size={20} /> : <SendIcon />}
          >
            {enviandoPedido ? 'Enviando...' : 'Confirmar Pedido'}
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

export default NewOrder;
