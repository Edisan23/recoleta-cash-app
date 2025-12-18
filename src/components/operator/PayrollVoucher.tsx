'use client';

import { PayrollSummary, Shift } from '@/types/db-entities';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';

interface PayrollVoucherProps {
    operatorName: string;
    companyName: string;
    period: { start: Date; end: Date };
    summary: PayrollSummary;
    shifts: Shift[];
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}

const BreakdownRow = ({ label, value }: { label: string; value: number }) => {
    if (value === 0) return null;
    return (
        <div className="flex justify-between py-2 text-sm">
            <p className="text-gray-600">{label}</p>
            <p className="font-medium">{formatCurrency(value)}</p>
        </div>
    );
};

export function PayrollVoucher({ operatorName, companyName, period, summary, shifts }: PayrollVoucherProps) {
    const detailedShifts = shifts.filter(s => s.itemDetails && s.itemDetails.length > 0);
    
    return (
        <Card className="w-[800px] shadow-lg border-2 font-sans bg-white text-black">
            <CardHeader className="text-center bg-gray-50 p-6">
                <CardTitle className="text-3xl font-bold">Comprobante de Pago</CardTitle>
                <CardDescription className="text-lg text-gray-700">
                    {companyName}
                </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-8 text-sm">
                    <div>
                        <p className="font-semibold text-gray-500">OPERADOR</p>
                        <p className="text-lg font-medium">{operatorName}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-semibold text-gray-500">PERÍODO DE PAGO</p>
                        <p className="text-lg font-medium">
                            {format(period.start, 'd \'de\' MMMM', { locale: es })} - {format(period.end, 'd \'de\' MMMM, yyyy', { locale: es })}
                        </p>
                    </div>
                </div>

                <Separator className="bg-gray-200" />

                <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                    {/* Earnings Column */}
                    <div className='space-y-2'>
                        <h3 className="text-lg font-semibold border-b border-gray-200 pb-2 mb-2">Ingresos</h3>
                        <BreakdownRow label="Pago Horas Regulares" value={summary.dayPay + summary.nightPay} />
                        <BreakdownRow label="Pago Horas Extra" value={summary.dayOvertimePay + summary.nightOvertimePay} />
                        <BreakdownRow label="Pago Horas Festivas" value={summary.holidayDayPay + summary.holidayNightPay} />
                        <BreakdownRow label="Pago Horas Extra Festivas" value={summary.holidayDayOvertimePay + summary.holidayNightOvertimePay} />
                         {summary.benefitBreakdown.map(b => <BreakdownRow key={b.name} label={b.name} value={b.value} />)}
                    </div>

                    {/* Deductions Column */}
                    <div className='space-y-2'>
                        <h3 className="text-lg font-semibold border-b border-gray-200 pb-2 mb-2">Deducciones</h3>
                        {summary.deductionBreakdown.length > 0 ? (
                             summary.deductionBreakdown.map(d => <BreakdownRow key={d.name} label={d.name} value={d.value} />)
                        ) : (
                            <p className="text-sm text-gray-500">No hay deducciones.</p>
                        )}
                    </div>
                </div>

                <Separator className="bg-gray-200" />
                
                {/* Summary Section */}
                <div className="space-y-4">
                     <div className="flex justify-between items-center font-medium text-lg">
                        <p>Total Ingresos (Bruto)</p>
                        <p>{formatCurrency(summary.grossPay + summary.totalBenefits)}</p>
                    </div>
                     <div className="flex justify-between items-center font-medium text-lg">
                        <p>Total Deducciones</p>
                        <p className='text-red-600'>-{formatCurrency(summary.totalDeductions)}</p>
                    </div>
                     <div className="flex justify-between items-center font-bold text-2xl bg-green-100 p-4 rounded-lg">
                        <p>Neto a Pagar</p>
                        <p>{formatCurrency(summary.netPay)}</p>
                    </div>
                </div>

                {detailedShifts.length > 0 && (
                     <>
                        <Separator className="bg-gray-200" />
                        <div className="space-y-2">
                             <h3 className="text-lg font-semibold border-b border-gray-200 pb-2 mb-2">Actividades Detalladas</h3>
                             <div className="text-sm text-gray-700 space-y-1">
                                {detailedShifts.map(shift => (
                                    shift.itemDetails?.map(detail => (
                                        <div key={`${shift.id}-${detail.itemId}`} className="grid grid-cols-3 gap-2 border-b pb-1">
                                            <p>{format(parseISO(shift.date), 'd MMM yyyy', {locale: es})}</p>
                                            <p className="font-medium col-span-2">{detail.itemName}: <span className="font-normal text-gray-600">{detail.detail}</span></p>
                                        </div>
                                    ))
                                ))}
                             </div>
                        </div>
                    </>
                )}


                <div className="text-center text-sm text-gray-500 pt-4">
                    <p>Total Horas Trabajadas en el Período: <span className="font-semibold">{summary.totalHours.toFixed(2)} horas</span></p>
                </div>

            </CardContent>
            <CardFooter className="text-center text-xs text-gray-400 p-4 bg-gray-50">
                <p>Este es un documento generado por el sistema Turno Pro. Para cualquier duda o reclamo, por favor contacta a tu supervisor o al departamento de recursos humanos.</p>
            </CardFooter>
        </Card>
    );
}
