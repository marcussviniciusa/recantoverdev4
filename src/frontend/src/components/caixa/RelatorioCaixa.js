import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  MenuItem,
  CircularProgress,
  Divider,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Card,
  CardContent,
  Alert
} from '@mui/material';
import {
  DateRange as DateRangeIcon,
  BarChart as BarChartIcon,
  FileDownload as FileDownloadIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { format, isValid, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReactApexChart from 'react-apexcharts';
import api from '../../services/api';

const RelatorioCaixa = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({
    periodo: 'dia',
    dataInicio: format(startOfDay(new Date()), 'yyyy-MM-dd'),
    dataFim: format(endOfDay(new Date()), 'yyyy-MM-dd'),
  });
  const [relatorio, setRelatorio] = useState(null);
  const chartRef = useRef(null);
  
  // Configuração do gráfico de métodos de pagamento
  const chartConfig = {
    options: {
      chart: {
        type: 'donut',
      },
      labels: ['Dinheiro', 'Crédito', 'Débito', 'PIX', 'Vale', 'Outros'],
      colors: ['#4CAF50', '#2196F3', '#3F51B5', '#FFC107', '#9C27B0', '#607D8B'],
      legend: {
        position: 'bottom',
      },
      tooltip: {
        y: {
          formatter: (value) => `R$ ${value.toFixed(2)}`
        }
      },
      dataLabels: {
        enabled: true,
        formatter: (val, opts) => {
          return `${val.toFixed(1)}%`;
        },
      },
      responsive: [{
        breakpoint: 480,
        options: {
          chart: {
            width: 250
          },
          legend: {
            position: 'bottom'
          }
        }
      }]
    },
    series: [],
  };
  
  // Configuração do gráfico de faturamento por dia
  const faturamentoConfig = {
    options: {
      chart: {
        type: 'area',
        toolbar: {
          show: false
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'smooth',
        width: 2
      },
      xaxis: {
        type: 'datetime',
        categories: []
      },
      yaxis: {
        title: {
          text: 'Valor (R$)'
        },
        labels: {
          formatter: (value) => `R$ ${value.toFixed(2)}`
        }
      },
      tooltip: {
        x: {
          format: 'dd/MM/yyyy'
        },
        y: {
          formatter: (value) => `R$ ${value.toFixed(2)}`
        }
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.9,
          stops: [0, 90, 100]
        }
      },
      colors: ['#2E7D32']
    },
    series: [
      {
        name: 'Faturamento',
        data: []
      }
    ]
  };
  
  useEffect(() => {
    atualizarPeriodoDatas();
  }, [filtros.periodo]);
  
  // Atualizar datas com base no período selecionado
  const atualizarPeriodoDatas = () => {
    const hoje = new Date();
    let dataInicio, dataFim;
    
    switch (filtros.periodo) {
      case 'dia':
        dataInicio = format(startOfDay(hoje), 'yyyy-MM-dd');
        dataFim = format(endOfDay(hoje), 'yyyy-MM-dd');
        break;
      case 'semana':
        dataInicio = format(startOfWeek(hoje, { weekStartsOn: 0 }), 'yyyy-MM-dd');
        dataFim = format(endOfWeek(hoje, { weekStartsOn: 0 }), 'yyyy-MM-dd');
        break;
      case 'mes':
        dataInicio = format(startOfMonth(hoje), 'yyyy-MM-dd');
        dataFim = format(endOfMonth(hoje), 'yyyy-MM-dd');
        break;
      case 'personalizado':
        // Manter as datas personalizadas
        return;
      default:
        dataInicio = format(startOfDay(hoje), 'yyyy-MM-dd');
        dataFim = format(endOfDay(hoje), 'yyyy-MM-dd');
    }
    
    setFiltros(prev => ({
      ...prev,
      dataInicio,
      dataFim
    }));
  };
  
  // Lidar com mudanças nos filtros
  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Buscar os dados do relatório
  const buscarRelatorio = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Validar datas
      if (!isValid(parseISO(filtros.dataInicio)) || !isValid(parseISO(filtros.dataFim))) {
        setError('Período de datas inválido');
        setLoading(false);
        return;
      }
      
      const response = await api.get('/api/caixa/relatorio', {
        params: {
          dataInicio: filtros.dataInicio,
          dataFim: filtros.dataFim
        }
      });
      
      if (response.data.success) {
        setRelatorio(response.data.data);
        
        // Atualizar dados do gráfico de métodos de pagamento
        if (response.data.data.pagamentos) {
          const pagamentos = response.data.data.pagamentos;
          chartConfig.series = [
            pagamentos.dinheiro || 0, 
            pagamentos.credito || 0, 
            pagamentos.debito || 0, 
            pagamentos.pix || 0, 
            pagamentos.vale || 0, 
            pagamentos.outros || 0
          ];
        }
        
        // Atualizar dados do gráfico de faturamento diário
        if (response.data.data.faturamentoDiario) {
          const faturamento = response.data.data.faturamentoDiario;
          faturamentoConfig.options.xaxis.categories = faturamento.map(item => item.data);
          faturamentoConfig.series[0].data = faturamento.map(item => item.valor);
        }
      } else {
        setError('Erro ao buscar relatório');
      }
    } catch (error) {
      console.error('Erro ao buscar relatório:', error);
      setError(error.response?.data?.message || 'Erro ao buscar relatório');
    } finally {
      setLoading(false);
    }
  };
  
  // Exportar relatório em formato CSV
  const exportarCSV = () => {
    if (!relatorio) return;
    
    // Cabeçalho
    let csv = 'Relatório de Caixa,\n';
    csv += `Período: ${format(parseISO(filtros.dataInicio), 'dd/MM/yyyy')} a ${format(parseISO(filtros.dataFim), 'dd/MM/yyyy')},\n\n`;
    
    // Resumo
    csv += 'Resumo Financeiro,\n';
    csv += `Total Faturamento,R$ ${relatorio.totalVendas?.toFixed(2) || '0.00'},\n`;
    csv += `Total Sangrias,R$ ${relatorio.totalSangrias?.toFixed(2) || '0.00'},\n`;
    csv += `Total Reforços,R$ ${relatorio.totalReforcos?.toFixed(2) || '0.00'},\n`;
    csv += `Diferença Total,R$ ${relatorio.diferencaTotal?.toFixed(2) || '0.00'},\n\n`;
    
    // Métodos de pagamento
    csv += 'Métodos de Pagamento,\n';
    csv += `Dinheiro,R$ ${relatorio.pagamentos?.dinheiro?.toFixed(2) || '0.00'},\n`;
    csv += `Crédito,R$ ${relatorio.pagamentos?.credito?.toFixed(2) || '0.00'},\n`;
    csv += `Débito,R$ ${relatorio.pagamentos?.debito?.toFixed(2) || '0.00'},\n`;
    csv += `PIX,R$ ${relatorio.pagamentos?.pix?.toFixed(2) || '0.00'},\n`;
    csv += `Vale,R$ ${relatorio.pagamentos?.vale?.toFixed(2) || '0.00'},\n`;
    csv += `Outros,R$ ${relatorio.pagamentos?.outros?.toFixed(2) || '0.00'},\n\n`;
    
    // Faturamento diário
    if (relatorio.faturamentoDiario && relatorio.faturamentoDiario.length > 0) {
      csv += 'Faturamento Diário,\n';
      csv += 'Data,Valor,\n';
      
      relatorio.faturamentoDiario.forEach(item => {
        csv += `${format(parseISO(item.data), 'dd/MM/yyyy')},R$ ${item.valor?.toFixed(2) || '0.00'},\n`;
      });
      
      csv += '\n';
    }
    
    // Histórico de caixas
    if (relatorio.historicoResumo && relatorio.historicoResumo.length > 0) {
      csv += 'Histórico de Caixas,\n';
      csv += 'Data Abertura,Data Fechamento,Valor Inicial,Valor Final,Vendas,Sangrias,Reforços,Diferença,\n';
      
      relatorio.historicoResumo.forEach(caixa => {
        csv += `${format(parseISO(caixa.dataAbertura), 'dd/MM/yyyy HH:mm')},`;
        csv += `${caixa.dataFechamento ? format(parseISO(caixa.dataFechamento), 'dd/MM/yyyy HH:mm') : 'N/A'},`;
        csv += `R$ ${caixa.valorInicial?.toFixed(2) || '0.00'},`;
        csv += `R$ ${caixa.valorFinal?.toFixed(2) || '0.00'},`;
        csv += `R$ ${caixa.vendas?.total?.toFixed(2) || '0.00'},`;
        csv += `R$ ${caixa.totalSangrias?.toFixed(2) || '0.00'},`;
        csv += `R$ ${caixa.totalReforcos?.toFixed(2) || '0.00'},`;
        csv += `R$ ${caixa.diferenca?.toFixed(2) || '0.00'},\n`;
      });
    }
    
    // Criar e baixar o arquivo
    const element = document.createElement('a');
    const file = new Blob([csv], { type: 'text/csv' });
    element.href = URL.createObjectURL(file);
    element.download = `relatorio-caixa-${format(new Date(), 'yyyyMMdd')}.csv`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  // Componente para mostrar cards de resumo
  const CardResumo = ({ titulo, valor, icone, corFundo }) => (
    <Card sx={{ bgcolor: corFundo }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
        <Box sx={{ mr: 2 }}>
          {icone}
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">
            {titulo}
          </Typography>
          <Typography variant="h6">
            {valor}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
  
  return (
    <Box>
      {/* Área de filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filtros do Relatório
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              label="Período"
              name="periodo"
              value={filtros.periodo}
              onChange={handleFiltroChange}
            >
              <MenuItem value="dia">Hoje</MenuItem>
              <MenuItem value="semana">Esta Semana</MenuItem>
              <MenuItem value="mes">Este Mês</MenuItem>
              <MenuItem value="personalizado">Personalizado</MenuItem>
            </TextField>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <TextField
              type="date"
              fullWidth
              label="Data Inicial"
              name="dataInicio"
              value={filtros.dataInicio}
              onChange={handleFiltroChange}
              disabled={filtros.periodo !== 'personalizado'}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <TextField
              type="date"
              fullWidth
              label="Data Final"
              name="dataFim"
              value={filtros.dataFim}
              onChange={handleFiltroChange}
              disabled={filtros.periodo !== 'personalizado'}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12} md={2} sx={{ display: 'flex', alignItems: 'center' }}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              startIcon={<SearchIcon />}
              onClick={buscarRelatorio}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Gerar'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Mensagem de erro */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Conteúdo do relatório */}
      {relatorio && !loading && (
        <Box>
          {/* Botão de exportação */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={exportarCSV}
            >
              Exportar CSV
            </Button>
          </Box>
          
          {/* Cards de resumo */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <CardResumo
                titulo="Total Faturamento"
                valor={`R$ ${relatorio.totalVendas?.toFixed(2) || '0.00'}`}
                icone={<BarChartIcon sx={{ color: 'success.main' }} />}
                corFundo="#f0f8f0"
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <CardResumo
                titulo="Qtde. Vendas"
                valor={relatorio.quantidadeVendas || 0}
                icone={<BarChartIcon sx={{ color: 'info.main' }} />}
                corFundo="#e3f2fd"
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <CardResumo
                titulo="Ticket Médio"
                valor={`R$ ${relatorio.ticketMedio?.toFixed(2) || '0.00'}`}
                icone={<BarChartIcon sx={{ color: 'primary.main' }} />}
                corFundo="#e8eaf6"
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <CardResumo
                titulo="Diferença Total"
                valor={`R$ ${relatorio.diferencaTotal?.toFixed(2) || '0.00'}`}
                icone={<BarChartIcon sx={{ color: relatorio.diferencaTotal < 0 ? 'error.main' : 'success.main' }} />}
                corFundo={relatorio.diferencaTotal < 0 ? "#fee8e7" : "#f0f8f0"}
              />
            </Grid>
          </Grid>
          
          {/* Gráficos */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Métodos de Pagamento
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {relatorio.pagamentos && (
                  <ReactApexChart 
                    options={chartConfig.options} 
                    series={chartConfig.series} 
                    type="donut" 
                    height={350} 
                  />
                )}
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Faturamento por Dia
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {relatorio.faturamentoDiario && relatorio.faturamentoDiario.length > 0 && (
                  <ReactApexChart 
                    options={faturamentoConfig.options} 
                    series={faturamentoConfig.series} 
                    type="area" 
                    height={350} 
                  />
                )}
              </Paper>
            </Grid>
          </Grid>
          
          {/* Tabela de histórico resumido */}
          {relatorio.historicoResumo && relatorio.historicoResumo.length > 0 && (
            <Paper sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ p: 2, pb: 0 }}>
                Histórico de Caixas no Período
              </Typography>
              <Divider sx={{ mb: 2, mx: 2 }} />
              
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Abertura</TableCell>
                      <TableCell>Fechamento</TableCell>
                      <TableCell>Responsável</TableCell>
                      <TableCell align="right">Inicial</TableCell>
                      <TableCell align="right">Final</TableCell>
                      <TableCell align="right">Vendas</TableCell>
                      <TableCell align="right">Diferença</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {relatorio.historicoResumo.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {format(parseISO(item.dataAbertura), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {item.dataFechamento 
                            ? format(parseISO(item.dataFechamento), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                            : 'Aberto'}
                        </TableCell>
                        <TableCell>
                          {item.responsavelAbertura?.nome || 'N/A'}
                        </TableCell>
                        <TableCell align="right">
                          R$ {item.valorInicial?.toFixed(2) || '0.00'}
                        </TableCell>
                        <TableCell align="right">
                          R$ {item.valorFinal?.toFixed(2) || '0.00'}
                        </TableCell>
                        <TableCell align="right">
                          R$ {item.vendas?.total?.toFixed(2) || '0.00'}
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            color={item.diferenca < 0 ? 'error.main' : item.diferenca > 0 ? 'success.main' : 'inherit'}
                          >
                            R$ {item.diferenca?.toFixed(2) || '0.00'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Box>
      )}
      
      {/* Mensagem quando não há dados */}
      {!relatorio && !loading && !error && (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <DateRangeIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Selecione um período e gere o relatório
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Os dados financeiros serão exibidos aqui
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default RelatorioCaixa;
