'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { LogoSpinner } from '@/components/LogoSpinner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function PaymentStatusContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [status, setStatus] = useState<'loading' | 'success' | 'declined' | 'error' | 'pending'>('loading');
    const [message, setMessage] = useState('Verificando el estado de tu pago...');

    useEffect(() => {
        const transactionId = searchParams.get('id');
        if (!transactionId) {
            setStatus('error');
            setMessage('No se encontró un ID de transacción para verificar.');
            return;
        }

        // Mock verification logic
        const verifyPayment = () => {
            // In a real app, you'd fetch the status from your backend
            // which in turn queries Wompi.
            // For this example, we'll just simulate a successful payment.
            setStatus('success');
            setMessage('¡Pago exitoso! Tu cuenta ha sido actualizada a Premium.');
            toast({
                title: 'Pago Exitoso',
                description: 'Tu cuenta ahora es Premium.',
            });
        };

        const timeoutId = setTimeout(verifyPayment, 2000); // Simulate network delay
        return () => clearTimeout(timeoutId);

    }, [searchParams, toast]);

    const renderIcon = () => {
        switch (status) {
            case 'loading':
                return <LogoSpinner className="h-16 w-16" />;
            case 'success':
                return <CheckCircle className="h-16 w-16 text-green-500" />;
            case 'declined':
                return <XCircle className="h-16 w-16 text-destructive" />;
            case 'pending':
                return <Clock className="h-16 w-16 text-blue-500" />;
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
            case 'pending':
                return 'Pago Pendiente';
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
