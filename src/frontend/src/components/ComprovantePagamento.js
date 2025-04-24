import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Divider,
  Tooltip,
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  Print as PrintIcon,
  WhatsApp as WhatsAppIcon,
  FileCopy as FileIcon,
  Close as CloseIcon,
  Send as SendIcon,
  ContactPhone as ContactIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import api from '../services/api';
import { IMaskInput } from 'react-imask';

// Componente de máscara para telefone
const TelefoneMasked = React.forwardRef(function TelefoneMasked(props, ref) {
  const { onChange, ...other } = props;
  return (
    <IMaskInput
      {...other}
      mask="(00) 00000-0000"
      definitions={{
        '#': /[1-9]/,
      }}
      inputRef={ref}
      onAccept={(value) => onChange({ target: { name: props.name, value } })}
      overwrite
    />
  );
});

// Componente principal
const ComprovantePagamento = ({ open, onClose, pedidoId, mesaId }) => {
  const [loading, setLoading] = useState(false);
  const [opcao, setOpcao] = useState('imprimir');
  const [telefone, setTelefone] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [linkComprovante, setLinkComprovante] = useState(null);
  
  // Resetar estados ao fechar
  const handleClose = () => {
    setOpcao('imprimir');
    setTelefone('');
    setNomeCliente('');
    setError(null);
    setSuccess(null);
    setLinkComprovante(null);
    onClose();
  };
  
  // Validar entrada de telefone
  const validarTelefone = () => {
    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (opcao === 'whatsapp' && telefoneLimpo.length < 11) {
      setError('Digite um número de telefone válido com DDD');
      return false;
    }
    setError(null);
    return true;
  };
  
  // Gerar o comprovante
  const gerarComprovante = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Validar telefone para WhatsApp
      if (opcao === 'whatsapp' && !validarTelefone()) {
        setLoading(false);
        return;
      }
      
      // Dados adicionais do cliente
      const dadosAdicionais = {
        cliente: {
          nome: nomeCliente || 'Cliente',
          telefone: telefone || null
        }
      };
      
      // Gerar comprovante
      if (opcao === 'whatsapp') {
        // Enviar por WhatsApp
        const response = await api.post('/api/comprovantes/enviar-whatsapp', {
          pedidoId,
          telefone,
          dadosAdicionais
        });
        
        if (response.data.success) {
          setSuccess(`Comprovante enviado por WhatsApp para ${telefone}`);
          setLinkComprovante(response.data.comprovante.url);
        }
      } else {
        // Gerar para impressão
        const response = await api.post('/api/comprovantes/imprimir', {
          pedidoId,
          dadosAdicionais
        });
        
        if (response.data.success) {
          setSuccess('Comprovante gerado com sucesso e pronto para impressão');
          setLinkComprovante(response.data.data.arquivo.url);
          
          // Abrir janela de impressão se gerou com sucesso
          if (response.data.data.arquivo.url) {
            window.open(`${window.location.origin}${response.data.data.arquivo.url}`, '_blank');
          }
        }
      }
    } catch (error) {
      console.error('Erro ao gerar comprovante:', error);
      setError(error.response?.data?.message || 'Erro ao gerar comprovante');
    } finally {
      setLoading(false);
    }
  };
  
  // Copiar link do comprovante
  const copiarLink = () => {
    if (linkComprovante) {
      navigator.clipboard.writeText(`${window.location.origin}${linkComprovante}`);
      setSuccess('Link copiado para a área de transferência!');
    }
  };
  
  return (
    <Dialog
      open={open}
      onClose={!loading ? handleClose : undefined}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Comprovante de Pagamento</Typography>
          <IconButton
            onClick={handleClose}
            disabled={loading}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 0 }}>
          {/* Mensagem de erro */}
          {error && (
            <Grid item xs={12}>
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            </Grid>
          )}
          
          {/* Mensagem de sucesso */}
          {success && (
            <Grid item xs={12}>
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            </Grid>
          )}
          
          {/* Opções de entrega do comprovante */}
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Opção de Comprovante</InputLabel>
              <Select
                value={opcao}
                onChange={(e) => setOpcao(e.target.value)}
                disabled={loading}
                label="Opção de Comprovante"
              >
                <MenuItem value="imprimir">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PrintIcon sx={{ mr: 1 }} />
                    Imprimir Comprovante
                  </Box>
                </MenuItem>
                <MenuItem value="whatsapp">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <WhatsAppIcon sx={{ mr: 1, color: '#25D366' }} />
                    Enviar por WhatsApp
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {/* Campo para nome do cliente (opcional) */}
          <Grid item xs={12}>
            <TextField
              label="Nome do Cliente (opcional)"
              fullWidth
              value={nomeCliente}
              onChange={(e) => setNomeCliente(e.target.value)}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <ContactIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          {/* Campo para telefone (obrigatório para WhatsApp) */}
          {opcao === 'whatsapp' && (
            <Grid item xs={12}>
              <TextField
                label="Telefone com DDD"
                fullWidth
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                required
                disabled={loading}
                InputProps={{
                  inputComponent: TelefoneMasked,
                  startAdornment: (
                    <InputAdornment position="start">
                      <WhatsAppIcon color="success" />
                    </InputAdornment>
                  ),
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Digite o número com DDD, ex: (11) 98765-4321
              </Typography>
            </Grid>
          )}
          
          {/* Link do comprovante gerado */}
          {linkComprovante && (
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                bgcolor: 'action.hover',
                p: 1.5,
                borderRadius: 1
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <FileIcon sx={{ mr: 1 }} />
                  <Typography variant="body2" noWrap sx={{ maxWidth: '250px' }}>
                    {linkComprovante}
                  </Typography>
                </Box>
                <Tooltip title="Copiar link">
                  <IconButton onClick={copiarLink} size="small">
                    <CheckIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={handleClose} 
          disabled={loading}
          startIcon={<CloseIcon />}
        >
          Fechar
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={gerarComprovante}
          disabled={loading || (opcao === 'whatsapp' && !telefone)}
          startIcon={loading ? <CircularProgress size={20} /> : opcao === 'whatsapp' ? <SendIcon /> : <PrintIcon />}
        >
          {loading ? 'Processando...' : opcao === 'whatsapp' ? 'Enviar por WhatsApp' : 'Gerar e Imprimir'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ComprovantePagamento;
