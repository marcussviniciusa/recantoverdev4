import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Chip,
  CircularProgress,
  IconButton,
  Card,
  CardContent,
  Grid,
  Divider,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Tooltip,
  Avatar,
  Snackbar,
  Alert
} from '@mui/material';
import {
  MonetizationOn as PaymentIcon,
  Person as PersonIcon,
  Event as EventIcon,
  Search as SearchIcon,
  TableBar as TableIcon,
  Receipt as ReceiptIcon,
  Delete as DeleteIcon,
  Cancel as CancelIcon,
  RestaurantRounded as RestaurantIcon,
  Badge as BadgeIcon,
  WhatsApp as WhatsAppIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const PaymentHistory = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPayments, setTotalPayments] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPayments, setFilteredPayments] = useState([]);
  
  // Estado para diálogo de confirmação de exclusão
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    paymentId: null,
    loading: false
  });

  // Estado para o diálogo de envio de comprovante por WhatsApp
  const [whatsappDialog, setWhatsappDialog] = useState({
    open: false,
    paymentId: null,
    telefone: '',
    loading: false
  });

  // Buscar histórico de pagamentos
  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  // Filtrar pagamentos com base no termo de busca
  useEffect(() => {
    if (payments.length > 0) {
      if (!searchTerm) {
        setFilteredPayments(payments);
        setTotalPayments(payments.length);
      } else {
        const lowercaseSearch = searchTerm.toLowerCase();
        const filtered = payments.filter(payment => 
          payment.mesa?.numero?.toString().includes(lowercaseSearch) ||
          payment.garcom?.nome?.toLowerCase().includes(lowercaseSearch) ||
          payment.valorTotal?.toString().includes(lowercaseSearch) ||
          format(new Date(payment.dataCriacao), 'dd/MM/yyyy HH:mm').includes(lowercaseSearch)
        );
        setFilteredPayments(filtered);
        setTotalPayments(filtered.length);
      }
    }
  }, [searchTerm, payments]);

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      // Buscar todos os pedidos pagos com população dos dados do usuário que finalizou o pagamento
      // e filtrar apenas os registros que não foram excluídos da lista
      // também agrupa pagamentos por mesa para evitar múltiplos registros da mesma mesa
      const response = await api.get('/api/pedidos?status=pago&populate=usuarioPagamento,garcom,mesa&excluidoDaLista=false&agruparPorMesa=true');
      
      if (response.data.success) {
        const paymentsData = response.data.data.filter(payment => !payment.excluidoDaLista);
        console.log('Dados de pagamentos agrupados por mesa:', paymentsData);
        
        // Log para verificar se os dados do garçom estão vindo corretamente
        paymentsData.forEach(payment => {
          console.log(`Pedido ${payment._id} - Garçom:`, payment.garcom);
        });
        
        setPayments(paymentsData);
        setFilteredPayments(paymentsData);
        setTotalPayments(paymentsData.length);
      }
    } catch (error) {
      console.error('Erro ao buscar histórico de pagamentos:', error);
      showSnackbar('Erro ao carregar histórico de pagamentos', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Função para abrir diálogo de confirmação de exclusão
  const handleDeleteClick = (paymentId) => {
    setDeleteDialog({
      open: true,
      paymentId,
      loading: false
    });
  };
  
  // Função para fechar diálogo de confirmação
  const handleDeleteDialogClose = () => {
    setDeleteDialog({
      ...deleteDialog,
      open: false
    });
  };
  
  // Função para excluir registro da lista (sem afetar o estado da mesa)
  const handleCancelPayment = async () => {
    try {
      setDeleteDialog(prev => ({
        ...prev,
        loading: true
      }));
      
      // Chama a API para excluir o registro da lista (sem afetar o estado da mesa)
      const response = await api.delete(`/api/pedidos/${deleteDialog.paymentId}/excluir-registro`);
      
      // Recarrega a lista de pagamentos
      fetchPaymentHistory();
      
      // Fecha o diálogo
      setDeleteDialog({
        open: false,
        paymentId: null,
        reason: '',
        loading: false
      });
      
      // Exibe mensagem de sucesso
      showSnackbar('Registro excluído da lista com sucesso', 'success');
    } catch (error) {
      console.error('Erro ao excluir registro:', error);
      showSnackbar(
        error.response?.data?.message || error.message || 'Erro ao excluir registro da lista',
        'error'
      );
    } finally {
      setDeleteDialog(prev => ({
        ...prev,
        loading: false
      }));
    }
  };
  
  // Função para abrir diálogo de envio por WhatsApp
  const handleWhatsAppClick = (paymentId) => {
    setWhatsappDialog({
      open: true,
      paymentId,
      telefone: '',
      loading: false
    });
  };
  
  // Função para fechar diálogo de WhatsApp
  const handleWhatsAppDialogClose = () => {
    setWhatsappDialog({
      ...whatsappDialog,
      open: false
    });
  };
  
  // Função para enviar comprovante por WhatsApp
  const handleSendWhatsApp = async () => {
    try {
      setWhatsappDialog(prev => ({
        ...prev,
        loading: true
      }));
      
      // Formatando o telefone
      const telefone = whatsappDialog.telefone.replace(/\D/g, '');
      
      // Validação básica do telefone
      if (!telefone || telefone.length < 10) {
        showSnackbar('Por favor, insira um número de telefone válido', 'error');
        setWhatsappDialog(prev => ({
          ...prev,
          loading: false
        }));
        return;
      }
      
      // Chama a API para enviar o comprovante
      const response = await api.post('/api/comprovantes/enviar-whatsapp', {
        pedidoId: whatsappDialog.paymentId,
        telefone: telefone,
        dadosAdicionais: {
          cliente: { 
            nome: 'Cliente', 
            telefone: telefone 
          }
        }
      });
      
      // Fecha o diálogo
      setWhatsappDialog({
        open: false,
        paymentId: null,
        telefone: '',
        loading: false
      });
      
      // Exibe mensagem de sucesso
      if (response.data.success) {
        showSnackbar('Comprovante enviado com sucesso', 'success');
      } else {
        throw new Error(response.data.message || 'Erro ao enviar comprovante');
      }
    } catch (error) {
      console.error('Erro ao enviar comprovante por WhatsApp:', error);
      showSnackbar(
        error.response?.data?.message || error.message || 'Erro ao enviar comprovante',
        'error'
      );
    } finally {
      setWhatsappDialog(prev => ({
        ...prev,
        loading: false
      }));
    }
  };
  
  // Exibir snackbar com mensagem
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };
  
  // Fechar snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (error) {
      return dateString || 'Data indisponível';
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const renderGarcomName = (payment) => {
    // Lógica revisada para mostrar informações de responsabilidade
    if (payment && payment.garcom && payment.garcom.nome) {
      return payment.garcom.nome;
    } else if (payment && payment.usuarioPagamento && payment.usuarioPagamento.nome) {
      // Se não houver garçom, mas houver usuário de pagamento, usa este
      return `${payment.usuarioPagamento.nome} (Pagamento)`;
    } else if (payment && payment.dataCriacao) {
      // Se mesmo assim não houver informações, mostra pelo menos quando foi feito
      return `Atendente (${formatDate(payment.dataCriacao).split(' às')[0]})`;
    } else {
      return 'Não informado';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 120px)' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom component="h1" sx={{ mb: 3 }}>
        Histórico de Pagamentos
      </Typography>

      {/* Estatísticas e filtros */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PaymentIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total de Pagamentos
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {totalPayments}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Buscar por mesa, garçom ou data..."
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabela de pagamentos */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>ID do Pedido</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TableIcon sx={{ mr: 1, fontSize: 18 }} />
                    Mesa
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PersonIcon sx={{ mr: 1, fontSize: 18 }} />
                    Garçom
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PersonIcon sx={{ mr: 1, fontSize: 18 }} />
                    Finalizado por
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <EventIcon sx={{ mr: 1, fontSize: 18 }} />
                    Data
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PaymentIcon sx={{ mr: 1, fontSize: 18 }} />
                    Valor
                  </Box>
                </TableCell>
                <TableCell>Método</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPayments
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((payment) => (
                  <TableRow key={payment._id} hover>
                    <TableCell>{payment._id.substring(payment._id.length - 6)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Chip
                          size="small"
                          label={`Mesa ${payment.mesa?.numero || 'N/D'}`}
                          color="primary"
                          variant="outlined"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Tooltip title="Garçom que atendeu a mesa">
                          <Avatar 
                            sx={{ width: 24, height: 24, mr: 1, bgcolor: 'primary.main' }}
                          >
                            <RestaurantIcon sx={{ fontSize: 14 }} />
                          </Avatar>
                        </Tooltip>
                        <Typography variant="body2" fontWeight="medium" color="primary.main">
                          {renderGarcomName(payment)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Tooltip title="Usuário que finalizou o pagamento">
                          <Avatar 
                            sx={{ width: 24, height: 24, mr: 1, bgcolor: 'secondary.main' }}
                          >
                            <BadgeIcon sx={{ fontSize: 14 }} />
                          </Avatar>
                        </Tooltip>
                        <Typography variant="body2">
                          {payment.usuarioPagamento?.nome || currentUser?.nome || 'N/D'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{formatDate(payment.dataPagamento || payment.dataCriacao)}</TableCell>
                    <TableCell>
                      {payment.taxaServico > 0 ? (
                        <Tooltip title={`Inclui ${formatCurrency(payment.taxaServico)} de taxa de serviço`}>
                          <Box>
                            {formatCurrency(payment.valorFinal || (payment.valorTotal + payment.taxaServico))}
                          </Box>
                        </Tooltip>
                      ) : (
                        formatCurrency(payment.valorTotal)
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={payment.metodoPagamento || 'N/D'}
                        color={
                          payment.metodoPagamento === 'dinheiro' ? 'success' :
                          payment.metodoPagamento?.includes('credito') ? 'info' :
                          payment.metodoPagamento?.includes('debito') ? 'primary' :
                          payment.metodoPagamento?.includes('pix') ? 'secondary' : 'default'
                        }
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Tooltip title="Enviar comprovante via WhatsApp">
                          <IconButton 
                            color="primary" 
                            size="small" 
                            onClick={() => handleWhatsAppClick(payment._id)}
                            sx={{ mr: 1 }}
                          >
                            <WhatsAppIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir da lista">
                          <IconButton 
                            color="error" 
                            size="small" 
                            onClick={() => handleDeleteClick(payment._id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              
              {filteredPayments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <ReceiptIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="body1" color="text.secondary">
                        Nenhum pagamento encontrado
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalPayments}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Itens por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </Paper>

      {/* Diálogo de confirmação de exclusão */}
      <Dialog 
        open={deleteDialog.open} 
        onClose={handleDeleteDialogClose}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Excluir registro da lista</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja excluir este registro da lista de histórico? Esta ação não altera o status da mesa ou do pagamento, apenas esconde o registro desta visualização.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose} color="primary">
            Não
          </Button>
          <Button 
            onClick={handleCancelPayment} 
            color="error" 
            variant="contained"
            disabled={deleteDialog.loading}
            startIcon={deleteDialog.loading ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {deleteDialog.loading ? 'Excluindo...' : 'Sim, excluir'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para envio de comprovante por WhatsApp */}
      <Dialog 
        open={whatsappDialog.open} 
        onClose={handleWhatsAppDialogClose}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Enviar Comprovante por WhatsApp</DialogTitle>
        
        <DialogContent>
          <DialogContentText>
            Digite o número de telefone para enviar o comprovante:
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Telefone (com DDD)"
            type="tel"
            fullWidth
            variant="outlined"
            value={whatsappDialog.telefone}
            onChange={(e) => setWhatsappDialog(prev => ({
              ...prev,
              telefone: e.target.value
            }))}
            placeholder="(00) 00000-0000"
            sx={{ mt: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <WhatsAppIcon color="success" />
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={handleWhatsAppDialogClose} 
            disabled={whatsappDialog.loading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSendWhatsApp}
            variant="contained" 
            color="primary"
            disabled={whatsappDialog.loading}
            startIcon={whatsappDialog.loading ? <CircularProgress size={24} /> : <WhatsAppIcon />}
          >
            Enviar
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
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PaymentHistory;
