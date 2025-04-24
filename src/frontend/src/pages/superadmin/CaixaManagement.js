import React, { useState, useEffect } from 'react';
import {
  Box,
  Tab,
  Tabs,
  Paper,
  Snackbar,
  Alert,
  Typography,
  CircularProgress
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  History as HistoryIcon,
  BarChart as ChartIcon
} from '@mui/icons-material';
import api from '../../services/api';
import CaixaAtual from '../../components/caixa/CaixaAtual';
import HistoricoCaixa from '../../components/caixa/HistoricoCaixa';
import RelatorioCaixa from '../../components/caixa/RelatorioCaixa';

// Componente TabPanel para renderizar o conteúdo de cada aba
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`caixa-tabpanel-${index}`}
      aria-labelledby={`caixa-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const CaixaManagement = () => {
  const [tabValue, setTabValue] = useState(0);
  const [caixaAtual, setCaixaAtual] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Buscar dados do caixa atual
  const fetchCaixaAtual = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/api/caixa/atual');
      
      if (response.data.success) {
        setCaixaAtual(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar caixa atual:', error);
      setError('Erro ao carregar dados do caixa. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  // Função para atualizar caixa após operações
  const handleCaixaUpdated = () => {
    fetchCaixaAtual();
    showSnackbar('Operação realizada com sucesso', 'success');
  };

  // Gerenciar mudança de aba
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Exibir mensagem de snackbar
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  // Fechar snackbar
  const handleSnackbarClose = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  // Buscar dados iniciais
  useEffect(() => {
    fetchCaixaAtual();
  }, []);

  return (
    <Box>
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab icon={<MoneyIcon />} label="Caixa Atual" />
          <Tab icon={<HistoryIcon />} label="Histórico" />
          <Tab icon={<ChartIcon />} label="Relatórios" />
        </Tabs>
      </Paper>

      {/* Tab de Caixa Atual */}
      <TabPanel value={tabValue} index={0}>
        <CaixaAtual 
          caixa={caixaAtual} 
          onCaixaUpdated={handleCaixaUpdated}
          loading={loading}
        />
      </TabPanel>

      {/* Tab de Histórico */}
      <TabPanel value={tabValue} index={1}>
        <HistoricoCaixa />
      </TabPanel>

      {/* Tab de Relatórios */}
      <TabPanel value={tabValue} index={2}>
        <RelatorioCaixa />
      </TabPanel>

      {/* Exibir erro global caso exista */}
      {error && (
        <Box sx={{ mt: 2 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}

      {/* Snackbar para feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
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

export default CaixaManagement;
