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
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Upload, Image as ImageIcon } from 'lucide-react';
import { useStorage } from '@/firebase/provider';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


export function CreateCompanyDialog() {
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const firestore = useFirestore();
  const storage = useStorage();
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
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
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
    
    let logoUrl = '';
    const companyData = {
        name: companyName,
        logoUrl: '',
        isActive: true,
        createdAt: serverTimestamp(),
    };

    try {
      // 1. Upload logo if it exists
      if (logoFile && storage) {
        const storageRef = ref(storage, `company-logos/${Date.now()}_${logoFile.name}`);
        const uploadResult = await uploadBytes(storageRef, logoFile);
        logoUrl = await getDownloadURL(uploadResult.ref);
        companyData.logoUrl = logoUrl; // Update logoUrl in the data object
      }

      // 2. Create the document in Firestore
      const companiesCol = collection(firestore, 'companies');
      await addDoc(companiesCol, companyData);

      // 3. If successful, show toast and close
      toast({
        title: 'Empresa creada',
        description: `La empresa "${companyName}" ha sido creada exitosamente.`,
      });
      resetForm();
      setOpen(false);

    } catch (error: any) {
        // Centralized error handling
        console.error('Error creating company:', error);

        if (error.code === 'permission-denied') {
             const permissionError = new FirestorePermissionError({
                path: 'companies',
                operation: 'create',
                requestResourceData: companyData,
              });
              // This will be caught by the FirebaseErrorListener and shown in dev overlay
              errorEmitter.emit('permission-error', permissionError); 
        } else {
            // For any other errors (e.g., storage upload issues)
            toast({
                variant: 'destructive',
                title: 'Error en la creación',
                description: error.message || 'No se pudo crear la empresa. Revisa los permisos o la conexión.',
            });
        }
    } finally {
        // 4. CRITICAL: Always reset submitting state, regardless of outcome
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Crear Empresa Nueva
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Crear Nueva Empresa</DialogTitle>
            <DialogDescription>
              Completa los datos para registrar una nueva empresa en el sistema.
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
                placeholder="Ej. Mi Empresa S.A.S"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">
                Logo
              </Label>
              <div className="col-span-3 flex flex-col gap-4">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Subir Imagen
                </Button>
                <Input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden"
                    onChange={handleFileChange}
                    accept="image/png, image/jpeg"
                />

                {logoPreview && (
                    <div className="relative w-24 h-24 border rounded-md p-1">
                        <img src={logoPreview} alt="Vista previa del logo" className="w-full h-full object-contain rounded-md" />
                    </div>
                )}
                {!logoPreview && (
                    <div className="relative w-24 h-24 border rounded-md p-1 flex items-center justify-center bg-muted">
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                )}

              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar Empresa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
