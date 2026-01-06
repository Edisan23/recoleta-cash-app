'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Payroll } from '@/types/db-entities';
import { LogoSpinner } from '@/components/LogoSpinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Calendar, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const OPERATOR_COMPANY_KEY = 'fake_operator_company_id';

function formatCurrency(value: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}

export default function PayrollHistoryPage() {
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [companyId, setCompanyId] = useState<string | null>(null);

    useEffect(() => {
        const storedCompanyId = localStorage.getItem(OPERATOR_COMPANY_KEY);
        if (storedCompanyId) {
            setCompanyId(storedCompanyId);
        } else if (!isUserLoading && user) {
            router.replace('/select-company');
        }
    }, [isUserLoading, user, router]);

    const payrollsQuery = useMemoFirebase(() => {
        if (!firestore || !user || !companyId) return null;
        return query(
            collection(firestore, 'companies', companyId, 'payrolls'),
            where('userId', '==', user.uid),
            orderBy('periodEnd', 'desc')
        );
    }, [firestore, user, companyId]);

    const { data: payrolls, isLoading: payrollsLoading, error } = useCollection<Payroll>(payrollsQuery);

    if (isUserLoading || payrollsLoading || !companyId) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <LogoSpinner />
            </div>
        );
    }
    
    if (!isUserLoading && !user) {
        router.replace('/login');
        return null;
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-4xl">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <Button variant="ghost" onClick={() => router.push('/operator/dashboard')} className="mb-4">
                        <ArrowLeft className="mr-2" />
                        Volver al Panel
                    </Button>
                    <h1 className="text-3xl font-bold">Historial de Nóminas</h1>
                    <p className="text-muted-foreground">Consulta tus períodos de pago guardados.</p>
                </div>
            </header>

            <main className="space-y-4">
                {error && (
                     <Card className="border-destructive">
                        <CardHeader>
                            <CardTitle className="text-destructive flex items-center gap-2"><FileText/> Error al Cargar</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>No se pudo cargar el historial de nóminas.</p>
                             <p className="text-sm text-muted-foreground">Por favor, inténtalo de nuevo más tarde o contacta a soporte.</p>
                        </CardContent>
                    </Card>
                )}
                
                {payrolls && payrolls.length > 0 ? (
                    payrolls.map(payroll => (
                        <Card 
                            key={payroll.id} 
                            className="hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => router.push(`/operator/payroll-history/${payroll.id}`)}
                        >
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-primary/10 rounded-lg">
                                        <Calendar className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-lg">
                                            {format(new Date(payroll.periodStart), 'd MMM', { locale: es })} - {format(new Date(payroll.periodEnd), "d MMM, yyyy", { locale: es })}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Pago Neto: <span className="font-bold text-green-600">{formatCurrency(payroll.summary.netPay)}</span>
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <Card>
                        <CardHeader>
                             <CardTitle>Sin Registros</CardTitle>
                        </CardHeader>
                        <CardContent>
                           <p className="text-center text-muted-foreground py-10">No se han encontrado períodos de nómina guardados.</p>
                        </CardContent>
                    </Card>
                )}

            </main>
        </div>
    );
}
