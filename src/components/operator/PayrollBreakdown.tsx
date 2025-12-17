'use client';

import type { PayrollSummary } from "@/types/db-entities";

function formatCurrency(value: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}

function BreakdownRow({ label, hours, pay }: { label: string; hours: number; pay: number }) {
    if (hours === 0 && pay === 0) return null;
    return (
        <div className="flex justify-between items-center text-sm py-1 border-b border-dashed">
            <span className="text-muted-foreground">{label} ({hours.toFixed(2)}h)</span>
            <span className="font-medium">{formatCurrency(pay)}</span>
        </div>
    );
}

export function PayrollBreakdown({ summary }: { summary: PayrollSummary }) {
    return (
        <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold text-center mb-2">Detalle del Cálculo</h4>
            <BreakdownRow label="Horas Diurnas" hours={summary.dayHours} pay={summary.dayPay} />
            <BreakdownRow label="Horas Nocturnas" hours={summary.nightHours} pay={summary.nightPay} />
            <BreakdownRow label="Extras Diurnas" hours={summary.dayOvertimeHours} pay={summary.dayOvertimePay} />
            <BreakdownRow label="Extras Nocturnas" hours={summary.nightOvertimeHours} pay={summary.nightOvertimePay} />
            <BreakdownRow label="Festivas Diurnas" hours={summary.holidayDayHours} pay={summary.holidayDayPay} />
            <BreakdownRow label="Festivas Nocturnas" hours={summary.holidayNightHours} pay={summary.holidayNightPay} />
            <BreakdownRow label="Extras Festivas Diurnas" hours={summary.holidayDayOvertimeHours} pay={summary.holidayDayOvertimePay} />
            <BreakdownRow label="Extras Festivas Nocturnas" hours={summary.holidayNightOvertimeHours} pay={summary.holidayNightOvertimePay} />
             <div className="flex justify-between items-center text-base font-bold pt-2 mt-2 border-t">
                <span>Total Bruto</span>
                <span>{formatCurrency(summary.grossPay)}</span>
            </div>
        </div>
    );
}
