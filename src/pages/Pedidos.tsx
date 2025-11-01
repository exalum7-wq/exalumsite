// @ts-nocheck - Temporary fix until Supabase types are regenerated
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Phone, CheckCircle, XCircle, Clock, Package, Eye, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface PedidoItem {
  id: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  produtos: {
    codigo: string;
    descricao: string;
    unidade: string;
  } | null;
}

interface Pedido {
  id: string;
  numero: string;
  status: string;
  valor_total: number;
  data_pedido: string;
  observacoes: string | null;
  cliente_id: string;
  clientes: {
    id: string;
    nome: string;
    telefone: string | null;
  } | null;
}

const statusColors = {
  pendente: "secondary",
  confirmado: "default",
  em_separacao: "default",
  enviado: "default",
  entregue: "default",
  cancelado: "destructive",
} as const;

const statusIcons = {
  pendente: Clock,
  confirmado: CheckCircle,
  em_separacao: Package,
  enviado: Package,
  entregue: CheckCircle,
  cancelado: XCircle,
};

export default function Pedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPedidoItens, setSelectedPedidoItens] = useState<PedidoItem[]>([]);
  const [loadingItens, setLoadingItens] = useState(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchPedidos();
  }, []);

  const fetchPedidos = async () => {
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select('id, numero, status, valor_total, data_pedido, observacoes, cliente_id, clientes(id, nome, telefone)')
        .order('data_pedido', { ascending: false });

      if (error) throw error;
      setPedidos(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar pedidos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = (telefone: string | null, nomePedido: string) => {
    if (!telefone) {
      toast({
        title: "Telefone não cadastrado",
        description: "Este cliente não possui telefone cadastrado.",
        variant: "destructive",
      });
      return;
    }

    const cleanPhone = telefone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá! Entrando em contato sobre o pedido ${nomePedido}.`);
    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
  };

  const handleConfirmarPedido = async (pedidoId: string) => {
    try {
      // Call the process order function
      const { data, error } = await supabase.rpc('processar_pedido', {
        pedido_id_param: pedidoId
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string; itens_faltando?: any[] };

      if (!result.success) {
        toast({
          title: "Estoque insuficiente",
          description: result.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Pedido confirmado",
        description: "O pedido foi confirmado e o estoque atualizado.",
      });

      fetchPedidos();
    } catch (error: any) {
      toast({
        title: "Erro ao confirmar pedido",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancelarPedido = async (pedidoId: string) => {
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ status: 'cancelado' })
        .eq('id', pedidoId);

      if (error) throw error;

      toast({
        title: "Pedido cancelado",
        description: "O pedido foi cancelado com sucesso.",
      });

      fetchPedidos();
    } catch (error: any) {
      toast({
        title: "Erro ao cancelar pedido",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleConverterEmOrcamento = async (pedido: Pedido) => {
    try {
      const { data: itens, error: itensError } = await supabase
        .from('pedido_itens')
        .select('produto_id, quantidade, preco_unitario, subtotal')
        .eq('pedido_id', pedido.id);

      if (itensError) throw itensError;

      const numeroOrcamento = `ORC-${Date.now()}`;
      const { data: orcamento, error: orcamentoError } = await supabase
        .from('orcamentos')
        .insert({
          numero: numeroOrcamento,
          cliente_id: pedido.cliente_id,
          status: 'pendente',
          valor_total: pedido.valor_total,
          observacoes: `Convertido do pedido ${pedido.numero}. ${pedido.observacoes || ''}`,
        })
        .select('id')
        .single();

      if (orcamentoError) throw orcamentoError;

      const orcamentoItens = itens.map(item => ({
        orcamento_id: orcamento.id,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        subtotal: item.subtotal,
      }));

      const { error: itensOrcError } = await supabase
        .from('orcamento_itens')
        .insert(orcamentoItens);

      if (itensOrcError) throw itensOrcError;

      toast({
        title: "Orçamento criado",
        description: `O pedido foi convertido no orçamento ${numeroOrcamento}`,
      });

      fetchPedidos();
    } catch (error: any) {
      toast({
        title: "Erro ao converter em orçamento",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchPedidoItens = async (pedidoId: string) => {
    setLoadingItens(true);
    try {
      const { data, error } = await supabase
        .from('pedido_itens')
        .select('id, quantidade, preco_unitario, subtotal, produtos(codigo, descricao, unidade)')
        .eq('pedido_id', pedidoId);

      if (error) throw error;
      setSelectedPedidoItens(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar itens",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingItens(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center py-8 text-muted-foreground">
          Carregando pedidos...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Pedidos</h2>
        <p className="text-muted-foreground">Gerencie os pedidos dos clientes</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Lista de Pedidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum pedido cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                pedidos.map((pedido) => {
                  const StatusIcon = statusIcons[pedido.status as keyof typeof statusIcons] || Clock;
                  
                  return (
                    <TableRow key={pedido.id}>
                      <TableCell className="font-medium">{pedido.numero}</TableCell>
                      <TableCell>{pedido.clientes?.nome || '-'}</TableCell>
                      <TableCell>
                        {new Date(pedido.data_pedido).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        R$ {pedido.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={statusColors[pedido.status as keyof typeof statusColors] || "secondary"}
                          className="gap-1"
                        >
                          <StatusIcon className="h-3 w-3" />
                          {pedido.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => fetchPedidoItens(pedido.id)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver Itens
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>Itens do Pedido {pedido.numero}</DialogTitle>
                                <DialogDescription>
                                  Lista de produtos para separação
                                </DialogDescription>
                              </DialogHeader>
                              {loadingItens ? (
                                <div className="text-center py-4">Carregando itens...</div>
                              ) : (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Código</TableHead>
                                      <TableHead>Produto</TableHead>
                                      <TableHead className="text-right">Quantidade</TableHead>
                                      <TableHead className="text-right">Preço Unit.</TableHead>
                                      <TableHead className="text-right">Subtotal</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {selectedPedidoItens.map((item) => (
                                      <TableRow key={item.id}>
                                        <TableCell className="font-medium">
                                          {item.produtos?.codigo || '-'}
                                        </TableCell>
                                        <TableCell>{item.produtos?.descricao || '-'}</TableCell>
                                        <TableCell className="text-right">
                                          {item.quantidade} {item.produtos?.unidade || 'UN'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          R$ {item.preco_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">
                                          R$ {item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}
                            </DialogContent>
                          </Dialog>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleWhatsApp(pedido.clientes?.telefone || null, pedido.numero)}
                          >
                            <Phone className="h-4 w-4 mr-1" />
                            WhatsApp
                          </Button>
                          
                          {pedido.status === 'pendente' && isAdmin && (
                            <>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="default">
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Confirmar
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Pedido</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Confirmar este pedido irá dar baixa automática no estoque.
                                      Deseja continuar?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleConfirmarPedido(pedido.id)}>
                                      Confirmar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleConverterEmOrcamento(pedido)}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Converter em Orçamento
                              </Button>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive">
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Cancelar
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Cancelar Pedido</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja cancelar este pedido?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Não</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleCancelarPedido(pedido.id)}>
                                      Sim, cancelar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
