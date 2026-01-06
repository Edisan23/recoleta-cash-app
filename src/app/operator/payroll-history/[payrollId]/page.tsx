'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Payroll, Company } from '@/types/db-entities';
import { LogoSpinner } from '@/components/LogoSpinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, AlertCircle } from 'lucide-react';
import { PayrollVoucher } from '@/components/operator/PayrollVoucher';
import { useReactToPrint } from 'react-to-print';
import { useToast } from '@/hooks/use-toast';
import { getPeriodDateRange } from '@/lib/payroll-calculator';

const OPERATOR_COMPANY_KEY = 'fake_operator_company_id';

export default function PayrollDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const voucherRef = useRef<HTMLDivElement>(null);

    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    
    const [companyId, setCompanyId] = useState<string | null>(null);

    useEffect(() => {
        const storedCompanyId = localStorage.getItem(OPERATOR_COMPANY_KEY);
        if (storedCompanyId) {
            setCompanyId(storedCompanyId);
        }
    }, []);

    const payrollId = params.payrollId as string;

    const payrollRef = useMemoFirebase(() => {
        if (!firestore || !companyId || !payrollId) return null;
        return doc(firestore, 'companies', companyId, 'payrolls', payrollId);
    }, [firestore, companyId, payrollId]);
    
    const { data: payroll, isLoading: payrollLoading, error: payrollError } = useDoc<Payroll>(payrollRef);

    const companyRef = useMemoFirebase(() => {
        if (!firestore || !companyId) return null;
        return doc(firestore, 'companies', companyId);
    }, [firestore, companyId]);

    const { data: company, isLoading: companyLoading } = useDoc<Company>(companyRef);

    const handlePrint = useReactToPrint({
      content: () => voucherRef.current,
      documentTitle: `comprobante-de-pago-${payroll?.userName.replace(/\s/g, '-').toLowerCase() || 'operador'}`,
      onAfterPrint: () => toast({ title: "Comprobante generado", description: "Tu comprobante se ha descargado."}),
      onPrintError: () => toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar el comprobante.'}),
    });
    
    if (isUserLoading || payrollLoading || companyLoading) {
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
    
    if (payrollError || (payroll && payroll.userId !== user?.uid)) {
         return (
          <div className="flex flex-col items-center justify-center h-screen text-center p-4">
              <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Acceso Denegado</h2>
              <p className="text-lg text-muted-foreground mb-6">No tienes permiso para ver este registro de nómina.</p>
              <Button onClick={() => router.push('/operator/payroll-history')}>
                  <ArrowLeft className="mr-2" />
                  Volver al Historial
              </Button>
          </div>
      );
    }
    
    if (!payroll && !payrollLoading) {
         return (
          <div className="flex flex-col items-center justify-center h-screen text-center p-4">
              <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Registro no Encontrado</h2>
              <p className="text-lg text-muted-foreground mb-6">No se pudo encontrar el registro de nómina que buscas.</p>
              <Button onClick={() => router.push('/operator/payroll-history')}>
                  <ArrowLeft className="mr-2" />
                  Volver al Historial
              </Button>
          </div>
        );
    }


    return (
        <div className="bg-gray-100 dark:bg-gray-900 min-h-screen py-8">
            <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-4xl">
                 <header className="flex items-center justify-between mb-8">
                    <div>
                        <Button variant="ghost" onClick={() => router.push('/operator/payroll-history')} className="mb-4">
                            <ArrowLeft className="mr-2" />
                            Volver al Historial
                        </Button>
                    </div>
                     <Button onClick={handlePrint} disabled={!payroll || !company}>
                        <Download className="mr-2" />
                        Descargar / Imprimir
                    </Button>
                </header>

                <main>
                    {payroll && company ? (
                         <div ref={voucherRef} className="bg-white text-black p-0 sm:p-4 rounded-lg">
                            <PayrollVoucher 
                                operatorName={payroll.userName}
                                companyName={company.name}
                                period={{start: new Date(payroll.periodStart), end: new Date(payroll.periodEnd)}}
                                summary={payroll.summary}
                                shifts={payroll.shifts}
                            />
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="flex justify-center items-center h-96">
                                <LogoSpinner />
                            </CardContent>
                        </Card>
                    )}
                </main>
            </div>
        </div>
    );
}
