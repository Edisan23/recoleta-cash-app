'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Payroll } from '@/types/db-entities';
import { LogoSpinner } from '../LogoSpinner';
import { Button } from '../ui/button';
import { ChevronRight, CalendarClock } from 'lucide-react';
import Link from 'next/link';
import { toDate } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PayrollHistoryCardProps {
    companyId: string;
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}

export function PayrollHistoryCard({ companyId }: PayrollHistoryCardProps) {
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

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><CalendarClock /> Historial de Pagos</CardTitle>
                </CardHeader>
                <CardContent className="h-24 flex items-center justify-center">
                    <LogoSpinner className="h-10 w-10" />
                </CardContent>
            </Card>
        );
    }
    
    if (error) {
        return null; // Don't show the card if there's a permission error
    }

    if (!payrolls || payrolls.length === 0) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><CalendarClock /> Historial de Pagos</CardTitle>
                    <CardDescription>Aquí aparecerán tus períodos de pago una vez sean cerrados por un administrador.</CardDescription>
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
                <CardTitle className="flex items-center gap-2"><CalendarClock /> Historial de Pagos</CardTitle>
                <CardDescription>Consulta el detalle y descarga los comprobantes de tus períodos anteriores.</CardDescription>
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
    )
}
