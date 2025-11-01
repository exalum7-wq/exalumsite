import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingCart, Search, Package, Filter, X, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { BuscaPorFoto } from "@/components/BuscaPorFoto";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Produto {
  id: string;
  codigo: string;
  descricao: string;
  preco_venda: number;
  tipo: string | null;
  liga: string | null;
  cor: string | null;
  foto_url: string | null;
  peso: number | null;
  unidade: string;
  estoque?: { quantidade: number };
}

interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
}

export default function CatalogoPublico() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroLiga, setFiltroLiga] = useState<string>("todos");
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefoneCliente, setTelefoneCliente] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);

  const fetchProdutos = async () => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*, estoque(quantidade)')
        .order('descricao');

      if (error) throw error;
      setProdutos(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar produtos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProdutos();
  }, []);

  const adicionarAoCarrinho = (produto: Produto) => {
    const itemExistente = carrinho.find(item => item.produto.id === produto.id);
    
    if (itemExistente) {
      setCarrinho(carrinho.map(item =>
        item.produto.id === produto.id
          ? { ...item, quantidade: item.quantidade + 1 }
          : item
      ));
    } else {
      setCarrinho([...carrinho, { produto, quantidade: 1 }]);
    }

    toast({
      title: "Produto adicionado!",
      description: `${produto.descricao} foi adicionado ao carrinho`,
    });
  };

  const removerDoCarrinho = (produtoId: string) => {
    setCarrinho(carrinho.filter(item => item.produto.id !== produtoId));
  };

  const atualizarQuantidade = (produtoId: string, quantidade: number) => {
    if (quantidade < 1) {
      removerDoCarrinho(produtoId);
      return;
    }
    
    setCarrinho(carrinho.map(item =>
      item.produto.id === produtoId
        ? { ...item, quantidade }
        : item
    ));
  };

  const produtosFiltrados = produtos.filter(produto => {
    const matchSearch = produto.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       produto.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = filtroTipo === "todos" || produto.tipo === filtroTipo;
    const matchLiga = filtroLiga === "todos" || produto.liga === filtroLiga;
    
    return matchSearch && matchTipo && matchLiga;
  });

  const tipos = [...new Set(produtos.map(p => p.tipo).filter(Boolean))];
  const ligas = [...new Set(produtos.map(p => p.liga).filter(Boolean))];

  const totalCarrinho = carrinho.reduce((total, item) => 
    total + (item.produto.preco_venda * item.quantidade), 0
  );

  const totalItens = carrinho.reduce((total, item) => total + item.quantidade, 0);

  const finalizarPedido = async () => {
    if (!nomeCliente || !telefoneCliente) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, preencha seu nome e telefone",
        variant: "destructive",
      });
      return;
    }

    if (carrinho.length === 0) {
      toast({
        title: "Carrinho vazio",
        description: "Adicione produtos ao carrinho antes de finalizar",
        variant: "destructive",
      });
      return;
    }

    setEnviandoPedido(true);
    try {
      let clienteId: string | null = null;

      const cpfCnpj = telefoneCliente.replace(/\D/g, '');
      const { data: clienteExistente } = await supabase
        .from('clientes')
        .select('id')
        .eq('cpf_cnpj', cpfCnpj)
        .maybeSingle();

      if (clienteExistente) {
        clienteId = clienteExistente.id;
      } else {
        const { data: novoCliente, error: clienteError } = await supabase
          .from('clientes')
          .insert({
            nome: nomeCliente,
            telefone: telefoneCliente,
            cpf_cnpj: cpfCnpj,
          })
          .select('id')
          .single();

        if (clienteError) throw clienteError;
        clienteId = novoCliente.id;
      }

      const numeroPedido = `PED-${Date.now()}`;
      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .insert({
          numero: numeroPedido,
          cliente_id: clienteId,
          status: 'pendente',
          valor_total: totalCarrinho,
          observacoes: observacoes || null,
        })
        .select('id')
        .single();

      if (pedidoError) throw pedidoError;

      const itens = carrinho.map(item => ({
        pedido_id: pedido.id,
        produto_id: item.produto.id,
        quantidade: item.quantidade,
        preco_unitario: item.produto.preco_venda,
        subtotal: item.quantidade * item.produto.preco_venda,
      }));

      const { error: itensError } = await supabase
        .from('pedido_itens')
        .insert(itens);

      if (itensError) throw itensError;

      toast({
        title: "Pedido enviado com sucesso!",
        description: `Seu pedido ${numeroPedido} foi registrado. Entraremos em contato em breve.`,
      });

      setCarrinho([]);
      setNomeCliente("");
      setTelefoneCliente("");
      setObservacoes("");
      setCarrinhoAberto(false);
    } catch (error: any) {
      toast({
        title: "Erro ao enviar pedido",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setEnviandoPedido(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center shadow-lg">
                <Package className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Catálogo Exalum</h1>
                <p className="text-sm text-gray-600">Produtos de qualidade premium</p>
              </div>
            </div>

            <Sheet open={carrinhoAberto} onOpenChange={setCarrinhoAberto}>
              <SheetTrigger asChild>
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all relative h-12 px-6">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  <span className="hidden sm:inline">Carrinho</span>
                  {totalItens > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 bg-red-500">
                      {totalItens}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-lg">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Meu Carrinho
                  </SheetTitle>
                  <SheetDescription>
                    {totalItens} {totalItens === 1 ? 'item' : 'itens'} no carrinho
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-8 space-y-4">
                  {carrinho.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <ShoppingCart className="h-16 w-16 mx-auto mb-4 opacity-20" />
                      <p>Seu carrinho está vazio</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                        {carrinho.map(item => (
                          <Card key={item.produto.id}>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-sm">{item.produto.descricao}</h4>
                                  <p className="text-xs text-muted-foreground">{item.produto.codigo}</p>
                                  <p className="text-sm font-bold text-primary mt-1">
                                    R$ {item.produto.preco_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/kg
                                  </p>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => atualizarQuantidade(item.produto.id, item.quantidade - 1)}
                                  >
                                    -
                                  </Button>
                                  <span className="w-8 text-center font-medium">{item.quantidade}</span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => atualizarQuantidade(item.produto.id, item.quantidade + 1)}
                                  >
                                    +
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removerDoCarrinho(item.produto.id)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      <div className="border-t pt-4 space-y-4">
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="nome">Seu Nome</Label>
                            <Input
                              id="nome"
                              placeholder="Digite seu nome completo"
                              value={nomeCliente}
                              onChange={(e) => setNomeCliente(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="telefone">Telefone/WhatsApp</Label>
                            <Input
                              id="telefone"
                              placeholder="(00) 00000-0000"
                              value={telefoneCliente}
                              onChange={(e) => setTelefoneCliente(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="observacoes">Observações (opcional)</Label>
                            <Textarea
                              id="observacoes"
                              placeholder="Alguma observação sobre o pedido?"
                              value={observacoes}
                              onChange={(e) => setObservacoes(e.target.value)}
                              rows={3}
                            />
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-lg font-bold">
                          <span>Total:</span>
                          <span className="text-primary">
                            R$ {totalCarrinho.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <Button
                          size="lg"
                          className="w-full bg-green-600 hover:bg-green-700"
                          onClick={finalizarPedido}
                          disabled={enviandoPedido}
                        >
                          <Send className="h-5 w-5 mr-2" />
                          {enviandoPedido ? "Enviando..." : "Enviar Pedido"}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gradient-to-br from-blue-50 to-slate-50 border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Filter className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Filtrar Produtos</h2>
            </div>
          
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Buscar produtos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 rounded-xl"
                  />
                </div>

                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="h-12 border-2 border-gray-200 focus:ring-4 focus:ring-blue-100 rounded-xl">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    {tipos.map(tipo => (
                      <SelectItem key={tipo} value={tipo!}>{tipo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filtroLiga} onValueChange={setFiltroLiga}>
                  <SelectTrigger className="h-12 border-2 border-gray-200 focus:ring-4 focus:ring-blue-100 rounded-xl">
                    <SelectValue placeholder="Liga" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas as ligas</SelectItem>
                    {ligas.map(liga => (
                      <SelectItem key={liga} value={liga!}>{liga}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-center pt-2">
                <BuscaPorFoto onBuscar={setSearchTerm} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="container mx-auto px-4 py-12">
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <p className="mt-6 text-gray-600 text-lg">Carregando produtos...</p>
          </div>
        ) : produtosFiltrados.length === 0 ? (
          <div className="text-center py-20">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Nenhum produto encontrado</h3>
              <p className="text-gray-600">Tente usar termos diferentes na busca ou ajustar os filtros</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-fade-in">
            {produtosFiltrados.map(produto => {
              const estoque = produto.estoque?.quantidade || 0;
              
              return (
                <Card key={produto.id} className="group overflow-hidden border border-gray-200 rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 bg-white">
                  {/* Product Image */}
                  <div className="aspect-square bg-gray-50 relative overflow-hidden">
                    {produto.foto_url ? (
                      <img
                        src={produto.foto_url}
                        alt={produto.descricao}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-24 w-24 text-gray-300" />
                      </div>
                    )}

                    {/* Stock Badge */}
                    {estoque > 0 ? (
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-green-500 text-white shadow-lg border-0 px-3 py-1">
                          Em estoque
                        </Badge>
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm">
                        <Badge variant="destructive" className="text-base px-6 py-2">Indisponível</Badge>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <CardContent className="p-6 space-y-4">
                    {/* Code */}
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cód: {produto.codigo}</p>

                    {/* Title */}
                    <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-2 min-h-[3.5rem]">
                      {produto.descricao}
                    </h3>

                    {/* Tags */}
                    <div className="flex gap-2 flex-wrap min-h-[28px]">
                      {produto.tipo && (
                        <Badge className="bg-blue-100 text-blue-700 border-0 hover:bg-blue-200">
                          {produto.tipo}
                        </Badge>
                      )}
                      {produto.liga && (
                        <Badge variant="outline" className="border-gray-300 text-gray-700">
                          {produto.liga}
                        </Badge>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-100"></div>

                    {/* Price Section */}
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Preço (6 metros)</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-4xl font-bold text-blue-600">
                            R$ {produto.preco_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        {produto.peso && (
                          <p className="text-sm text-gray-600 mt-2">
                            <span className="font-semibold">{produto.peso} kg/m</span> • <span className="font-semibold">{(produto.peso * 6).toFixed(3)} kg</span> total (6m)
                          </p>
                        )}
                      </div>

                      {/* Add to Cart Button */}
                      <Button
                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
                        onClick={() => adicionarAoCarrinho(produto)}
                        disabled={estoque === 0}
                      >
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        {estoque === 0 ? 'Indisponível' : 'Adicionar ao Carrinho'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
