import { useState } from 'react';
import { Camera, X, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface BuscaPorFotoProps {
  onBuscar: (descricao: string) => void;
}

export function BuscaPorFoto({ onBuscar }: BuscaPorFotoProps) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);

  const analisarCor = (imageData: ImageData): string => {
    const data = imageData.data;
    let r = 0, g = 0, b = 0;
    const pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }

    r = Math.floor(r / pixelCount);
    g = Math.floor(g / pixelCount);
    b = Math.floor(b / pixelCount);

    if (r > 200 && g > 200 && b > 200) return 'branco';
    if (r < 50 && g < 50 && b < 50) return 'preto';
    if (r > 150 && g > 150 && b < 100) return 'amarelo';
    if (r > 150 && g < 100 && b < 100) return 'vermelho';
    if (r < 100 && g > 150 && b < 100) return 'verde';
    if (r < 100 && g < 100 && b > 150) return 'azul';
    if (r > 100 && g > 100 && b > 100) return 'cinza';
    if (r > 150 && g > 100 && b < 100) return 'laranja';
    if (r > 100 && g < 100 && b > 100) return 'roxo';
    if (r > 120 && g > 80 && b < 80) return 'marrom';

    return '';
  };

  const analisarBrilho = (imageData: ImageData): string => {
    const data = imageData.data;
    let brightness = 0;
    const pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      brightness += (r + g + b) / 3;
    }

    const avgBrightness = brightness / pixelCount;

    if (avgBrightness > 180) return 'brilhante';
    if (avgBrightness < 80) return 'fosco';
    return '';
  };

  const processarImagem = (file: File) => {
    setProcessando(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          const cor = analisarCor(imageData);
          const acabamento = analisarBrilho(imageData);

          let termoBusca = '';

          if (cor) termoBusca += cor;
          if (acabamento) termoBusca += (termoBusca ? ' ' : '') + acabamento;

          if (!termoBusca) {
            termoBusca = 'aluminio';
          }

          toast.success(`Busca iniciada por: ${termoBusca}`);
          onBuscar(termoBusca);
          setOpen(false);
          limparFoto();
        }

        setProcessando(false);
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Imagem muito grande. Máximo 10MB.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const limparFoto = () => {
    setPreview(null);
    const input = document.getElementById('foto-upload') as HTMLInputElement;
    if (input) input.value = '';
  };

  const buscarPorFoto = () => {
    const input = document.getElementById('foto-upload') as HTMLInputElement;
    const file = input?.files?.[0];

    if (!file) {
      toast.error('Selecione uma foto primeiro');
      return;
    }

    processarImagem(file);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
        >
          <Camera className="h-5 w-5 mr-2" />
          Buscar por Foto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-blue-600" />
            Buscar Produto por Foto
          </DialogTitle>
          <DialogDescription>
            Envie uma foto do produto que você procura e encontraremos produtos similares por cor e acabamento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!preview ? (
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-all cursor-pointer bg-gray-50">
              <label htmlFor="foto-upload" className="cursor-pointer block">
                <Camera className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Clique para enviar uma foto
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG ou JPEG até 10MB
                </p>
                <input
                  id="foto-upload"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          ) : (
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-64 object-cover rounded-xl border-2 border-gray-200"
              />
              <Button
                size="sm"
                variant="destructive"
                className="absolute top-2 right-2"
                onClick={limparFoto}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {preview && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Como funciona:</strong> Analisamos as cores e o acabamento da foto para encontrar produtos similares no catálogo.
              </p>
            </div>
          )}

          <Button
            onClick={buscarPorFoto}
            disabled={!preview || processando}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
          >
            {processando ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Search className="h-5 w-5 mr-2" />
                Buscar Produtos Similares
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
