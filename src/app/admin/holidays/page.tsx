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

const HOLIDAYS_DB_KEY = 'fake_holidays_db';

export default function HolidaysPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [holidays, setHolidays] = useState<Date[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedHolidays = localStorage.getItem(HOLIDAYS_DB_KEY);
      if (storedHolidays) {
        const holidayStrings: string[] = JSON.parse(storedHolidays);
        setHolidays(holidayStrings.map(dateString => new Date(dateString)));
      }
    } catch (e) {
      console.error("Failed to load holidays from localStorage", e);
      toast({ title: "Error", description: "No se pudieron cargar los feriados.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const saveHolidaysToStorage = (updatedHolidays: Date[]) => {
    try {
      const holidayStrings = updatedHolidays.map(d => d.toISOString());
      localStorage.setItem(HOLIDAYS_DB_KEY, JSON.stringify(holidayStrings));
    } catch (e) {
      console.error("Failed to save holidays to localStorage", e);
      toast({ title: "Error", description: "No se pudieron guardar los cambios.", variant: "destructive" });
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    const normalizedDate = startOfDay(date);
    const isAlreadySelected = holidays.some(h => isSameDay(h, normalizedDate));

    let updatedHolidays;
    if (isAlreadySelected) {
      updatedHolidays = holidays.filter(h => !isSameDay(h, normalizedDate));
      toast({ title: "Feriado eliminado", description: `Se quitó el ${format(normalizedDate, 'PPP', { locale: es })}.` });
    } else {
      updatedHolidays = [...holidays, normalizedDate].sort((a, b) => a.getTime() - b.getTime());
      toast({ title: "Feriado agregado", description: `Se añadió el ${format(normalizedDate, 'PPP', { locale: es })}.` });
    }
    setHolidays(updatedHolidays);
    saveHolidaysToStorage(updatedHolidays);
  };

  const handleRemoveHoliday = (dateToRemove: Date) => {
    const updatedHolidays = holidays.filter(h => !isSameDay(h, dateToRemove));
    setHolidays(updatedHolidays);
    saveHolidaysToStorage(updatedHolidays);
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
