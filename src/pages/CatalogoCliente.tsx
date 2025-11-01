// @ts-nocheck - Temporary fix until Supabase types are regenerated
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Package, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { BuscaPorFoto } from "@/components/BuscaPorFoto";

interface Product {
  id: string;
  codigo: string;
  descricao: string;
  tipo: string | null;
  cor: string | null;
  preco_venda: number;
  peso: number | null;
  foto_url: string | null;
  estoque: Array<{ quantidade: number }>;
}

interface CartItem {
  produto_id: string;
  descricao: string;
  quantidade: number;
  preco_unitario: number;
  peso?: number;
}

export default function CatalogoCliente() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
    loadCart();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('id, codigo, descricao, tipo, cor, preco_venda, peso, foto_url, estoque(quantidade)')
        .order('descricao', { ascending: true });

      if (error) throw error;
      
      const productsWithEstoque = (data || []).map(p => ({
        ...p,
        estoque: Array.isArray(p.estoque) ? p.estoque : [p.estoque]
      }));
      
      setProducts(productsWithEstoque as Product[]);
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

  const loadCart = () => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  };

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const addToCart = (product: Product) => {
    const estoque = product.estoque[0]?.quantidade || 0;
    if (estoque <= 0) {
      toast({
        title: "Produto sem estoque",
        description: "Este produto não está disponível no momento",
        variant: "destructive",
      });
      return;
    }

    const existingItem = cart.find(item => item.produto_id === product.id);
    let newCart: CartItem[];

    if (existingItem) {
      if (existingItem.quantidade >= estoque) {
        toast({
          title: "Quantidade máxima",
          description: `Só temos ${estoque} unidades disponíveis`,
          variant: "destructive",
        });
        return;
      }
      newCart = cart.map(item =>
        item.produto_id === product.id
          ? { ...item, quantidade: item.quantidade + 1 }
          : item
      );
    } else {
      newCart = [...cart, {
        produto_id: product.id,
        descricao: product.descricao,
        quantidade: 1,
        preco_unitario: product.preco_venda,
        peso: product.peso || 0,
      }];
    }

    saveCart(newCart);
    toast({
      title: "Produto adicionado",
      description: `${product.descricao} foi adicionado ao carrinho`,
    });
  };

  const filteredProducts = products.filter((product) =>
    product.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const cartTotal = cart.reduce((sum, item) => sum + (item.quantidade * item.preco_unitario), 0);
  const cartItems = cart.reduce((sum, item) => sum + item.quantidade, 0);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center py-8 text-muted-foreground">
          Carregando catálogo...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 animate-fade-in">
      {/* Premium Header */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 sm:px-6">
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
            {cartItems > 0 && (
              <Button
                onClick={() => navigate('/carrinho')}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all relative"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                <span className="hidden sm:inline">Carrinho</span>
                <span className="ml-2">({cartItems})</span>
                <span className="hidden md:inline ml-2">• R$ {cartTotal.toFixed(2)}</span>
                <span className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">{cartItems}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-gradient-to-br from-blue-50 to-slate-50 border-b">
        <div className="container mx-auto px-4 sm:px-6 py-8">
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="relative">
              <Search className="absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar produtos por nome ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-14 pr-6 h-16 border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 rounded-2xl text-lg shadow-sm bg-white"
              />
            </div>
            <div className="flex justify-center">
              <BuscaPorFoto onBuscar={setSearchTerm} />
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="container mx-auto px-4 sm:px-6 py-12">

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => {
              const estoque = product.estoque[0]?.quantidade || 0;
              const inCart = cart.find(item => item.produto_id === product.id);

              return (
                <Card key={product.id} className="group overflow-hidden border border-gray-200 rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 bg-white">
                  {/* Product Image */}
                  <div className="aspect-square bg-gray-50 relative overflow-hidden">
                    {product.foto_url ? (
                      <img
                        src={product.foto_url}
                        alt={product.descricao}
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

                    {/* Cart Indicator */}
                    {inCart && (
                      <div className="absolute top-4 left-4">
                        <Badge className="bg-blue-600 text-white shadow-lg border-0 px-3 py-1">
                          {inCart.quantidade}x no carrinho
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <CardContent className="p-6 space-y-4">
                    {/* Code */}
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cód: {product.codigo}</p>

                    {/* Title */}
                    <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-2 min-h-[3.5rem]">
                      {product.descricao}
                    </h3>

                    {/* Tags */}
                    <div className="flex gap-2 flex-wrap min-h-[28px]">
                      {product.tipo && (
                        <Badge className="bg-blue-100 text-blue-700 border-0 hover:bg-blue-200">
                          {product.tipo}
                        </Badge>
                      )}
                      {product.cor && (
                        <Badge variant="outline" className="border-gray-300 text-gray-700">
                          {product.cor}
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
                            R$ {product.preco_venda.toFixed(2)}
                          </p>
                        </div>
                        {product.peso && (
                          <p className="text-sm text-gray-600 mt-2">
                            <span className="font-semibold">{product.peso} kg/m</span> • <span className="font-semibold">{(product.peso * 6).toFixed(3)} kg</span> total (6m)
                          </p>
                        )}
                      </div>

                      {/* Add to Cart Button */}
                      <Button
                        onClick={() => addToCart(product)}
                        disabled={estoque <= 0}
                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        {estoque <= 0 ? 'Indisponível' : inCart ? 'Adicionar mais' : 'Adicionar ao Carrinho'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Nenhum produto encontrado</h3>
              <p className="text-gray-600">Tente usar termos diferentes na busca</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}