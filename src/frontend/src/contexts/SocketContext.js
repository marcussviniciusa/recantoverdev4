import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { currentUser, isAuthenticated } = useAuth();

  useEffect(() => {
    // Só inicializa o socket se o usuário estiver autenticado
    if (isAuthenticated && currentUser) {
      // Conectar ao servidor WebSocket
      const socketInstance = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
        auth: {
          userId: currentUser._id,
          role: currentUser.role
        }
      });

      // Evento de conexão estabelecida
      socketInstance.on('connect', () => {
        console.log('Socket conectado:', socketInstance.id);
        setConnected(true);
      });

      // Evento de desconexão
      socketInstance.on('disconnect', (reason) => {
        console.log('Socket desconectado:', reason);
        setConnected(false);
      });

      // Evento de erro de conexão
      socketInstance.on('connect_error', (error) => {
        console.error('Erro de conexão do Socket:', error);
        setConnected(false);
      });

      // Salvar a instância do socket
      setSocket(socketInstance);

      // Limpar ao desmontar
      return () => {
        if (socketInstance) {
          socketInstance.disconnect();
        }
      };
    } else {
      // Se o usuário não estiver autenticado, desconectar o socket
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
    }
  }, [isAuthenticated, currentUser]);

  // Função para ouvir eventos
  const listen = (event, callback) => {
    if (socket) {
      socket.on(event, callback);
      return () => socket.off(event, callback);
    }
    return () => {};
  };

  // Função para emitir eventos
  const emit = (event, data, callback) => {
    if (socket && connected) {
      socket.emit(event, data, callback);
      return true;
    }
    return false;
  };

  // Valor do contexto
  const value = {
    socket,
    connected,
    listen,
    emit
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
