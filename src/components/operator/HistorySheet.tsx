'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Payroll, PayrollSummary, CompanySettings } from '@/types/db-entities';
import { LogoSpinner } from '../LogoSpinner';
import { Button } from '../ui/button';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { toDate } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface HistorySheetProps {
    companyId: string;
    periodSummary: PayrollSummary | null;
    settings: CompanySettings | null;
}

function formatCurrency(value: number) {
    if (isNaN(value)) return '$0';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}

export function HistorySheet({ companyId, periodSummary, settings }: HistorySheetProps) {
    const { user } = useUser();
    const firestore = useFirestore();

    const payrollsQuery = useMemoFirebase(() => {
        if (!firestore || !user?.uid || !companyId) return null;
        return query(
            collection(firestore, 'companies', companyId, 'payrolls'),
            where('userId', '==', user.uid),
            orderBy('periodEnd', 'desc')
        );
    }, [firestore, companyId, user]);

    const { data: payrolls, isLoading, error } = useCollection<Payroll>(payrollsQuery);

    const renderPayrollList = () => {
        if (isLoading) {
            return (
                <div className="h-24 flex items-center justify-center">
                    <LogoSpinner className="h-10 w-10" />
                </div>
            );
        }

        if (error) {
            return <p className="text-center text-destructive py-8">No tienes permiso para ver el historial.</p>;
        }

        if (!payrolls || payrolls.length === 0) {
            return (
                <Card>
                    <CardHeader>
                        <CardTitle>Historial de Pagos</CardTitle>
                        <CardDescription>Aquí aparecerán tus períodos de pago una vez sean cerrados.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-center text-muted-foreground py-8">Aún no tienes períodos de pago registrados.</p>
                    </CardContent>
                </Card>
            )
        }

        return (
            <Card>
                <CardHeader>
                    <CardTitle>Historial de Pagos</CardTitle>
                    <CardDescription>Consulta el detalle de tus períodos anteriores.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-3">
                        {payrolls.map(payroll => {
                            const periodStart = toDate(payroll.periodStart);
                            const periodEnd = toDate(payroll.periodEnd);
                            return (
                                 <li key={payroll.id}>
                                    <Link href={`/operator/history/${payroll.id}`} passHref>
                                        <Button variant="outline" className="w-full h-auto justify-between py-3 px-4">
                                            <div className="text-left">
                                                <p className="font-semibold">
                                                     {periodStart && periodEnd ? `${format(periodStart, 'd MMM', {locale: es})} - ${format(periodEnd, 'd MMM, yyyy', {locale: es})}` : 'Periodo no definido'}
                                                </p>
                                                <div className="flex items-baseline gap-4 mt-1">
                                                    <p className="text-base text-primary font-bold">{formatCurrency(payroll.summary.netPay)}</p>
                                                    <p className="text-xs text-muted-foreground">{`${payroll.summary.daysWorked} días • ${payroll.summary.totalHours}h`}</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                        </Button>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </CardContent>
            </Card>
        );
    }


    return (
        <div className="space-y-8 p-4 sm:p-6 h-full overflow-y-auto">
             <Card>
                <CardHeader>
                    <CardTitle>
                        {settings?.payrollCycle === 'bi-weekly' ? 'Resumen de la Quincena Actual' : 'Resumen del Mes Actual'}
                    </CardTitle>
                    <CardDescription>Este es el acumulado de tu período de pago en curso.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center p-4 rounded-lg bg-muted">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Horas</p>
                            <p className="text-2xl font-bold">
                                {periodSummary ? `${periodSummary.totalHours}h` : '0h'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Pago Bruto</p>
                            <p className="text-2xl font-bold">
                                {periodSummary ? formatCurrency(periodSummary.grossPay) : '$0'}
                            </p>
                        </div>
                         <div>
                            <p className="text-sm text-muted-foreground">Pago Neto</p>
                            <p className="text-2xl font-bold text-primary">
                                {periodSummary ? formatCurrency(periodSummary.netPay) : '$0'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {renderPayrollList()}
        </div>
    );
}
