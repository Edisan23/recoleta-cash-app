'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { es } from 'date-fns/locale';
import { format, isSameDay, startOfDay } from 'date-fns';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';

export default function HolidaysPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [holidays, setHolidays] = useState<Date[]>([]);
  
  const holidaysRef = useMemoFirebase(() => firestore ? collection(firestore, 'holidays') : null, [firestore]);
  const { data: holidaysData, isLoading } = useCollection<{ date: string }>(holidaysRef);

  useEffect(() => {
    if (holidaysData) {
      const dates = holidaysData.map(h => new Date(h.date));
      setHolidays(dates);
    }
  }, [holidaysData]);


  const saveHolidaysToFirestore = async (updatedHolidays: Date[]) => {
    if (!firestore) return;
    try {
      const batch = writeBatch(firestore);
      
      // Delete old holidays
      holidaysData?.forEach(h => {
        const docRef = doc(firestore, 'holidays', h.id);
        batch.delete(docRef);
      });

      // Add new holidays
      updatedHolidays.forEach(d => {
        const dateString = d.toISOString();
        const docRef = doc(firestore, 'holidays', dateString);
        batch.set(docRef, { date: dateString });
      });

      await batch.commit();

    } catch (e) {
      console.error("Failed to save holidays to Firestore", e);
      toast({ title: "Error", description: "No se pudieron guardar los cambios.", variant: "destructive" });
    }
  };

  const handleDateSelect = (dates: Date[] | undefined) => {
    if (!dates) {
        dates = [];
    }

    const previouslySelectedCount = holidays.length;
    const currentlySelectedCount = dates.length;

    // Determine if a date was added or removed
    if (currentlySelectedCount > previouslySelectedCount) {
        // Date added
        const newDate = dates.find(d => !holidays.some(h => isSameDay(h, d)));
        if (newDate) {
            toast({ title: "Feriado agregado", description: `Se añadió el ${format(newDate, 'PPP', { locale: es })}.` });
        }
    } else {
        // Date removed
        const removedDate = holidays.find(h => !dates.some(d => isSameDay(h, d)));
        if (removedDate) {
            toast({ title: "Feriado eliminado", description: `Se quitó el ${format(removedDate, 'PPP', { locale: es })}.` });
        }
    }

    const updatedHolidays = dates.map(d => startOfDay(d)).sort((a, b) => a.getTime() - b.getTime());
    setHolidays(updatedHolidays);
    saveHolidaysToFirestore(updatedHolidays);
  };

  const handleRemoveHoliday = (dateToRemove: Date) => {
    const updatedHolidays = holidays.filter(h => !isSameDay(h, dateToRemove));
    setHolidays(updatedHolidays);
    saveHolidaysToFirestore(updatedHolidays);
    toast({ title: "Feriado eliminado", description: `Se quitó el ${format(dateToRemove, 'PPP', { locale: es })}.` });
  };


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
       <header className="flex items-center justify-between mb-8">
        <div>
          <Button variant="ghost" onClick={() => router.push('/admin')} className="mb-4">
            <ArrowLeft className="mr-2" />
            Volver al Panel
          </Button>
          <h1 className="text-3xl font-bold">Gestionar Días Feriados</h1>
          <p className="text-muted-foreground">Añade o elimina días festivos que aplican a todas las empresas.</p>
        </div>
      </header>

      <main className="grid gap-8 md:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Calendario</CardTitle>
                <CardDescription>Selecciona los días en el calendario para marcarlos como feriados.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
                <Calendar
                    mode="multiple"
                    selected={holidays}
                    onSelect={handleDateSelect}
                    locale={es}
                    disabled={isLoading}
                    footer={<p className="text-sm text-muted-foreground pt-2">Los Domingos y Lunes festivos oficiales se calculan automáticamente.</p>}
                />
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Listado de Feriados Manuales</CardTitle>
                <CardDescription>Estos son los días que has añadido manualmente.</CardDescription>
            </CardHeader>
            <CardContent>
                {holidays.length > 0 ? (
                    <ul className="space-y-2">
                        {holidays.map(holiday => (
                            <li key={holiday.toString()} className="flex items-center justify-between p-2 rounded-md bg-muted">
                                <span>{format(holiday, 'PPP', { locale: es })}</span>
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveHoliday(holiday)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-center text-muted-foreground py-10">No has agregado feriados manuales.</p>
                )}
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
