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
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  TextField,
  InputAdornment,
  Tooltip,
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

function PaymentHistory() {
  const navigate = useNavigate();
  
  // Estado para armazenar o histórico de pagamentos
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Estado para paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
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
  
  // Função para buscar os dados do histórico de pagamentos
  const fetchPaymentHistory = async () => {
    setLoading(true);
    try {
      // Usar a mesma rota de API que a página de usuário usa
      const response = await api.get('/api/pedidos?status=pago&populate=usuarioPagamento,garcom,mesa&excluidoDaLista=false&agruparPorMesa=true');
      
      if (response.data.success) {
        const paymentsData = response.data.data.filter(payment => !payment.excluidoDaLista);
        setPayments(paymentsData);
      } else {
        throw new Error(response.data.message || 'Erro ao carregar histórico de pagamentos');
      }
    } catch (error) {
      console.error('Erro ao buscar histórico de pagamentos:', error);
      showSnackbar('Erro ao carregar histórico de pagamentos', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Funções para paginação
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Função para formatar a data
  const formatDate = (dateString) => {
    if (!dateString) return 'N/D';
    try {
      const date = new Date(dateString);
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (error) {
      return 'Data inválida';
    }
  };
  
  // Função para formatar o valor monetário
  const formatCurrency = (value) => {
    if (value === undefined || value === null) return 'R$ 0,00';
    return `R$ ${Number(value).toFixed(2)}`;
  };
  
  // Função para renderizar o nome do garçom de forma mais robusta
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
  
  // Filtragem dos pagamentos com base na pesquisa
  const filteredPayments = payments.filter(payment => {
    const searchLower = searchQuery.toLowerCase();
    
    // Verificar se o ID da mesa (se existir) corresponde à pesquisa
    const mesaMatch = payment.mesa && payment.mesa.numero && 
      payment.mesa.numero.toString().includes(searchLower);
    
    // Verificar se o nome do garçom (se existir) corresponde à pesquisa
    const garcomMatch = payment.garcom && payment.garcom.nome && 
      payment.garcom.nome.toLowerCase().includes(searchLower);
    
    // Verificar se o método de pagamento (se existir) corresponde à pesquisa
    const metodoMatch = payment.metodoPagamento && 
      payment.metodoPagamento.toLowerCase().includes(searchLower);
    
    // Verificar se a data (se existir) corresponde à pesquisa
    const dataMatch = payment.dataPagamento && 
      formatDate(payment.dataPagamento).toLowerCase().includes(searchLower);
    
    // Verificar se o ID do pagamento corresponde à pesquisa
    const idMatch = payment._id && payment._id.toLowerCase().includes(searchLower);
    
    return mesaMatch || garcomMatch || metodoMatch || dataMatch || idMatch;
  });
  
  // Ordenar pagamentos do mais recente para o mais antigo
  const sortedPayments = [...filteredPayments].sort((a, b) => {
    const dateA = a.dataPagamento ? new Date(a.dataPagamento) : new Date(0);
    const dateB = b.dataPagamento ? new Date(b.dataPagamento) : new Date(0);
    return dateB - dateA;
  });
  
  // Paginar os resultados
  const paginatedPayments = sortedPayments.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );
  
  // Função para abrir diálogo de exclusão
  const handleDeleteClick = (paymentId) => {
    setDeleteDialog({
      open: true,
      paymentId,
      loading: false
    });
  };
  
  // Função para fechar diálogo de exclusão
  const handleDeleteDialogClose = () => {
    setDeleteDialog({
      ...deleteDialog,
      open: false
    });
  };
  
  // Função para confirmar exclusão
  const handleConfirmDelete = async () => {
    try {
      setDeleteDialog(prev => ({
        ...prev,
        loading: true
      }));
      
      // Corrigido o endpoint para usar o mesmo que o componente do usuário
      const response = await api.delete(`/api/pedidos/${deleteDialog.paymentId}/excluir-registro`);
      
      if (response.data.success) {
        showSnackbar('Registro removido com sucesso', 'success');
        fetchPaymentHistory(); // Recarregar dados
      } else {
        throw new Error(response.data.message || 'Erro ao remover registro');
      }
      
      setDeleteDialog({
        open: false,
        paymentId: null,
        loading: false
      });
    } catch (error) {
      console.error('Erro ao excluir registro:', error);
      showSnackbar(
        error.response?.data?.message || error.message || 'Erro ao excluir registro',
        'error'
      );
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
  
  const handleSnackbarClose = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Histórico de Pagamentos
        </Typography>
        
        <TextField
          placeholder="Pesquisar..."
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: '250px' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      
      <Paper sx={{ width: '100%', overflow: 'hidden', mb: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : paginatedPayments.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              {searchQuery ? 'Nenhum resultado encontrado para a pesquisa.' : 'Nenhum pagamento registrado.'}
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 440 }}>
            <Table stickyHeader aria-label="tabela de histórico de pagamentos">
              <TableHead>
                <TableRow>
                  <TableCell>Data/Hora</TableCell>
                  <TableCell>Mesa</TableCell>
                  <TableCell>Garçom</TableCell>
                  <TableCell>Valor Total</TableCell>
                  <TableCell>Método</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedPayments.map((payment) => (
                  <TableRow key={payment._id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <EventIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        {formatDate(payment.dataPagamento)}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TableIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                        {payment.mesa ? `Mesa ${payment.mesa.numero}` : 'N/D'}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <BadgeIcon fontSize="small" sx={{ mr: 1, color: 'secondary.main' }} />
                        {renderGarcomName(payment)}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PaymentIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} />
                        {payment.incluirTaxaServico ? 
                          formatCurrency(payment.valorTotal + (payment.taxaServico || 0)) : 
                          formatCurrency(payment.valorTotal)
                        }
                      </Box>
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
              </TableBody>
            </Table>
          </TableContainer>
        )}
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredPayments.length}
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
          <Button 
            onClick={handleDeleteDialogClose}
            startIcon={<CancelIcon />}
            disabled={deleteDialog.loading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            startIcon={deleteDialog.loading ? <CircularProgress size={24} /> : <DeleteIcon />}
            disabled={deleteDialog.loading}
          >
            {deleteDialog.loading ? 'Excluindo...' : 'Excluir'}
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
        autoHideDuration={5000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default PaymentHistory;
