import React, { useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip,
  Alert,
  useTheme
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  MoneyOff as MoneyOffIcon,
  North as ArrowUpIcon,
  South as ArrowDownIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  AccountBalance as AccountIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import api from '../../services/api';

const CaixaAtual = ({ caixa, onCaixaUpdated, loading }) => {
  const theme = useTheme();
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [dialogData, setDialogData] = useState({
    valor: '',
    motivo: '',
    observacoes: ''
  });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  
  // Verificar se há caixa aberto
  const caixaAberto = caixa && caixa.status === 'aberto';
  
  // Calcular valor atual em caixa (aproximado)
  const calcularValorAtual = () => {
    if (!caixaAberto) return 0;
    
    const valorInicial = caixa.valorInicial || 0;
    const vendas = caixa.vendas?.total || 0;
    const sangrias = caixa.sangrias?.reduce((total, s) => total + s.valor, 0) || 0;
    const reforcos = caixa.reforcos?.reduce((total, r) => total + r.valor, 0) || 0;
    
    return valorInicial + vendas - sangrias + reforcos;
  };
  
  // Abrir diálogo com o tipo especificado
  const handleOpenDialog = (type) => {
    setDialogType(type);
    setDialogData({
      valor: '',
      motivo: '',
      observacoes: ''
    });
    setError('');
    setOpenDialog(true);
  };
  
  // Fechar diálogo
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };
  
  // Atualizar dados do diálogo
  const handleDialogChange = (e) => {
    setDialogData({
      ...dialogData,
      [e.target.name]: e.target.value
    });
  };
  
  // Confirmar ação do diálogo
  const handleConfirmDialog = async () => {
    setError('');
    setProcessing(true);
    
    try {
      let response;
      
      switch (dialogType) {
        case 'abrir':
          if (!dialogData.valor || parseFloat(dialogData.valor) < 0) {
            setError('Informe um valor inicial válido');
            setProcessing(false);
            return;
          }
          
          response = await api.post('/api/caixa/abrir', {
            valorInicial: parseFloat(dialogData.valor),
            observacoes: dialogData.observacoes
          });
          break;
          
        case 'fechar':
          if (!dialogData.valor || parseFloat(dialogData.valor) < 0) {
            setError('Informe o valor em caixa válido');
            setProcessing(false);
            return;
          }
          
          response = await api.put('/api/caixa/fechar', {
            valorFinal: parseFloat(dialogData.valor),
            observacoes: dialogData.observacoes
          });
          break;
          
        case 'sangria':
          if (!dialogData.valor || parseFloat(dialogData.valor) <= 0) {
            setError('Informe um valor válido para a sangria');
            setProcessing(false);
            return;
          }
          
          if (!dialogData.motivo) {
            setError('Informe o motivo da sangria');
            setProcessing(false);
            return;
          }
          
          response = await api.post('/api/caixa/sangria', {
            valor: parseFloat(dialogData.valor),
            motivo: dialogData.motivo
          });
          break;
          
        case 'reforco':
          if (!dialogData.valor || parseFloat(dialogData.valor) <= 0) {
            setError('Informe um valor válido para o reforço');
            setProcessing(false);
            return;
          }
          
          if (!dialogData.motivo) {
            setError('Informe o motivo do reforço');
            setProcessing(false);
            return;
          }
          
          response = await api.post('/api/caixa/reforco', {
            valor: parseFloat(dialogData.valor),
            motivo: dialogData.motivo
          });
          break;
          
        default:
          break;
      }
      
      if (response && response.data.success) {
        handleCloseDialog();
        onCaixaUpdated();
      }
    } catch (error) {
      console.error(`Erro ao ${dialogType} caixa:`, error);
      setError(error.response?.data?.message || `Erro ao ${dialogType} caixa`);
    } finally {
      setProcessing(false);
    }
  };
  
  // Renderizar diálogo com base no tipo
  const renderDialog = () => {
    let title = '';
    let confirmLabel = '';
    let icon = null;
    
    switch (dialogType) {
      case 'abrir':
        title = 'Abrir Caixa';
        confirmLabel = 'Abrir';
        icon = <MoneyIcon color="primary" />;
        break;
        
      case 'fechar':
        title = 'Fechar Caixa';
        confirmLabel = 'Fechar';
        icon = <MoneyOffIcon color="error" />;
        break;
        
      case 'sangria':
        title = 'Realizar Sangria';
        confirmLabel = 'Confirmar';
        icon = <ArrowDownIcon color="warning" />;
        break;
        
      case 'reforco':
        title = 'Realizar Reforço';
        confirmLabel = 'Confirmar';
        icon = <ArrowUpIcon color="success" />;
        break;
        
      default:
        return null;
    }
    
    return (
      <Dialog
        open={openDialog}
        onClose={!processing ? handleCloseDialog : undefined}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          {icon && <Box sx={{ mr: 1 }}>{icon}</Box>}
          {title}
        </DialogTitle>
        
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label={dialogType === 'abrir' ? 'Valor Inicial' : 
                      dialogType === 'fechar' ? 'Valor em Caixa' : 
                      'Valor'}
                type="number"
                name="valor"
                value={dialogData.valor}
                onChange={handleDialogChange}
                fullWidth
                required
                inputProps={{ step: '0.01' }}
              />
            </Grid>
            
            {(dialogType === 'sangria' || dialogType === 'reforco') && (
              <Grid item xs={12}>
                <TextField
                  label="Motivo"
                  name="motivo"
                  value={dialogData.motivo}
                  onChange={handleDialogChange}
                  fullWidth
                  required
                />
              </Grid>
            )}
            
            <Grid item xs={12}>
              <TextField
                label="Observações"
                name="observacoes"
                value={dialogData.observacoes}
                onChange={handleDialogChange}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={handleCloseDialog}
            disabled={processing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmDialog}
            variant="contained"
            color="primary"
            disabled={processing}
            startIcon={processing ? <CircularProgress size={20} /> : null}
          >
            {processing ? 'Processando...' : confirmLabel}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Componente quando não há caixa aberto
  const renderNoCaixa = () => (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <Box sx={{ mb: 2 }}>
        <MoneyOffIcon sx={{ fontSize: 60, color: 'text.secondary' }} />
      </Box>
      
      <Typography variant="h5" color="text.secondary" gutterBottom>
        Não há caixa aberto no momento
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Para iniciar as operações, é necessário abrir um novo caixa
      </Typography>
      
      <Button
        variant="contained"
        color="primary"
        startIcon={<MoneyIcon />}
        onClick={() => handleOpenDialog('abrir')}
        disabled={loading}
        size="large"
      >
        Abrir Caixa
      </Button>
    </Box>
  );
  
  // Componente para exibir caixa aberto
  const renderCaixaAberto = () => {
    // Formatar data de abertura
    const dataAbertura = caixa.dataAbertura 
      ? format(new Date(caixa.dataAbertura), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
      : 'Data não disponível';
    
    // Calcular duração
    const calcularDuracao = () => {
      if (!caixa.dataAbertura) return 'Indisponível';
      
      const inicio = new Date(caixa.dataAbertura);
      const agora = new Date();
      const diff = Math.floor((agora - inicio) / (1000 * 60 * 60));
      
      if (diff < 1) {
        return 'Menos de 1 hora';
      } else if (diff === 1) {
        return '1 hora';
      } else {
        return `${diff} horas`;
      }
    };
    
    return (
      <Box>
        <Grid container spacing={3}>
          {/* Card de status */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                      <Typography variant="h6">
                        Caixa Aberto
                      </Typography>
                      <Chip 
                        label="Ativo" 
                        color="success" 
                        size="small" 
                        sx={{ ml: 1 }}
                      />
                    </Box>
                    
                    <Divider sx={{ mb: 2 }} />
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Aberto em
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {dataAbertura}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Duração
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {calcularDuracao()}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Responsável
                    </Typography>
                    <Typography variant="body1">
                      {caixa.responsavelAbertura?.nome || 'Não especificado'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Card de valores */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AccountIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Balanço Atual
                  </Typography>
                </Box>
                
                <Divider sx={{ mb: 2 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Valor Inicial
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      R$ {caixa.valorInicial?.toFixed(2) || '0.00'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Vendas
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      R$ {caixa.vendas?.total?.toFixed(2) || '0.00'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Sangrias
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      R$ {caixa.sangrias?.reduce((total, s) => total + s.valor, 0)?.toFixed(2) || '0.00'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Reforços
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      R$ {caixa.reforcos?.reduce((total, r) => total + r.valor, 0)?.toFixed(2) || '0.00'}
                    </Typography>
                  </Grid>
                </Grid>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Valor Atual Estimado
                </Typography>
                <Typography variant="h5" color="primary">
                  R$ {calcularValorAtual().toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Resumo de pagamentos */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Resumo de Pagamentos
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4} lg={2}>
                    <Paper 
                      elevation={0}
                      sx={{ 
                        p: 2, 
                        textAlign: 'center',
                        bgcolor: 'success.light',
                        color: 'success.contrastText'
                      }}
                    >
                      <Typography variant="body2" gutterBottom>
                        Dinheiro
                      </Typography>
                      <Typography variant="h6">
                        R$ {caixa.pagamentos?.dinheiro?.toFixed(2) || '0.00'}
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4} lg={2}>
                    <Paper 
                      elevation={0}
                      sx={{ 
                        p: 2, 
                        textAlign: 'center',
                        bgcolor: 'primary.light',
                        color: 'primary.contrastText'
                      }}
                    >
                      <Typography variant="body2" gutterBottom>
                        Crédito
                      </Typography>
                      <Typography variant="h6">
                        R$ {caixa.pagamentos?.credito?.toFixed(2) || '0.00'}
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4} lg={2}>
                    <Paper 
                      elevation={0}
                      sx={{ 
                        p: 2, 
                        textAlign: 'center',
                        bgcolor: 'info.light',
                        color: 'info.contrastText'
                      }}
                    >
                      <Typography variant="body2" gutterBottom>
                        Débito
                      </Typography>
                      <Typography variant="h6">
                        R$ {caixa.pagamentos?.debito?.toFixed(2) || '0.00'}
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4} lg={2}>
                    <Paper 
                      elevation={0}
                      sx={{ 
                        p: 2, 
                        textAlign: 'center',
                        bgcolor: 'warning.light',
                        color: 'warning.contrastText'
                      }}
                    >
                      <Typography variant="body2" gutterBottom>
                        PIX
                      </Typography>
                      <Typography variant="h6">
                        R$ {caixa.pagamentos?.pix?.toFixed(2) || '0.00'}
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4} lg={2}>
                    <Paper 
                      elevation={0}
                      sx={{ 
                        p: 2, 
                        textAlign: 'center',
                        bgcolor: 'secondary.light',
                        color: 'secondary.contrastText'
                      }}
                    >
                      <Typography variant="body2" gutterBottom>
                        Vale
                      </Typography>
                      <Typography variant="h6">
                        R$ {caixa.pagamentos?.vale?.toFixed(2) || '0.00'}
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4} lg={2}>
                    <Paper 
                      elevation={0}
                      sx={{ 
                        p: 2, 
                        textAlign: 'center',
                        bgcolor: 'grey.300',
                        color: 'text.primary'
                      }}
                    >
                      <Typography variant="body2" gutterBottom>
                        Outros
                      </Typography>
                      <Typography variant="h6">
                        R$ {caixa.pagamentos?.outros?.toFixed(2) || '0.00'}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Ações para caixa aberto */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Ações Disponíveis
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<MoneyOffIcon />}
                  onClick={() => handleOpenDialog('fechar')}
                >
                  Fechar Caixa
                </Button>
                
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<ArrowDownIcon />}
                  onClick={() => handleOpenDialog('sangria')}
                >
                  Sangria
                </Button>
                
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<ArrowUpIcon />}
                  onClick={() => handleOpenDialog('reforco')}
                >
                  Reforço de Caixa
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Renderizar conteúdo com base no estado do caixa */}
      {caixaAberto ? renderCaixaAberto() : renderNoCaixa()}
      
      {/* Diálogo para ações de caixa */}
      {renderDialog()}
    </Box>
  );
};

export default CaixaAtual;
