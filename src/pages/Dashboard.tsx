// @ts-nocheck - Temporary fix until Supabase types are regenerated
import { useState, useEffect } from "react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, DollarSign, FileText, TrendingUp, AlertTriangle, ShoppingCart, Users, Calendar } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface DashboardStats {
  total_produtos: number;
  total_kg_aluminio: number;
  valor_total_estoque: number;
  receitas_mes: number;
  despesas_mes: number;
  vendas_mes: number;
}

interface LowStockItem {
  produto: string;
  estoque: number;
  minimo: number;
}

interface RecentQuote {
  id: string;
  numero: string;
  cliente: string;
  valor_total: number;
  status: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    total_produtos: 0,
    total_kg_aluminio: 0,
    valor_total_estoque: 0,
    receitas_mes: 0,
    despesas_mes: 0,
    vendas_mes: 0,
  });
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [recentQuotes, setRecentQuotes] = useState<RecentQuote[]>([]);
  const [vendasPorMes, setVendasPorMes] = useState<any[]>([]);
  const [pedidosPorStatus, setPedidosPorStatus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch dashboard stats
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_dashboard_stats');
      
      if (statsError) throw statsError;
      if (statsData && typeof statsData === 'object') {
        setStats(statsData as unknown as DashboardStats);
      }

      // Fetch low stock items - filtering on client side since PostgREST doesn't support column comparison
      const { data: stockData, error: stockError } = await supabase
        .from('estoque')
        .select('quantidade, quantidade_minima, produtos(descricao)')
        .order('quantidade', { ascending: true });

      if (!stockError && stockData) {
        const lowStockItems = stockData
          .filter(item => item.quantidade < (item.quantidade_minima || 0))
          .slice(0, 5);

        setLowStock(lowStockItems.map(item => ({
          produto: (item.produtos as any)?.descricao || '-',
          estoque: item.quantidade,
          minimo: item.quantidade_minima || 0,
        })));
      }

      // Fetch recent quotes with proper join
      const { data: quotesData, error: quotesError } = await supabase
        .from('orcamentos')
        .select('id, numero, valor_total, status, clientes!inner(nome)')
        .order('created_at', { ascending: false })
        .limit(5);

      if (!quotesError && quotesData) {
        setRecentQuotes(quotesData.map(q => ({
          id: q.id,
          numero: q.numero,
          cliente: (q.clientes as any)?.nome || 'Cliente não identificado',
          valor_total: q.valor_total || 0,
          status: q.status,
        })));
      }

      // Fetch vendas por mês (últimos 6 meses)
      const { data: vendasData } = await supabase
        .from('vendas')
        .select('created_at, valor_total')
        .gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });

      if (vendasData) {
        const vendasMap = new Map();
        vendasData.forEach(v => {
          const mes = new Date(v.created_at).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
          vendasMap.set(mes, (vendasMap.get(mes) || 0) + (v.valor_total || 0));
        });
        const chartData = Array.from(vendasMap.entries()).map(([mes, valor]) => ({
          mes,
          valor: Number(valor.toFixed(2))
        }));
        setVendasPorMes(chartData);
      }

      // Fetch pedidos por status
      const { data: pedidosData } = await supabase
        .from('pedidos')
        .select('status');

      if (pedidosData) {
        const statusMap = new Map();
        pedidosData.forEach(p => {
          const status = p.status || 'pendente';
          statusMap.set(status, (statusMap.get(status) || 0) + 1);
        });
        const statusData = Array.from(statusMap.entries()).map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value
        }));
        setPedidosPorStatus(statusData);
      }

    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center py-8 text-muted-foreground">
          Carregando dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-2">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Dashboard</h2>
        <p className="text-muted-foreground text-lg">Visão geral do sistema</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-slide-up">
        <StatsCard
          title="Total de Produtos"
          value={stats.total_produtos.toString()}
          icon={Package}
        />
        <StatsCard
          title="Alumínio em Estoque"
          value={`${stats.total_kg_aluminio.toFixed(2)} kg`}
          icon={Package}
        />
        <StatsCard
          title="Valor do Estoque"
          value={`R$ ${stats.valor_total_estoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
        />
        <StatsCard
          title="Vendas do Mês"
          value={`R$ ${stats.vendas_mes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-lg hover-lift overflow-hidden">
          <div className="h-2 w-full bg-gradient-to-r from-primary via-accent to-primary"></div>
          <CardHeader className="bg-gradient-to-br from-white to-blue-50/30">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              Vendas por Mês (Últimos 6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vendasPorMes.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={vendasPorMes}>
                  <defs>
                    <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="mes" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: any) => `R$ ${Number(value).toFixed(2)}`}
                  />
                  <Area type="monotone" dataKey="valor" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorVendas)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhuma venda registrada
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover-lift overflow-hidden">
          <div className="h-2 w-full bg-gradient-to-r from-accent via-primary to-accent"></div>
          <CardHeader className="bg-gradient-to-br from-white to-blue-50/30">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              Status dos Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pedidosPorStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pedidosPorStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pedidosPorStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum pedido registrado
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-0 shadow-lg hover-lift overflow-hidden">
          <div className="h-2 w-full bg-gradient-to-r from-success via-primary to-success"></div>
          <CardHeader className="bg-gradient-to-br from-white to-green-50/20">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-lg bg-gradient-to-br from-success/10 to-primary/10">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              Resumo Financeiro do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-success/5">
                <div>
                  <p className="text-sm text-muted-foreground">Receitas</p>
                  <p className="text-2xl font-bold text-success">
                    R$ {stats.receitas_mes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-success" />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-destructive/5">
                <div>
                  <p className="text-sm text-muted-foreground">Despesas</p>
                  <p className="text-2xl font-bold text-destructive">
                    R$ {stats.despesas_mes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-destructive rotate-180" />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-primary/5">
                <div>
                  <p className="text-sm text-muted-foreground">Lucro Líquido</p>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {(stats.receitas_mes - stats.despesas_mes).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover-lift overflow-hidden">
          <div className="h-2 w-full bg-gradient-to-r from-warning via-accent to-warning"></div>
          <CardHeader className="bg-gradient-to-br from-white to-orange-50/20">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-lg bg-gradient-to-br from-warning/10 to-accent/10">
                <FileText className="h-5 w-5 text-warning" />
              </div>
              Orçamentos Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentQuotes.length > 0 ? (
                recentQuotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5 transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{quote.numero}</p>
                      <p className="text-sm text-muted-foreground">{quote.cliente}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-semibold text-foreground">
                        R$ {quote.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <Badge variant={quote.status === 'aprovado' ? 'default' : 'secondary'}>
                        {quote.status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum orçamento encontrado
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {lowStock.length > 0 && (
        <Card className="border-0 shadow-lg hover-lift overflow-hidden border-l-4 border-destructive">
          <div className="h-2 w-full bg-gradient-to-r from-destructive via-warning to-destructive"></div>
          <CardHeader className="bg-gradient-to-br from-white to-red-50/20">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-lg bg-gradient-to-br from-destructive/10 to-warning/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              Produtos com Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStock.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-xl border border-destructive/20 bg-gradient-to-r from-destructive/5 to-warning/5 hover:shadow-md transition-all duration-200 hover:scale-[1.01]"
                >
                  <div>
                    <p className="font-semibold text-foreground">{item.produto}</p>
                    <p className="text-sm text-muted-foreground">
                      Estoque atual: {item.estoque} | Mínimo: {item.minimo}
                    </p>
                  </div>
                  <Badge variant="destructive">Crítico</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
