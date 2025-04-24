# Documentação do Projeto Recanto Verde

## 1. Visão Geral do Sistema

O Recanto Verde é um sistema web completo para gerenciamento de restaurantes, desenvolvido com uma arquitetura moderna de frontend e backend separados. O sistema oferece duas interfaces principais baseadas em perfis de usuário:

- **Superadmin (Recepcionista)**: Gerenciamento completo do restaurante, incluindo mesas, cardápio, relatórios e configurações do sistema.
- **Usuário (Garçom)**: Interface operacional para atendimento aos clientes, gerenciamento de pedidos e mesas.

### Principais Funcionalidades

- Dashboard interativo com mapa visual do restaurante
- Gerenciamento visual de mesas (disponíveis, ocupadas, reservadas)
- Sistema de previsão de ocupação com IA
- Gestão completa de cardápio com análise de popularidade de itens
- Sistema de pedidos com acompanhamento em tempo real
- Integração com WhatsApp para envio de comandas digitais
- Geração de comprovantes de pagamento
- Gerenciamento financeiro e caixa
- Relatórios de desempenho e análises
- Funcionalidades especiais como divisão de comanda, união de mesas e atendimento múltiplo

## 2. Arquitetura e Tecnologias

### 2.1 Backend

- **Plataforma**: Node.js
- **Framework**: Express.js
- **Banco de Dados**: MongoDB com Mongoose ODM
- **Autenticação**: JWT (JSON Web Tokens)
- **Tempo Real**: Socket.IO para atualizações em tempo real
- **Serviços Externos**: API WhatsApp para envio de comandas
- **Bibliotecas Principais**:
  - `axios`: Cliente HTTP para requisições externas
  - `bcryptjs`: Criptografia de senhas
  - `date-fns`: Manipulação de datas
  - `pdfkit`: Geração de PDFs para comprovantes
  - `qrcode`: Geração de QR Code para comandas digitais
  - `express-validator`: Validação de dados das requisições

### 2.2 Frontend

- **Framework**: React 19
- **UI Framework**: Material UI 7
- **Roteamento**: React Router 7
- **Gerenciamento de Estado**: Context API do React
- **Requisições HTTP**: Axios
- **Notificações**: React-Toastify
- **Gráficos e Relatórios**: Chart.js e ApexCharts
- **Comunicação em Tempo Real**: Socket.IO Client

### 2.3 Arquitetura do Sistema

O sistema utiliza uma arquitetura cliente-servidor com comunicação via REST API e WebSockets:

- **API REST**: Para operações CRUD padrão e lógica de negócios
- **WebSockets**: Para atualizações em tempo real do status de mesas, pedidos e notificações

## 3. Estrutura do Projeto

### 3.1 Backend

```
/src/backend/
├── config/           # Configurações do sistema (banco de dados, autenticação)
├── controllers/      # Controladores para cada recurso da API
├── middleware/       # Middlewares Express (auth, validação, etc.)
├── models/           # Modelos/schemas do Mongoose
├── routes/           # Rotas da API
├── scripts/          # Scripts utilitários 
├── services/         # Serviços de negócio
├── utils/            # Funções utilitárias
└── server.js         # Ponto de entrada do servidor
```

### 3.2 Frontend

```
/src/frontend/
├── public/           # Ativos públicos
└── src/
    ├── components/   # Componentes React reutilizáveis
    │   └── caixa/    # Componentes específicos para módulo de caixa
    ├── contexts/     # Contextos React para gerenciar estado
    ├── layouts/      # Layouts de página compartilhados
    ├── pages/        # Componentes de página
    │   ├── auth/     # Páginas de autenticação
    │   ├── superadmin/ # Páginas administrativas
    │   └── user/     # Páginas para usuários (garçons)
    ├── services/     # Serviços para comunicação com a API
    └── utils/        # Utilidades e helpers
```

## 4. Modelos de Dados Principais

### 4.1 Usuário (User)

Representa os usuários do sistema, com dois tipos principais: administradores (recepcionistas) e usuários padrão (garçons).

### 4.2 Mesa (Mesa)

Representa as mesas do restaurante, com informações sobre status, capacidade, ocupação atual e histórico.

### 4.3 Cardápio (Cardapio)

Dois modelos principais:
- **Categoria**: Categorias dos itens do cardápio
- **ItemCardapio**: Itens do menu com detalhes como preço, descrição, ingredientes e estatísticas de vendas

### 4.4 Pedido (Pedido)

Representa um pedido feito por clientes, com informações sobre itens, status de pagamento, mesa, garçom e opções de divisão.

### 4.5 Caixa (Caixa)

Gerencia operações financeiras como abertura/fechamento de caixa, registro de entradas e saídas, e balanço.

## 5. Funcionalidades Implementadas e Estado Atual

### 5.1 Módulo de Autenticação

- Login/logout do sistema
- Gerenciamento de perfis de usuário
- Proteção de rotas baseada em perfil

### 5.2 Módulo de Mesas

- Visualização do mapa do restaurante
- Gerenciamento visual do status das mesas
- Funcionalidades para abrir, fechar, reservar e liberar mesas
- União de mesas para grupos grandes

### 5.3 Módulo de Cardápio

- CRUD completo para categorias e itens
- Gestão de disponibilidade de itens
- Estatísticas de popularidade e vendas
- Organização de itens por categoria

### 5.4 Módulo de Pedidos

- Criação e gerenciamento de pedidos
- Adição, remoção e atualização de itens
- Status de preparo dos itens
- Divisão de comanda entre clientes
- Fechamento e pagamento de pedidos

### 5.5 Módulo de Comprovantes

- Geração de comprovantes em PDF
- Envio de comprovantes via WhatsApp
- Preparação para impressão física

### 5.6 Comunicação em Tempo Real

- Atualização em tempo real do status de mesas
- Notificação sobre novos pedidos
- Atualização de status de preparo de itens

## 6. Issues Conhecidos

### 6.1 Problemas de Conexão WebSocket

Atualmente há falhas ocasionais na conexão WebSocket, resultando em atualizações em tempo real inconsistentes. O erro ocorre durante o estabelecimento da conexão inicial ou em reconexões.

### 6.2 Erros no Envio de Comprovantes via WhatsApp

O sistema apresenta erros intermitentes ao tentar enviar comprovantes via WhatsApp. Foi identificado que parte do problema estava relacionada à população incorreta de campos no modelo, corrigida recentemente:

- Os campos `itens.produto` foram alterados para `itens.item` no controller de comprovantes
- O campo `atendente` agora está sendo corretamente populado

### 6.3 Exibição de Itens por Categoria

Foi implementada uma correção para resolver o problema de itens aparecendo como "Sem categoria" no menu. A solução envolveu o uso adequado do método `populate()` do Mongoose para garantir que os detalhes da categoria fossem incluídos nos resultados.

## 7. Configuração e Execução

### 7.1 Requisitos

- Node.js (v16+)
- MongoDB (v4+)
- Conexão com internet para APIs externas (WhatsApp)

### 7.2 Variáveis de Ambiente

O arquivo `.env` no diretório backend contém as seguintes variáveis:

```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/restaurante
JWT_SECRET=seu_segredo_jwt
JWT_EXPIRATION=24h
CLIENT_URL=http://localhost:3000
WHATSAPP_API_DOMAIN=dominio_da_api_whatsapp
WHATSAPP_API_KEY=chave_da_api_whatsapp
WHATSAPP_INSTANCE=instancia_whatsapp
```

### 7.3 Instalação e Execução

**Backend:**
```bash
cd src/backend
npm install
npm run dev   # Para desenvolvimento
npm start     # Para produção
```

**Frontend:**
```bash
cd src/frontend
npm install
npm start
```

## 8. Próximos Passos

### 8.1 Correções Prioritárias

- Resolver problemas de conexão WebSocket para garantir atualizações em tempo real confiáveis
- Finalizar os ajustes e testes do envio de comprovantes via WhatsApp
- Otimizar a performance do carregamento de itens por categoria no menu

### 8.2 Melhorias Planejadas

- Implementar sistema de reservas online
- Adicionar sistema de fidelidade para clientes frequentes
- Expandir recursos de análise e relatórios
- Melhorar interface de divisão de comanda
- Adicionar suporte para múltiplos idiomas

### 8.3 Otimizações Técnicas

- Implementar cache para consultas frequentes ao banco de dados
- Melhorar a estratégia de conexão/reconexão do WebSocket
- Adicionar testes automatizados para funções críticas
- Implementar sistema de logs mais abrangente

## 9. Contatos e Recursos

Para questões técnicas ou suporte, entre em contato com a equipe de desenvolvimento.

---

*Documentação criada em: 24 de abril de 2025*
