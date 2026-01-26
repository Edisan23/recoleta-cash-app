'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { LogoSpinner } from '@/components/LogoSpinner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Payroll } from '@/types/db-entities';
import { collection, query, where, orderBy } from 'firebase/firestore';
import Link from 'next/link';
import { toDate } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const OPERATOR_COMPANY_KEY = 'fake_operator_company_id';

function formatCurrency(value: number): string {
    if (isNaN(value)) return '$0';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}

export default function HistoryPage() {
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted) return;
        if (isUserLoading) return;
        if (!user) {
            router.replace('/login');
            return;
        }
        const storedCompanyId = localStorage.getItem(OPERATOR_COMPANY_KEY);
        if (!storedCompanyId) {
            router.replace('/select-company');
        } else {
            setCompanyId(storedCompanyId);
        }
    }, [user, isUserLoading, router, isMounted]);

    const payrollsQuery = useMemoFirebase(() => {
        if (!firestore || !user?.uid || !companyId) return null;
        return query(
            collection(firestore, 'companies', companyId, 'payrolls'),
            where('userId', '==', user.uid),
            orderBy('periodEnd', 'desc')
        );
    }, [firestore, companyId, user]);

    const { data: payrolls, isLoading: payrollsLoading, error } = useCollection<Payroll>(payrollsQuery);
    
    const isLoading = isUserLoading || payrollsLoading || !isMounted || !companyId;

    const renderContent = () => {
        if (isLoading) {
             return (
                <div className="h-40 flex items-center justify-center">
                    <LogoSpinner className="h-10 w-10" />
                </div>
            );
        }

        if (error) {
            return <p className="text-center text-destructive py-8">No tienes permiso para ver el historial de pagos.</p>;
        }

        if (!payrolls || payrolls.length === 0) {
            return (
                <p className="text-center text-muted-foreground py-8">Aún no tienes períodos de pago registrados.</p>
            );
        }

        return (
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
        );
    }

    if (isUserLoading || !isMounted || !companyId) {
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
                    <h1 className="text-3xl font-bold">Historial de Pagos</h1>
                    <p className="text-muted-foreground">Consulta el detalle y descarga los comprobantes de tus períodos anteriores.</p>
                </div>
            </header>
            <main>
                <Card>
                    <CardContent className="pt-6">
                        {renderContent()}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
