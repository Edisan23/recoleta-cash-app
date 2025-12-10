'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Upload } from 'lucide-react';
import Image from 'next/image';
import type { Company } from '@/types/db-entities';

interface CreateCompanyDialogProps {
    onCompanyCreated: (companyData: Omit<Company, 'id'>) => void;
}

export function CreateCompanyDialog({ onCompanyCreated }: CreateCompanyDialogProps) {
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
      setCompanyName('');
      setLogoFile(null);
      setLogoPreview(null);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'El nombre de la empresa es obligatorio.',
      });
      return;
    }
    
    setIsSubmitting(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newCompanyData: Omit<Company, 'id'> = {
        name: companyName,
        logoUrl: logoPreview || 'https://placehold.co/100x100/e2e8f0/64748b?text=Logo', // Use preview or a placeholder
        isActive: true,
    };

    onCompanyCreated(newCompanyData);

    toast({
      title: '¡Éxito!',
      description: `La empresa "${companyName}" ha sido añadida a la tabla.`,
    });

    setIsSubmitting(false);
    resetForm();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2" />
          Nueva Empresa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => {
          if (isSubmitting) {
            e.preventDefault();
          }
      }}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Crear Nueva Empresa</DialogTitle>
            <DialogDescription>
              Añade los detalles de la nueva empresa.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nombre
              </Label>
              <Input
                id="name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="col-span-3"
                placeholder="Nombre de la Empresa"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Logo
              </Label>
              <div className="col-span-3 flex items-center gap-4">
                {logoPreview ? (
                    <Image src={logoPreview} alt="Logo preview" width={48} height={48} className="rounded-md object-contain" />
                ) : (
                    <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center text-muted-foreground">
                        <Upload />
                    </div>
                )}
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    Subir Imagen
                </Button>
                <Input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/png, image/jpeg, image/webp"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>
                Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
