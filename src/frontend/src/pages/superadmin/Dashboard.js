import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Card, 
  CardContent, 
  CardHeader,
  Divider,
  Button,
  CircularProgress,
  useTheme 
} from '@mui/material';
import { 
  TableBar as TableIcon,
  RestaurantMenu as MenuIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { useSocket } from '../../contexts/SocketContext';
import api from '../../services/api';

// Componente de estatística
const StatCard = ({ icon, title, value, color }) => {
  return (
    <Card elevation={2} sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 60,
                width: 60,
                borderRadius: 2,
                bgcolor: `${color}.light`,
                color: `${color}.main`,
              }}
            >
              {icon}
            </Box>
          </Grid>
          <Grid item xs>
            <Typography variant="h6" component="div" fontWeight="bold">
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const theme = useTheme();
  const { listen } = useSocket();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    mesasOcupadas: 0,
    mesasDisponiveis: 0,
    totalMesas: 0,
    usuariosAtivos: 0,
    totalUsuarios: 0,
    itensPedidos: 0,
    valorTotal: 0
  });
  const [mesasStatus, setMesasStatus] = useState([]);

  // Cores para status das mesas
  const mesaStatusColors = {
    disponivel: '#4caf50', // Verde
    ocupada: '#f9a825', // Amarelo
    reservada: '#2196f3', // Azul
    manutencao: '#d32f2f' // Vermelho
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Obter estatísticas gerais do sistema
        const [mesasRes, usuariosRes, pedidosRes] = await Promise.all([
          api.get('/api/mesas'),
          api.get('/api/users'),
          api.get('/api/pedidos')
        ]);

        // Calcular estatísticas para o dashboard
        const mesas = mesasRes.data.data || [];
        const usuarios = usuariosRes.data.data || [];
        const pedidos = pedidosRes.data.data || [];

        const mesasOcupadas = mesas.filter(mesa => mesa.status === 'ocupada').length;
        const mesasDisponiveis = mesas.filter(mesa => mesa.status === 'disponivel').length;

        // Calcular valor total dos pedidos do dia
        const hoje = new Date().toISOString().split('T')[0];
        const pedidosHoje = pedidos.filter(pedido => 
          new Date(pedido.dataCriacao).toISOString().split('T')[0] === hoje
        );
        
        const valorTotal = pedidosHoje.reduce((total, pedido) => total + (pedido.valorTotal || 0), 0);
        const itensPedidos = pedidosHoje.reduce((total, pedido) => {
          return total + pedido.itens.reduce((sum, item) => sum + (item.quantidade || 1), 0)
        }, 0);

        // Atualizar estatísticas
        setStats({
          mesasOcupadas,
          mesasDisponiveis,
          totalMesas: mesas.length,
          usuariosAtivos: usuarios.filter(user => user.ativo).length,
          totalUsuarios: usuarios.length,
          itensPedidos,
          valorTotal
        });

        // Atualizar status das mesas para o mapa
        setMesasStatus(mesas.map(mesa => ({
          id: mesa._id,
          numero: mesa.numero,
          status: mesa.status,
          capacidade: mesa.capacidade,
          localizacao: mesa.localizacao,
          ocupacaoAtual: mesa.ocupacaoAtual
        })));

      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Configurar listeners para atualizações em tempo real
    const unsubscribeMesa = listen('atualizar_mesa', (data) => {
      setMesasStatus(current => {
        const index = current.findIndex(mesa => mesa.id === data.id);
        if (index !== -1) {
          const updatedMesas = [...current];
          updatedMesas[index] = {
            ...updatedMesas[index],
            status: data.status,
            ocupacaoAtual: data.ocupacaoAtual
          };
          return updatedMesas;
        }
        return current;
      });

      // Atualizar contadores
      setStats(current => {
        const statsDelta = { 
          mesasOcupadas: current.mesasOcupadas, 
          mesasDisponiveis: current.mesasDisponiveis 
        };

        if (data.statusAnterior === 'disponivel' && data.status === 'ocupada') {
          statsDelta.mesasDisponiveis--;
          statsDelta.mesasOcupadas++;
        } else if (data.statusAnterior === 'ocupada' && data.status === 'disponivel') {
          statsDelta.mesasDisponiveis++;
          statsDelta.mesasOcupadas--;
        }

        return { ...current, ...statsDelta };
      });
    });

    const unsubscribePedido = listen('atualizar_pedidos', (data) => {
      if (data.acao === 'novo') {
        setStats(current => ({
          ...current,
          itensPedidos: current.itensPedidos + data.quantidadeItens,
          valorTotal: current.valorTotal + data.valorTotal
        }));
      }
    });

    // Limpar listeners ao desmontar
    return () => {
      unsubscribeMesa();
      unsubscribePedido();
    };
  }, [listen]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Visão geral do restaurante e operações em tempo real.
      </Typography>

      {/* Cards de estatísticas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<TableIcon sx={{ fontSize: 30 }} />}
            title="Mesas Ocupadas"
            value={`${stats.mesasOcupadas} de ${stats.totalMesas}`}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<PeopleIcon sx={{ fontSize: 30 }} />}
            title="Garçons Ativos"
            value={`${stats.usuariosAtivos} de ${stats.totalUsuarios}`}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<MenuIcon sx={{ fontSize: 30 }} />}
            title="Itens Pedidos Hoje"
            value={stats.itensPedidos}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<TrendingUpIcon sx={{ fontSize: 30 }} />}
            title="Faturamento Hoje"
            value={`R$ ${stats.valorTotal.toFixed(2)}`}
            color="info"
          />
        </Grid>
      </Grid>

      {/* Mapa de mesas */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Mapa de Mesas
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 3 }}>
          {mesasStatus.map((mesa) => (
            <Box
              key={mesa.id}
              sx={{
                width: 80,
                height: 80,
                borderRadius: 2,
                bgcolor: mesaStatusColors[mesa.status] || 'grey.300',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'scale(1.05)',
                },
              }}
            >
              <Typography variant="h6" fontWeight="bold">
                {mesa.numero}
              </Typography>
              <Typography variant="caption">
                {mesa.status === 'ocupada' 
                  ? `${mesa.ocupacaoAtual.clientes} pessoas` 
                  : `Cap: ${mesa.capacidade}`}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => window.location.href = '/admin/tables'}>
            Gerenciar Mesas
          </Button>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mr: 2,
            }}
          >
            <Box sx={{ width: 15, height: 15, bgcolor: mesaStatusColors.disponivel, borderRadius: '50%' }} />
            <Typography variant="body2">Disponível</Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mr: 2,
            }}
          >
            <Box sx={{ width: 15, height: 15, bgcolor: mesaStatusColors.ocupada, borderRadius: '50%' }} />
            <Typography variant="body2">Ocupada</Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mr: 2,
            }}
          >
            <Box sx={{ width: 15, height: 15, bgcolor: mesaStatusColors.reservada, borderRadius: '50%' }} />
            <Typography variant="body2">Reservada</Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Box sx={{ width: 15, height: 15, bgcolor: mesaStatusColors.manutencao, borderRadius: '50%' }} />
            <Typography variant="body2">Manutenção</Typography>
          </Box>
        </Box>
      </Paper>

      {/* Últimos pedidos */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Atividade Recente
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
          Integração de dados em tempo real implementada.
          <br />
          O histórico de atividades será mostrado aqui.
        </Typography>
      </Paper>
    </Box>
  );
};

export default Dashboard;
