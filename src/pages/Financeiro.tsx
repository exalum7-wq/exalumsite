// @ts-nocheck - Temporary fix until Supabase types are regenerated
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, RotateCcw } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import AddTransactionDialog from "@/components/financeiro/AddTransactionDialog";

interface Transaction {
  id: string;
  descricao: string;
  tipo: string;
  valor: number;
  data: string;
  status: string;
}

export default function Financeiro() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [saldoTotal, setSaldoTotal] = useState(0);
  const [receitas, setReceitas] = useState(0);
  const [despesas, setDespesas] = useState(0);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transacoes_financeiras')
        .select('*')
        .order('data', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      setTransactions(data || []);
      
      // Calculate totals
      const receitasTotal = (data || [])
        .filter(t => t.tipo === 'receita' && (t.status === 'recebido' || t.status === 'pago'))
        .reduce((sum, t) => sum + Number(t.valor), 0);
      
      const despesasTotal = (data || [])
        .filter(t => t.tipo === 'despesa' && (t.status === 'recebido' || t.status === 'pago'))
        .reduce((sum, t) => sum + Number(t.valor), 0);
      
      setReceitas(receitasTotal);
      setDespesas(despesasTotal);
      setSaldoTotal(receitasTotal - despesasTotal);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar transações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      // Delete only financial transactions and movements
      const { error: transError } = await supabase
        .from('transacoes_financeiras')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (transError) throw transError;

      const { error: movError } = await supabase
        .from('movimentacao_estoque')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (movError) throw movError;

      // Reset stock quantities to zero
      const { error: estError } = await supabase
        .from('estoque')
        .update({ quantidade: 0 });

      if (estError) throw estError;

      toast({
        title: "Dados resetados",
        description: "Transações financeiras e movimentações de estoque foram removidas. Cadastros mantidos.",
      });

      fetchTransactions();
    } catch (error: any) {
      toast({
        title: "Erro ao resetar dados",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center py-8 text-muted-foreground">
          Carregando dados financeiros...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Controle Financeiro</h2>
          <p className="text-muted-foreground">Gerencie contas a pagar e receber</p>
        </div>
        <div className="flex gap-2">
          <AddTransactionDialog onTransactionAdded={fetchTransactions} />
          {isAdmin && (
            <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                Resetar Dados
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Reset</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação irá remover todas as transações financeiras do sistema.
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset}>Confirmar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Saldo Total</p>
                <h3 className="text-2xl font-bold text-foreground">
                  R$ {saldoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Receitas</p>
                <h3 className="text-2xl font-bold text-success">
                  R$ {receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Despesas</p>
                <h3 className="text-2xl font-bold text-destructive">
                  R$ {despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10">
                <TrendingDown className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Movimentações Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhuma transação cadastrada.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transacao) => (
                  <TableRow key={transacao.id}>
                    <TableCell className="font-medium">{transacao.descricao}</TableCell>
                    <TableCell>
                      <Badge variant={transacao.tipo === "receita" ? "default" : "secondary"}>
                        {transacao.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold ${
                        transacao.tipo === "receita" ? "text-success" : "text-destructive"
                      }`}
                    >
                      R${" "}
                      {Math.abs(transacao.valor).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>{new Date(transacao.data).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      <Badge
                        variant={transacao.status === "recebido" || transacao.status === "pago" ? "default" : "secondary"}
                      >
                        {transacao.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
