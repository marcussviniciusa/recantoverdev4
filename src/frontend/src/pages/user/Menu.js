import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  Chip,
  TextField,
  IconButton,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Snackbar,
  Alert,
  useTheme
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Star as StarIcon,
  Info as InfoIcon,
  RestaurantMenu as MenuIcon,
  LocalOffer as TagIcon,
  Share as ShareIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  ExpandMore as ExpandMoreIcon,
  Whatshot as WhatshotIcon,
  FilterList as FilterIcon,
  Sort as SortIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const Menu = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // Estados
  const [categorias, setCategorias] = useState([]);
  const [itens, setItens] = useState([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [itensPopulares, setItensPopulares] = useState([]);
  const [carregandoCategorias, setCarregandoCategorias] = useState(true);
  const [carregandoItens, setCarregandoItens] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [openItemDialog, setOpenItemDialog] = useState(false);
  const [favoritos, setFavoritos] = useState([]);
  const [showFavoritos, setShowFavoritos] = useState(false);
  const [sortBy, setSortBy] = useState('nome');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Buscar dados ao carregar componente
  useEffect(() => {
    fetchCategorias();
    fetchItensPopulares();
    
    // Carregar favoritos do localStorage
    const storedFavoritos = localStorage.getItem('favoritos');
    if (storedFavoritos) {
      setFavoritos(JSON.parse(storedFavoritos));
    }
  }, []);
  
  // Buscar categorias do cardápio
  const fetchCategorias = async () => {
    try {
      setCarregandoCategorias(true);
      const response = await api.get('/api/cardapio/categorias');
      if (response.data.success) {
        setCategorias(response.data.data);
        
        // Carregar todos os itens inicialmente
        fetchAllItens();
      }
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      showSnackbar('Erro ao carregar categorias do cardápio', 'error');
    } finally {
      setCarregandoCategorias(false);
    }
  };
  
  // Buscar todos os itens do cardápio
  const fetchAllItens = async () => {
    try {
      setCarregandoItens(true);
      const response = await api.get('/api/cardapio/itens');
      if (response.data.success) {
        setItens(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar itens:', error);
      showSnackbar('Erro ao carregar itens do cardápio', 'error');
    } finally {
      setCarregandoItens(false);
    }
  };
  
  // Buscar itens populares
  const fetchItensPopulares = async () => {
    try {
      const response = await api.get('/api/cardapio/itens/populares');
      if (response.data.success) {
        setItensPopulares(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar itens populares:', error);
    }
  };
  
  // Buscar itens por categoria
  const fetchItensByCategoria = async (categoriaId) => {
    if (categoriaId === 'todas') {
      fetchAllItens();
      return;
    }
    
    try {
      setCarregandoItens(true);
      const response = await api.get(`/api/cardapio/categorias/${categoriaId}/itens`);
      if (response.data.success) {
        setItens(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar itens da categoria:', error);
      showSnackbar('Erro ao carregar itens da categoria', 'error');
    } finally {
      setCarregandoItens(false);
    }
  };
  
  // Mudar categoria ativa
  const handleCategoriaChange = (categoriaId) => {
    setCategoriaAtiva(categoriaId);
    setSearchQuery('');
    setShowFavoritos(false);
    
    if (categoriaId === 'favoritos') {
      setShowFavoritos(true);
      // Filtrar itens favoritos
      fetchAllItens().then(() => {
        // Os itens serão filtrados na renderização
      });
    } else {
      fetchItensByCategoria(categoriaId);
    }
  };
  
  // Buscar itens por termo de pesquisa
  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.length > 0) {
      setCategoriaAtiva('');
      setShowFavoritos(false);
    } else if (query.length === 0) {
      // Voltar para "todas" as categorias quando a busca for limpa
      setCategoriaAtiva('todas');
      fetchAllItens();
    }
  };
  
  // Ordenar itens
  const handleSortChange = (sortType) => {
    setSortBy(sortType);
  };
  
  // Exibir diálogo com detalhes do item
  const handleOpenItemDetails = (item) => {
    setSelectedItem(item);
    setOpenItemDialog(true);
  };
  
  // Adicionar/remover item dos favoritos
  const toggleFavorito = (itemId) => {
    setFavoritos(prev => {
      const isFavorito = prev.includes(itemId);
      let newFavoritos;
      
      if (isFavorito) {
        newFavoritos = prev.filter(id => id !== itemId);
        showSnackbar('Item removido dos favoritos', 'info');
      } else {
        newFavoritos = [...prev, itemId];
        showSnackbar('Item adicionado aos favoritos', 'success');
      }
      
      // Salvar no localStorage
      localStorage.setItem('favoritos', JSON.stringify(newFavoritos));
      
      return newFavoritos;
    });
  };
  
  // Compartilhar item
  const handleShareItem = () => {
    if (!selectedItem) return;
    
    // Implementação simplificada de compartilhamento
    if (navigator.share) {
      navigator.share({
        title: selectedItem.nome,
        text: `Confira o item ${selectedItem.nome} do nosso cardápio! ${selectedItem.descricao}`,
      }).catch(err => {
        console.error('Erro ao compartilhar:', err);
      });
    } else {
      showSnackbar('Função de compartilhamento não disponível neste dispositivo', 'warning');
    }
  };
  
  // Exibir snackbar com mensagem
  const showSnackbar = (message, severity = 'info') => {
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
  
  // Filtrar e ordenar itens
  const getFilteredAndSortedItems = () => {
    // Primeiro filtrar os itens
    let filteredItems = itens;
    
    if (showFavoritos) {
      filteredItems = itens.filter(item => favoritos.includes(item._id));
    } else if (searchQuery) {
      filteredItems = itens.filter(item => 
        item.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.descricao?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.categoria?.nome.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Depois ordenar
    return filteredItems.sort((a, b) => {
      switch (sortBy) {
        case 'nome':
          return a.nome.localeCompare(b.nome);
        case 'preco_baixo':
          return a.preco - b.preco;
        case 'preco_alto':
          return b.preco - a.preco;
        case 'popularidade':
          return (b.estatisticas?.pedidosTotais || 0) - (a.estatisticas?.pedidosTotais || 0);
        default:
          return 0;
      }
    });
  };
  
  // Itens filtrados e ordenados para exibição
  const itensParaExibir = getFilteredAndSortedItems();
  
  // Agrupar itens por categoria para visualização
  const itensAgrupados = () => {
    const grupos = {};
    
    itensParaExibir.forEach(item => {
      const categoriaNome = item.categoria?.nome || 'Sem categoria';
      
      if (!grupos[categoriaNome]) {
        grupos[categoriaNome] = [];
      }
      
      grupos[categoriaNome].push(item);
    });
    
    return grupos;
  };
  
  // Renderizar card de item
  const renderItemCard = (item) => (
    <Grid item xs={12} sm={6} md={4} key={item._id}>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardActionArea 
          onClick={() => handleOpenItemDetails(item)}
          sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
        >
          {item.imagem && (
            <CardMedia
              component="img"
              height="140"
              image={item.imagem}
              alt={item.nome}
            />
          )}
          
          <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography variant="h6" component="div" gutterBottom>
                {item.nome}
              </Typography>
              
              <Typography 
                variant="subtitle1" 
                fontWeight="bold"
                color="primary"
              >
                R$ {item.preco.toFixed(2)}
              </Typography>
            </Box>
            
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: 1.5, 
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                flexGrow: 1
              }}
            >
              {item.descricao || "Sem descrição"}
            </Typography>
            
            <Box sx={{ display: 'flex', mt: 'auto', flexWrap: 'wrap', gap: 0.5 }}>
              {item.destaque && (
                <Chip 
                  icon={<StarIcon fontSize="small" />} 
                  label="Destaque"
                  size="small"
                  color="warning"
                />
              )}
              
              {item.estatisticas?.pedidosTotais > 20 && (
                <Chip 
                  icon={<WhatshotIcon fontSize="small" />} 
                  label="Popular"
                  size="small"
                  color="error"
                />
              )}
              
              <Chip 
                icon={<TagIcon fontSize="small" />} 
                label={item.categoria?.nome || "Sem categoria"} 
                size="small"
                color="default"
                variant="outlined"
              />
            </Box>
          </CardContent>
        </CardActionArea>
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
          <IconButton 
            size="small" 
            color={favoritos.includes(item._id) ? "primary" : "default"}
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorito(item._id);
            }}
          >
            {favoritos.includes(item._id) ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          </IconButton>
        </Box>
      </Card>
    </Grid>
  );

  return (
    <Box sx={{ p: 2, pb: 7 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Cardápio Digital
      </Typography>
      
      {/* Barra de pesquisa */}
      <Paper sx={{ p: 1, mb: 2, display: 'flex', alignItems: 'center' }}>
        <IconButton size="small" sx={{ mr: 1 }}>
          <SearchIcon />
        </IconButton>
        
        <TextField
          placeholder="Buscar no cardápio..."
          fullWidth
          variant="standard"
          value={searchQuery}
          onChange={handleSearch}
          InputProps={{
            disableUnderline: true,
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchQuery('')}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </Paper>
      
      {/* Botões de ordenação e favoritos */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
        <Box>
          <Tooltip title="Ordenar itens">
            <Button
              size="small"
              startIcon={<SortIcon />}
              variant="outlined"
              color="primary"
              onClick={(e) => {
                // TODO: Implementar menu de ordenação
                handleSortChange('nome');
              }}
            >
              Ordenar
            </Button>
          </Tooltip>
        </Box>
        
        <Button
          size="small"
          startIcon={favoritos.length > 0 && showFavoritos ? <StarIcon color="warning" /> : <FavoriteBorderIcon />}
          variant={showFavoritos ? "contained" : "outlined"}
          color={showFavoritos ? "primary" : "default"}
          onClick={() => handleCategoriaChange(showFavoritos ? 'todas' : 'favoritos')}
        >
          Favoritos {favoritos.length > 0 && `(${favoritos.length})`}
        </Button>
      </Box>
      
      {/* Itens populares (horizontal scroll) */}
      {!searchQuery && !showFavoritos && categoriaAtiva === 'todas' && itensPopulares.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="medium" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WhatshotIcon color="error" /> Mais Pedidos
          </Typography>
          
          <Box
            sx={{
              display: 'flex',
              overflowX: 'auto',
              pb: 1,
              px: 0.5,
              gap: 1,
              scrollSnapType: 'x mandatory',
              '&::-webkit-scrollbar': {
                height: 6
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: 3
              }
            }}
          >
            {itensPopulares.map(item => (
              <Card 
                key={item._id}
                sx={{ 
                  minWidth: 200, 
                  scrollSnapAlign: 'start',
                  flexShrink: 0
                }}
              >
                <CardActionArea onClick={() => handleOpenItemDetails(item)}>
                  {item.imagem && (
                    <CardMedia
                      component="img"
                      height="80"
                      image={item.imagem}
                      alt={item.nome}
                    />
                  )}
                  
                  <CardContent sx={{ p: 1.5 }}>
                    <Typography variant="body1" fontWeight="medium" noWrap>
                      {item.nome}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {item.categoria?.nome}
                    </Typography>
                    <Typography variant="body1" color="primary" fontWeight="bold">
                      R$ {item.preco.toFixed(2)}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        </Box>
      )}
      
      {/* Tabs de categorias */}
      {!searchQuery && (
        <Paper sx={{ mb: 2, overflow: 'auto' }}>
          <Tabs
            value={categoriaAtiva}
            onChange={(e, newValue) => handleCategoriaChange(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab 
              label="Todas" 
              value="todas" 
              icon={<MenuIcon />}
              iconPosition="start"
            />
            
            {categorias.map((categoria) => (
              <Tab 
                key={categoria._id} 
                label={categoria.nome} 
                value={categoria._id}
                iconPosition="start"
                icon={<MenuIcon />}
              />
            ))}
          </Tabs>
        </Paper>
      )}
      
      {/* Lista de itens */}
      <Box sx={{ mb: 4 }}>
        {carregandoItens ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress size={40} />
          </Box>
        ) : itensParaExibir.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {searchQuery 
                ? "Nenhum resultado encontrado" 
                : showFavoritos 
                  ? "Você ainda não tem favoritos" 
                  : "Nenhum item disponível"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchQuery 
                ? "Tente outro termo de pesquisa." 
                : showFavoritos 
                  ? "Adicione itens aos favoritos tocando no ícone de coração." 
                  : "Esta categoria não possui itens cadastrados."}
            </Typography>
          </Paper>
        ) : (
          <>
            {/* Vista normal - grid de items */}
            {!categoryGroupingEnabled() && (
              <Grid container spacing={2}>
                {itensParaExibir.map(renderItemCard)}
              </Grid>
            )}
            
            {/* Vista agrupada por categoria */}
            {categoryGroupingEnabled() && (
              <Box>
                {Object.entries(itensAgrupados()).map(([categoriaNome, itensGrupo]) => (
                  <Accordion key={categoriaNome} defaultExpanded elevation={1} sx={{ mb: 2 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {categoriaNome} ({itensGrupo.length})
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 1 }}>
                      <Grid container spacing={2}>
                        {itensGrupo.map(renderItemCard)}
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )}
          </>
        )}
      </Box>
      
      {/* Diálogo de detalhes do item */}
      <Dialog
        open={openItemDialog}
        onClose={() => setOpenItemDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        {selectedItem && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Typography variant="h6" component="div">
                {selectedItem.nome}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedItem.categoria?.nome}
              </Typography>
            </DialogTitle>
            
            <DialogContent dividers>
              {selectedItem.imagem && (
                <Box sx={{ mb: 2, textAlign: 'center', bgcolor: 'background.default', borderRadius: 1, p: 1 }}>
                  <img 
                    src={selectedItem.imagem} 
                    alt={selectedItem.nome} 
                    style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }}
                  />
                </Box>
              )}
              
              <Typography variant="body1" paragraph>
                {selectedItem.descricao || "Item sem descrição detalhada."}
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Preço
                  </Typography>
                  <Typography variant="h6" color="primary" fontWeight="bold">
                    R$ {selectedItem.preco.toFixed(2)}
                  </Typography>
                </Grid>
                
                {selectedItem.estatisticas && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Popularidade
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <WhatshotIcon color={selectedItem.estatisticas.pedidosTotais > 20 ? "error" : "disabled"} />
                      <Typography>
                        {selectedItem.estatisticas.pedidosTotais || 0} pedidos
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
              
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Informações Adicionais
                </Typography>
                <Grid container spacing={1}>
                  {selectedItem.ingredientes && (
                    <Grid item xs={12}>
                      <Typography variant="body2">
                        <strong>Ingredientes:</strong> {selectedItem.ingredientes}
                      </Typography>
                    </Grid>
                  )}
                  
                  {selectedItem.alergenicos && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="error">
                        <strong>Contém alérgenos:</strong> {selectedItem.alergenicos}
                      </Typography>
                    </Grid>
                  )}
                  
                  {selectedItem.tempoPreparoEstimado && (
                    <Grid item xs={12}>
                      <Typography variant="body2">
                        <strong>Tempo de preparo:</strong> {selectedItem.tempoPreparoEstimado} minutos
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            </DialogContent>
            
            <DialogActions>
              <IconButton 
                color={favoritos.includes(selectedItem._id) ? "primary" : "default"}
                onClick={() => toggleFavorito(selectedItem._id)}
              >
                {favoritos.includes(selectedItem._id) ? <FavoriteIcon /> : <FavoriteBorderIcon />}
              </IconButton>
              
              <IconButton onClick={handleShareItem}>
                <ShareIcon />
              </IconButton>
              
              <Box sx={{ flexGrow: 1 }} />
              
              <Button onClick={() => setOpenItemDialog(false)}>
                Fechar
              </Button>
              
              <Button 
                variant="contained" 
                color="primary"
                onClick={() => {
                  setOpenItemDialog(false);
                  navigate(`/tables`);
                }}
              >
                Fazer Pedido
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
      
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

// Função auxiliar para determinar se agrupamento por categoria deve ser usado
const categoryGroupingEnabled = () => {
  // Usar agrupamento apenas na visualização "todas" para melhor organização
  return true;
};

export default Menu;
