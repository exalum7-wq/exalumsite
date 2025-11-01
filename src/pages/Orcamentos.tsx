// @ts-nocheck - Temporary fix until Supabase types are regenerated
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Phone, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import AddOrcamentoDialog from "@/components/orcamentos/AddOrcamentoDialog";
import { gerarPDFOrcamento, downloadPDF } from "@/utils/pdfGenerator";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Orcamento {
  id: string;
  numero: string;
  valor_total: number;
  status: string;
  created_at: string;
  clientes: { nome: string } | null;
}

export default function Orcamentos() {
  const { isAdmin } = useAuth();
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  const fetchOrcamentos = async () => {
    try {
      const { data, error } = await supabase
        .from('orcamentos')
        .select('id, numero, valor_total, status, created_at, clientes(nome)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrcamentos(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar orçamentos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrcamentos();
  }, []);

  const handleGerarPDF = async (orcamentoId: string) => {
    setGeneratingPdf(orcamentoId);
    try {
      // Buscar dados do orçamento
      const { data: orcamento, error: orcError } = await supabase
        .from('orcamentos')
        .select('*, clientes(*), orcamento_itens(*, produtos(*))')
        .eq('id', orcamentoId)
        .single();

      if (orcError) throw orcError;

      // Buscar configurações
      const { data: config, error: confError } = await supabase
        .from('configuracoes')
        .select('*')
        .limit(1)
        .single();

      if (confError) throw confError;

      const dataAtual = new Date(orcamento.created_at).toLocaleDateString('pt-BR');
      const dataValidade = new Date(orcamento.created_at);
      dataValidade.setDate(dataValidade.getDate() + 7);

      const dadosOrcamento = {
        numero: orcamento.numero,
        data: dataAtual,
        validade: dataValidade.toLocaleDateString('pt-BR'),
        cliente: orcamento.clientes,
        itens: (orcamento.orcamento_itens || []).map((item: any) => ({
          descricao: item.produtos?.descricao || '',
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          subtotal: item.subtotal,
          peso: item.produtos?.peso,
        })),
        valor_total: orcamento.valor_total,
        observacoes: orcamento.observacoes,
      };

      const pdfBlob = await gerarPDFOrcamento(dadosOrcamento, config);
      downloadPDF(pdfBlob, `orcamento_${orcamento.numero}.pdf`);

      toast({
        title: "PDF gerado!",
        description: "O arquivo foi baixado com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao gerar PDF",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingPdf(null);
    }
  };

  const handleWhatsApp = async (orcamentoId: string) => {
    try {
      const { data: orcamento } = await supabase
        .from('orcamentos')
        .select('numero, clientes(nome, telefone)')
        .eq('id', orcamentoId)
        .single();

      if (!orcamento?.clientes?.telefone) {
        toast({
          title: "Telefone não cadastrado",
          description: "Este cliente não possui telefone cadastrado",
          variant: "destructive",
        });
        return;
      }

      const telefone = orcamento.clientes.telefone.replace(/\D/g, '');
      const mensagem = encodeURIComponent(
        `Olá ${orcamento.clientes.nome}! Segue o orçamento ${orcamento.numero}.`
      );
      window.open(`https://wa.me/55${telefone}?text=${mensagem}`, '_blank');
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (orcamentoId: string, newStatus: string) => {
    try {
      if (newStatus === 'aprovado') {
        // Chamar função para processar orçamento e debitar do estoque
        const { data, error } = await supabase.rpc('processar_orcamento_aprovado', {
          orcamento_id_param: orcamentoId
        });

        if (error) throw error;

        if (!data.success) {
          toast({
            title: "Estoque insuficiente",
            description: data.message,
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Orçamento aprovado!",
          description: data.message,
        });
      } else {
        // Para outros status, apenas atualizar
        const { error } = await supabase
          .from('orcamentos')
          .update({ status: newStatus })
          .eq('id', orcamentoId);

        if (error) throw error;

        toast({
          title: "Status atualizado!",
          description: "O status do orçamento foi alterado com sucesso",
        });
      }

      fetchOrcamentos();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredOrcamentos = orcamentos.filter((orcamento) =>
    orcamento.clientes?.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Orçamentos</h2>
          <p className="text-muted-foreground">Gerencie orçamentos e propostas</p>
        </div>
        {isAdmin && <AddOrcamentoDialog onOrcamentoAdded={fetchOrcamentos} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Lista de Orçamentos
          </CardTitle>
          <div className="mt-4">
            <Input
              placeholder="Buscar por cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando orçamentos...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrcamentos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? "Nenhum orçamento encontrado para este cliente." : `Nenhum orçamento cadastrado. ${isAdmin ? "Clique em 'Novo Orçamento' para criar." : ""}`}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrcamentos.map((orcamento) => (
                    <TableRow key={orcamento.id}>
                      <TableCell className="font-medium">{orcamento.numero}</TableCell>
                      <TableCell>{orcamento.clientes?.nome || "-"}</TableCell>
                      <TableCell>
                        {new Date(orcamento.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        R$ {orcamento.valor_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <Select
                            value={orcamento.status}
                            onValueChange={(value) => handleStatusChange(orcamento.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendente">Pendente</SelectItem>
                              <SelectItem value="aprovado">Aprovado</SelectItem>
                              <SelectItem value="rejeitado">Rejeitado</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={orcamento.status === "aprovado" ? "default" : "secondary"}>
                            {orcamento.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGerarPDF(orcamento.id)}
                            disabled={generatingPdf === orcamento.id}
                          >
                            {generatingPdf === orcamento.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4 mr-1" />
                            )}
                            PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleWhatsApp(orcamento.id)}
                          >
                            <Phone className="h-4 w-4 mr-1" />
                            WhatsApp
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
