
'use client';

import type { PayrollSummary } from "@/types/db-entities";

function formatCurrency(value: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}

function BreakdownRow({ label, hours, pay }: { label: string; hours?: number; pay: number }) {
    if (pay === 0) return null;
    return (
        <div className="flex justify-between items-center text-sm py-1 border-b border-dashed">
            <span className="text-muted-foreground">{label} {hours ? `(${hours.toFixed(2)}h)` : ''}</span>
            <span className="font-medium">{formatCurrency(pay)}</span>
        </div>
    );
}

export function PayrollBreakdown({ summary }: { summary: Partial<PayrollSummary> }) {
    return (
        <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold text-center mb-2">Detalle del Cálculo</h4>
            
            <div className="space-y-1">
                <BreakdownRow label="Horas Diurnas" hours={summary.dayHours} pay={summary.dayPay || 0} />
                <BreakdownRow label="Horas Nocturnas" hours={summary.nightHours} pay={summary.nightPay || 0} />
                <BreakdownRow label="Extras Diurnas" hours={summary.dayOvertimeHours} pay={summary.dayOvertimePay || 0} />
                <BreakdownRow label="Extras Nocturnas" hours={summary.nightOvertimeHours} pay={summary.nightOvertimePay || 0} />
                <BreakdownRow label="Festivas Diurnas" hours={summary.holidayDayHours} pay={summary.holidayDayPay || 0} />
                <BreakdownRow label="Festivas Nocturnas" hours={summary.holidayNightHours} pay={summary.holidayNightPay || 0} />
                <BreakdownRow label="Extras Festivas Diurnas" hours={summary.holidayDayOvertimeHours} pay={summary.holidayDayOvertimePay || 0} />
                <BreakdownRow label="Extras Festivas Nocturnas" hours={summary.holidayNightOvertimeHours} pay={summary.holidayNightOvertimePay || 0} />
            </div>
             
             <div className="flex justify-between items-center text-sm font-semibold pt-2 mt-2 border-t">
                <span>Total Bruto</span>
                <span>{formatCurrency(summary.grossPay || 0)}</span>
            </div>

            {summary.benefitBreakdown && summary.benefitBreakdown.length > 0 && (
                <div className="pt-2 mt-2 border-t">
                    <h5 className="text-sm font-semibold mb-1">Beneficios</h5>
                    {summary.benefitBreakdown.map(benefit => (
                        <div key={benefit.name} className="flex justify-between items-center text-sm py-1 border-b border-dashed">
                            <span className="text-muted-foreground">{benefit.name}</span>
                            <span className="font-medium text-green-600">+{formatCurrency(benefit.value)}</span>
                        </div>
                    ))}
                </div>
            )}

            {summary.deductionBreakdown && summary.deductionBreakdown.length > 0 && (
                 <div className="pt-2 mt-2">
                    <h5 className="text-sm font-semibold mb-1">Deducciones</h5>
                    {summary.deductionBreakdown.map(deduction => (
                         <div key={deduction.name} className="flex justify-between items-center text-sm py-1 border-b border-dashed">
                            <span className="text-muted-foreground">{deduction.name}</span>
                            <span className="font-medium text-destructive">-{formatCurrency(deduction.value)}</span>
                        </div>
                    ))}
                </div>
            )}

            {summary.netPay !== undefined && (
                <div className="flex justify-between items-center text-base font-bold pt-2 mt-2 border-t">
                    <span>Total Neto</span>
                    <span>{formatCurrency(summary.netPay)}</span>
                </div>
            )}
        </div>
    );
}
