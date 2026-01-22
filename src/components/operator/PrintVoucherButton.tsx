'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PrintVoucherButtonProps {
    voucherRef: React.RefObject<HTMLDivElement>;
}

export const PrintVoucherButton: React.FC<PrintVoucherButtonProps> = ({ voucherRef }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const { toast } = useToast();

    const handleDownload = async () => {
        if (!voucherRef.current) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo encontrar el contenido del comprobante.',
            });
            return;
        }

        setIsGenerating(true);
        toast({
            title: 'Generando PDF...',
            description: 'La descarga comenzará en unos momentos.',
        });

        try {
            const canvas = await html2canvas(voucherRef.current, {
                scale: 2, // Higher scale for better quality
                useCORS: true,
                allowTaint: true,
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: 'a4',
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / pdfWidth;
            const calculatedHeight = canvasHeight / ratio;
            
            let heightLeft = calculatedHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, calculatedHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = heightLeft - calculatedHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, calculatedHeight);
                heightLeft -= pdfHeight;
            }

            pdf.save('comprobante-pago.pdf');

        } catch (error) {
            console.error("Hubo un problema al crear el documento PDF:", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Hubo un problema al crear el documento PDF.',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Button onClick={handleDownload} disabled={isGenerating}>
            {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Download className="mr-2 h-4 w-4" />
            )}
            Descargar Comprobante
        </Button>
    );
};
