import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  DateRange as DateRangeIcon,
  Search as SearchIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../../services/api';

// Componente para exibir detalhes de um caixa fechado
const DetalheCaixa = ({ caixaId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [caixa, setCaixa] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (caixaId) {
      fetchCaixaDetails();
    }
  }, [caixaId]);
  
  const fetchCaixaDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/caixa/${caixaId}`);
      
      if (response.data.success) {
        setCaixa(response.data.data);
      } else {
        setError('Erro ao carregar detalhes do caixa');
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes do caixa:', error);
      setError(error.response?.data?.message || 'Erro ao buscar detalhes do caixa');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }
  
  if (!caixa) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Nenhum detalhe disponível</Typography>
      </Box>
    );
  }
  
  // Formatar datas
  const dataAbertura = caixa.caixa.dataAbertura 
    ? format(new Date(caixa.caixa.dataAbertura), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : 'Não disponível';
    
  const dataFechamento = caixa.caixa.dataFechamento 
    ? format(new Date(caixa.caixa.dataFechamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : 'Não disponível';
  
  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="h6" gutterBottom>
        Detalhes do Caixa
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle1" gutterBottom>
              Informações Gerais
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <Chip 
                  label={caixa.caixa.status === 'aberto' ? 'Aberto' : 'Fechado'} 
                  color={caixa.caixa.status === 'aberto' ? 'success' : 'default'} 
                  size="small" 
                  sx={{ mt: 0.5 }}
                />
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Tempo Aberto
                </Typography>
                <Typography variant="body1">
                  {caixa.estatisticas.tempoAberto}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Data de Abertura
                </Typography>
                <Typography variant="body1">
                  {dataAbertura}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Data de Fechamento
                </Typography>
                <Typography variant="body1">
                  {dataFechamento}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Responsável Abertura
                </Typography>
                <Typography variant="body1">
                  {caixa.caixa.responsavelAbertura?.nome || 'Não especificado'}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Responsável Fechamento
                </Typography>
                <Typography variant="body1">
                  {caixa.caixa.responsavelFechamento?.nome || 'Não especificado'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle1" gutterBottom>
              Resumo Financeiro
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Valor Inicial
                </Typography>
                <Typography variant="body1">
                  R$ {caixa.caixa.valorInicial?.toFixed(2) || '0.00'}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Valor Final
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  R$ {caixa.caixa.valorFinal?.toFixed(2) || '0.00'}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Total de Vendas
                </Typography>
                <Typography variant="body1">
                  R$ {caixa.caixa.vendas?.total?.toFixed(2) || '0.00'}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Qtde. Pedidos
                </Typography>
                <Typography variant="body1">
                  {caixa.caixa.vendas?.quantidade || 0}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Ticket Médio
                </Typography>
                <Typography variant="body1">
                  R$ {caixa.estatisticas.ticketMedio?.toFixed(2) || '0.00'}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Diferença
                </Typography>
                <Typography 
                  variant="body1" 
                  color={caixa.caixa.diferenca < 0 ? 'error.main' : caixa.caixa.diferenca > 0 ? 'success.main' : 'inherit'}
                  fontWeight="bold"
                >
                  R$ {caixa.caixa.diferenca?.toFixed(2) || '0.00'}
                  {caixa.caixa.diferenca < 0 && ' (Falta)'}
                  {caixa.caixa.diferenca > 0 && ' (Sobra)'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Métodos de Pagamento
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={6} sm={4} md={2}>
                <Paper variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Dinheiro
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    R$ {caixa.caixa.pagamentos?.dinheiro?.toFixed(2) || '0.00'}
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={6} sm={4} md={2}>
                <Paper variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Crédito
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    R$ {caixa.caixa.pagamentos?.credito?.toFixed(2) || '0.00'}
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={6} sm={4} md={2}>
                <Paper variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Débito
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    R$ {caixa.caixa.pagamentos?.debito?.toFixed(2) || '0.00'}
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={6} sm={4} md={2}>
                <Paper variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    PIX
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    R$ {caixa.caixa.pagamentos?.pix?.toFixed(2) || '0.00'}
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={6} sm={4} md={2}>
                <Paper variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Vale
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    R$ {caixa.caixa.pagamentos?.vale?.toFixed(2) || '0.00'}
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={6} sm={4} md={2}>
                <Paper variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Outros
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    R$ {caixa.caixa.pagamentos?.outros?.toFixed(2) || '0.00'}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Sangrias
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {caixa.caixa.sangrias && caixa.caixa.sangrias.length > 0 ? (
              <TableContainer sx={{ maxHeight: 300 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Data/Hora</TableCell>
                      <TableCell>Motivo</TableCell>
                      <TableCell align="right">Valor</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {caixa.caixa.sangrias.map((sangria, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {format(new Date(sangria.data), 'dd/MM HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell>{sangria.motivo}</TableCell>
                        <TableCell align="right">R$ {sangria.valor.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body2" color="text.secondary" align="center">
                Nenhuma sangria registrada
              </Typography>
            )}
            
            {caixa.caixa.sangrias && caixa.caixa.sangrias.length > 0 && (
              <Box sx={{ mt: 1, textAlign: 'right' }}>
                <Typography variant="body2" fontWeight="bold">
                  Total: R$ {caixa.estatisticas.totalSangrias?.toFixed(2) || '0.00'}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Reforços
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {caixa.caixa.reforcos && caixa.caixa.reforcos.length > 0 ? (
              <TableContainer sx={{ maxHeight: 300 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Data/Hora</TableCell>
                      <TableCell>Motivo</TableCell>
                      <TableCell align="right">Valor</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {caixa.caixa.reforcos.map((reforco, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {format(new Date(reforco.data), 'dd/MM HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell>{reforco.motivo}</TableCell>
                        <TableCell align="right">R$ {reforco.valor.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body2" color="text.secondary" align="center">
                Nenhum reforço registrado
              </Typography>
            )}
            
            {caixa.caixa.reforcos && caixa.caixa.reforcos.length > 0 && (
              <Box sx={{ mt: 1, textAlign: 'right' }}>
                <Typography variant="body2" fontWeight="bold">
                  Total: R$ {caixa.estatisticas.totalReforcos?.toFixed(2) || '0.00'}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        
        {caixa.caixa.observacoes && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Observações
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body1">
                {caixa.caixa.observacoes}
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

const HistoricoCaixa = ({ initialData = [] }) => {
  const [caixas, setCaixas] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [filtros, setFiltros] = useState({
    status: '',
    dataInicio: '',
    dataFim: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCaixa, setSelectedCaixa] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  useEffect(() => {
    fetchHistorico();
  }, [page, rowsPerPage]);
  
  const fetchHistorico = async () => {
    try {
      setLoading(true);
      
      // Construir a URL com os filtros e paginação
      let url = `/api/caixa?page=${page + 1}&limit=${rowsPerPage}`;
      
      if (filtros.status) {
        url += `&status=${filtros.status}`;
      }
      
      if (filtros.dataInicio && filtros.dataFim) {
        url += `&dataInicio=${filtros.dataInicio}&dataFim=${filtros.dataFim}`;
      }
      
      const response = await api.get(url);
      
      if (response.data.success) {
        setCaixas(response.data.data);
        setTotalRows(response.data.total);
      }
    } catch (error) {
      console.error('Erro ao buscar histórico de caixas:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const handleFilterChange = (e) => {
    setFiltros({
      ...filtros,
      [e.target.name]: e.target.value
    });
  };
  
  const aplicarFiltros = () => {
    setPage(0);
    fetchHistorico();
  };
  
  const limparFiltros = () => {
    setFiltros({
      status: '',
      dataInicio: '',
      dataFim: ''
    });
    setPage(0);
    
    // Dar tempo para os campos serem limpos antes de buscar
    setTimeout(fetchHistorico, 100);
  };
  
  const handleViewDetails = (caixaId) => {
    setSelectedCaixa(caixaId);
    setDetailsOpen(true);
  };
  
  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedCaixa(null);
  };
  
  // Renderizar filtros
  const renderFiltros = () => (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        Filtros
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <TextField
            select
            fullWidth
            name="status"
            label="Status"
            value={filtros.status}
            onChange={handleFilterChange}
            size="small"
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="aberto">Aberto</MenuItem>
            <MenuItem value="fechado">Fechado</MenuItem>
          </TextField>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <TextField
            type="date"
            fullWidth
            name="dataInicio"
            label="Data Inicial"
            value={filtros.dataInicio}
            onChange={handleFilterChange}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <TextField
            type="date"
            fullWidth
            name="dataFim"
            label="Data Final"
            value={filtros.dataFim}
            onChange={handleFilterChange}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button 
          variant="outlined" 
          onClick={limparFiltros}
        >
          Limpar
        </Button>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<SearchIcon />}
          onClick={aplicarFiltros}
        >
          Aplicar Filtros
        </Button>
      </Box>
    </Paper>
  );
  
  return (
    <Box>
      {/* Botão de filtros */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          startIcon={<DateRangeIcon />}
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
        </Button>
      </Box>
      
      {/* Área de filtros */}
      {showFilters && renderFiltros()}
      
      {/* Tabela de histórico */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Data de Abertura</TableCell>
              <TableCell>Data de Fechamento</TableCell>
              <TableCell>Responsável</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Vendas</TableCell>
              <TableCell align="right">Diferença</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && caixas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  <CircularProgress size={30} />
                </TableCell>
              </TableRow>
            ) : caixas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            ) : (
              caixas.map((caixa) => (
                <TableRow key={caixa._id}>
                  <TableCell>
                    {caixa.dataAbertura 
                      ? format(new Date(caixa.dataAbertura), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {caixa.dataFechamento 
                      ? format(new Date(caixa.dataFechamento), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {caixa.responsavelAbertura?.nome || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={caixa.status === 'aberto' ? 'Aberto' : 'Fechado'} 
                      color={caixa.status === 'aberto' ? 'success' : 'default'} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell align="right">
                    R$ {caixa.vendas?.total?.toFixed(2) || '0.00'}
                  </TableCell>
                  <TableCell align="right">
                    {caixa.diferenca !== undefined && caixa.diferenca !== null ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        {caixa.diferenca < 0 && <ArrowDownIcon color="error" fontSize="small" />}
                        {caixa.diferenca > 0 && <ArrowUpIcon color="success" fontSize="small" />}
                        <Typography 
                          variant="body2" 
                          color={caixa.diferenca < 0 ? 'error.main' : caixa.diferenca > 0 ? 'success.main' : 'inherit'}
                        >
                          R$ {Math.abs(caixa.diferenca).toFixed(2)}
                        </Typography>
                      </Box>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={() => handleViewDetails(caixa._id)}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        {/* Paginação */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalRows}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Itens por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </TableContainer>
      
      {/* Dialog de detalhes */}
      <Dialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Detalhes do Caixa
        </DialogTitle>
        <DialogContent dividers>
          <DetalheCaixa caixaId={selectedCaixa} onClose={handleCloseDetails} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HistoricoCaixa;
