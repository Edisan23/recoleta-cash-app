
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft, PlusCircle, Trash2, Edit, Loader2, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { CompanyItem } from '@/types/db-entities';

const ITEMS_DB_KEY = 'fake_company_items_db';

export default function CompanyItemsPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.companyId as string;
  const { toast } = useToast();

  const [items, setItems] = useState<CompanyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<CompanyItem>>({});
  const [isEditing, setIsEditing] = useState(false);

  const loadItems = useCallback(() => {
    setIsLoading(true);
    try {
      const storedItems = localStorage.getItem(ITEMS_DB_KEY);
      const allItems: { [key: string]: CompanyItem[] } = storedItems ? JSON.parse(storedItems) : {};
      setItems(allItems[companyId] || []);
    } catch (e) {
      console.error("Failed to load items from localStorage", e);
      toast({ title: "Error", description: "No se pudieron cargar los ítems.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [companyId, toast]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const saveItemsToStorage = (updatedItems: CompanyItem[]) => {
    try {
      const storedItems = localStorage.getItem(ITEMS_DB_KEY);
      const allItems: { [key: string]: CompanyItem[] } = storedItems ? JSON.parse(storedItems) : {};
      allItems[companyId] = updatedItems;
      localStorage.setItem(ITEMS_DB_KEY, JSON.stringify(allItems));
    } catch (e) {
      console.error("Failed to save items to localStorage", e);
      toast({ title: "Error", description: "No se pudieron guardar los cambios.", variant: "destructive" });
    }
  };

  const handleOpenDialog = (item?: CompanyItem) => {
    if (item) {
      setCurrentItem({ ...item });
      setIsEditing(true);
    } else {
      setCurrentItem({});
      setIsEditing(false);
    }
    setIsDialogOpen(true);
  };

  const handleSaveChanges = () => {
    if (!currentItem.name || !currentItem.value || currentItem.value <= 0) {
      toast({ title: "Datos inválidos", description: "El nombre y un valor positivo son requeridos.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    let updatedItems: CompanyItem[];

    if (isEditing && currentItem.id) {
      updatedItems = items.map(it => (it.id === currentItem.id ? (currentItem as CompanyItem) : it));
    } else {
      const newItem: CompanyItem = {
        id: `item_${Date.now()}`,
        name: currentItem.name,
        value: currentItem.value,
        description: currentItem.description || '',
      };
      updatedItems = [...items, newItem];
    }
    
    setItems(updatedItems);
    saveItemsToStorage(updatedItems);

    setTimeout(() => {
        toast({ title: "¡Guardado!", description: `El ítem "${currentItem.name}" ha sido guardado.` });
        setIsSaving(false);
        setIsDialogOpen(false);
    }, 500);
  };

  const handleDeleteItem = (itemId: string) => {
    const updatedItems = items.filter(it => it.id !== itemId);
    setItems(updatedItems);
    saveItemsToStorage(updatedItems);
    toast({ title: "Eliminado", description: "El ítem ha sido eliminado." });
  };
  
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <Button variant="ghost" onClick={() => router.push(`/admin/company/${companyId}`)} className="mb-4">
            <ArrowLeft className="mr-2" />
            Volver a la Configuración
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-3">
             <Package /> Gestionar Ítems de Producción
          </h1>
          <p className="text-muted-foreground">Define los productos o servicios para el pago por producción.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <PlusCircle className="mr-2" />
              Nuevo Ítem
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Editar Ítem' : 'Nuevo Ítem'}</DialogTitle>
              <DialogDescription>
                Completa los detalles del ítem de producción.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="item-name">Nombre del Ítem</Label>
                <Input
                  id="item-name"
                  value={currentItem.name || ''}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Bulto de cemento movido"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="item-value">Valor por Unidad ($)</Label>
                <Input
                  id="item-value"
                  type="number"
                  value={currentItem.value || ''}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, value: parseFloat(e.target.value) || undefined }))}
                  placeholder="Ej: 500"
                />
              </div>
               <div className="grid gap-2">
                <Label htmlFor="item-desc">Descripción (Opcional)</Label>
                <Input
                  id="item-desc"
                  value={currentItem.description || ''}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ej: Unidad de 50kg"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Cancelar</Button>
              <Button onClick={handleSaveChanges} disabled={isSaving}>
                {isSaving ? <Loader2 className="animate-spin mr-2"/> : null}
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <main>
        <Card>
            <CardHeader>
                <CardTitle>Listado de Ítems</CardTitle>
                <CardDescription>Estos son los ítems disponibles para esta empresa.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Valor por Unidad</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    <Loader2 className="mx-auto animate-spin text-muted-foreground" />
                                </TableCell>
                            </TableRow>
                        ) : items.length > 0 ? (
                            items.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>${item.value?.toLocaleString('es-CO')}</TableCell>
                                <TableCell className="text-muted-foreground">{item.description}</TableCell>
                                <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteItem(item.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                </TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                No hay ítems creados para esta empresa.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}

    