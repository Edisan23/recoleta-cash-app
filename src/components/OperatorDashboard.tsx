
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2, Trash2 } from 'lucide-react';
import type { Company, Shift, CompanySettings } from '@/types/db-entities';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { DatePicker } from '@/components/DatePicker';
import { TimeInput } from '@/components/TimeInput';
import { DeleteShiftDialog } from '@/components/operator/DeleteShiftDialog';

// --- FAKE DATA & KEYS ---
const FAKE_OPERATOR_USER = {
  uid: 'fake-operator-uid-12345',
  isAnonymous: false,
  displayName: 'Juan Operador',
  photoURL: '',
};

const COMPANIES_DB_KEY = 'fake_companies_db';
const OPERATOR_COMPANY_KEY = 'fake_operator_company_id';
const SHIFTS_DB_KEY = 'fake_shifts_db';
const SETTINGS_DB_KEY = 'fake_company_settings_db';

// --- HELPER FUNCTIONS ---
function getInitials(name: string) {
    const names = name.split(' ');
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}


// --- COMPONENT ---
export function OperatorDashboard({ companyId }: { companyId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  
  const user = FAKE_OPERATOR_USER;

  // Global state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Data from DB
  const [company, setCompany] = useState<Company | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [allShifts, setAllShifts] = useState<Shift[]>([]);

  // Shift state for the selected day
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [workedHoursSummary, setWorkedHoursSummary] = useState<string | null>(null);
  const [accumulatedHoursSummary, setAccumulatedHoursSummary] = useState<string | null>(null);

  // --- DERIVED STATE ---
  const shiftForSelectedDate = useMemo(() => {
    if (!date || !user) return null;
    return allShifts.find(s => 
        s.userId === user.uid && 
        s.companyId === companyId &&
        new Date(s.date).toDateString() === date.toDateString()
    );
  }, [date, allShifts, companyId, user.uid]);
  
  const shiftDays = useMemo(() => {
    return allShifts
        .filter(s => s.userId === user.uid && s.companyId === companyId)
        .map(s => new Date(s.date));
  }, [allShifts, user.uid, companyId]);


  // Effect 1: Load all initial data from localStorage ONCE
  useEffect(() => {
    setIsLoading(true);
    try {
      // Load Company
      const storedCompanies = localStorage.getItem(COMPANIES_DB_KEY);
      const allCompanies: Company[] = storedCompanies ? JSON.parse(storedCompanies) : [];
      const foundCompany = allCompanies.find(c => c.id === companyId);
      
      if (!foundCompany) {
        toast({ title: 'Error', description: 'Empresa no encontrada.', variant: 'destructive' });
        localStorage.removeItem(OPERATOR_COMPANY_KEY);
        router.replace('/select-company');
        return;
      }
      setCompany(foundCompany);

      // Load all shifts for this user
      const storedShifts = localStorage.getItem(SHIFTS_DB_KEY);
      const parsedShifts: Shift[] = storedShifts ? JSON.parse(storedShifts) : [];
      setAllShifts(parsedShifts);
      
      // Load Company Settings
      const storedSettings = localStorage.getItem(SETTINGS_DB_KEY);
      if(storedSettings) {
        let allSettings: CompanySettings[] = JSON.parse(storedSettings);
        if (!Array.isArray(allSettings)) {
          allSettings = [allSettings];
        }
        const foundSettings = allSettings.find(s => s.id === companyId);
        setSettings(foundSettings || { id: companyId, payrollCycle: 'monthly' });
      } else {
        setSettings({ id: companyId, payrollCycle: 'monthly' });
      }


    } catch(e) {
      console.error("Failed to load initial data from localStorage", e);
      toast({ title: 'Error', description: 'No se pudieron cargar los datos iniciales.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [companyId, router, toast]);

  // Effect 2: Update inputs when date changes or shifts are updated
  useEffect(() => {
    if (shiftForSelectedDate) {
      setStartTime(shiftForSelectedDate.startTime || '');
      setEndTime(shiftForSelectedDate.endTime || '');
    } else {
      setStartTime('');
      setEndTime('');
    }
  }, [shiftForSelectedDate, date]);

  // Effect 3: Calculate worked hours summary for the selected day
  useEffect(() => {
    if (startTime && endTime && /^\d{2}:\d{2}$/.test(startTime) && /^\d{2}:\d{2}$/.test(endTime)) {
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [endHours, endMinutes] = endTime.split(':').map(Number);

        let start = new Date();
        start.setHours(startHours, startMinutes, 0, 0);

        let end = new Date();
        end.setHours(endHours, endMinutes, 0, 0);

        if (end < start) {
            end.setDate(end.getDate() + 1);
        }

        const diffMs = end.getTime() - start.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        setWorkedHoursSummary(`${diffHours}h ${diffMins}m`);
    } else {
        setWorkedHoursSummary(null);
    }
  }, [startTime, endTime]);

  // Effect 4: Calculate accumulated hours for the current period (month/fortnight)
  useEffect(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    let periodShifts: Shift[] = [];

    if (settings?.payrollCycle === 'bi-weekly') {
        const isFirstFortnight = currentDay <= 15;
        periodShifts = allShifts.filter(shift => {
            const shiftDate = new Date(shift.date);
            const shiftDay = shiftDate.getDate();
            return shift.userId === user.uid &&
                   shift.companyId === companyId &&
                   shiftDate.getFullYear() === currentYear &&
                   shiftDate.getMonth() === currentMonth &&
                   (isFirstFortnight ? shiftDay <= 15 : shiftDay > 15);
        });
    } else { // monthly
        periodShifts = allShifts.filter(shift => {
            const shiftDate = new Date(shift.date);
            return shift.userId === user.uid &&
                   shift.companyId === companyId &&
                   shiftDate.getFullYear() === currentYear &&
                   shiftDate.getMonth() === currentMonth;
        });
    }

    let totalMs = 0;
    periodShifts.forEach(shift => {
        if (shift.startTime && shift.endTime) {
             const [startHours, startMinutes] = shift.startTime.split(':').map(Number);
             const [endHours, endMinutes] = shift.endTime.split(':').map(Number);

             let start = new Date(shift.date);
             start.setHours(startHours, startMinutes, 0, 0);

             let end = new Date(shift.date);
             end.setHours(endHours, endMinutes, 0, 0);

             if (end < start) {
                 end.setDate(end.getDate() + 1);
             }
             totalMs += end.getTime() - start.getTime();
        }
    });

    const totalHours = Math.floor(totalMs / (1000 * 60 * 60));
    const totalMins = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
    
    setAccumulatedHoursSummary(`${totalHours}h ${totalMins}m`);

  }, [allShifts, user.uid, companyId, settings]);

  const handleSave = async () => {
    if (!date || !user || (!startTime && !endTime)) {
        toast({ title: "Atención", description: "Debes ingresar al menos una hora para guardar.", variant: "destructive"});
        return;
    }

    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate save

    let updatedShifts = [...allShifts];
    const shiftIndex = updatedShifts.findIndex(s => 
        s.userId === user.uid && 
        s.companyId === companyId &&
        new Date(s.date).toDateString() === date.toDateString()
    );

    const shiftData = { startTime, endTime };

    if (shiftIndex > -1) {
        // Update existing shift
        updatedShifts[shiftIndex] = { ...updatedShifts[shiftIndex], ...shiftData };
    } else {
        // Create new shift
        const newShift: Shift = {
            id: `shift_${Date.now()}`,
            userId: user.uid,
            companyId: companyId,
            date: date.toISOString(),
            ...shiftData,
        };
        updatedShifts.push(newShift);
    }
    
    try {
        localStorage.setItem(SHIFTS_DB_KEY, JSON.stringify(updatedShifts));
        setAllShifts(updatedShifts);
        toast({ title: "¡Guardado!", description: "Tu turno se ha guardado correctamente." });
    } catch(e) {
        console.error("Error saving shifts to localStorage", e);
        toast({ title: "Error", description: "No se pudo guardar tu turno.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!date || !user || !shiftForSelectedDate) return;

    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    const updatedShifts = allShifts.filter(s => s.id !== shiftForSelectedDate.id);

    try {
        localStorage.setItem(SHIFTS_DB_KEY, JSON.stringify(updatedShifts));
        setAllShifts(updatedShifts);
        toast({ title: "¡Eliminado!", description: "El turno ha sido eliminado." });
    } catch (e) {
        console.error("Error deleting shift from localStorage", e);
        toast({ title: "Error", description: "No se pudo eliminar el turno.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };
  

  const handleSignOut = () => {
    try {
        localStorage.removeItem(OPERATOR_COMPANY_KEY);
    } catch (e) {
        console.error("Failed to clear localStorage", e);
    }
    router.push('/'); 
  };
  
  if (isLoading || !company) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }
  
  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gray-100 dark:bg-gray-900">
      <div className="flex-1 w-full max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <header className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-4">
                 <Avatar className="h-16 w-16">
                    <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'}/>
                    <AvatarFallback>
                        {user?.isAnonymous ? 'OP' : (user?.displayName ? getInitials(user.displayName) : 'U')}
                    </AvatarFallback>
                </Avatar>
                <div className="text-left">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    Bienvenido, {user?.isAnonymous ? 'Operador' : user?.displayName || ''}
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
                    Panel de Operador
                    </p>
                </div>
            </div>
             <div className="flex flex-col items-end gap-2">
                 {company && (
                    <div className="flex items-center gap-3 text-right">
                        <div>
                            <p className="font-semibold text-lg">{company.name}</p>
                            <p className="text-sm text-muted-foreground">Empresa</p>
                        </div>
                        {company.logoUrl ? (
                            <Image src={company.logoUrl} alt={company.name} width={48} height={48} className="rounded-md object-contain" />
                        ) : (
                             <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">
                                Logo
                            </div>
                        )}
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={handleSignOut} aria-label="Cerrar sesión">
                        <LogOut className="mr-2 h-5 w-5" />
                        Salir
                    </Button>
                </div>
            </div>
        </header>

        <main className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Registrar Actividad</CardTitle>
                    <CardDescription>
                        Selecciona una fecha y registra tus horas de trabajo. Los días con turnos guardados aparecen marcados.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        <DatePicker date={date} setDate={setDate} highlightedDays={shiftDays} />
                        
                        <div className="grid grid-cols-2 gap-4 w-full">
                           <TimeInput 
                                label="Hora de Entrada"
                                value={startTime}
                                onChange={setStartTime}
                            />
                           <TimeInput 
                                label="Hora de Salida"
                                value={endTime}
                                onChange={setEndTime}
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                    <div>
                        {shiftForSelectedDate && (
                            <DeleteShiftDialog onConfirm={handleDelete}>
                                <Button variant="destructive" size="icon" disabled={isSaving}>
                                    <Trash2 className="h-4 w-4"/>
                                    <span className="sr-only">Eliminar Turno</span>
                                </Button>
                            </DeleteShiftDialog>
                        )}
                    </div>
                    <Button onClick={handleSave} disabled={isSaving || !date}>
                        {isSaving ? <Loader2 className="animate-spin mr-2" /> : null}
                        Guardar Turno
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Resumen del Turno</CardTitle>
                    <CardDescription>
                        Cálculo para el día seleccionado.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-around items-center text-center">
                        <div>
                            <p className="text-sm text-muted-foreground">Total de Horas</p>
                            <p className="text-2xl font-bold">
                                {workedHoursSummary || '--:--'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>
                        {settings?.payrollCycle === 'bi-weekly' ? 'Acumulado Quincenal' : 'Acumulado Mensual'}
                    </CardTitle>
                    <CardDescription>
                        Total de horas trabajadas en el período actual.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-around items-center text-center">
                        <div>
                            <p className="text-sm text-muted-foreground">Total de Horas Acumuladas</p>
                            <p className="text-2xl font-bold">
                                {accumulatedHoursSummary || '0h 0m'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </main>
      </div>
    </div>
  );
}
