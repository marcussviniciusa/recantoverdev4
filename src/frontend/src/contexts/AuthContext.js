import React, { createContext, useState, useContext, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          // Configurar token para todas as requisições
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Obter dados do usuário
          const response = await api.get('/api/auth/me');
          
          if (response.data.success) {
            setCurrentUser(response.data.data);
          } else {
            // Se não conseguir obter os dados, fazer logout
            logout();
          }
        } catch (error) {
          console.error('Erro ao carregar usuário:', error);
          logout();
        }
      }
      
      setLoading(false);
    };

    loadUser();
  }, [token]);

  const login = async (email, senha) => {
    try {
      // Usando a rota de login regular
      const response = await api.post('/api/auth/login', { email, senha });
      
      if (response.data.success) {
        const { token, usuario } = response.data.data;
        
        // Salvar token no localStorage
        localStorage.setItem('token', token);
        
        // Configurar token para todas as requisições
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        setToken(token);
        setCurrentUser(usuario);
        
        toast.success('Login realizado com sucesso!');
        return { success: true, role: usuario.role };
      } else {
        toast.error(response.data.message || 'Erro ao fazer login');
        return { success: false };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao conectar ao servidor';
      toast.error(message);
      return { success: false, message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/api/auth/register', userData);
      
      if (response.data.success) {
        const { token, usuario } = response.data.data;
        
        // Salvar token no localStorage
        localStorage.setItem('token', token);
        
        // Configurar token para todas as requisições
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        setToken(token);
        setCurrentUser(usuario);
        
        toast.success('Cadastro realizado com sucesso!');
        return { success: true, role: usuario.role };
      } else {
        toast.error(response.data.message || 'Erro ao criar conta');
        return { success: false };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao conectar ao servidor';
      toast.error(message);
      return { success: false, message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    api.defaults.headers.common['Authorization'] = '';
    setToken(null);
    setCurrentUser(null);
    toast.info('Logout realizado');
  };

  const updateProfile = async (userId, userData) => {
    try {
      const response = await api.put(`/api/users/${userId}`, userData);
      
      if (response.data.success) {
        // Atualizar dados do usuário atual se for o próprio perfil
        if (currentUser._id === userId) {
          setCurrentUser(response.data.data);
        }
        
        toast.success('Perfil atualizado com sucesso!');
        return { success: true };
      } else {
        toast.error(response.data.message || 'Erro ao atualizar perfil');
        return { success: false };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao conectar ao servidor';
      toast.error(message);
      return { success: false, message };
    }
  };

  const changePassword = async (senhaAtual, novaSenha) => {
    try {
      const response = await api.post('/api/auth/change-password', { 
        senhaAtual, 
        novaSenha 
      });
      
      if (response.data.success) {
        toast.success('Senha alterada com sucesso!');
        return { success: true };
      } else {
        toast.error(response.data.message || 'Erro ao alterar senha');
        return { success: false };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao conectar ao servidor';
      toast.error(message);
      return { success: false, message };
    }
  };

  const value = {
    currentUser,
    loading,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    isAuthenticated: !!currentUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
