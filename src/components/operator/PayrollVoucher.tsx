'use client';

import React from 'react';
import type { Company, PayrollSummary, UserProfile } from '@/types/db-entities';
import { User } from 'firebase/auth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';
import { getInitials } from '@/lib/utils';

interface PayrollVoucherProps {
    summary: PayrollSummary;
    period: { start: Date; end: Date };
    company: Company | null;
    user: User | null;
    userProfile: UserProfile | null;
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}

const VoucherRow: React.FC<{ label: string; value: string | number; isBold?: boolean; isTotal?: boolean; className?: string }> = ({ label, value, isBold, isTotal, className }) => (
    <div className={`flex justify-between py-2 border-b ${isTotal ? 'border-t-2 border-black' : 'border-gray-200'} ${className}`}>
        <p className={`${isBold ? 'font-bold' : ''}`}>{label}</p>
        <p className={`${isBold ? 'font-bold' : ''}`}>{typeof value === 'number' ? formatCurrency(value) : value}</p>
    </div>
);

const BreakdownRow: React.FC<{ label: string; hours?: number; pay: number }> = ({ label, hours, pay }) => {
    if (pay === 0 && (hours === undefined || hours === 0)) return null;
    return (
        <div className="flex justify-between text-xs py-1">
            <p className="text-gray-600">{label} {hours !== undefined ? `(${hours.toFixed(2)}h)` : ''}</p>
            <p>{formatCurrency(pay)}</p>
        </div>
    );
};


export const PayrollVoucher = React.forwardRef<HTMLDivElement, PayrollVoucherProps>(({ summary, period, company, user, userProfile }, ref) => {
    return (
        <div ref={ref} className="bg-white text-black p-8" style={{ width: '800px' }}>
            <header className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
                <div>
                    <h1 className="text-3xl font-bold">{company?.name || 'Empresa'}</h1>
                    <p>Comprobante de Pago</p>
                </div>
                {company?.logoUrl && <Image src={company.logoUrl} alt="Logo" width={80} height={80} className="object-contain" />}
            </header>

            <section className="mb-6">
                <h2 className="font-bold text-lg mb-2">Información del Operador</h2>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                    <p><span className="font-semibold">Nombre:</span> {userProfile?.displayName || 'N/A'}</p>
                    <p><span className="font-semibold">Email:</span> {userProfile?.email || 'N/A'}</p>
                    <p><span className="font-semibold">Período:</span> {format(period.start, 'dd MMM', { locale: es })} - {format(period.end, 'dd MMM, yyyy', { locale: es })}</p>
                    <p><span className="font-semibold">Fecha de Emisión:</span> {format(new Date(), 'PPP', { locale: es })}</p>
                </div>
            </section>
            
            <section>
                 <h2 className="font-bold text-lg mb-2">Resumen de Pago</h2>
                 <div className="text-sm">
                    <VoucherRow label="Pago Bruto (Horas y Recargos)" value={summary.grossPay} />
                    
                    <div className="pl-4 border-l-2 ml-2 my-2">
                        <BreakdownRow label="Horas Diurnas" hours={summary.dayHours} pay={summary.dayPay || 0} />
                        <BreakdownRow label="Horas Nocturnas" hours={summary.nightHours} pay={summary.nightPay || 0} />
                        <BreakdownRow label="Extras Diurnas" hours={summary.dayOvertimeHours} pay={summary.dayOvertimePay || 0} />
                        <BreakdownRow label="Extras Nocturnas" hours={summary.nightOvertimeHours} pay={summary.nightOvertimePay || 0} />
                        <BreakdownRow label="Festivas Diurnas" hours={summary.holidayDayHours} pay={summary.holidayDayPay || 0} />
                        <BreakdownRow label="Festivas Nocturnas" hours={summary.holidayNightHours} pay={summary.holidayNightPay || 0} />
                        <BreakdownRow label="Extras Festivas Diurnas" hours={summary.holidayDayOvertimeHours} pay={summary.holidayDayOvertimePay || 0} />
                        <BreakdownRow label="Extras Festivas Nocturnas" hours={summary.holidayNightOvertimeHours} pay={summary.holidayNightOvertimePay || 0} />
                    </div>

                    {summary.benefitBreakdown.map(benefit => (
                         <VoucherRow key={benefit.name} label={`(+) ${benefit.name}`} value={benefit.value} className="text-green-700" />
                    ))}
                    
                    {summary.deductionBreakdown.map(deduction => (
                         <VoucherRow key={deduction.name} label={`(-) ${deduction.name}`} value={-deduction.value} className="text-red-700" />
                    ))}

                    <VoucherRow label="Total Neto a Pagar" value={summary.netPay} isBold isTotal />
                 </div>
            </section>

             <footer className="mt-12 text-center text-xs text-gray-500">
                <p>Este es un documento generado automáticamente por Turno Pro.</p>
                <p>{company?.name} - {new Date().getFullYear()}</p>
            </footer>
        </div>
    );
});
PayrollVoucher.displayName = 'PayrollVoucher';
