'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getWompiTransactionStatus, updateUserToPremium } from '@/app/actions/wompi';
import { LogoSpinner } from '@/components/LogoSpinner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function PaymentStatusContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [status, setStatus] = useState<'loading' | 'success' | 'declined' | 'error'>('loading');
    const [message, setMessage] = useState('Verificando el estado de tu pago...');

    useEffect(() => {
        const transactionId = searchParams.get('id');
        if (!transactionId) {
            setStatus('error');
            setMessage('No se encontró un ID de transacción para verificar.');
            return;
        }

        const verifyPayment = async () => {
            const wompiResult = await getWompiTransactionStatus(transactionId);

            if ('error' in wompiResult) {
                setStatus('error');
                setMessage(wompiResult.error);
                return;
            }

            if (wompiResult.status === 'APPROVED') {
                // Reference format: turnopro-premium-{userId}-{companyId}-{timestamp}
                const referenceParts = wompiResult.reference.split('-');
                const userId = referenceParts[2];
                const companyId = referenceParts[3];

                if (!userId || !companyId) {
                     setStatus('error');
                     setMessage('La referencia de la transacción es inválida.');
                     return;
                }

                const updateResult = await updateUserToPremium(userId, companyId);

                if ('error' in updateResult) {
                    setStatus('error');
                    setMessage('Tu pago fue aprobado, pero hubo un problema al activar tu cuenta. Por favor, contacta a soporte.');
                    toast({
                        variant: 'destructive',
                        title: 'Error de activación',
                        description: `Tu pago fue exitoso (ID: ${transactionId}) pero no pudimos actualizar tu cuenta.`,
                    });
                } else {
                    setStatus('success');
                    setMessage('¡Pago exitoso! Tu cuenta ha sido actualizada a Premium.');
                }
            } else if (wompiResult.status === 'DECLINED' || wompiResult.status === 'VOIDED' || wompiResult.status === 'ERROR') {
                setStatus('declined');
                setMessage(`Tu pago fue ${wompiResult.status === 'DECLINED' ? 'declinado' : 'cancelado'}. Por favor, intenta de nuevo o usa otro método de pago.`);
            } else {
                 setStatus('declined'); // Otro estado como PENDING
                 setMessage('Tu pago está pendiente de confirmación. Te notificaremos cuando se complete.');
            }
        };

        verifyPayment();

    }, [searchParams, toast]);

    const renderIcon = () => {
        switch (status) {
            case 'loading':
                return <LogoSpinner className="h-16 w-16" />;
            case 'success':
                return <CheckCircle className="h-16 w-16 text-green-500" />;
            case 'declined':
                return <XCircle className="h-16 w-16 text-destructive" />;
            case 'error':
                return <AlertCircle className="h-16 w-16 text-yellow-500" />;
        }
    };

     const renderTitle = () => {
        switch (status) {
            case 'loading':
                return 'Procesando...';
            case 'success':
                return '¡Felicidades!';
            case 'declined':
                return 'Pago Declinado';
            case 'error':
                return 'Ocurrió un Error';
        }
    };


    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto mb-4">{renderIcon()}</div>
                    <CardTitle className="text-2xl">{renderTitle()}</CardTitle>
                    <CardDescription>{message}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => router.push('/operator/dashboard')} className="w-full">
                        Volver al Panel Principal
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}


export default function PaymentStatusPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><LogoSpinner /></div>}>
            <PaymentStatusContent />
        </Suspense>
    )
}
