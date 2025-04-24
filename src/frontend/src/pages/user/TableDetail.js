import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  Card,
  CardContent,
  CardMedia,
  CardActions
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Restaurant as RestaurantIcon,
  Money as MoneyIcon,
  Receipt as ReceiptIcon,
  People as PeopleIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Remove,
  Add,
  AccessTime as TimeIcon,
  TableBar as TableIcon,
  WhatsApp as WhatsAppIcon
} from '@mui/icons-material';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import api from '../../services/api';

// Componente de detalhes da mesa
const TableDetail = () => {
  const { id } = useParams();
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { listen, emit } = useSocket();
  
  // Estados
  const [mesa, setMesa] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [categorias, setCategorias] = useState([]);
  const [itensCardapio, setItensCardapio] = useState([]);
  const [loadingCardapio, setLoadingCardapio] = useState(false);
  const [carrinho, setCarrinho] = useState([]);
  const [observacoes, setObservacoes] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Diálogos
  const [openAdicionarClientes, setOpenAdicionarClientes] = useState(false);
  const [numClientesForm, setNumClientesForm] = useState('');
  const [openMenuDialog, setOpenMenuDialog] = useState(false);
  
  // Cores para status das mesas
  const mesaStatusColors = {
    disponivel: theme.palette.success.main,
    ocupada: theme.palette.warning.main,
    reservada: theme.palette.info.main,
    manutencao: theme.palette.error.main
  };

  // Mostrar snackbar - definido primeiro para ser usado por outras funções
  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  }, []);

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

  // Buscar detalhes da mesa
  const fetchMesaDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/mesas/${id}`);
      if (response.data.success) {
        setMesa(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes da mesa:', error);
      showSnackbar('Erro ao carregar detalhes da mesa', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showSnackbar]);
  
  // Buscar pedidos da mesa
  const fetchPedidos = useCallback(async () => {
    try {
      const response = await api.get(`/api/pedidos/mesa/${id}`);
      if (response.data.success) {
        setPedidos(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      showSnackbar('Erro ao carregar pedidos da mesa', 'error');
    }
  }, [id, showSnackbar]);

  // Buscar itens do cardápio
  const fetchCardapio = useCallback(async () => {
    try {
      console.log('Iniciando busca do cardápio...');
      setLoadingCardapio(true);
      
      // Garantir que o token está sendo enviado
      const token = localStorage.getItem('token');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      // Buscar categorias
      const categoriasResponse = await api.get('/api/cardapio/categorias');
      console.log('Categorias recebidas:', categoriasResponse.data);
      if (categoriasResponse.data.success) {
        setCategorias(categoriasResponse.data.data);
        console.log('Categorias definidas no estado:', categoriasResponse.data.data.length);
      } else {
        console.warn('API retornou sucesso=false para categorias');
      }
      
      // Buscar itens
      const itensResponse = await api.get('/api/cardapio/itens');
      console.log('Itens recebidos:', itensResponse.data);
      if (itensResponse.data.success) {
        // Formatar os dados para garantir que os IDs de categoria sejam strings
        const itensTratados = itensResponse.data.data.map(item => ({
          ...item,
          categoria: item.categoria ? String(item.categoria) : null
        }));
        
        setItensCardapio(itensTratados);
        console.log('Itens definidos no estado:', itensTratados.length);
      } else {
        console.warn('API retornou sucesso=false para itens');
      }
      
      // Se não existirem itens no cardápio, mostrar mensagem
      if (!itensResponse.data.data || itensResponse.data.data.length === 0) {
        showSnackbar('Não há itens disponíveis no cardápio', 'warning');
      }
    } catch (error) {
      console.error('Erro ao buscar cardápio:', error);
      showSnackbar('Erro ao carregar o cardápio', 'error');
    } finally {
      setLoadingCardapio(false);
    }
    
    return true; // Para usar com .then() no handleNovoPedido
  }, [showSnackbar]);

  // useEffect deve ficar após as definições das funções que ele utiliza
  useEffect(() => {
    console.log('Carregando dados iniciais da mesa:', id);
    // Garantir que o token está sendo enviado em todas as requisições
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('Token configurado nas requisições');
    } else {
      console.error('Token não encontrado');
    }

    // Carregar dados iniciais
    fetchMesaDetails();
    fetchPedidos();
    fetchCardapio();

    // Configurar listeners de socket
    listen('mesaAtualizada', (data) => {
      console.log('Evento mesaAtualizada recebido:', data);
      if (data.mesaId === id) {
        fetchMesaDetails();
      }
    });

    listen('pedidoAtualizado', (data) => {
      console.log('Evento pedidoAtualizado recebido:', data);
      if (data.mesaId === id) {
        fetchPedidos();
      }
    });

    listen('cardapioAtualizado', () => {
      console.log('Evento cardapioAtualizado recebido');
      fetchCardapio();
    });

    // Limpeza ao desmontar
    return () => {
      // Remover listeners de socket ao desmontar
      console.log('Desmontando componente, limpando listeners');
    };
  }, [id, listen, fetchMesaDetails, fetchPedidos, fetchCardapio]);
  
  // Adicionar clientes à mesa
  const handleAdicionarClientes = async () => {
    try {
      const numClientes = parseInt(numClientesForm);
      
      if (!numClientes || numClientes <= 0) {
        showSnackbar('Informe um número válido de clientes', 'error');
        return;
      }
      
      const response = await api.post(`/api/mesas/${id}/adicionar-cliente`, {
        numClientes
      });
      
      if (response.data.success) {
        setMesa(response.data.data);
        showSnackbar(`${numClientes} cliente(s) adicionado(s) com sucesso`, 'success');
        setOpenAdicionarClientes(false);
        
        // Emitir evento de atualização para todos os clientes
        emit('mesa_atualizada', {
          id,
          status: 'ocupada',
          ocupacaoAtual: response.data.data.ocupacaoAtual
        });
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Ocorreu um erro ao adicionar clientes';
      showSnackbar(errorMessage, 'error');
    }
  };

  // Liberar mesa
  const handleLiberarMesa = async () => {
    // Verificar se há pedidos abertos
    const pedidosAbertos = pedidos.filter(pedido => 
      pedido.status !== 'fechado' && pedido.status !== 'cancelado'
    );
    
    if (pedidosAbertos.length > 0) {
      showSnackbar('Há pedidos abertos para esta mesa. Feche-os antes de liberar.', 'error');
      return;
    }
    
    try {
      // Enviar objeto vazio como corpo da requisição
      const response = await api.post(`/api/mesas/${id}/liberar`, {});
      
      if (response.data.success) {
        showSnackbar('Mesa liberada com sucesso', 'success');
        
        // Emitir evento de atualização para todos os clientes
        emit('mesa_atualizada', {
          id,
          status: 'disponivel'
        });
        
        // Redirecionar para lista de mesas
        navigate('/tables');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erro ao liberar mesa';
      showSnackbar(errorMessage, 'error');
    }
  };

  // Adicionar item ao carrinho
  const handleAddItemToCart = (item) => {
    console.log('Tentando adicionar item ao carrinho:', item);
    
    // Verificar se o item está disponível
    if (!item.disponivel) {
      console.log(`Item indisponível: ${item.nome}`);
      showSnackbar('Este item não está disponível', 'warning');
      return;
    }

    // Criar uma cópia do carrinho atual para manipulação
    let novoCarrinho = [...carrinho];
    
    // Verificar se o item já está no carrinho
    const itemIndex = novoCarrinho.findIndex(i => i.item._id === item._id);
    
    if (itemIndex !== -1) {
      // Item já existe no carrinho, aumentando quantidade
      console.log('Atualizando quantidade de item existente no carrinho');
      novoCarrinho[itemIndex].quantidade += 1;
    } else {
      // Adicionar novo item ao carrinho
      console.log('Adicionando novo item ao carrinho');
      novoCarrinho.push({
        item: item,
        quantidade: 1,
        preco: item.preco
      });
    }
    
    // Atualizar o estado do carrinho
    setCarrinho(novoCarrinho);
    
    // Mostrar confirmação
    showSnackbar(`${item.nome} adicionado ao carrinho`, 'success');
    
    console.log('Carrinho atualizado:', novoCarrinho);
  };

  // Decrementar quantidade no carrinho
  const handleDecreaseQuantity = (itemId) => {
    console.log('Diminuindo quantidade do item:', itemId);
    // Encontrar item no carrinho
    const existingItemIndex = carrinho.findIndex(cartItem => cartItem.item._id === itemId);
    
    if (existingItemIndex === -1) return; // Item não encontrado
    
    const currentItem = carrinho[existingItemIndex];
    const newCart = [...carrinho];
    
    if (currentItem.quantidade > 1) {
      // Reduzir quantidade
      newCart[existingItemIndex].quantidade -= 1;
      setCarrinho(newCart);
      console.log('Quantidade reduzida para:', newCart[existingItemIndex].quantidade);
    } else {
      // Remover item se quantidade = 1
      handleRemoveFromCart(itemId);
    }
  };

  // Incrementar quantidade no carrinho
  const handleIncreaseQuantity = (itemId) => {
    console.log('Aumentando quantidade do item:', itemId);
    // Encontrar item no carrinho
    const existingItemIndex = carrinho.findIndex(cartItem => cartItem.item._id === itemId);
    
    if (existingItemIndex === -1) return; // Item não encontrado
    
    const newCart = [...carrinho];
    newCart[existingItemIndex].quantidade += 1;
    setCarrinho(newCart);
    console.log('Nova quantidade:', newCart[existingItemIndex].quantidade);
  };

  // Remover item do carrinho
  const handleRemoveFromCart = (itemId) => {
    console.log('Removendo item do carrinho:', itemId);
    setCarrinho(prev => prev.filter(item => item.item._id !== itemId));
    // Também remover qualquer observação
    setObservacoes(prev => {
      const newObservacoes = { ...prev };
      delete newObservacoes[itemId];
      return newObservacoes;
    });
  };

  // Atualizar observação do item
  const handleUpdateObservacao = (itemId, texto) => {
    console.log('Atualizando observação para item:', itemId, texto);
    setObservacoes(prev => ({
      ...prev,
      [itemId]: texto
    }));
  };

  // Finalizar pedido
  const handleFinalizarPedido = async () => {
    if (carrinho.length === 0) {
      showSnackbar('Adicione pelo menos um item ao pedido', 'error');
      return;
    }

    try {
      // Formatar itens para envio - ajustando para o formato esperado pelo backend
      const itens = carrinho.map(item => {
        console.log('Formatando item para envio:', item);
        return {
          itemId: item.item._id,        // Backend espera itemId em vez de item
          quantidade: item.quantidade,
          preco: item.preco,           // Precisamos manter o preu00e7o pois o modelo do backend exige
          observacao: observacoes[item.item._id] || ''
        };
      });

      // Garantir que o token está sendo enviado
      const token = localStorage.getItem('token');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      // Log detalhado para debug
      console.log('Enviando pedido:', { 
        mesa: id, 
        itens: itens
      });
      
      // Debug - vamos verificar exatamente o que estamos enviando
      const dadosPedido = {
        mesa: id,
        itens,
        observacao: 'Pedido feito via tablet'
      };
      
      console.log('Dados do pedido formatados para envio:', JSON.stringify(dadosPedido));
      
      const response = await api.post('/api/pedidos', dadosPedido);

      if (response.data.success) {
        showSnackbar('Pedido criado com sucesso', 'success');
        // Limpar carrinho
        setCarrinho([]);
        setObservacoes({});
        // Fechar diálogo
        setOpenMenuDialog(false);
        // Atualizar lista de pedidos
        fetchPedidos();
      }
    } catch (error) {
      // Logar o erro completo para depurau00e7u00e3o
      console.error('Erro completo ao criar pedido:', error);
      console.error('Detalhes do erro:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || 'Erro ao criar pedido';
      showSnackbar(errorMessage, 'error');
    }
  };

  // Criar novo pedido
  const handleNovoPedido = async () => {
    console.log('Iniciando novo pedido para mesa:', id);
    
    // Limpar carrinho antes de abrir o dialog
    setCarrinho([]);
    setObservacoes({});
    setLoadingCardapio(true);
    
    try {
      // Configurar o token para autorização
      const token = localStorage.getItem('token');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      // Fazer requests em paralelo para melhorar performance
      const [categoriasResponse, itensResponse] = await Promise.all([
        api.get('/api/cardapio/categorias'),
        api.get('/api/cardapio/itens')
      ]);
      
      // Processar as categorias
      if (categoriasResponse.data.success) {
        console.log('Categorias carregadas:', categoriasResponse.data.data.length);
        setCategorias(categoriasResponse.data.data);
      } else {
        console.warn('Erro ao carregar categorias');
        setCategorias([]);
      }
      
      // Processar os itens do cardápio
      if (itensResponse.data.success && itensResponse.data.data && itensResponse.data.data.length > 0) {
        console.log('Itens carregados:', itensResponse.data.data.length);
        
        // Garantir que os IDs de categoria sejam strings para comparação consistente
        const itensTratados = itensResponse.data.data.map(item => ({
          ...item,
          categoria: item.categoria ? String(item.categoria) : null
        }));
        
        setItensCardapio(itensTratados);
        console.log('Itens prontos para exibição');
        
        // Abrir o dialog apenas depois que os dados estiverem carregados
        setOpenMenuDialog(true);
      } else {
        console.error('Resposta vazia ou erro ao carregar itens do cardápio');
        showSnackbar('Não foi possível carregar os itens do cardápio', 'error');
      }
    } catch (error) {
      console.error('Erro ao carregar dados para novo pedido:', error);
      showSnackbar('Erro ao carregar cardápio. Tente novamente.', 'error');
    } finally {
      setLoadingCardapio(false);
    }
  };

  // Fechar snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({
      ...prev,
      open: false
    }));
  };

  // Funu00e7u00f5es utilitarias
  const formatarData = (data) => {
    if (!data) return '-';
    return format(parseISO(data), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  const calcularTempoDecorrido = (data) => {
    if (!data) return '-';
    return formatDistanceToNow(parseISO(data), { locale: ptBR, addSuffix: true });
  };

  // Calcular total de um pedido
  const calcularTotalPedido = (pedido) => {
    if (!pedido || !pedido.itens || pedido.itens.length === 0) return 0;
    
    return pedido.itens.reduce((total, item) => {
      return total + (item.preco * item.quantidade);
    }, 0);
  };

  // Calcular total de todos os pedidos
  const calcularTotalGeral = () => {
    if (!pedidos || pedidos.length === 0) return 0;
    
    const total = pedidos.reduce((sum, pedido) => {
      // Su00f3 considerar pedidos nu00e3o cancelados
      if (pedido.status !== 'cancelado') {
        return sum + calcularTotalPedido(pedido);
      }
      return sum;
    }, 0);
    
    return total;
  };

  // Obter cor para status do pedido
  const getStatusPedidoColor = (status) => {
    switch (status) {
      case 'pendente': return theme.palette.info.main;
      case 'preparando': return theme.palette.warning.main;
      case 'pronto': return theme.palette.success.main;
      case 'entregue': return theme.palette.success.dark;
      case 'fechado': return theme.palette.success.dark;
      case 'cancelado': return theme.palette.error.main;
      default: return theme.palette.text.secondary;
    }
  };

  // Obter texto para status do pedido
  const getStatusPedidoText = (status) => {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'preparando': return 'Preparando';
      case 'pronto': return 'Pronto';
      case 'entregue': return 'Entregue';
      case 'fechado': return 'Fechado';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  // Muda a tab ativa
  const handleChangeTab = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Renderizar itens do cardápio
  const renderMenuDialog = () => {
    return (
      <Dialog
        open={openMenuDialog}
        onClose={() => setOpenMenuDialog(false)}
        fullWidth
        maxWidth="md"
        scroll="paper"
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Cardápio</Typography>
            <IconButton onClick={() => setOpenMenuDialog(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          <Box sx={{ display: 'flex', height: '100%' }}>
            {loadingCardapio ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ width: '100%' }}>
                {/* Debug info - oculto em ambiente de produção */}
                {process.env.NODE_ENV === 'development' && (
                  <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography variant="body2">
                      Categorias carregadas: {categorias.length}
                    </Typography>
                    <Typography variant="body2">
                      Itens carregados: {itensCardapio.length}
                    </Typography>
                  </Box>
                )}
                
                {/* Mostrar itens de cardápio */}
                {itensCardapio.length === 0 ? (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                      Nenhum item disponível no cardápio.
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <Box sx={{ mb: 4 }}>
                      <Typography
                        variant="h6"
                        color="primary"
                        gutterBottom
                        sx={{ borderBottom: 1, borderColor: 'divider', pb: 1 }}
                      >
                        Menu Completo
                      </Typography>
                      
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {itensCardapio.map(item => (
                          <Box key={item._id} sx={{ width: { xs: '100%', sm: '48%', md: '31%' } }}>
                            <Card
                              variant="outlined"
                              sx={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                cursor: 'pointer'
                              }}
                              onClick={() => handleAddItemToCart(item)}
                            >
                              {item.imagem && (
                                <CardMedia
                                  component="img"
                                  height="140"
                                  image={item.imagem}
                                  alt={item.nome}
                                  sx={{ objectFit: 'cover' }}
                                />
                              )}
                              
                              <CardContent sx={{ flexGrow: 1 }}>
                                <Typography variant="h6" component="h3" gutterBottom>
                                  {item.nome}
                                </Typography>
                                
                                {item.descricao && (
                                  <Typography variant="body2" color="text.secondary" gutterBottom>
                                    {item.descricao}
                                  </Typography>
                                )}
                                
                                <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                                  R$ {item.preco.toFixed(2).replace('.', ',')}
                                </Typography>
                              </CardContent>
                              
                              <CardActions>
                                {!item.disponivel ? (
                                  <Typography variant="body2" color="error" sx={{ ml: 1 }}>
                                    Indisponível
                                  </Typography>
                                ) : (
                                  <Button
                                    color="primary"
                                    startIcon={<AddIcon />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddItemToCart(item);
                                    }}
                                    fullWidth
                                    variant="contained"
                                  >
                                    Adicionar
                                  </Button>
                                )}
                              </CardActions>
                            </Card>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    );
  };

  // Calcular total do carrinho
  const calcularTotalCarrinho = () => {
    return carrinho.reduce((total, item) => total + (item.preco * item.quantidade), 0);
  };

  // Renderizar carrinho flutuante
  const renderFloatingCart = () => {
    if (carrinho.length === 0) return null;
    
    return (
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          width: '300px',
          bgcolor: 'background.paper',
          boxShadow: 3,
          borderTopLeftRadius: 8,
          zIndex: 1200
        }}
      >
        <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Carrinho ({carrinho.length})
            </Typography>
            
            <IconButton
              size="small"
              sx={{ color: 'white' }}
              onClick={() => setCarrinho([])}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        
        <Box sx={{ maxHeight: '300px', overflowY: 'auto' }}>
          <List sx={{ py: 0 }}>
            {carrinho.map((itemCarrinho, index) => (
              <ListItem
                key={`${itemCarrinho.item._id}-${index}`}
                sx={{
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  py: 1
                }}
              >
                <Box sx={{ width: '100%' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      mb: 1
                    }}
                  >
                    <Typography variant="subtitle2">
                      {itemCarrinho.item.nome}
                    </Typography>
                    
                    <Typography variant="body2" color="primary" sx={{ fontWeight: 'medium' }}>
                      R$ {(itemCarrinho.preco * itemCarrinho.quantidade).toFixed(2).replace('.', ',')}
                    </Typography>
                  </Box>
                  
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() => handleDecreaseQuantity(itemCarrinho.item._id)}
                      >
                        <Remove fontSize="small" />
                      </IconButton>
                      
                      <Typography variant="body2" sx={{ px: 1 }}>
                        {itemCarrinho.quantidade}
                      </Typography>
                      
                      <IconButton
                        size="small"
                        onClick={() => handleIncreaseQuantity(itemCarrinho.item._id)}
                      >
                        <Add fontSize="small" />
                      </IconButton>
                    </Box>
                    
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveFromCart(itemCarrinho.item._id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  
                  <TextField
                    placeholder="Observação"
                    fullWidth
                    margin="dense"
                    size="small"
                    value={observacoes[itemCarrinho.item._id] || ''}
                    onChange={(e) => handleUpdateObservacao(itemCarrinho.item._id, e.target.value)}
                  />
                </Box>
              </ListItem>
            ))}
          </List>
        </Box>
        
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
            Total: R$ {calcularTotalCarrinho().toFixed(2).replace('.', ',')}
          </Typography>
          
          <Button
            variant="contained"
            color="primary"
            fullWidth
            startIcon={<CheckCircleIcon />}
            onClick={handleFinalizarPedido}
          >
            Finalizar Pedido
          </Button>
        </Box>
      </Box>
    );
  };

  // Esta função é usada no futuro ou em outro lugar quando há necessidade de renderizar os itens do cardapio
  // em um contexto diferente do dialog
  const renderCardapioItems = () => {
    return (
      <Box p={2}>
        {renderMenuDialog()}
      </Box>
    );
  };

  // Renderizar conteudo principal
  return (
    <Box sx={{ pb: 7 }}>
      {/* Renderizar o cardápio */}
      {renderMenuDialog()}
      
      {/* Renderizar o carrinho flutuante */}
      {renderFloatingCart()}
      
      {/* Header */}
      <Box
        sx={{
          p: 2,
          mb: 2,
          backgroundColor: mesaStatusColors[mesa?.status || 'disponivel'],
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            color="inherit"
            onClick={() => navigate('/tables')}
            sx={{ mr: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>
          
          <Typography variant="h6" component="h1">
            Mesa {mesa?.numero}
          </Typography>
          
          <Chip
            label={getStatusText(mesa?.status)}
            size="small"
            sx={{
              ml: 1,
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              fontWeight: 'medium'
            }}
          />
        </Box>
      </Box>
      
      {/* Informações rápidas */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <PeopleIcon color="primary" />
            <Typography variant="body2" color="text.secondary">
              Clientes
            </Typography>
            <Typography variant="h6" fontWeight="medium">
              {mesa?.ocupacaoAtual?.clientes || 0}
            </Typography>
          </Box>
          
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <ReceiptIcon color="primary" />
            <Typography variant="body2" color="text.secondary">
              Pedidos
            </Typography>
            <Typography variant="h6" fontWeight="medium">
              {pedidos.filter(p => p.status !== 'cancelado').length || 0}
            </Typography>
          </Box>
          
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <MoneyIcon color="primary" />
            <Typography variant="body2" color="text.secondary">
              Total
            </Typography>
            <Typography variant="h6" fontWeight="medium">
              R$ {calcularTotalGeral().toFixed(2)}
            </Typography>
          </Box>
        </Box>
      </Paper>
      
      {/* Tabs de navegação */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleChangeTab}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Detalhes" />
          <Tab label="Pedidos" />
          <Tab label="Ações" />
        </Tabs>
      </Paper>
      
      {/* Conteúdo das Tabs */}
      <Box sx={{ pt: 1 }}>
        {/* Tab de Detalhes */}
        {activeTab === 0 && (
          <Paper sx={{ p: 2 }}>
            {loading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Informações da Mesa
                </Typography>
                
                <Typography variant="body2">
                  <strong>Capacidade:</strong> {mesa?.capacidade} pessoas
                </Typography>
                
                <Typography variant="body2">
                  <strong>Área:</strong> {getAreaText(mesa?.localizacao?.area)}
                </Typography>
                
                <Typography variant="body2">
                  <strong>Ocupada desde:</strong> {mesa?.ocupacaoAtual?.inicio ? 
                    formatarData(mesa.ocupacaoAtual.inicio) : 'N/A'}
                </Typography>
                
                <Typography variant="body2">
                  <strong>Tempo de ocupação:</strong> {mesa?.ocupacaoAtual?.inicio ?
                    calcularTempoDecorrido(mesa.ocupacaoAtual.inicio) : 'N/A'}
                </Typography>
                
                {mesa?.garcom && (
                  <Typography variant="body2">
                    <strong>Atendido por:</strong> {mesa.garcom.nome}
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        )}
        
        {/* Tab de Pedidos */}
        {activeTab === 1 && (
          <Paper>
            <List>
              {pedidos.length === 0 ? (
                <Box p={3} textAlign="center">
                  <Typography color="textSecondary">
                    Nenhum pedido registrado para esta mesa.
                  </Typography>
                </Box>
              ) : (
                pedidos.map((pedido) => (
                  <Box key={pedido._id}>
                    <ListItem>
                      <Box sx={{ width: '100%' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle1">
                            Pedido #{pedido._id.substr(-6)}
                          </Typography>
                          
                          <Chip
                            label={getStatusPedidoText(pedido.status)}
                            size="small"
                            sx={{
                              backgroundColor: getStatusPedidoColor(pedido.status),
                              color: 'white'
                            }}
                          />
                        </Box>
                        
                        <Typography variant="body2" color="textSecondary">
                          <TimeIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                          {formatarData(pedido.dataCriacao)}
                        </Typography>
                        
                        <Divider sx={{ my: 1 }} />
                        
                        <List dense>
                          {pedido.itens.map((item, idx) => (
                            <ListItem key={idx} dense>
                              <ListItemText
                                primary={
                                  <Typography variant="body2">
                                    {item.quantidade}x {item.nome || 'Item'}
                                  </Typography>
                                }
                                secondary={
                                  <Typography variant="body2" color="textSecondary">
                                    R$ {(item.valorUnitario * item.quantidade).toFixed(2).replace('.', ',')}
                                    {item.observacao && ` - ${item.observacao}`}
                                  </Typography>
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                          <Typography variant="body2" fontWeight="bold">
                            Total: R$ {calcularTotalPedido(pedido).toFixed(2).replace('.', ',')}
                          </Typography>
                        </Box>
                      </Box>
                    </ListItem>
                    <Divider />
                  </Box>
                ))
              )}
            </List>
          </Paper>
        )}
        
        {/* Tab de Ações */}
        {activeTab === 2 && (
          <Paper sx={{ p: 2 }}>
            <Box display="flex" flexDirection="column" gap={2}>
              <Button
                variant="outlined"
                startIcon={<PersonAddIcon />}
                onClick={() => setOpenAdicionarClientes(true)}
                disabled={mesa?.status !== 'ocupada'}
              >
                Adicionar clientes
              </Button>
              
              <Button
                variant="contained"
                color="primary"
                startIcon={<RestaurantIcon />}
                onClick={handleNovoPedido}
                disabled={mesa?.status !== 'ocupada'}
              >
                Novo Pedido
              </Button>
              
              <Button
                variant="outlined"
                color="success"
                startIcon={<WhatsAppIcon />}
                disabled={pedidos.length === 0}
                onClick={() => {
                  // Implementar envio por whatsapp
                  showSnackbar('Funcionalidade em implementação', 'info');
                }}
              >
                Enviar comanda por WhatsApp
              </Button>
              
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<MoneyIcon />}
                disabled={pedidos.length === 0}
                onClick={() => {
                  // Navegar para a página de pagamento
                  navigate(`/tables/${id}/payment`);
                }}
              >
                Processar pagamento
              </Button>
              
              <Button
                variant="outlined"
                color="error"
                startIcon={<TableIcon />}
                onClick={handleLiberarMesa}
                disabled={mesa?.status !== 'ocupada'}
              >
                Liberar mesa
              </Button>
            </Box>
          </Paper>
        )}
      </Box>
      
      {/* Botão flutuante para adicionar pedido */}
      {mesa?.status === 'ocupada' && activeTab === 1 && (
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16
          }}
          onClick={handleNovoPedido}
        >
          <AddIcon />
        </Fab>
      )}
      
      {/* Diálogo para adicionar clientes */}
      <Dialog
        open={openAdicionarClientes}
        onClose={() => setOpenAdicionarClientes(false)}
      >
        <DialogTitle>Adicionar Clientes</DialogTitle>
        
        <DialogContent>
          <Typography variant="body2" paragraph>
            Informe o número de clientes adicionais
          </Typography>
          
          <TextField
            label="Número de Clientes"
            type="number"
            fullWidth
            value={numClientesForm}
            onChange={(e) => setNumClientesForm(e.target.value)}
            margin="normal"
            required
            InputProps={{ 
              inputProps: { min: 1, max: (mesa?.capacidade || 10) - (mesa?.ocupacaoAtual?.clientes || 0) } 
            }}
            helperText={`Máximo: ${(mesa?.capacidade || 10) - (mesa?.ocupacaoAtual?.clientes || 0)} pessoas adicionais`}
          />
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setOpenAdicionarClientes(false)}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={handleAdicionarClientes}
            startIcon={<PersonAddIcon />}
          >
            Adicionar
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

export default TableDetail;
