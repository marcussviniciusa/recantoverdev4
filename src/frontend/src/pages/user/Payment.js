import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Grid,
  Button,
  IconButton,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Checkbox,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  InputAdornment,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  useTheme,
  Select,
  MenuItem,
  InputLabel
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  CreditCard as CreditCardIcon,
  MonetizationOn as MoneyIcon,
  Smartphone as PixIcon,
  LocalAtm as BillIcon,
  AccountBalance as BankIcon,
  Check as CheckIcon,
  CheckCircle as CheckCircleIcon,
  PeopleAlt as GroupIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  WhatsApp as WhatsAppIcon
} from '@mui/icons-material';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import ComprovantePagamento from '../../components/ComprovantePagamento';

const Payment = () => {
  const { id: mesaId } = useParams();
  const theme = useTheme();
  const navigate = useNavigate();
  const { emit } = useSocket();
  
  // Estados
  const [mesa, setMesa] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metodosPagamento] = useState([
    { id: 'dinheiro', nome: 'Dinheiro', icon: <MoneyIcon color="primary" /> },
    { id: 'credito', nome: 'Cartão de Crédito', icon: <CreditCardIcon color="primary" /> },
    { id: 'debito', nome: 'Cartão de Débito', icon: <BankIcon color="primary" /> },
    { id: 'pix', nome: 'PIX', icon: <PixIcon color="primary" /> },
    { id: 'vale', nome: 'Vale Refeição', icon: <BillIcon color="primary" /> },
  ]);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedPedidos, setSelectedPedidos] = useState([]);
  const [pagamento, setPagamento] = useState({
    metodo: 'dinheiro',
    valor: '',
    troco: 0,
    observacao: ''
  });
  const [pagantes, setPagantes] = useState([]);
  const [openDivisaoDialog, setOpenDivisaoDialog] = useState(false);
  const [openConfirmacaoDialog, setOpenConfirmacaoDialog] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [divisaoMetodo, setDivisaoMetodo] = useState('igual');
  const [selectedItems, setSelectedItems] = useState({});
  const [editPaganteIndex, setEditPaganteIndex] = useState(null);
  const [sucessoPagamento, setSucessoPagamento] = useState(false);
  const [pedidoPagoId, setPedidoPagoId] = useState(null);
  const [openComprovante, setOpenComprovante] = useState(false);
  
  useEffect(() => {
    if (mesaId) {
      fetchMesaDetails();
      fetchPedidos();
    }
  }, [mesaId]);
  
  // Buscar detalhes da mesa
  const fetchMesaDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/mesas/${mesaId}`);
      if (response.data.success) {
        setMesa(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes da mesa:', error);
      showSnackbar('Erro ao carregar detalhes da mesa', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Buscar pedidos da mesa
  const fetchPedidos = async () => {
    try {
      const response = await api.get(`/api/pedidos/mesa/${mesaId}`);
      if (response.data.success) {
        // Filtrar apenas pedidos em aberto (não pagos e não cancelados)
        const pedidosAbertos = response.data.data.filter(
          pedido => pedido.status !== 'pago' && pedido.status !== 'cancelado'
        );
        setPedidos(pedidosAbertos);
        
        // Selecionar todos os pedidos por padrão para pagamento total
        setSelectedPedidos(pedidosAbertos.map(pedido => pedido._id));
        
        // Definir valor total como padrão
        const valorTotal = calcularTotal(pedidosAbertos);
        setPagamento(prev => ({
          ...prev,
          valor: valorTotal.toFixed(2)
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      showSnackbar('Erro ao carregar pedidos da mesa', 'error');
    }
  };
  
  // Calcular total dos pedidos selecionados
  const calcularTotal = (pedidosList = null) => {
    const lista = pedidosList || pedidos;
    
    if (selectedPedidos.length === 0) return 0;
    
    return lista
      .filter(pedido => selectedPedidos.includes(pedido._id))
      .reduce((total, pedido) => {
        return total + pedido.itens.reduce((subtotal, item) => {
          return subtotal + (item.preco * item.quantidade);
        }, 0);
      }, 0);
  };
  
  // Toggle seleção de pedido
  const togglePedidoSelection = (pedidoId) => {
    setSelectedPedidos(prev => {
      const isSelected = prev.includes(pedidoId);
      let newSelected;
      
      if (isSelected) {
        newSelected = prev.filter(id => id !== pedidoId);
      } else {
        newSelected = [...prev, pedidoId];
      }
      
      // Atualizar valor do pagamento com base na nova seleção
      const novoTotal = pedidos
        .filter(pedido => newSelected.includes(pedido._id))
        .reduce((total, pedido) => {
          return total + calcularTotalPedido(pedido);
        }, 0);
      
      setPagamento(prev => ({
        ...prev,
        valor: novoTotal.toFixed(2),
        troco: novoTotal > parseFloat(prev.valor || 0) ? 0 : parseFloat(prev.valor) - novoTotal
      }));
      
      // Atualizar valor do primeiro pagante
      setPagantes(prev => {
        const updated = [...prev];
        updated[0].valor = novoTotal.toFixed(2);
        return updated;
      });
      
      return newSelected;
    });
  };
  
  // Calcular total de um pedido
  const calcularTotalPedido = (pedido) => {
    if (!pedido || !pedido.itens || pedido.itens.length === 0) return 0;
    
    return pedido.itens.reduce((total, item) => {
      return total + (item.preco * item.quantidade);
    }, 0);
  };
  
  // Atualizar valor do pagamento
  const handlePagamentoChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'valor') {
      const valorPago = parseFloat(value) || 0;
      const totalPedidos = calcularTotal();
      const troco = valorPago > totalPedidos ? valorPago - totalPedidos : 0;
      
      setPagamento(prev => ({
        ...prev,
        [name]: value,
        troco
      }));
    } else {
      setPagamento(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // Processar pagamento
  const processarPagamento = async (tipo) => {
    try {
      setProcessando(true);
      
      // Validar dados básicos
      if (selectedPedidos.length === 0) {
        throw new Error('Selecione pelo menos um pedido para pagamento');
      }
      
      // Realizar o pagamento de acordo com o tipo
      if (tipo === 'total') {
        // Pagamento total - processamento simplificado
        const promises = selectedPedidos.map(pedidoId => {
          return api.put(`/api/pedidos/${pedidoId}/pagar`, {
            metodoPagamento: 'dinheiro', // Valor padrão simplificado
            valor: calcularTotal(), // Valor total da conta
            observacao: 'Pagamento registrado pelo sistema'
          });
        });
        
        const results = await Promise.all(promises);
        
        // Verificar se todos os pagamentos foram bem-sucedidos
        const allSuccess = results.every(res => res.data.success);
        
        if (allSuccess) {
          // Armazenar o ID do primeiro pedido pago para o comprovante
          setPedidoPagoId(selectedPedidos[0]);
          
          // Atualizar o estado para exibir comprovante
          setSucessoPagamento(true);
          
          showSnackbar('Pagamento registrado com sucesso!', 'success');
          
          // Notificar via socket
          emit('pagamento_registrado', {
            mesaId,
            pedidosIds: selectedPedidos
          });
          
          // Liberar a mesa automaticamente após o pagamento
          try {
            const valorConsumido = calcularTotal(); // Total consumido na mesa
            const liberarResponse = await api.post(`/api/mesas/${mesaId}/liberar`, {
              valorConsumido
            });
            
            if (liberarResponse.data.success) {
              console.log('Mesa liberada automaticamente após pagamento');
              showSnackbar('Mesa liberada com sucesso', 'success');
            }
          } catch (liberarError) {
            console.error('Erro ao liberar a mesa:', liberarError);
            // Não exibimos erro ao usuário pois o pagamento já foi processado
          }
          
          // Fechar o diálogo de confirmação
          setOpenConfirmacaoDialog(false);
        } else {
          throw new Error('Não foi possível processar todos os pagamentos');
        }
      } else if (tipo === 'dividido') {
        // Pagamento dividido simplificado
        // Para divisão igual entre todos os pagantes
        const totalPorPagante = calcularTotal() / pagantes.length;
        
        const dadosPagamento = {
          pagantes: pagantes.map(p => ({
            nome: p.nome,
            metodo: 'dinheiro', // Método padrão simplificado
            valor: totalPorPagante,
            itens: [] // Sem itens específicos na versão simplificada
          })),
          pedidos: selectedPedidos
        };
        
        // Enviar requisição
        const response = await api.post(`/api/pedidos/mesa/${mesaId}/pagar-dividido`, dadosPagamento);
        
        if (response.data.success) {
          // Armazenar o ID do primeiro pedido pago para o comprovante
          if (response.data.pedidos && response.data.pedidos.length > 0) {
            setPedidoPagoId(response.data.pedidos[0]._id);
          } else {
            setPedidoPagoId(selectedPedidos[0]);
          }
          
          // Atualizar o estado para exibir comprovante
          setSucessoPagamento(true);
          
          showSnackbar('Pagamento dividido registrado com sucesso!', 'success');
          
          // Notificar via socket
          emit('pagamento_registrado', {
            mesaId,
            pedidosIds: selectedPedidos
          });
          
          // Liberar a mesa automaticamente após o pagamento
          try {
            const valorConsumido = calcularTotal(); // Total consumido na mesa
            const liberarResponse = await api.post(`/api/mesas/${mesaId}/liberar`, {
              valorConsumido
            });
            
            if (liberarResponse.data.success) {
              console.log('Mesa liberada automaticamente após pagamento');
              showSnackbar('Mesa liberada com sucesso', 'success');
            }
          } catch (liberarError) {
            console.error('Erro ao liberar a mesa:', liberarError);
            // Não exibimos erro ao usuário pois o pagamento já foi processado
          }
          
          // Fechar o diálogo de confirmação
          setOpenConfirmacaoDialog(false);
        } else {
          throw new Error(response.data.message || 'Falha ao processar pagamento dividido');
        }
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      showSnackbar(
        error.response?.data?.message || error.message || 'Erro ao processar pagamento. Tente novamente.',
        'error'
      );
    } finally {
      setProcessando(false);
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
  
  // Renderizar conteúdo da aba "Pagamento Total"
  const renderPagamentoTotalTab = () => (
    <Box sx={{ mt: 2 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Resumo da Conta
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Total de Itens
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {pedidos.reduce((total, pedido) => total + pedido.itens.length, 0)}
            </Typography>
          </Grid>
          
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Pedidos
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {pedidos.length}
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="h6" fontWeight="bold" color="primary">
              Total: R$ {calcularTotal().toFixed(2)}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
      

      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/tables/${mesaId}`)}
        >
          Voltar
        </Button>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<PaymentIcon />}
          onClick={() => setOpenConfirmacaoDialog(true)}
          disabled={selectedPedidos.length === 0}
        >
          Finalizar Pagamento
        </Button>
      </Box>
    </Box>
  );

  // Renderizar conteúdo da aba "Divisão de Conta"
  const renderDivisaoContaTab = () => {
    const totalConta = calcularTotal();
    
    return (
      <Box sx={{ p: 2 }}>
        {/* Seleção do método de divisão */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Como deseja dividir a conta?
          </Typography>
          
          <RadioGroup
            row
            value={divisaoMetodo}
            onChange={(e) => setDivisaoMetodo(e.target.value)}
          >
            <FormControlLabel 
              value="igual" 
              control={<Radio />} 
              label="Partes iguais" 
            />
            <FormControlLabel 
              value="porcentagem" 
              control={<Radio />} 
              label="Porcentagem" 
            />
            <FormControlLabel 
              value="itens" 
              control={<Radio />} 
              label="Por item" 
            />
          </RadioGroup>
        </Paper>
        
        {/* Lista de pagantes */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">
              Pagantes
            </Typography>
            
            <Button
              startIcon={<PersonAddIcon />}
              variant="outlined"
              size="small"
              onClick={() => setPagantes(prev => [...prev, { id: prev.length + 1, nome: 'Cliente ' + (prev.length + 1), valor: '', porcentagem: 100, metodo: 'dinheiro', items: [] }])}
            >
              Adicionar Pagante
            </Button>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={2}>
            {pagantes.map((pagante, index) => (
              <Grid item xs={12} key={pagante.id}>
                <Card variant="outlined" sx={{ mb: 1 }}>
                  <CardContent sx={{ pt: 2, pb: 2, "&:last-child": { pb: 2 } }}>
                    <Grid container spacing={2} alignItems="center">
                      {/* Nome do pagante */}
                      <Grid item xs={12} sm={2.5}>
                        <TextField
                          label="Nome"
                          variant="outlined"
                          size="small"
                          fullWidth
                          value={pagante.nome}
                          onChange={(e) => setPagantes(prev => {
                            const updated = [...prev];
                            updated[index].nome = e.target.value;
                            return updated;
                          })}
                        />
                      </Grid>
                      
                      {/* Valor ou porcentagem de acordo com o método selecionado */}
                      {divisaoMetodo === 'igual' && (
                        <Grid item xs={12} sm={2.5}>
                          <TextField
                            label="Valor"
                            variant="outlined"
                            size="small"
                            fullWidth
                            value={(totalConta / pagantes.length).toFixed(2)}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                              readOnly: true,
                            }}
                          />
                        </Grid>
                      )}
                      
                      {divisaoMetodo === 'porcentagem' && (
                        <Grid item xs={12} sm={2.5}>
                          <TextField
                            label="Porcentagem"
                            variant="outlined"
                            size="small"
                            type="number"
                            fullWidth
                            value={pagante.porcentagem}
                            onChange={(e) => setPagantes(prev => {
                              const updated = [...prev];
                              updated[index].porcentagem = parseFloat(e.target.value) || 0;
                              return updated;
                            })}
                            InputProps={{
                              endAdornment: <InputAdornment position="end">%</InputAdornment>
                            }}
                          />
                        </Grid>
                      )}
                      
                      {divisaoMetodo === 'itens' && (
                        <Grid item xs={12} sm={2.5}>
                          <Button
                            fullWidth
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              setEditPaganteIndex(index);
                              setOpenDivisaoDialog(true);
                            }}
                          >
                            Selecionar Itens
                          </Button>
                        </Grid>
                      )}
                      
                      {/* Valor calculado */}
                      <Grid item xs={6} sm={2.5}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Valor a pagar
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          R$ {
                            divisaoMetodo === 'igual' 
                              ? (totalConta / pagantes.length).toFixed(2) 
                              : divisaoMetodo === 'porcentagem' 
                                ? ((pagante.porcentagem / 100) * totalConta).toFixed(2)
                                : pagante.valor || '0.00'
                          }
                        </Typography>
                      </Grid>
                      
                      {/* Método de pagamento */}
                      <Grid item xs={6} sm={3}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Forma de Pagamento</InputLabel>
                          <Select
                            value={pagante.metodo}
                            onChange={(e) => setPagantes(prev => {
                              const updated = [...prev];
                              updated[index].metodo = e.target.value;
                              return updated;
                            })}
                            label="Forma de Pagamento"
                          >
                            {metodosPagamento.map(metodo => (
                              <MenuItem key={metodo.id} value={metodo.id}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  {metodo.icon}
                                  <Typography sx={{ ml: 1 }}>{metodo.nome}</Typography>
                                </Box>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      
                      {/* Ações */}
                      <Grid item xs={12} sm={1.5} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <IconButton 
                          color="error" 
                          size="small"
                          onClick={() => setPagantes(prev => prev.filter(p => p.id !== pagante.id))}
                          disabled={pagantes.length <= 1}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
        
        {/* Resumo da divisão */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Resumo da divisão
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" color="text.secondary">
                Valor total da conta
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                R$ {totalConta.toFixed(2)}
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" color="text.secondary">
                Valor total dividido
              </Typography>
              <Typography 
                variant="h6" 
                fontWeight="bold"
                color={
                  Math.abs(
                    totalConta - 
                    pagantes.reduce((sum, p) => {
                      const valorPagante = divisaoMetodo === 'igual' 
                        ? totalConta / pagantes.length
                        : divisaoMetodo === 'porcentagem'
                          ? (p.porcentagem / 100) * totalConta
                          : parseFloat(p.valor) || 0;
                      return sum + valorPagante;
                    }, 0)
                  ) > 0.01 ? 'error.main' : 'success.main'
                }
              >
                R$ {
                  pagantes.reduce((sum, p) => {
                    const valorPagante = divisaoMetodo === 'igual' 
                      ? totalConta / pagantes.length
                      : divisaoMetodo === 'porcentagem'
                        ? (p.porcentagem / 100) * totalConta
                        : parseFloat(p.valor) || 0;
                    return sum + valorPagante;
                  }, 0).toFixed(2)
                }
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" color="text.secondary">
                Diferença
              </Typography>
              <Typography 
                variant="h6" 
                fontWeight="bold"
                color={
                  Math.abs(
                    totalConta - 
                    pagantes.reduce((sum, p) => {
                      const valorPagante = divisaoMetodo === 'igual' 
                        ? totalConta / pagantes.length
                        : divisaoMetodo === 'porcentagem'
                          ? (p.porcentagem / 100) * totalConta
                          : parseFloat(p.valor) || 0;
                      return sum + valorPagante;
                    }, 0)
                  ) > 0.01 ? 'error.main' : 'success.main'
                }
              >
                R$ {
                  Math.abs(
                    totalConta - 
                    pagantes.reduce((sum, p) => {
                      const valorPagante = divisaoMetodo === 'igual' 
                        ? totalConta / pagantes.length
                        : divisaoMetodo === 'porcentagem'
                          ? (p.porcentagem / 100) * totalConta
                          : parseFloat(p.valor) || 0;
                      return sum + valorPagante;
                    }, 0)
                  ).toFixed(2)
                }
              </Typography>
            </Grid>
          </Grid>
        </Paper>
        
        {/* Botão para confirmar pagamento */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<PaymentIcon />}
            onClick={() => setOpenConfirmacaoDialog(true)}
            disabled={
              // Verificar se o total dividido corresponde ao total da conta
              Math.abs(
                totalConta - 
                pagantes.reduce((sum, p) => {
                  const valorPagante = divisaoMetodo === 'igual' 
                    ? totalConta / pagantes.length
                    : divisaoMetodo === 'porcentagem'
                      ? (p.porcentagem / 100) * totalConta
                      : parseFloat(p.valor) || 0;
                  return sum + valorPagante;
                }, 0)
              ) > 0.01
            }
          >
            Confirmar Pagamento Dividido
          </Button>
        </Box>
      </Box>
    );
  };

  // Continuar com o resto da implementação...
  // Este é apenas o início do componente Payment.js
  
  // Renderizar o componente
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 2, pb: 7 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton 
          edge="start" 
          sx={{ mr: 1 }}
          onClick={() => navigate(`/tables/${mesaId}`)}
        >
          <ArrowBackIcon />
        </IconButton>
        
        <Typography variant="h6" component="h1">
          Pagamento - Mesa {mesa?.numero}
        </Typography>
        
        <Chip 
          label={`${mesa?.ocupacaoAtual?.clientes || 0} pessoas`}
          size="small"
          icon={<PersonIcon />}
          sx={{ ml: 1 }}
        />
      </Box>
      
      {/* Tabs de navegação */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab 
            label="Pagamento Total" 
            icon={<PaymentIcon />} 
            iconPosition="start" 
          />
          <Tab 
            label="Pagamento Parcial" 
            icon={<ReceiptIcon />} 
            iconPosition="start" 
          />
          <Tab 
            label="Divisão da Conta" 
            icon={<GroupIcon />} 
            iconPosition="start" 
          />
        </Tabs>
      </Paper>
      
      {/* Conteúdo com base na tab ativa */}
      {activeTab === 0 && renderPagamentoTotalTab()}
      {activeTab === 1 && (
        <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>
          Implementação do pagamento parcial será adicionada em breve...
        </Typography>
      )}
      {activeTab === 2 && renderDivisaoContaTab()}
      
      {/* Diálogo de confirmação de pagamento */}
      <Dialog
        open={openConfirmacaoDialog}
        onClose={() => !processando && setOpenConfirmacaoDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Confirmar Pagamento
        </DialogTitle>
        
        <DialogContent dividers>
          <Typography variant="body1" paragraph>
            Confirme os detalhes do pagamento:
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Valor Total
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                R$ {calcularTotal().toFixed(2)}
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={() => setOpenConfirmacaoDialog(false)}
            disabled={processando}
          >
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={processando ? <CircularProgress size={20} color="inherit" /> : <CheckIcon />}
            disabled={processando}
            onClick={() => {
              if (activeTab === 0) {
                processarPagamento('total');
              } else if (activeTab === 2) {
                processarPagamento('dividido');
              }
            }}
          >
            {processando ? 'Processando...' : 'Confirmar Pagamento'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo para seleção de itens na divisão por itens */}
      <Dialog
        open={openDivisaoDialog}
        onClose={() => setOpenDivisaoDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Selecionar Itens para {pagantes[editPaganteIndex]?.nome || 'Cliente'}
        </DialogTitle>
        
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" paragraph>
            Selecione os itens que serão pagos por este cliente. Os itens já atribuídos a outros clientes aparecerão desabilitados.
          </Typography>
          
          {pedidos.length === 0 ? (
            <Typography variant="body1" align="center" sx={{ my: 3 }}>
              Nenhum pedido disponível para divisão.
            </Typography>
          ) : (
            <List sx={{ width: '100%' }}>
              {pedidos.map(pedido => (
                <React.Fragment key={pedido._id}>
                  <Typography variant="subtitle2" sx={{ mt: 2, ml: 1 }}>
                    Pedido #{pedido.numeroPedido || pedido._id.substr(-4)}
                  </Typography>
                  
                  {pedido.itens.map(item => {
                    // Para cada item, verificar se já está atribuído a algum pagante
                    const itemKey = `${pedido._id}_${item._id}`;
                    const atribuidoA = selectedItems[itemKey];
                    const atribuidoAEste = atribuidoA === editPaganteIndex;
                    const atribuidoAOutro = atribuidoA !== null && atribuidoA !== editPaganteIndex;
                    const nomePagante = atribuidoAOutro ? pagantes[atribuidoA]?.nome : null;
                    
                    return (
                      <ListItem
                        key={item._id}
                        divider
                        secondaryAction={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {atribuidoAOutro && (
                              <Chip 
                                label={`Atribuído a ${nomePagante}`}
                                size="small"
                                color="primary"
                                sx={{ mr: 1 }}
                              />
                            )}
                            <Checkbox
                              edge="end"
                              checked={atribuidoAEste}
                              disabled={atribuidoAOutro}
                              onChange={() => {
                                // Atribuir/desatribuir item
                                const newSelectedItems = { ...selectedItems };
                                
                                if (atribuidoAEste) {
                                  // Desatribuir
                                  newSelectedItems[itemKey] = null;
                                  
                                  // Remover da lista de itens do pagante
                                  const paganteAtualizado = { ...pagantes[editPaganteIndex] };
                                  paganteAtualizado.items = paganteAtualizado.items.filter(
                                    i => !(i.pedidoId === pedido._id && i.itemId === item._id)
                                  );
                                  
                                  const novosPagantes = [...pagantes];
                                  novosPagantes[editPaganteIndex] = paganteAtualizado;
                                  setPagantes(novosPagantes);
                                } else {
                                  // Atribuir ao pagante atual
                                  newSelectedItems[itemKey] = editPaganteIndex;
                                  
                                  // Adicionar à lista de itens do pagante
                                  const paganteAtualizado = { ...pagantes[editPaganteIndex] };
                                  paganteAtualizado.items.push({
                                    pedidoId: pedido._id,
                                    itemId: item._id
                                  });
                                  
                                  const novosPagantes = [...pagantes];
                                  novosPagantes[editPaganteIndex] = paganteAtualizado;
                                  setPagantes(novosPagantes);
                                }
                                
                                setSelectedItems(newSelectedItems);
                              }}
                            />
                          </Box>
                        }
                      >
                        <ListItemIcon>
                          <ReceiptIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={item.nome || `Item #${item._id.substr(-4)}`}
                          secondary={
                            <React.Fragment>
                              <Typography variant="body2" component="span">
                                {item.quantidade}x R$ {item.preco.toFixed(2)}
                              </Typography>
                              <br />
                              <Typography variant="body2" component="span" color="text.secondary">
                                Total: R$ {(item.quantidade * item.preco).toFixed(2)}
                              </Typography>
                            </React.Fragment>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setOpenDivisaoDialog(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={() => {
              // Calcular o valor total dos itens selecionados
              let valorTotal = 0;
              const pagante = pagantes[editPaganteIndex];
              
              pagante.items.forEach(item => {
                // Encontrar o pedido e o item
                const pedido = pedidos.find(p => p._id === item.pedidoId);
                if (pedido) {
                  const pedidoItem = pedido.itens.find(i => i._id === item.itemId);
                  if (pedidoItem) {
                    valorTotal += pedidoItem.preco * pedidoItem.quantidade;
                  }
                }
              });
              
              // Atualizar o valor do pagante
              const novosPagantes = [...pagantes];
              novosPagantes[editPaganteIndex].valor = valorTotal.toFixed(2);
              setPagantes(novosPagantes);
              
              setOpenDivisaoDialog(false);
            }}
            variant="contained"
            color="primary"
          >
            Confirmar Seleção
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo de sucesso no pagamento */}
      <Dialog
        open={sucessoPagamento && !openComprovante}
        onClose={() => navigate('/payment-history')}
      >
        <DialogTitle>Pagamento Realizado</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            O pagamento foi processado com sucesso!
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenComprovante(true)} 
            color="primary"
            variant="outlined"
          >
            Gerar Comprovante
          </Button>
          <Button 
            onClick={() => navigate('/payment-history')} 
            color="primary"
            variant="contained"
            autoFocus
          >
            Ver Histórico de Pagamentos
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Componente de Comprovante */}
      <ComprovantePagamento
        open={openComprovante}
        onClose={() => {
          setOpenComprovante(false);
          navigate('/payment-history');
        }}
        pedidoId={pedidoPagoId}
        mesaId={mesaId}
      />
      
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

export default Payment;
