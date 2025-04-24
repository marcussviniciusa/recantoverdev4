import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Divider,
  Button,
  TextField,
  MenuItem,
  CircularProgress,
  Tabs,
  Tab,
  IconButton,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tooltip
} from '@mui/material';
import { 
  DatePicker, 
  LocalizationProvider 
} from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ptBR from 'date-fns/locale/pt-BR';
import {
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  TableChart as TableChartIcon,
  TrendingUp as TrendingUpIcon,
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  Restaurant as RestaurantIcon,
  Coffee as CoffeeIcon,
  LocalBar as DrinkIcon,
  Cake as DessertIcon,
  AccountBalance as AccountIcon
} from '@mui/icons-material';
import api from '../../services/api';
import { format } from 'date-fns';
import Chart from 'react-apexcharts';

// Componente TabPanel para as abas de relatórios
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`report-tabpanel-${index}`}
      aria-labelledby={`report-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Reports = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)),
    endDate: new Date()
  });
  const [reportPeriod, setReportPeriod] = useState('week');
  const [salesData, setSalesData] = useState({
    daily: [],
    totalSales: 0,
    averageTicket: 0,
    totalOrders: 0,
    topSellingItems: []
  });
  const [tableStats, setTableStats] = useState({
    occupancyRate: 0,
    averageTime: 0,
    peakHours: [],
    tableUsage: []
  });
  const [menuPerformance, setMenuPerformance] = useState({
    categories: [],
    topItems: [],
    lowPerformers: [],
    itemPerformance: []
  });
  
  useEffect(() => {
    fetchReportData();
  }, [dateRange, reportPeriod]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handlePeriodChange = (event) => {
    const period = event.target.value;
    setReportPeriod(period);
    
    // Ajustar o intervalo de datas com base no período selecionado
    const endDate = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'today':
        startDate = new Date(endDate);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }
    
    setDateRange({ startDate, endDate });
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // Formatar datas para a API
      const startDateStr = format(dateRange.startDate, 'yyyy-MM-dd');
      const endDateStr = format(dateRange.endDate, 'yyyy-MM-dd');
      
      // Buscar dados de vendas
      const salesResponse = await api.get(`/api/reports/sales?startDate=${startDateStr}&endDate=${endDateStr}`);
      
      // Buscar estatísticas de ocupação de mesas
      const tablesResponse = await api.get(`/api/reports/tables?startDate=${startDateStr}&endDate=${endDateStr}`);
      
      // Buscar desempenho do cardápio
      const menuResponse = await api.get(`/api/reports/menu?startDate=${startDateStr}&endDate=${endDateStr}`);
      
      // Processar e armazenar dados
      // Dados de vendas
      setSalesData({
        daily: salesResponse.data.dailySales || [],
        totalSales: salesResponse.data.totalSales || 0,
        averageTicket: salesResponse.data.averageTicket || 0,
        totalOrders: salesResponse.data.totalOrders || 0,
        topSellingItems: salesResponse.data.topSellingItems || []
      });
      
      // Estatísticas de mesas
      setTableStats({
        occupancyRate: tablesResponse.data.occupancyRate || 0,
        averageTime: tablesResponse.data.averageTime || 0,
        peakHours: tablesResponse.data.peakHours || [],
        tableUsage: tablesResponse.data.tableUsage || []
      });
      
      // Desempenho do cardápio
      setMenuPerformance({
        categories: menuResponse.data.categoryPerformance || [],
        topItems: menuResponse.data.topItems || [],
        lowPerformers: menuResponse.data.lowPerformers || [],
        itemPerformance: menuResponse.data.itemPerformance || []
      });
      
    } catch (error) {
      console.error('Erro ao buscar dados de relatórios:', error);
      // Usar dados de exemplo para demonstração em caso de erro
      setDemoData();
    } finally {
      setLoading(false);
    }
  };

  // Função para gerar dados de demonstração
  const setDemoData = () => {
    // Dados de vendas de exemplo
    setSalesData({
      daily: [
        { date: '2025-04-16', sales: 1250.75, orders: 28 },
        { date: '2025-04-17', sales: 1645.50, orders: 35 },
        { date: '2025-04-18', sales: 2450.25, orders: 42 },
        { date: '2025-04-19', sales: 3210.00, orders: 58 },
        { date: '2025-04-20', sales: 3800.50, orders: 64 },
        { date: '2025-04-21', sales: 2780.75, orders: 45 },
        { date: '2025-04-22', sales: 1950.25, orders: 37 },
      ],
      totalSales: 17087.00,
      averageTicket: 55.42,
      totalOrders: 309,
      topSellingItems: [
        { name: 'Picanha na Brasa', quantity: 89, totalSales: 2670.00 },
        { name: 'Caipirinha', quantity: 124, totalSales: 1860.00 },
        { name: 'Filé à Parmegiana', quantity: 76, totalSales: 2280.00 },
        { name: 'Mousse de Chocolate', quantity: 68, totalSales: 680.00 },
        { name: 'Salada Caesar', quantity: 52, totalSales: 780.00 }
      ]
    });
    
    // Dados de mesas de exemplo
    setTableStats({
      occupancyRate: 68.5,
      averageTime: 87, // minutos
      peakHours: [
        { hour: '12:00', occupancy: 82 },
        { hour: '13:00', occupancy: 95 },
        { hour: '19:00', occupancy: 78 },
        { hour: '20:00', occupancy: 97 },
        { hour: '21:00', occupancy: 85 }
      ],
      tableUsage: [
        { number: 1, usage: 85, avgTime: 95 },
        { number: 2, usage: 76, avgTime: 88 },
        { number: 3, usage: 92, avgTime: 102 },
        { number: 4, usage: 68, avgTime: 78 },
        { number: 5, usage: 72, avgTime: 85 },
        { number: 6, usage: 88, avgTime: 92 },
        { number: 7, usage: 64, avgTime: 75 },
        { number: 8, usage: 78, avgTime: 89 }
      ]
    });
    
    // Dados de cardápio de exemplo
    setMenuPerformance({
      categories: [
        { name: 'Pratos Principais', sales: 9850.00, percentage: 57.6 },
        { name: 'Bebidas', sales: 4200.00, percentage: 24.6 },
        { name: 'Sobremesas', sales: 1850.00, percentage: 10.8 },
        { name: 'Entradas', sales: 1187.00, percentage: 7.0 }
      ],
      topItems: [
        { name: 'Picanha na Brasa', quantity: 89, revenue: 2670.00, profit: 1335.00 },
        { name: 'Caipirinha', quantity: 124, revenue: 1860.00, profit: 1395.00 },
        { name: 'Filé à Parmegiana', quantity: 76, revenue: 2280.00, profit: 1140.00 }
      ],
      lowPerformers: [
        { name: 'Salada Verde', quantity: 12, revenue: 144.00, profit: 108.00 },
        { name: 'Suco de Maracujá', quantity: 18, revenue: 162.00, profit: 108.00 },
        { name: 'Água com Gás', quantity: 24, revenue: 120.00, profit: 96.00 }
      ],
      itemPerformance: [
        { name: 'Picanha na Brasa', category: 'Pratos Principais', sales: 89, revenue: 2670.00, cost: 1335.00, profitMargin: 50 },
        { name: 'Caipirinha', category: 'Bebidas', sales: 124, revenue: 1860.00, cost: 465.00, profitMargin: 75 },
        { name: 'Filé à Parmegiana', category: 'Pratos Principais', sales: 76, revenue: 2280.00, cost: 1140.00, profitMargin: 50 },
        { name: 'Mousse de Chocolate', category: 'Sobremesas', sales: 68, revenue: 680.00, cost: 204.00, profitMargin: 70 },
        { name: 'Salada Caesar', category: 'Entradas', sales: 52, revenue: 780.00, cost: 234.00, profitMargin: 70 }
      ]
    });
  };

  // Configurações dos gráficos
  const salesChartOptions = {
    chart: {
      type: 'bar',
      toolbar: {
        show: true
      }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '60%'
      }
    },
    dataLabels: {
      enabled: false
    },
    colors: [theme.palette.primary.main],
    xaxis: {
      categories: salesData.daily.map(day => format(new Date(day.date), 'dd/MM')),
      title: {
        text: 'Data'
      }
    },
    yaxis: {
      title: {
        text: 'Vendas (R$)'
      }
    },
    fill: {
      opacity: 1
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return `R$ ${val.toFixed(2)}`;
        }
      }
    }
  };

  const salesChartSeries = [
    {
      name: 'Vendas',
      data: salesData.daily.map(day => day.sales)
    }
  ];

  const categoryChartOptions = {
    chart: {
      type: 'pie'
    },
    labels: menuPerformance.categories.map(cat => cat.name),
    colors: [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.success.main,
      theme.palette.warning.main
    ],
    responsive: [{
      breakpoint: 480,
      options: {
        chart: {
          width: 200
        },
        legend: {
          position: 'bottom'
        }
      }
    }],
    tooltip: {
      y: {
        formatter: function (val) {
          return `R$ ${val.toFixed(2)}`;
        }
      }
    }
  };

  const categoryChartSeries = menuPerformance.categories.map(cat => cat.sales);

  // Renderizar relatório de vendas
  const renderSalesReport = () => (
    <Box>
      <Grid container spacing={3}>
        {/* Cards de estatísticas */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                Total de Vendas
              </Typography>
              <Typography variant="h4">
                R$ {salesData.totalSales.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                Ticket Médio
              </Typography>
              <Typography variant="h4">
                R$ {salesData.averageTicket.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                Pedidos
              </Typography>
              <Typography variant="h4">
                {salesData.totalOrders}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                Taxa de Ocupação
              </Typography>
              <Typography variant="h4">
                {tableStats.occupancyRate.toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Gráfico de vendas */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Vendas por Dia
              </Typography>
              <IconButton onClick={fetchReportData}>
                <RefreshIcon />
              </IconButton>
            </Box>
            <Divider sx={{ mb: 2 }} />
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Chart
                options={salesChartOptions}
                series={salesChartSeries}
                type="bar"
                height={350}
              />
            )}
          </Paper>
        </Grid>
        
        {/* Produtos mais vendidos */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Produtos Mais Vendidos
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Produto</TableCell>
                    <TableCell align="right">Quantidade</TableCell>
                    <TableCell align="right">Vendas (R$)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {salesData.topSellingItems.map((item) => (
                    <TableRow key={item.name}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">R$ {item.totalSales.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
        
        {/* Vendas por categoria */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Vendas por Categoria
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Chart
                options={categoryChartOptions}
                series={categoryChartSeries}
                type="pie"
                height={300}
              />
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Relatórios e Análises
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Tooltip title="Exportar como PDF">
            <IconButton>
              <PrintIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Exportar como CSV">
            <IconButton>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Filtros */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              fullWidth
              label="Período"
              value={reportPeriod}
              onChange={handlePeriodChange}
            >
              <MenuItem value="today">Hoje</MenuItem>
              <MenuItem value="yesterday">Ontem</MenuItem>
              <MenuItem value="week">Últimos 7 dias</MenuItem>
              <MenuItem value="month">Último mês</MenuItem>
              <MenuItem value="quarter">Último trimestre</MenuItem>
              <MenuItem value="year">Último ano</MenuItem>
              <MenuItem value="custom">Personalizado</MenuItem>
            </TextField>
          </Grid>
          
          {reportPeriod === 'custom' && (
            <>
              <Grid item xs={12} sm={6} md={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                  <DatePicker
                    label="Data inicial"
                    value={dateRange.startDate}
                    onChange={(newValue) => setDateRange({ ...dateRange, startDate: newValue })}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                  <DatePicker
                    label="Data final"
                    value={dateRange.endDate}
                    onChange={(newValue) => setDateRange({ ...dateRange, endDate: newValue })}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </LocalizationProvider>
              </Grid>
            </>
          )}
          
          <Grid item xs={12} sm={6} md={reportPeriod === 'custom' ? 3 : 6}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              startIcon={<RefreshIcon />}
              onClick={fetchReportData}
              disabled={loading}
            >
              {loading ? 'Carregando...' : 'Atualizar'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Abas de relatórios */}
      <Paper elevation={2} sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="relatórios"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<BarChartIcon />} label="Vendas" id="report-tab-0" aria-controls="report-tabpanel-0" />
          <Tab icon={<TableChartIcon />} label="Mesas" id="report-tab-1" aria-controls="report-tabpanel-1" />
          <Tab icon={<RestaurantIcon />} label="Cardápio" id="report-tab-2" aria-controls="report-tabpanel-2" />
          <Tab icon={<AccountIcon />} label="Financeiro" id="report-tab-3" aria-controls="report-tabpanel-3" />
        </Tabs>
        
        <Box sx={{ p: 3 }}>
          <TabPanel value={activeTab} index={0}>
            {renderSalesReport()}
          </TabPanel>
          <TabPanel value={activeTab} index={1}>
            <Typography variant="h6" color="text.secondary" align="center">
              Relatório de Mesas em desenvolvimento...
            </Typography>
          </TabPanel>
          <TabPanel value={activeTab} index={2}>
            <Typography variant="h6" color="text.secondary" align="center">
              Relatório de Cardápio em desenvolvimento...
            </Typography>
          </TabPanel>
          <TabPanel value={activeTab} index={3}>
            <Typography variant="h6" color="text.secondary" align="center">
              Relatório Financeiro em desenvolvimento...
            </Typography>
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
};

export default Reports;
