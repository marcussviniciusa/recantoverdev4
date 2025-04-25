const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { format } = require('date-fns');
const { ptBR } = require('date-fns/locale');
const qrcode = require('qrcode');
const { promisify } = require('util');
const qrCodeToBuffer = promisify(qrcode.toBuffer);

class ComprovanteService {
  /**
   * Função utilitária para formatar números com segurança
   * @param {any} value - Valor a ser formatado
   * @param {number} decimals - Número de casas decimais (padrão: 2)
   * @returns {string} - Valor formatado com casas decimais
   */
  safeToFixed(value, decimals = 2) {
    // Verifica se o valor existe e é um número
    if (value === undefined || value === null || isNaN(Number(value))) {
      // Retorna zero formatado com o número correto de casas decimais
      return (0).toFixed(decimals);
    }
    // Certifica que o valor é tratado como número antes de chamar toFixed
    return Number(value).toFixed(decimals);
  }
  /**
   * Gera um comprovante em PDF
   * @param {Object} dados - Dados do pedido e pagamento
   * @returns {Promise<string>} - Caminho do arquivo gerado
   */
  async gerarComprovantePDF(dados) {
    return new Promise(async (resolve, reject) => {
      try {
        // Extração segura dos dados com valores padrão
        const pedido = dados.pedido || {};
        const pagamento = dados.pagamento || {};
        const cliente = dados.cliente || {};
        
        // Criar diretório para comprovantes se não existir
        const diretorio = path.join(__dirname, '../uploads/comprovantes');
        if (!fs.existsSync(diretorio)) {
          fs.mkdirSync(diretorio, { recursive: true });
        }
        
        // Nome do arquivo baseado no ID do pedido e data atual
        const nomeArquivo = `comprovante_${pedido._id}_${new Date().getTime()}.pdf`;
        const caminhoArquivo = path.join(diretorio, nomeArquivo);
        
        // Criar o documento PDF
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50
        });
        
        // Stream para o arquivo
        const stream = fs.createWriteStream(caminhoArquivo);
        doc.pipe(stream);
        
        // Logo (se existir)
        const logoPath = path.join(__dirname, '../uploads/logos/logo.png');
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, {
            fit: [150, 150],
            align: 'center'
          });
        }
        
        // Título e cabeçalho
        doc.fontSize(20).font('Helvetica-Bold').text('Recanto Verde', { align: 'center' });
        doc.fontSize(12).font('Helvetica').text('Comprovante de Pagamento', { align: 'center' });
        doc.moveDown();
        
        // Dados do estabelecimento
        doc.fontSize(10).text('CNPJ: 00.000.000/0001-00');
        doc.text('Endereço: Boqueirão - Parelhas-RN');
        doc.text('Telefone: (00) 0000-0000');
        doc.moveDown();
        
        // Linha separadora
        doc.moveTo(50, doc.y)
           .lineTo(550, doc.y)
           .stroke();
        doc.moveDown();
        
        // Dados do pedido
        doc.fontSize(12).font('Helvetica-Bold').text('Dados do Pedido');
        doc.fontSize(10).font('Helvetica');
        doc.text(`Nº do Pedido: ${pedido._id}`);
        
        // Formatação segura da data
        let dataFormatada = 'Data não disponível';
        try {
          // Verificar se a data é válida
          const dataObj = pedido.data ? new Date(pedido.data) : new Date();
          if (!isNaN(dataObj.getTime())) {
            dataFormatada = format(dataObj, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
          }
        } catch (err) {
          console.error('Erro ao formatar data do pedido:', err);
        }
        
        doc.text(`Data: ${dataFormatada}`);
        // Removido campo de atendente
        doc.text(`Mesa: ${pedido.mesa?.numero || 'Não informado'}`);
        
        // Dados do cliente (se fornecidos)
        if (cliente) {
          doc.moveDown();
          doc.fontSize(12).font('Helvetica-Bold').text('Dados do Cliente');
          doc.fontSize(10).font('Helvetica');
          doc.text(`Nome: ${cliente.nome || 'Não informado'}`);
          if (cliente.telefone) {
            doc.text(`Telefone: ${cliente.telefone}`);
          }
          if (cliente.email) {
            doc.text(`Email: ${cliente.email}`);
          }
        }
        
        doc.moveDown();
        
        // Itens do pedido
        doc.fontSize(12).font('Helvetica-Bold').text('Itens do Pedido');
        doc.fontSize(10).font('Helvetica');
        
        // Tabela de itens
        let yInicial = doc.y;
        doc.font('Helvetica-Bold');
        doc.text('Item', 50, yInicial);
        doc.text('Qtd', 300, yInicial);
        doc.text('Preço', 370, yInicial, { width: 80, align: 'right' });
        doc.text('Total', 450, yInicial, { width: 80, align: 'right' });
        
        yInicial += 20;
        doc.font('Helvetica');
        
        pedido.itens.forEach((item, index) => {
          // Verificar se precisa de nova página
          if (yInicial > 700) {
            doc.addPage();
            yInicial = 50;
            
            // Recriar cabeçalho da tabela
            doc.font('Helvetica-Bold');
            doc.text('Item', 50, yInicial);
            doc.text('Qtd', 300, yInicial);
            doc.text('Preço', 370, yInicial, { width: 80, align: 'right' });
            doc.text('Total', 450, yInicial, { width: 80, align: 'right' });
            
            yInicial += 20;
            doc.font('Helvetica');
          }
          
          // Nome do item (com observação se houver)
          // Verificar todas as possíveis estruturas de dados para nomes de produtos
          let nomeItem = item.produto?.nome || item.item?.nome || item.nome || 'Produto não especificado';
          
          // Adicionar observação se existir
          if (item.observacao) {
            nomeItem += `\n   Obs: ${item.observacao}`;
          }
          
          doc.text(nomeItem, 50, yInicial, { width: 240 });
          doc.text(item.quantidade.toString(), 300, yInicial);
          doc.text(`R$ ${this.safeToFixed(item.preco)}`, 370, yInicial, { width: 80, align: 'right' });
          // Calcular o total do item com segurança
          const qtd = isNaN(Number(item.quantidade)) ? 1 : Number(item.quantidade);
          const preco = isNaN(Number(item.preco)) ? 0 : Number(item.preco);
          doc.text(`R$ ${this.safeToFixed(qtd * preco)}`, 450, yInicial, { width: 80, align: 'right' });
          
          // Incrementar Y com espaço extra para itens com observação
          const linhas = item.observacao ? 2 : 1;
          yInicial += 20 * linhas;
        });
        
        // Linha separadora
        yInicial += 10;
        doc.moveTo(50, yInicial)
           .lineTo(550, yInicial)
           .stroke();
        
        // Calcular o total final que pode vir de itens ou valor já calculado
        let totalFinal = 0;
        // Somar os itens
        if (pedido.itens && Array.isArray(pedido.itens)) {
          totalFinal = pedido.itens.reduce((total, item) => {
            const quantidade = item.quantidade || 1;
            const preco = item.preco || 0;
            return total + (quantidade * preco);
          }, 0);
        }
        
        // Se o pedido tem um total definido, priorizar esse valor
        if (pedido.total) {
          totalFinal = pedido.total;
        }
        
        // Se o pagamento tem valorPago definido, usar este como valor final
        if (pagamento && typeof pagamento.valorPago === 'number' && pagamento.valorPago > 0) {
          totalFinal = pagamento.valorPago;
        }
        
        // Adicionar espaço suficiente após a linha de divisão
        yInicial += 30;
        
        // Valor total
        doc.fontSize(14).font('Helvetica-Bold').text(`Total: R$ ${this.safeToFixed(totalFinal)}`, 50, yInicial, { align: 'right' });
        
        doc.moveDown(2);
        
        // Rodapé
        doc.fontSize(8);
        const rodape = 'Este documento não possui valor fiscal. É apenas um comprovante de pagamento.';
        const rodapeY = doc.page.height - 50;
        doc.text(rodape, 50, rodapeY, { align: 'center' });
        
        // Finalizar documento
        doc.end();
        
        // Resolver a promise quando o stream for finalizado
        stream.on('finish', () => {
          resolve({
            caminho: caminhoArquivo,
            nome: nomeArquivo,
            url: `/uploads/comprovantes/${nomeArquivo}`
          });
        });
        
        stream.on('error', (err) => {
          reject(err);
        });
        
      } catch (error) {
        console.error('Erro ao gerar comprovante PDF:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Envia um comprovante por WhatsApp
   * @param {string} telefone - Número de telefone do cliente
   * @param {string} caminhoArquivo - Caminho do arquivo PDF do comprovante
   * @param {Object} dados - Dados adicionais para mensagem
   * @returns {Promise<Object>} - Resultado do envio
   */
  /**
   * Verifica se o comprovante está com todos os dados necessários
   * @param {Object} dados - Dados do comprovante
   * @returns {Object} - Dados validados e complementados
   */
  _validarDadosComprovante(dados) {
    // Clone os dados para não modificar o original
    const dadosValidados = { ...dados };
    
    // Garantir que as estruturas básicas existem
    if (!dadosValidados.pedido) dadosValidados.pedido = {};
    if (!dadosValidados.pagamento) dadosValidados.pagamento = {};
    if (!dadosValidados.cliente) dadosValidados.cliente = {};
    
    // Garantir que pagamento tem todas as subpropriedades essenciais inicializadas
    if (!dadosValidados.pagamento.divisao) dadosValidados.pagamento.divisao = [];
    if (!dadosValidados.pagamento.metodo) dadosValidados.pagamento.metodo = null;
    if (!dadosValidados.pagamento.valorPago) dadosValidados.pagamento.valorPago = 0;
    
    // Garantir que pedido tem subpropriedades inicializadas
    if (!dadosValidados.pedido.itens) dadosValidados.pedido.itens = [];
    if (!dadosValidados.pedido.total) dadosValidados.pedido.total = 0;
    
    // Registrar no log se faltar informações críticas
    if (!dadosValidados.pedido._id) {
      console.log('AVISO: ID do pedido não fornecido para envio de comprovante');
    }
    
    if (!dadosValidados.pedido.total && !dadosValidados.pagamento.valorPago) {
      console.log('AVISO: Valor do pedido ou pagamento não fornecido para envio de comprovante');
    }
    
    return dadosValidados;
  }
  
  async enviarComprovanteWhatsApp(telefone, caminhoArquivo, dados) {
    try {
      // Validar e complementar dados do comprovante
      dados = this._validarDadosComprovante(dados);
      // Validar número de telefone (remover caracteres não numéricos)
      telefone = telefone.replace(/\D/g, '');
      
      // Adicionar 55 (Brasil) se não estiver presente e garantir formato correto
      if (!telefone.startsWith('55')) {
        telefone = `55${telefone}`;
      }
      
      // Verificar se é um celular válido
      if (telefone.length !== 13 || !telefone.startsWith('55')) {
        throw new Error('Número de telefone inválido. Formato esperado: 55DDDNÚMERO');
      }
      
      // Extrair dados importantes com validação
      const pedido = dados.pedido || {};
      const pagamento = dados.pagamento || {};
      
      // Obter informações reais do pedido
      const valorTotal = pagamento.valorPago || pedido.total || 0;
      
      // Obter data do pagamento ou data do pedido ou data atual
      let dataPagamento;
      try {
        if (pagamento && pagamento.data) {
          dataPagamento = format(new Date(pagamento.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        } else if (pedido && pedido.data) {
          dataPagamento = format(new Date(pedido.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        } else {
          dataPagamento = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        }
      } catch (err) {
        console.log('Erro ao formatar data para WhatsApp:', err);
        dataPagamento = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      }
      
      // Obter método de pagamento
      let metodoPagamento = 'Não especificado';
      if (pagamento && pagamento.metodo) {
        metodoPagamento = this.formatarMetodoPagamento(pagamento.metodo);
      } else if (pagamento && pagamento.divisao && Array.isArray(pagamento.divisao) && pagamento.divisao.length > 0) {
        metodoPagamento = 'Pagamento dividido';
      }
      
      // Resumo dos itens (limitado a 3 para não deixar a mensagem muito longa)
      let resumoItens = '';
      if (pedido.itens && Array.isArray(pedido.itens) && pedido.itens.length > 0) {
        try {
          const itensExibir = pedido.itens.slice(0, 3); // Limite de 3 itens para não sobrecarregar a mensagem
          resumoItens = itensExibir.map(item => {
            // Buscar o nome do produto de várias possíveis fontes
            let nome = 'Produto';
            try {
              if (item.produto && typeof item.produto === 'object' && item.produto.nome) {
                nome = item.produto.nome;
              } else if (item.item && typeof item.item === 'object' && item.item.nome) {
                nome = item.item.nome;
              } else if (item.nome) {
                nome = item.nome;
              } else if (typeof item === 'string') {
                nome = 'Item ' + item.substring(0, 8) + '...'; // Mostrar parte do ID se for string
              }
            } catch (itemErr) {
              console.log('Erro ao processar nome do item:', itemErr);
            }
            
            // Buscar a quantidade, com valor padrão 1
            const qtd = item.quantidade || 1;
            return `- ${qtd}x ${nome}`;
          }).join('\n');
          
          if (pedido.itens.length > 3) {
            resumoItens += `\n- ...e mais ${pedido.itens.length - 3} item(ns)`;
          }
        } catch (err) {
          console.log('Erro ao processar resumo de itens:', err);
          resumoItens = '- Itens não disponíveis (erro de processamento)';
        }
      }
      
      // Montar a mensagem como caption com informações mais ricas e precisas
      const caption = `*Recanto Verde* 🌿\n\n` +
        `Olá, ${dados.cliente?.nome || 'Cliente'}! Aqui está o comprovante do seu pedido.\n\n` +
        `*Pedido:* ${pedido._id || 'N/A'}\n` +
        `*Valor Total:* R$ ${this.safeToFixed(valorTotal)}\n` +
        (resumoItens ? `\n*Itens:*\n${resumoItens}\n` : '') +
        `\nAgradecemos sua preferência! 😊\n` +
        `Comprovante completo em anexo.`;
      
      // Verificar se há API key e outras configurações
      const whatsappApiKey = process.env.WHATSAPP_API_KEY;
      const whatsappInstance = process.env.WHATSAPP_INSTANCE;
      const whatsappApiDomain = process.env.WHATSAPP_API_DOMAIN;
      
      if (!whatsappApiKey || !whatsappInstance || !whatsappApiDomain) {
        throw new Error('Credenciais ou configurações da API de WhatsApp incompletas.');
      }
      
      // Ler o arquivo como base64
      const fileBuffer = fs.readFileSync(caminhoArquivo);
      const fileBase64 = fileBuffer.toString('base64');
      
      // Preparar o nome do arquivo
      const fileName = `Comprovante_Recanto_Verde_${new Date().getTime()}.pdf`;
      
      // Enviar mensagem via Evolution API
      const response = await axios.post(
        `https://${whatsappApiDomain}/message/sendMedia/${whatsappInstance}`,
        {
          number: telefone,
          mediatype: "document",
          mimetype: "application/pdf",
          media: fileBase64,
          fileName: fileName,
          caption: caption
        },
        {
          headers: {
            'apikey': whatsappApiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return {
        success: true,
        data: response.data,
        message: 'Comprovante enviado com sucesso'
      };
      
    } catch (error) {
      console.error('Erro ao enviar comprovante por WhatsApp:', error);
      
      // Se for um erro da API externa, formatar melhor a mensagem
      if (error.response) {
        return {
          success: false,
          message: `Erro ao enviar: ${error.response.data.message || 'Falha na API de WhatsApp'}`,
          error: error.response.data
        };
      }
      
      return {
        success: false,
        message: `Erro ao enviar comprovante: ${error.message}`,
        error
      };
    }
  }
  
  /**
   * Prepara comprovante para impressão
   * @param {Object} dados - Dados do pedido e pagamento
   * @returns {Promise<Object>} - Dados de impressão
   */
  async prepararImpressao(dados) {
    try {
      // Gerar o PDF primeiro
      const pdfInfo = await this.gerarComprovantePDF(dados);
      
      // Retornar informações para impressão
      return {
        success: true,
        data: {
          arquivo: pdfInfo,
          impressora: process.env.IMPRESSORA_PADRAO || 'default',
          copias: 1,
          // Adicionar mais configurações conforme necessário
        },
        message: 'Comprovante preparado para impressão'
      };
    } catch (error) {
      console.error('Erro ao preparar impressão:', error);
      return {
        success: false,
        message: `Erro ao preparar impressão: ${error.message}`,
        error
      };
    }
  }
  
  /**
   * Formata o método de pagamento
   * @param {string} metodo - Método de pagamento (código)
   * @returns {string} - Nome formatado do método
   */
  formatarMetodoPagamento(metodo) {
    // Verifica se o método foi fornecido
    if (!metodo) return 'Não especificado';
    
    const metodos = {
      'dinheiro': 'Dinheiro',
      'credito': 'Cartão de Crédito',
      'debito': 'Cartão de Débito',
      'pix': 'PIX',
      'transferencia': 'Transferência Bancária',
      'vale': 'Vale-Refeição/Alimentação',
      'outros': 'Outros'
    };
    
    return metodos[metodo] || metodo || 'Não especificado';
  }
}

module.exports = new ComprovanteService();
