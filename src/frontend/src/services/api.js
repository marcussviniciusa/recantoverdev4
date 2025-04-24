import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  timeout: 30000, // Aumentado para 30 segundos para permitir mais tempo de resposta do servidor
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Adicionar token a todas as requisições se estiver no localStorage
const token = localStorage.getItem('token');
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Interceptor para tratamento de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Tratamento de erro de autenticação
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      // Redirecionar para a página de login se não estiver lá
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
