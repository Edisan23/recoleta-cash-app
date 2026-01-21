'use client';

import React from 'react';
import { useReactToPrint } from 'react-to-print';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface PrintVoucherButtonProps {
    voucherRef: React.RefObject<HTMLDivElement>;
    isDisabled: boolean;
    operatorName: string;
}

export const PrintVoucherButton: React.FC<PrintVoucherButtonProps> = ({ voucherRef, isDisabled, operatorName }) => {
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
