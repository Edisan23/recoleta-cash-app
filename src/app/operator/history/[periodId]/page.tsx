'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Payroll, Company, UserProfile } from '@/types/db-entities';
import { useDoc, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { LogoSpinner } from '@/components/LogoSpinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { PayrollVoucher } from '@/components/operator/PayrollVoucher';
import { PrintVoucherButton } from '@/components/operator/PrintVoucherButton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toDate } from '@/lib/utils';
import Image from 'next/image';

function formatCurrency(value: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}

export default function PayrollDetailPage() {
    const router = useRouter();
    const params = useParams();
    const payrollId = params.periodId as string;
    const { user, userProfile } = useUser();
    const firestore = useFirestore();

    const voucherRef = useRef<HTMLDivElement>(null);

    const [companyId, setCompanyId] = useState<string | null>(null);
    useEffect(() => {
        const storedCompanyId = localStorage.getItem('fake_operator_company_id');
        if (storedCompanyId) {
            setCompanyId(storedCompanyId);
        } else if(user) {
             router.push('/select-company');
        }
    }, [user, router]);
    
    const payrollRef = useMemoFirebase(() => {
        if (!firestore || !companyId || !payrollId) return null;
        return doc(firestore, 'companies', companyId, 'payrolls', payrollId);
    }, [firestore, companyId, payrollId]);

    const { data: payroll, isLoading: payrollLoading, error: payrollError } = useDoc<Payroll>(payrollRef);
    
    const companyRef = useMemoFirebase(() => {
        if(!firestore || !companyId) return null;
        return doc(firestore, 'companies', companyId);
    }, [firestore, companyId]);
    const { data: company, isLoading: companyLoading } = useDoc<Company>(companyRef);
    
    const isLoading = payrollLoading || companyLoading || !companyId || !user;

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <LogoSpinner />
            </div>
        );
    }

    if (payrollError || !payroll) {
         return (
            <div className="flex flex-col items-center justify-center h-screen text-center p-4">
              <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Comprobante no encontrado</h2>
              <p className="text-lg text-muted-foreground mb-6">
                No se pudo encontrar el comprobante de pago o no tienes permiso para verlo.
              </p>
              <Button onClick={() => router.push('/operator/dashboard')}>
                  <ArrowLeft className="mr-2" />
                  Volver al Panel
              </Button>
          </div>
        );
    }
    
    const periodStart = toDate(payroll.periodStart);
    const periodEnd = toDate(payroll.periodEnd);

    return (
        <div className="relative min-h-screen bg-muted/40 p-4 sm:p-8 overflow-x-hidden">
            <div className="max-w-4xl mx-auto">
                <Button variant="ghost" onClick={() => router.push('/operator/dashboard')} className="mb-4">
                    <ArrowLeft className="mr-2" />
                    Volver al Panel
                </Button>

                <Card className="overflow-hidden">
                    <CardHeader className="bg-background p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-3xl">Comprobante de Pago</CardTitle>
                                <CardDescription className="text-base">
                                    {periodStart && periodEnd ? `${format(periodStart, 'd MMM', {locale: es})} - ${format(periodEnd, 'd MMM, yyyy', {locale: es})}` : 'Periodo no definido'}
                                </CardDescription>
                            </div>
                            {company && (
                                 <div className="text-right flex-shrink-0 ml-4">
                                    {company.logoUrl && (
                                        <Image src={company.logoUrl} alt={company.name} width={80} height={80} className="ml-auto mb-2 rounded-md object-contain" />
                                    )}
                                    <p className="font-bold text-lg">{company.name}</p>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="grid sm:grid-cols-3 gap-4 text-center p-4 rounded-lg bg-muted">
                            <div>
                                <p className="text-sm text-muted-foreground">Pago Neto</p>
                                <p className="text-4xl font-bold text-primary">{formatCurrency(payroll.summary.netPay)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Días Trabajados</p>
                                <p className="text-4xl font-bold">{payroll.summary.daysWorked}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Horas</p>
                                <p className="text-4xl font-bold">{payroll.summary.totalHours}h</p>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="p-6 bg-background flex justify-end">
                       <PrintVoucherButton voucherRef={voucherRef} />
                    </CardFooter>
                </Card>
            </div>
            
            {/* The voucher content, hidden off-screen for PDF generation */}
            <div className="fixed -left-[9999px] -top-[9999px] w-[800px]">
                 <PayrollVoucher ref={voucherRef} payroll={payroll} company={company} userProfile={userProfile} />
            </div>
        </div>
    );
}
