'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useReactToPrint } from 'react-to-print';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { LogoSpinner } from '../LogoSpinner';

interface PrintVoucherButtonProps {
    voucherRef: React.RefObject<HTMLDivElement>;
    isDisabled: boolean;
    operatorName: string;
}

const PrintVoucherButtonComponent: React.FC<PrintVoucherButtonProps> = ({ voucherRef, isDisabled, operatorName }) => {
    const { toast } = useToast();

    const handlePrint = useReactToPrint({
        content: () => voucherRef.current,
        documentTitle: `comprobante-pago-${operatorName.replace(/\s/g, '-').toLowerCase()}`,
        onAfterPrint: () => toast({ title: "Comprobante generado", description: "La descarga de tu comprobante ha comenzado." }),
        onPrintError: () => toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar el comprobante.' }),
    });

    return (
        <Button onClick={handlePrint} disabled={isDisabled}>
            <Download className="mr-2 h-4 w-4" />
            Descargar Comprobante
        </Button>
    );
};

// Dynamically import the component with SSR turned off
export const PrintVoucherButton = dynamic(() => Promise.resolve(PrintVoucherButtonComponent), {
    ssr: false,
    loading: () => (
        <Button disabled>
            <LogoSpinner className="mr-2 h-5 w-5" />
            Cargando...
        </Button>
    ),
});
