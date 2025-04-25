FROM node:18-alpine as build

WORKDIR /app

# Copiar arquivos do package.json e instalar dependências
COPY package*.json ./
RUN npm install

# Copiar o arquivo de ambiente de produção
COPY .env.production ./

# Copiar o resto do código fonte
COPY . .

# Construir o aplicativo
RUN npm run build

# Imagem de produção
FROM nginx:alpine

# Copiar a build do React para o diretório do Nginx
COPY --from=build /app/build /usr/share/nginx/html

# Adicionar arquivo de configuração do Nginx para suportar rotas do React (SPA)
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/

# Expor a porta 80
EXPOSE 80

# Iniciar o Nginx
CMD ["nginx", "-g", "daemon off;"]
