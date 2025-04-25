FROM node:18-alpine

WORKDIR /app

# Copiar arquivos do package.json e instalar dependências
COPY package*.json ./
RUN npm install

# Copiar arquivo de configuração de produção
COPY .env.production ./.env

# Copiar o resto do código fonte
COPY . .

# Expor a porta 5000
EXPOSE 5000

# Iniciar a aplicação usando o script personalizado
CMD ["node", "start.js"]
