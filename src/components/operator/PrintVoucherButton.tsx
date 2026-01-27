'use client';

import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { PayrollVoucher } from './PayrollVoucher';
import type { Company, PayrollSummary, UserProfile, Shift, CompanySettings } from '@/types/db-entities';
import { User } from 'firebase/auth';

interface PrintVoucherButtonProps {
    summary: PayrollSummary;
    period: { start: Date; end: Date };
    company: Company | null;
    user: User | null;
    userProfile: UserProfile | null;
    shifts: Shift[];
    settings: CompanySettings | null;
    holidays: Date[];
}

export const PrintVoucherButton: React.FC<PrintVoucherButtonProps> = ({ summary, period, company, user, userProfile, shifts, settings, holidays }) => {
    const voucherRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleDownload = async () => {
        const element = voucherRef.current;
        if (!element) return;
        
        setIsLoading(true);

        try {
            const canvas = await html2canvas(element, {
                scale: 2, // Higher scale for better quality
                useCORS: true,
                backgroundColor: null,
            });
            const imgData = canvas.toDataURL('image/png');

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });
            
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            
            const fileName = `Comprobante_${userProfile?.displayName?.replace(' ', '_')}_${period.start.toISOString().split('T')[0]}.pdf`;
            pdf.save(fileName);

        } catch (error) {
            console.error("Error generating PDF:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            {/* The voucher component is hidden and only used for PDF generation */}
            <div className="absolute -z-10 -left-[9999px] top-0">
                <PayrollVoucher
                    ref={voucherRef}
                    summary={summary}
                    period={period}
                    company={company}
                    user={user}
                    userProfile={userProfile}
                    shifts={shifts}
                    settings={settings}
                    holidays={holidays}
                />
            </div>
            <Button onClick={handleDownload} disabled={isLoading} className="w-full mt-4">
                {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Download className="mr-2 h-4 w-4" />
                )}
                {isLoading ? 'Generando...' : 'Descargar Comprobante'}
            </Button>
        </div>
    );
};
