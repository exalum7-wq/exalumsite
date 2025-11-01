// @ts-nocheck - Temporary fix until Supabase types are regenerated
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Product {
  id: string;
  codigo: string;
  descricao: string;
  tipo: string | null;
  cor: string | null;
  liga: string | null;
  peso: number | null;
  unidade: string;
  preco_custo: number | null;
  preco_venda: number;
  preco_por_kg: number | null;
  foto_url: string | null;
}

interface EditProductDialogProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductUpdated: () => void;
}

export default function EditProductDialog({ product, open, onOpenChange, onProductUpdated }: EditProductDialogProps) {
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(product.foto_url);
  
  const [formData, setFormData] = useState({
    codigo: product.codigo,
    descricao: product.descricao,
    tipo: product.tipo || "",
    cor: product.cor || "",
    liga: product.liga || "",
    peso: product.peso?.toString() || "",
    unidade: product.unidade,
    preco_custo: product.preco_custo?.toString() || "",
    preco_venda: product.preco_venda.toString(),
    preco_por_kg: product.preco_por_kg?.toString() || "",
    localizacao: product.localizacao || "",
  });

  useEffect(() => {
    setFormData({
      codigo: product.codigo,
      descricao: product.descricao,
      tipo: product.tipo || "",
      cor: product.cor || "",
      liga: product.liga || "",
      peso: product.peso?.toString() || "",
      unidade: product.unidade,
      preco_custo: product.preco_custo?.toString() || "",
      preco_venda: product.preco_venda.toString(),
      preco_por_kg: product.preco_por_kg?.toString() || "",
      localizacao: product.localizacao || "",
    });
    setImagePreview(product.foto_url);
  }, [product]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.peso || isNaN(parseFloat(formData.peso))) {
      toast({
        title: "Erro de validação",
        description: "Peso por unidade é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.preco_por_kg || isNaN(parseFloat(formData.preco_por_kg))) {
      toast({
        title: "Erro de validação",
        description: "Preço por kg é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      let fotoUrl = product.foto_url;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('produtos')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('produtos')
          .getPublicUrl(filePath);

        fotoUrl = publicUrl;
      } else if (!imagePreview) {
        fotoUrl = null;
      }

      const { error } = await supabase.from('produtos').update({
        codigo: formData.codigo,
        descricao: formData.descricao,
        tipo: formData.tipo || null,
        cor: formData.cor || null,
        liga: formData.liga || null,
        peso: formData.peso && !isNaN(parseFloat(formData.peso)) ? parseFloat(formData.peso) : null,
        localizacao: formData.localizacao || null,
        unidade: formData.unidade,
        preco_custo: formData.preco_custo && !isNaN(parseFloat(formData.preco_custo)) ? parseFloat(formData.preco_custo) : null,
        preco_venda: parseFloat(formData.preco_venda),
        preco_por_kg: formData.preco_por_kg && !isNaN(parseFloat(formData.preco_por_kg)) ? parseFloat(formData.preco_por_kg) : null,
        foto_url: fotoUrl,
      }).eq('id', product.id);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Produto atualizado com sucesso.",
      });

      onOpenChange(false);
      setImageFile(null);
      onProductUpdated();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Produto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Foto do Produto</Label>
            {imagePreview ? (
              <div className="relative w-full h-48 border rounded-lg overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={removeImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <Label htmlFor="image-upload" className="cursor-pointer text-sm text-muted-foreground">
                  Clique para fazer upload da foto
                </Label>
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código *</Label>
              <Input
                id="codigo"
                required
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unidade">Unidade</Label>
              <Input
                id="unidade"
                value={formData.unidade}
                onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <Textarea
              id="descricao"
              required
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Input
                id="tipo"
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cor">Cor</Label>
              <Input
                id="cor"
                value={formData.cor}
                onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="liga">Liga</Label>
              <Input
                id="liga"
                value={formData.liga}
                onChange={(e) => setFormData({ ...formData, liga: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="peso">Peso por Unidade (kg/m) *</Label>
              <Input
                id="peso"
                type="number"
                step="0.001"
                min="0"
                required
                value={formData.peso}
                onChange={(e) => {
                  const newPeso = e.target.value;
                  setFormData({ ...formData, peso: newPeso });

                  if (newPeso && formData.preco_por_kg) {
                    const peso = parseFloat(newPeso);
                    const precoKg = parseFloat(formData.preco_por_kg);
                    if (!isNaN(peso) && !isNaN(precoKg) && peso > 0) {
                      const pesoTotal = peso * 6;
                      const precoVenda = (pesoTotal * precoKg).toFixed(2);
                      setFormData(prev => ({ ...prev, preco_venda: precoVenda, peso: newPeso }));
                    }
                  }
                }}
                placeholder="0.000"
              />
              <p className="text-xs text-muted-foreground">Peso por metro (será calculado para 6 metros)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="preco_custo">Preço de Custo</Label>
              <Input
                id="preco_custo"
                type="number"
                step="0.01"
                min="0"
                value={formData.preco_custo}
                onChange={(e) => setFormData({ ...formData, preco_custo: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preco_por_kg">Preço por Kg *</Label>
              <Input
                id="preco_por_kg"
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.preco_por_kg}
                onChange={(e) => {
                  const newPrecoKg = e.target.value;
                  setFormData({ ...formData, preco_por_kg: newPrecoKg });

                  if (newPrecoKg && formData.peso) {
                    const peso = parseFloat(formData.peso);
                    const precoKg = parseFloat(newPrecoKg);
                    if (!isNaN(peso) && !isNaN(precoKg) && peso > 0) {
                      const pesoTotal = peso * 6;
                      const precoVenda = (pesoTotal * precoKg).toFixed(2);
                      setFormData(prev => ({ ...prev, preco_venda: precoVenda, preco_por_kg: newPrecoKg }));
                    }
                  }
                }}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preco_venda">Preço de Venda (6 metros - calculado automaticamente)</Label>
            <Input
              id="preco_venda"
              type="number"
              step="0.01"
              min="0"
              value={formData.preco_venda}
              onChange={(e) => setFormData({ ...formData, preco_venda: e.target.value })}
              placeholder="0.00"
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Preencha o peso e preço por kg para calcular automaticamente
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="localizacao">Localização no Galpão</Label>
            <Input
              id="localizacao"
              value={formData.localizacao}
              onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
              placeholder="Ex: Prateleira A3, Setor 2"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
