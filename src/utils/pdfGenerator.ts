import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ConfiguracaoEmpresa {
  nome_empresa: string;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  logo_url: string | null;
}

interface Cliente {
  nome: string;
  cpf_cnpj: string;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
}

interface OrcamentoItem {
  descricao: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  peso?: number;
}

interface DadosOrcamento {
  numero: string;
  data: string;
  validade: string;
  cliente: Cliente;
  itens: OrcamentoItem[];
  valor_total: number;
  observacoes?: string;
}

export async function gerarPDFOrcamento(
  dados: DadosOrcamento,
  config: ConfiguracaoEmpresa
): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  // Cor principal para o tema
  const primaryColor: [number, number, number] = [41, 128, 185]; // Azul profissional
  const lightGray: [number, number, number] = [245, 245, 245];

  // Cabeçalho com fundo colorido
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Nome da empresa em branco
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(config.nome_empresa.toUpperCase(), pageWidth / 2, 20, { align: 'center' });

  // Informações da empresa em branco
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  let headerY = 28;
  const infoEmpresa: string[] = [];
  if (config.cnpj) infoEmpresa.push(`CNPJ: ${config.cnpj}`);
  if (config.telefone) infoEmpresa.push(`Tel: ${config.telefone}`);
  if (config.email) infoEmpresa.push(`Email: ${config.email}`);
  
  const infoLine = infoEmpresa.join(' | ');
  doc.text(infoLine, pageWidth / 2, headerY, { align: 'center' });
  headerY += 5;
  
  if (config.endereco) {
    doc.text(config.endereco, pageWidth / 2, headerY, { align: 'center' });
  }

  // Resetar cor do texto
  doc.setTextColor(0, 0, 0);
  yPos = 60;

  // Título do orçamento com destaque
  doc.setFillColor(...lightGray);
  doc.rect(15, yPos - 5, pageWidth - 30, 15, 'F');
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('ORÇAMENTO', pageWidth / 2, yPos + 5, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  yPos += 20;

  // Box de informações do orçamento
  doc.setFillColor(...lightGray);
  doc.roundedRect(15, yPos, (pageWidth - 30) / 2 - 5, 25, 2, 2, 'F');
  doc.roundedRect(pageWidth / 2 + 5, yPos, (pageWidth - 30) / 2 - 5, 25, 2, 2, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('NÚMERO:', 20, yPos + 7);
  doc.text('DATA DE EMISSÃO:', 20, yPos + 14);
  doc.text('VALIDADE:', 20, yPos + 21);

  doc.text('CLIENTE:', pageWidth / 2 + 10, yPos + 7);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(dados.numero, 45, yPos + 7);
  doc.text(dados.data, 60, yPos + 14);
  doc.text(dados.validade, 45, yPos + 21);
  doc.text(dados.cliente.nome, pageWidth / 2 + 10, yPos + 14);

  yPos += 30;

  // Dados completos do cliente em box
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, yPos, pageWidth - 30, 30, 2, 2);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('DADOS DO CLIENTE', 20, yPos + 7);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  let clienteY = yPos + 14;
  doc.text(`Nome: ${dados.cliente.nome}`, 20, clienteY);
  clienteY += 5;
  doc.text(`CPF/CNPJ: ${dados.cliente.cpf_cnpj}`, 20, clienteY);
  
  if (dados.cliente.telefone) {
    doc.text(`Telefone: ${dados.cliente.telefone}`, pageWidth / 2 + 10, yPos + 14);
  }
  if (dados.cliente.email) {
    doc.text(`Email: ${dados.cliente.email}`, pageWidth / 2 + 10, yPos + 19);
  }
  
  yPos += 35;

  // Tabela de produtos
  const tableData = dados.itens.map(item => [
    item.descricao,
    item.quantidade.toString(),
    item.peso ? `${item.peso} kg` : '-',
    `R$ ${item.preco_unitario.toFixed(2)}`,
    `R$ ${item.subtotal.toFixed(2)}`
  ]);

  // Título da tabela
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('ITENS DO ORÇAMENTO', 20, yPos);
  yPos += 5;

  autoTable(doc, {
    startY: yPos,
    head: [['Produto', 'Qtd', 'Peso/Un', 'Preço Unit.', 'Subtotal']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 9
    },
    alternateRowStyles: {
      fillColor: lightGray
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'center', cellWidth: 25 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 30 }
    },
    margin: { left: 15, right: 15 }
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Box de totais
  const pesoTotal = dados.itens.reduce((sum, item) => 
    sum + ((item.peso || 0) * item.quantidade), 0
  );

  const boxHeight = pesoTotal > 0 ? 25 : 18;
  doc.setFillColor(...primaryColor);
  doc.roundedRect(pageWidth - 85, yPos, 70, boxHeight, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  
  let totalY = yPos + 7;
  if (pesoTotal > 0) {
    doc.text(`Peso Total: ${pesoTotal.toFixed(2)} kg`, pageWidth - 80, totalY);
    totalY += 7;
  }

  doc.setFontSize(12);
  doc.text('VALOR TOTAL:', pageWidth - 80, totalY);
  doc.setFontSize(14);
  doc.text(`R$ ${dados.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - 80, totalY + 8);
  
  doc.setTextColor(0, 0, 0);
  yPos += boxHeight + 10;

  // Observações
  if (dados.observacoes) {
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.roundedRect(15, yPos, pageWidth - 30, 35, 2, 2);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('OBSERVAÇÕES', 20, yPos + 7);
    
    yPos += 12;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const splitObs = doc.splitTextToSize(dados.observacoes, pageWidth - 40);
    doc.text(splitObs, 20, yPos);
    yPos += (splitObs.length * 5) + 15;
  }

  // Rodapé com fundo
  doc.setFillColor(...primaryColor);
  doc.rect(0, pageHeight - 25, pageWidth, 25, 'F');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(
    `Orçamento válido até ${dados.validade}`,
    pageWidth / 2,
    pageHeight - 15,
    { align: 'center' }
  );
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Agradecemos sua preferência!',
    pageWidth / 2,
    pageHeight - 9,
    { align: 'center' }
  );

  return doc.output('blob');
}

export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}