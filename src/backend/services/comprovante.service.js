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
   * Gera um comprovante em PDF
   * @param {Object} dados - Dados do pedido e pagamento
   * @returns {Promise<string>} - Caminho do arquivo gerado
   */
  async gerarComprovantePDF(dados) {
    return new Promise(async (resolve, reject) => {
      try {
        const { pedido, pagamento, cliente } = dados;
        
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
        doc.text('Endereço: Rua do Restaurante, 123 - Bairro - Cidade/UF');
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
        doc.text(`Data: ${format(new Date(pedido.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`);
        doc.text(`Atendente: ${pedido.atendente?.nome || 'Não informado'}`);
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
          let nomeItem = item.produto?.nome || 'Produto não especificado';
          if (item.observacao) {
            nomeItem += `\n   Obs: ${item.observacao}`;
          }
          
          doc.text(nomeItem, 50, yInicial, { width: 240 });
          doc.text(item.quantidade.toString(), 300, yInicial);
          doc.text(`R$ ${item.preco.toFixed(2)}`, 370, yInicial, { width: 80, align: 'right' });
          doc.text(`R$ ${(item.quantidade * item.preco).toFixed(2)}`, 450, yInicial, { width: 80, align: 'right' });
          
          // Incrementar Y com espaço extra para itens com observação
          const linhas = item.observacao ? 2 : 1;
          yInicial += 20 * linhas;
        });
        
        // Linha separadora
        yInicial += 10;
        doc.moveTo(50, yInicial)
           .lineTo(550, yInicial)
           .stroke();
        
        // Totais
        yInicial += 20;
        doc.font('Helvetica-Bold');
        doc.text('Subtotal:', 300, yInicial);
        doc.text(`R$ ${pedido.subtotal.toFixed(2)}`, 450, yInicial, { width: 80, align: 'right' });
        
        if (pedido.taxaServico > 0) {
          yInicial += 20;
          doc.text('Taxa de Serviço (10%):', 300, yInicial);
          doc.text(`R$ ${pedido.taxaServico.toFixed(2)}`, 450, yInicial, { width: 80, align: 'right' });
        }
        
        if (pedido.desconto > 0) {
          yInicial += 20;
          doc.text('Desconto:', 300, yInicial);
          doc.text(`R$ ${pedido.desconto.toFixed(2)}`, 450, yInicial, { width: 80, align: 'right' });
        }
        
        yInicial += 20;
        doc.fontSize(12);
        doc.text('TOTAL:', 300, yInicial);
        doc.text(`R$ ${pedido.total.toFixed(2)}`, 450, yInicial, { width: 80, align: 'right' });
        
        // Dados do pagamento
        yInicial += 40;
        doc.fontSize(12).text('Pagamento', 50, yInicial);
        yInicial += 20;
        
        if (pagamento.divisao && pagamento.divisao.length > 0) {
          // Caso de pagamento dividido
          doc.fontSize(10).font('Helvetica');
          doc.text('Pagamento dividido:', 50, yInicial);
          yInicial += 20;
          
          pagamento.divisao.forEach((parte, index) => {
            doc.text(`Parte ${index + 1}: R$ ${parte.valor.toFixed(2)} (${this.formatarMetodoPagamento(parte.metodo)})`, 70, yInicial);
            yInicial += 20;
          });
        } else {
          // Pagamento único
          doc.fontSize(10).font('Helvetica');
          doc.text(`Método: ${this.formatarMetodoPagamento(pagamento.metodo)}`, 50, yInicial);
          yInicial += 20;
          doc.text(`Valor Pago: R$ ${pagamento.valorPago.toFixed(2)}`, 50, yInicial);
          yInicial += 20;
          
          if (pagamento.troco > 0) {
            doc.text(`Troco: R$ ${pagamento.troco.toFixed(2)}`, 50, yInicial);
            yInicial += 20;
          }
        }
        
        // Data e hora do pagamento
        yInicial += 20;
        doc.text(`Pagamento realizado em: ${format(new Date(pagamento.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 50, yInicial);
        
        // QR Code para validação (pode ser link para sistema online)
        try {
          const qrCodeData = `https://recantoverde.com.br/validar/${pedido._id}`;
          const qrBuffer = await qrCodeToBuffer(qrCodeData);
          
          // Verificar se precisa de nova página
          if (yInicial > 650) {
            doc.addPage();
            yInicial = 50;
          } else {
            yInicial += 40;
          }
          
          doc.image(qrBuffer, 200, yInicial, { width: 150 });
          yInicial += 160;
          doc.fontSize(8).text('Escaneie o QR Code para validar este comprovante', { align: 'center' });
        } catch (err) {
          console.error('Erro ao gerar QR Code:', err);
        }
        
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
  async enviarComprovanteWhatsApp(telefone, caminhoArquivo, dados) {
    try {
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
      
      // Montar a mensagem
      const mensagem = `*Recanto Verde* 🌿\n\n` +
        `Olá, ${dados.cliente?.nome || 'Cliente'}! Aqui está o comprovante do seu pagamento.\n\n` +
        `*Pedido:* ${dados.pedido._id}\n` +
        `*Valor:* R$ ${dados.pagamento.valorPago.toFixed(2)}\n` +
        `*Data:* ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}\n\n` +
        `Agradecemos sua preferência! 😊`;
      
      // Verificar se há API key e token configurados
      const whatsappApiKey = process.env.WHATSAPP_API_KEY;
      const whatsappInstanceId = process.env.WHATSAPP_INSTANCE_ID;
      
      if (!whatsappApiKey || !whatsappInstanceId) {
        throw new Error('Credenciais da API de WhatsApp não configuradas.');
      }
      
      // Ler o arquivo como base64
      const fileBuffer = fs.readFileSync(caminhoArquivo);
      const fileBase64 = fileBuffer.toString('base64');
      
      // Enviar mensagem via API WhatsApp (exemplo usando API externa)
      const response = await axios.post(
        `https://api.whatsapp.com/v1/messages`, 
        {
          to: telefone,
          type: 'document',
          document: {
            filename: `Comprovante_Recanto_Verde_${new Date().getTime()}.pdf`,
            mimetype: 'application/pdf',
            data: fileBase64
          },
          caption: mensagem
        },
        {
          headers: {
            'Authorization': `Bearer ${whatsappApiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Instance-Id': whatsappInstanceId
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
   * Formata o método de pagamento para exibição
   * @param {string} metodo - Código do método de pagamento
   * @returns {string} - Nome formatado do método
   */
  formatarMetodoPagamento(metodo) {
    const metodos = {
      'dinheiro': 'Dinheiro',
      'credito': 'Cartão de Crédito',
      'debito': 'Cartão de Débito',
      'pix': 'PIX',
      'vale': 'Vale-Refeição/Alimentação',
      'outros': 'Outros'
    };
    
    return metodos[metodo] || 'Não especificado';
  }
}

module.exports = new ComprovanteService();
