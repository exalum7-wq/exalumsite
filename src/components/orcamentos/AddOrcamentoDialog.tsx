R,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Download, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { gerarPDFOrcamento, downloadPDF } from "@/utils/pdfGenerator";

interface Cliente {
  id: string;
  nome: string;
  cpf_cnpj: string;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
}

interface Produto {
  id: string;
  descricao: string;
  preco_venda: number;
  peso: number | null;
  estoque: Array<{ quantidade: number }>;
}

interface ItemOrcamento {
  produto_id: string;
  descricao: string;
  quantidade: number;
  preco_unitario: number;
  peso: number | null;
}

export default function AddOrcamentoDialog({ onOrcamentoAdded }: { onOrcamentoAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [itens, setItens] = useState<ItemOrcamento[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState("");
  const [quantidade, setQuantidade] = useState(1);

  useEffect(() => {
    if (open) {
      fetchClientes();
      fetchProdutos();
    }
  }, [open]);

  const fetchClientes = async () => {
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .order('nome');
    if (data) setClientes(data);
  };

  const fetchProdutos = async () => {
    const { data } = await supabase
      .from('produtos')
      .select('id, descricao, preco_venda, peso, estoque(quantidade)')
      .order('descricao');
    if (data) {
      const productsWithEstoque = data.map(p => ({
        ...p,
        estoque: Array.isArray(p.estoque) ? p.estoque : [p.estoque]
      }));
      setProdutos(productsWithEstoque as Produto[]);
    }
  };

  const addItem = () => {
    if (!produtoSelecionado || quantidade <= 0) return;

    const produto = produtos.find(p => p.id === produtoSelecionado);
    if (!produto) return;

    const estoque = produto.estoque[0]?.quantidade || 0;
    if (quantidade > estoque) {
      toast({
        title: "Estoque insuficiente",
        description: `Apenas ${estoque} unidades disponíveis`,
        variant: "destructive",
      });
      return;
    }

    const itemExistente = itens.find(i => i.produto_id === produtoSelecionado);
    if (itemExistente) {
      toast({
        title: "Produto já adicionado",
        description: "Remova o item existente antes de adicionar novamente",
        variant: "destructive",
      });
      return;
    }

    const precoUnitario = produto.peso && produto.peso > 0 
      ? (produto.preco_venda / produto.peso)
      : produto.preco_venda;

    setItens([...itens, {
      produto_id: produto.id,
      descricao: produto.descricao,
      quantidade,
      preco_unitario: precoUnitario,
      peso: produto.peso,
    }]);

    setProdutoSelecionado("");
    setQuantidade(1);
  };

  const removeItem = (produto_id: string) => {
    setItens(itens.filter(i => i.produto_id !== produto_id));
  };

  const handleSubmit = async (gerarPDF: boolean = false) => {
    if (!clienteId || itens.length === 0) {
      toast({
        title: "Dados incompletos",
        description: "Selecione um cliente e adicione produtos",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Gerar número do orçamento
      const { data: numeroOrcamento } = await supabase.rpc('gerar_numero_orcamento');

      // Criar orçamento
      const valorTotal = itens.reduce((sum, item) => sum + (item.quantidade * item.preco_unitario), 0);
      
      const { data: orcamento, error: orcError } = await supabase
        .from('orcamentos')
        .insert({
          numero: numeroOrcamento,
          cliente_id: clienteId,
          valor_total: valorTotal,
          observacoes: observacoes || null,
          status: 'pendente',
        })
        .select()
        .single();

      if (orcError) throw orcError;

      // Adicionar itens
      const orcamentoItens = itens.map(item => ({
        orcamento_id: orcamento.id,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        subtotal: item.quantidade * item.preco_unitario,
      }));

      const { error: itensError } = await supabase
        .from('orcamento_itens')
        .insert(orcamentoItens);

      if (itensError) throw itensError;

      toast({
        title: "Orçamento criado!",
        description: `Orçamento ${numeroOrcamento} criado com sucesso`,
      });

      // Gerar PDF se solicitado
      if (gerarPDF) {
        await gerarEBaixarPDF(orcamento.id, numeroOrcamento);
      }

      setOpen(false);
      resetForm();
      onOrcamentoAdded();
    } catch (error: any) {
      toast({
        title: "Erro ao criar orçamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const gerarEBaixarPDF = async (orcamentoId: string, numeroOrcamento: string) => {
    try {
      // Buscar dados completos
      const { data: config } = await supabase
        .from('configuracoes')
        .select('*')
        .limit(1)
        .single();

      const { data: cliente } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .single();

      if (!config || !cliente) throw new Error('Dados não encontrados');

      const dataAtual = new Date().toLocaleDateString('pt-BR');
      const dataValidade = new Date();
      dataValidade.setDate(dataValidade.getDate() + 7);

      const dadosOrcamento = {
        numero: numeroOrcamento,
        data: dataAtual,
        validade: dataValidade.toLocaleDateString('pt-BR'),
        cliente,
        itens: itens.map(item => ({
          descricao: item.descricao,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          subtotal: item.quantidade * item.preco_unitario,
          peso: item.peso || undefined,
        })),
        valor_total: itens.reduce((sum, item) => sum + (item.quantidade * item.preco_unitario), 0),
        observacoes,
      };

      const pdfBlob = await gerarPDFOrcamento(dadosOrcamento, config);
      downloadPDF(pdfBlob, `orcamento_${numeroOrcamento}.pdf`);
    } catch (error: any) {
      toast({
        title: "Erro ao gerar PDF",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setClienteId("");
    setObservacoes("");
    setItens([]);
    setProdutoSelecionado("");
    setQuantidade(1);
  };

  const valorTotal = itens.reduce((sum, item) => sum + (item.quantidade * item.preco_unitario), 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Orçamento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Orçamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map(cliente => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.nome} - {cliente.cpf_cnpj}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border border-border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold">Adicionar Produtos</h3>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2 space-y-2">
                <Label>Produto</Label>
                <Select value={produtoSelecionado} onValueChange={setProdutoSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos.map(produto => {
                      const estoque = produto.estoque[0]?.quantidade || 0;
                      return (
                        <SelectItem key={produto.id} value={produto.id}>
                          {produto.descricao} - R$ {produto.preco_venda.toFixed(2)} (Estoque: {estoque})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantidade</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={quantidade}
                    onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
                  />
                  <Button onClick={addItem} type="button">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {itens.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Itens do Orçamento:</h4>
                <div className="space-y-2">
                  {itens.map((item) => (
                    <div key={item.produto_id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{item.descricao}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantidade} x R$ {item.preco_unitario.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-semibold">
                          R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                        </p>
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => removeItem(item.produto_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-xl font-bold text-right">
                    Total: R$ {valorTotal.toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Informações adicionais sobre o orçamento..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={() => handleSubmit(false)} disabled={loading}>
              Salvar
            </Button>
            <Button onClick={() => handleSubmit(true)} disabled={loading}>
              <Download className="h-4 w-4 mr-2" />
              Salvar e Gerar PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}