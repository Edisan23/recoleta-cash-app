'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { LogoSpinner } from '@/components/LogoSpinner';
import type { Shift, CompanySettings } from '@/types/db-entities';
import { collection, query, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, startOfMonth, addMonths, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { getPeriodDateRange } from '@/lib/payroll-calculator';
import { ArrowLeft, ChevronRight } from 'lucide-react';

const OPERATOR_COMPANY_KEY = 'fake_operator_company_id';

const generatePeriods = (allShifts: Shift[], settings: CompanySettings) => {
    if (allShifts.length === 0) return [];
    
    const sortedShifts = allShifts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstShiftDate = new Date(sortedShifts[0].date);
    const lastShiftDate = new Date(sortedShifts[sortedShifts.length - 1].date);
    
    const periods: { start: Date, end: Date }[] = [];
    let current = startOfMonth(firstShiftDate);

    const isWithinPeriod = (date: Date, period: { start: Date; end: Date }) => {
        const time = date.getTime();
        return time >= period.start.getTime() && time <= new Date(period.end).setHours(23, 59, 59, 999);
    };

    while (current <= lastShiftDate) {
        if (settings.payrollCycle === 'monthly') {
            const period = getPeriodDateRange(current, 'monthly');
            if (allShifts.some(s => isWithinPeriod(new Date(s.date), period))) {
                 periods.push(period);
            }
            current = addMonths(current, 1);
        } else { // bi-weekly
            const firstHalf = { start: startOfDay(new Date(current.getFullYear(), current.getMonth(), 1)), end: startOfDay(new Date(current.getFullYear(), current.getMonth(), 15))};
            const secondHalf = { start: startOfDay(new Date(current.getFullYear(), current.getMonth(), 16)), end: startOfDay(new Date(current.getFullYear(), current.getMonth() + 1, 0))};
            
            if(allShifts.some(s => isWithinPeriod(new Date(s.date), firstHalf))) {
                periods.push(firstHalf);
            }
            if(allShifts.some(s => isWithinPeriod(new Date(s.date), secondHalf))) {
                 periods.push(secondHalf);
            }
            current = addMonths(current, 1);
        }
    }
    return periods.reverse(); // Show most recent first
};

export default function HistoryListPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading: isUserAuthLoading } = useUser();
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    const storedCompanyId = localStorage.getItem(OPERATOR_COMPANY_KEY);
    if (storedCompanyId) {
      setCompanyId(storedCompanyId);
    } else if (!isUserAuthLoading && user) {
        router.replace('/select-company');
    }
  }, [isUserAuthLoading, user, router]);

  const shiftsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid || !companyId) return null;
    return query(collection(firestore, 'companies', companyId, 'shifts'), where('userId', '==', user.uid));
  }, [firestore, companyId, user]);
  const { data: allShifts, isLoading: shiftsLoading } = useCollection<Shift>(shiftsQuery);
  
  const settingsRef = useMemoFirebase(() => firestore && companyId ? doc(firestore, 'companies', companyId, 'settings', 'main') : null, [firestore, companyId]);
  const { data: settings, isLoading: settingsLoading } = useDoc<CompanySettings>(settingsRef);

  const isLoading = isUserAuthLoading || shiftsLoading || settingsLoading;

  const availablePeriods = useMemo(() => {
      if (!allShifts || !settings) return [];
      return generatePeriods(allShifts, settings);
  }, [allShifts, settings]);

  const handlePeriodSelect = (period: { start: Date, end: Date }) => {
    // Format: YYYY-MM-DD_YYYY-MM-DD
    const periodId = `${format(period.start, 'yyyy-MM-dd')}_${format(period.end, 'yyyy-MM-dd')}`;
    router.push(`/operator/history/${periodId}`);
  };

  if (isLoading || !user || !settings) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LogoSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <header className="flex items-center justify-between mb-8">
            <div>
                <Button variant="ghost" onClick={() => router.push('/operator/dashboard')} className="mb-4">
                    <ArrowLeft className="mr-2" />
                    Volver al Panel
                </Button>
                <h1 className="text-3xl font-bold">Historial de Períodos</h1>
                <p className="text-muted-foreground">Selecciona un período para ver el detalle de tus pagos.</p>
            </div>
        </header>

        <main>
            <Card>
                <CardHeader>
                    <CardTitle>Períodos de Pago</CardTitle>
                    <CardDescription>Estos son todos tus períodos de pago registrados.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {availablePeriods.length > 0 ? (
                            availablePeriods.map((period, index) => (
                                <button
                                    key={index}
                                    onClick={() => handlePeriodSelect(period)}
                                    className="w-full flex items-center justify-between p-4 rounded-lg border bg-background hover:bg-muted transition-colors text-left"
                                >
                                    <div>
                                        <p className="font-semibold capitalize text-lg">
                                            {format(period.start, 'MMMM yyyy', { locale: es })}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {format(period.start, 'dd MMM', { locale: es })} - {format(period.end, 'dd MMM', { locale: es })}
                                        </p>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                </button>
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground py-10">No se encontraron períodos de pago con turnos registrados.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </main>
    </div>
  );
}
