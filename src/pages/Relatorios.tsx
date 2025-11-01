// @ts-nocheck - Temporary fix until Supabase types are regenerated
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, FileDown, Calendar, TrendingUp, Package, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Relatorios() {
  const [loading, setLoading] = useState(false);

  const generateVendasReport = async () => {
    setLoading(true);
    try {
      const { data: vendas } = await supabase
        .from('vendas')
        .select('*, clientes(nome), venda_itens(*, produtos(descricao))')
        .order('created_at', { ascending: false });

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Relatório de Vendas", 14, 20);
      doc.setFontSize(11);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);

      const tableData = (vendas || []).map(v => [
        v.numero,
        v.clientes?.nome || '-',
        `R$ ${v.valor_total?.toFixed(2)}`,
        v.status,
        new Date(v.created_at).toLocaleDateString('pt-BR')
      ]);

      autoTable(doc, {
        startY: 40,
        head: [['Número', 'Cliente', 'Valor', 'Status', 'Data']],
        body: tableData,
      });

      doc.save("relatorio-vendas.pdf");
      toast({ title: "Relatório gerado com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao gerar relatório", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generateEstoqueReport = async () => {
    setLoading(true);
    try {
      const { data: estoque } = await supabase
        .from('estoque')
        .select('*, produtos(codigo, descricao, preco_venda)')
        .order('quantidade', { ascending: true });

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Relatório de Estoque", 14, 20);
      doc.setFontSize(11);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);

      const tableData = (estoque || []).map(e => [
        e.produtos?.codigo || '-',
        e.produtos?.descricao || '-',
        e.quantidade?.toString() || '0',
        e.quantidade_minima?.toString() || '0',
        `R$ ${((e.quantidade || 0) * (e.produtos?.preco_venda || 0)).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: 40,
        head: [['Código', 'Produto', 'Qtd', 'Mínimo', 'Valor Total']],
        body: tableData,
      });

      doc.save("relatorio-estoque.pdf");
      toast({ title: "Relatório gerado com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao gerar relatório", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generateFinanceiroReport = async () => {
    setLoading(true);
    try {
      const { data: transacoes } = await supabase
        .from('transacoes_financeiras')
        .select('*')
        .order('data', { ascending: false });

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Relatório Financeiro", 14, 20);
      doc.setFontSize(11);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);

      const receitas = (transacoes || []).filter(t => t.tipo === 'receita').reduce((sum, t) => sum + t.valor, 0);
      const despesas = (transacoes || []).filter(t => t.tipo === 'despesa').reduce((sum, t) => sum + t.valor, 0);

      doc.text(`Total Receitas: R$ ${receitas.toFixed(2)}`, 14, 40);
      doc.text(`Total Despesas: R$ ${despesas.toFixed(2)}`, 14, 47);
      doc.text(`Saldo: R$ ${(receitas - despesas).toFixed(2)}`, 14, 54);

      const tableData = (transacoes || []).map(t => [
        t.descricao,
        t.tipo,
        `R$ ${t.valor?.toFixed(2)}`,
        t.status,
        new Date(t.data).toLocaleDateString('pt-BR')
      ]);

      autoTable(doc, {
        startY: 65,
        head: [['Descrição', 'Tipo', 'Valor', 'Status', 'Data']],
        body: tableData,
      });

      doc.save("relatorio-financeiro.pdf");
      toast({ title: "Relatório gerado com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao gerar relatório", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generateProdutosMaisVendidosReport = async () => {
    setLoading(true);
    try {
      const { data: itens } = await supabase
        .from('venda_itens')
        .select('quantidade, produtos(descricao, codigo)');

      const produtosMap = new Map();
      (itens || []).forEach(item => {
        const produtoNome = item.produtos?.descricao || 'Desconhecido';
        const codigo = item.produtos?.codigo || '-';
        const key = `${codigo}-${produtoNome}`;
        produtosMap.set(key, (produtosMap.get(key) || 0) + item.quantidade);
      });

      const produtosArray = Array.from(produtosMap.entries())
        .map(([key, qtd]) => {
          const [codigo, nome] = key.split('-');
          return [codigo, nome, qtd];
        })
        .sort((a, b) => b[2] - a[2])
        .slice(0, 20);

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Produtos Mais Vendidos", 14, 20);
      doc.setFontSize(11);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);

      autoTable(doc, {
        startY: 40,
        head: [['Código', 'Produto', 'Quantidade Vendida']],
        body: produtosArray,
      });

      doc.save("relatorio-produtos-mais-vendidos.pdf");
      toast({ title: "Relatório gerado com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao gerar relatório", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generateClientesAtivosReport = async () => {
    setLoading(true);
    try {
      const { data: vendas } = await supabase
        .from('vendas')
        .select('clientes(nome, cpf_cnpj, telefone), valor_total');

      const clientesMap = new Map();
      (vendas || []).forEach(venda => {
        const clienteNome = venda.clientes?.nome || 'Desconhecido';
        if (!clientesMap.has(clienteNome)) {
          clientesMap.set(clienteNome, {
            nome: clienteNome,
            cpf: venda.clientes?.cpf_cnpj || '-',
            telefone: venda.clientes?.telefone || '-',
            total: 0,
            compras: 0
          });
        }
        const cliente = clientesMap.get(clienteNome);
        cliente.total += venda.valor_total || 0;
        cliente.compras += 1;
      });

      const clientesArray = Array.from(clientesMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 20);

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Clientes Mais Ativos", 14, 20);
      doc.setFontSize(11);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);

      const tableData = clientesArray.map(c => [
        c.nome,
        c.cpf,
        c.telefone,
        c.compras.toString(),
        `R$ ${c.total.toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: 40,
        head: [['Cliente', 'CPF/CNPJ', 'Telefone', 'Compras', 'Total Gasto']],
        body: tableData,
      });

      doc.save("relatorio-clientes-ativos.pdf");
      toast({ title: "Relatório gerado com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao gerar relatório", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generateOrcamentosReport = async () => {
    setLoading(true);
    try {
      const { data: orcamentos } = await supabase
        .from('orcamentos')
        .select('*, clientes(nome)')
        .order('created_at', { ascending: false });

      const total = orcamentos?.length || 0;
      const aprovados = orcamentos?.filter(o => o.status === 'aprovado').length || 0;
      const taxaConversao = total > 0 ? ((aprovados / total) * 100).toFixed(1) : '0';

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Relatório de Orçamentos", 14, 20);
      doc.setFontSize(11);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
      doc.text(`Taxa de Conversão: ${taxaConversao}%`, 14, 40);

      const tableData = (orcamentos || []).map(o => [
        o.numero,
        o.clientes?.nome || '-',
        `R$ ${o.valor_total?.toFixed(2)}`,
        o.status,
        new Date(o.created_at).toLocaleDateString('pt-BR')
      ]);

      autoTable(doc, {
        startY: 50,
        head: [['Número', 'Cliente', 'Valor', 'Status', 'Data']],
        body: tableData,
      });

      doc.save("relatorio-orcamentos.pdf");
      toast({ title: "Relatório gerado com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao gerar relatório", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generatePedidosReport = async () => {
    setLoading(true);
    try {
      const { data: pedidos } = await supabase
        .from('pedidos')
        .select('*, clientes(nome)')
        .order('data_pedido', { ascending: false });

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Relatório de Pedidos", 14, 20);
      doc.setFontSize(11);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);

      const tableData = (pedidos || []).map(p => [
        p.numero,
        p.clientes?.nome || '-',
        `R$ ${p.valor_total?.toFixed(2)}`,
        p.status,
        new Date(p.data_pedido).toLocaleDateString('pt-BR')
      ]);

      autoTable(doc, {
        startY: 40,
        head: [['Número', 'Cliente', 'Valor', 'Status', 'Data']],
        body: tableData,
      });

      doc.save("relatorio-pedidos.pdf");
      toast({ title: "Relatório gerado com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao gerar relatório", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Relatórios</h2>
        <p className="text-muted-foreground">Gere relatórios detalhados em PDF</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-primary" />
              Relatório de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Análise completa de vendas com detalhamento por produto e cliente
            </p>
            <Button 
              className="w-full gap-2" 
              onClick={generateVendasReport}
              disabled={loading}
            >
              <FileDown className="h-4 w-4" />
              Gerar PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5 text-primary" />
              Relatório de Estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Posição atual de estoque com valores e quantidades mínimas
            </p>
            <Button 
              className="w-full gap-2"
              onClick={generateEstoqueReport}
              disabled={loading}
            >
              <FileDown className="h-4 w-4" />
              Gerar PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-primary" />
              Relatório Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Fluxo de caixa com receitas, despesas e saldo consolidado
            </p>
            <Button 
              className="w-full gap-2"
              onClick={generateFinanceiroReport}
              disabled={loading}
            >
              <FileDown className="h-4 w-4" />
              Gerar PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5 text-primary" />
              Produtos Mais Vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Ranking dos 20 produtos com maior volume de vendas
            </p>
            <Button 
              className="w-full gap-2"
              onClick={generateProdutosMaisVendidosReport}
              disabled={loading}
            >
              <FileDown className="h-4 w-4" />
              Gerar PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-primary" />
              Clientes Mais Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Top 20 clientes por volume de compras e valor total
            </p>
            <Button 
              className="w-full gap-2"
              onClick={generateClientesAtivosReport}
              disabled={loading}
            >
              <FileDown className="h-4 w-4" />
              Gerar PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-primary" />
              Orçamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Análise de orçamentos com taxa de conversão em vendas
            </p>
            <Button 
              className="w-full gap-2"
              onClick={generateOrcamentosReport}
              disabled={loading}
            >
              <FileDown className="h-4 w-4" />
              Gerar PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5 text-primary" />
              Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Relatório completo de todos os pedidos realizados
            </p>
            <Button 
              className="w-full gap-2"
              onClick={generatePedidosReport}
              disabled={loading}
            >
              <FileDown className="h-4 w-4" />
              Gerar PDF
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
