// src/app/payment/confirmation/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { verifyWompiPayment } from '@/app/actions/wompi';
import { LogoSpinner } from '@/components/LogoSpinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

function ConfirmationContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const transactionId = searchParams.get('id');

    const [status, setStatus] = useState<'LOADING' | 'APPROVED' | 'DECLINED' | 'ERROR'>('LOADING');
    const [message, setMessage] = useState('Verificando tu pago, por favor espera...');

    useEffect(() => {
        if (!transactionId) {
            setStatus('ERROR');
            setMessage('No se encontró un ID de transacción.');
            return;
        }

        async function verify() {
            const result = await verifyWompiPayment(transactionId!);
            setMessage(result.message);
            if (result.status === 'APPROVED') {
                setStatus('APPROVED');
            } else if (result.status === 'DECLINED' || result.status === 'VOIDED' || result.status === 'ERROR') {
                setStatus('DECLINED'); // Agrupando rechazados y errores para la UI
            } else {
                setStatus('ERROR'); // Cualquier otro estado
            }
        }

        verify();
    }, [transactionId]);

    const renderIcon = () => {
        switch (status) {
            case 'LOADING':
                return <LogoSpinner className="h-16 w-16" />;
            case 'APPROVED':
                return <CheckCircle className="h-16 w-16 text-green-500" />;
            case 'DECLINED':
                return <XCircle className="h-16 w-16 text-red-500" />;
            case 'ERROR':
                return <AlertTriangle className="h-16 w-16 text-yellow-500" />;
            default:
                return null;
        }
    };

    const getTitle = () => {
        switch (status) {
            case 'LOADING':
                return 'Procesando Pago';
            case 'APPROVED':
                return '¡Pago Exitoso!';
            case 'DECLINED':
                return 'Pago Rechazado';
            case 'ERROR':
                return 'Error en la Transacción';
            default:
                return '';
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto mb-4">
                        {renderIcon()}
                    </div>
                    <CardTitle className="text-2xl">{getTitle()}</CardTitle>
                    <CardDescription>{message}</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Contenido opcional puede ir aquí */}
                </CardContent>
                <CardFooter>
                    <Button className="w-full" onClick={() => router.push('/operator/dashboard')}>
                        Volver al Panel
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}


export default function PaymentConfirmationPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><LogoSpinner /></div>}>
            <ConfirmationContent />
        </Suspense>
    );
}
