'use client';

import React from 'react';
import type { PayrollSummary, Company, UserProfile, Shift } from '@/types/db-entities';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { LogoIcon } from '../icons/logo';

interface PayrollVoucherProps {
    summary: PayrollSummary;
    company: Company;
    user: UserProfile;
    period: { start: Date; end: Date };
    shifts: Shift[];
}

const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

const BreakdownRow = ({ label, hours, pay }: { label: string; hours?: number; pay: number }) => {
    if (pay === 0 && (typeof hours !== 'number' || hours === 0)) return null;
    return (
        <tr className="border-b border-gray-200 last:border-b-0">
            <td className="py-2 px-4 text-gray-600">{label} {typeof hours === 'number' ? `(${hours}h)` : ''}</td>
            <td className="py-2 px-4 text-right font-medium">{formatCurrency(pay)}</td>
        </tr>
    );
};

export const PayrollVoucher = React.forwardRef<HTMLDivElement, PayrollVoucherProps>(({ summary, company, user, period, shifts }, ref) => {
    return (
        <div ref={ref} className="p-8 bg-white text-gray-800 font-sans">
            {/* Header */}
            <header className="flex justify-between items-center pb-6 border-b-2 border-gray-200">
                <div className="flex items-center gap-4">
                    {company.logoUrl && !company.logoUrl.includes('placehold.co') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={company.logoUrl} alt={company.name} width={80} height={80} className="object-contain" crossOrigin="anonymous" />
                    ) : (
                        <LogoIcon className="h-20 w-20 text-primary" />
                    )}
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
                        <p className="text-gray-500">Comprobante de Pago</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm">Fecha de Emisión</p>
                    <p className="font-semibold">{format(new Date(), 'PPP', { locale: es })}</p>
                </div>
            </header>

            {/* User and Period Info */}
            <section className="my-8 grid grid-cols-2 gap-8">
                <div>
                    <p className="text-sm text-gray-500">Operador</p>
                    <p className="text-lg font-semibold">{user.displayName}</p>
                    <p className="text-gray-600">{user.email}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-500">Período de Pago</p>
                    <p className="text-lg font-semibold capitalize">
                        {format(period.start, "d 'de' MMMM", { locale: es })} - {format(period.end, "d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                </div>
            </section>
            
            {/* Main Summary */}
            <section className="bg-primary/10 rounded-xl p-6 my-8 text-primary">
                <h2 className="text-xl font-semibold mb-4 text-center">Resumen del Período</h2>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-sm opacity-80">Total Horas</p>
                        <p className="text-3xl font-bold">{summary.totalHours}h</p>
                    </div>
                    <div>
                        <p className="text-sm opacity-80">Pago Bruto</p>
                        <p className="text-3xl font-bold">{formatCurrency(summary.grossPay)}</p>
                    </div>
                    <div className="text-green-700">
                        <p className="text-sm">Pago Neto Final</p>
                        <p className="text-3xl font-bold">{formatCurrency(summary.netPay)}</p>
                    </div>
                </div>
            </section>

            {/* Detailed Breakdown */}
            <section className="my-8">
                <div className="grid grid-cols-2 gap-12">
                    {/* Earnings */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2 border-b pb-2">Ingresos por Horas</h3>
                        <table className="w-full text-sm">
                            <tbody>
                                <BreakdownRow label="Horas Diurnas" hours={summary.dayHours} pay={summary.dayPay} />
                                <BreakdownRow label="Horas Nocturnas" hours={summary.nightHours} pay={summary.nightPay} />
                                <BreakdownRow label="Extras Diurnas" hours={summary.dayOvertimeHours} pay={summary.dayOvertimePay} />
                                <BreakdownRow label="Extras Nocturnas" hours={summary.nightOvertimeHours} pay={summary.nightOvertimePay} />
                                <BreakdownRow label="Festivas Diurnas" hours={summary.holidayDayHours} pay={summary.holidayDayPay} />
                                <BreakdownRow label="Festivas Nocturnas" hours={summary.holidayNightHours} pay={summary.holidayNightPay} />
                                <BreakdownRow label="Extras Festivas Diurnas" hours={summary.holidayDayOvertimeHours} pay={summary.holidayDayOvertimePay} />
                                <BreakdownRow label="Extras Festivas Nocturnas" hours={summary.holidayNightOvertimeHours} pay={summary.holidayNightOvertimePay} />
                            </tbody>
                            <tfoot>
                                <tr className="font-bold border-t-2 border-gray-300">
                                    <td className="py-2 px-4">Total Bruto</td>
                                    <td className="py-2 px-4 text-right">{formatCurrency(summary.grossPay)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                     {/* Benefits and Deductions */}
                    <div>
                        {summary.benefitBreakdown.length > 0 && (
                             <div>
                                <h3 className="text-lg font-semibold mb-2 border-b pb-2">Beneficios Adicionales</h3>
                                <table className="w-full text-sm mb-6">
                                    <tbody>
                                        {summary.benefitBreakdown.map(b => (
                                            <tr key={b.name} className="border-b border-gray-200">
                                                <td className="py-2 px-4 text-gray-600">{b.name}</td>
                                                <td className="py-2 px-4 text-right font-medium text-green-600">+{formatCurrency(b.value)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                       
                        {summary.deductionBreakdown.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold mb-2 border-b pb-2">Deducciones</h3>
                                <table className="w-full text-sm">
                                    <tbody>
                                    {summary.deductionBreakdown.map(d => (
                                        <tr key={d.name} className="border-b border-gray-200">
                                            <td className="py-2 px-4 text-gray-600">{d.name}</td>
                                            <td className="py-2 px-4 text-right font-medium text-red-600">-{formatCurrency(d.value)}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </section>

             {/* Shift by shift details */}
            <section className="my-8" style={{pageBreakInside: 'avoid'}}>
                <h3 className="text-lg font-semibold mb-2 border-b pb-2">Detalle de Turnos Registrados</h3>
                <table className="w-full text-sm" style={{ tableLayout: 'fixed', width: '100%' }}>
                    <thead className="bg-gray-50">
                        <tr className="border-b border-gray-300">
                            <th className="py-2 px-4 text-left font-semibold w-[25%]">Fecha</th>
                            <th className="py-2 px-4 text-left font-semibold w-[20%]">Horario</th>
                            <th className="py-2 px-4 text-left font-semibold w-[55%]">Detalles y Notas</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...shifts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(shift => (
                            <tr key={shift.id} className="border-b border-gray-200 last:border-b-0 align-top">
                                <td className="py-3 px-4">
                                    {format(new Date(shift.date), 'EEE, dd MMM', { locale: es })}
                                </td>
                                <td className="py-3 px-4 font-mono">
                                    {shift.startTime} - {shift.endTime}
                                </td>
                                <td className="py-3 px-4 break-words">
                                    {shift.itemDetails && shift.itemDetails.length > 0 && (
                                        <div className="mb-2">
                                            {shift.itemDetails.map(detail => (
                                                <div key={detail.itemId} className="text-xs">
                                                    <span className="text-gray-500">{detail.itemName}: </span>
                                                    <span className="font-medium">{detail.detail}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {shift.notes && (
                                        <div className="whitespace-pre-wrap text-gray-600 text-xs">
                                            <span className="font-semibold not-italic text-gray-500">Notas: </span>
                                            <span className="italic">{shift.notes}</span>
                                        </div>
                                    )}
                                    {(!shift.itemDetails || shift.itemDetails.length === 0) && !shift.notes && (
                                        <span className="text-gray-400">--</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {shifts.length === 0 && (
                             <tr>
                                <td colSpan={3} className="py-3 px-4 text-center text-gray-500">
                                    No hay turnos registrados en este período.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </section>

             {/* Footer */}
            <footer className="pt-8 mt-8 border-t border-gray-200 text-center text-xs text-gray-500">
                <p>Este es un comprobante generado por el sistema y no requiere firma.</p>
                <p>Turno Pro - {new Date().getFullYear()}</p>
            </footer>
        </div>
    );
});

PayrollVoucher.displayName = 'PayrollVoucher';
