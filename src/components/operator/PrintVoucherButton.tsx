'use client';

import React, { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { LogoSpinner } from '../LogoSpinner';

interface PrintVoucherButtonProps {
    voucherRef: React.RefObject<HTMLDivElement>;
    isDisabled: boolean;
    operatorName: string;
}

export const PrintVoucherButton: React.FC<PrintVoucherButtonProps> = ({ voucherRef, isDisabled, operatorName }) => {
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);

    const handleDownloadPdf = async () => {
        const input = voucherRef.current;
        if (!input) {
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
            description: 'Tu comprobante se está procesando y la descarga comenzará en breve.',
        });

        try {
            // html2canvas renders the component into a canvas
            const canvas = await html2canvas(input, {
                scale: 2, // Higher scale for better resolution
                useCORS: true,
            });

            const imgData = canvas.toDataURL('image/png');
            
            // Using jsPDF to create the PDF document
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

            let heightLeft = imgHeight;
            let position = 0;

            // Add the first page
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            // Add new pages if content is taller than one page
            while (heightLeft > 0) {
                position -= pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }
            
            const fileName = `comprobante-pago-${operatorName.replace(/\s/g, '-').toLowerCase()}.pdf`;
            pdf.save(fileName);

        } catch (error) {
            console.error("Error generating PDF:", error);
            toast({
                variant: 'destructive',
                title: 'Error al generar PDF',
                description: 'Hubo un problema al crear el archivo PDF.',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Button onClick={handleDownloadPdf} disabled={isDisabled || isGenerating}>
            {isGenerating ? (
                <LogoSpinner className="mr-2 h-5 w-5" />
            ) : (
                <Download className="mr-2 h-4 w-4" />
            )}
            {isGenerating ? 'Generando...' : 'Descargar Comprobante'}
        </Button>
    );
};
