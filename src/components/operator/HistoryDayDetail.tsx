'use client';

import type { PayrollSummary, Shift } from '@/types/db-entities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PayrollBreakdown } from './PayrollBreakdown';
import { Separator } from '../ui/separator';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface HistoryDayDetailProps {
    selectedDay: Date | undefined;
    summary: Partial<Omit<PayrollSummary, 'netPay'>> | null;
    shifts: Shift[];
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}

export function HistoryDayDetail({ selectedDay, summary, shifts }: HistoryDayDetailProps) {

    const detailedShifts = shifts.filter(s => s.itemDetails && s.itemDetails.length > 0 && s.itemDetails.some(d => d.detail));

    if (!selectedDay) {
        return (
            <Card className="h-full flex items-center justify-center">
                <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">Selecciona un día para ver su detalle.</p>
                </CardContent>
            </Card>
        );
    }

    if (!summary) {
        return (
            <Card className="h-full flex items-center justify-center">
                <CardHeader>
                    <CardTitle>{selectedDay.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</CardTitle>
                </CardHeader>
                <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No hay turnos registrados para este día.</p>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>{selectedDay.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</CardTitle>
                <CardDescription>Detalle de horas y pago para el día seleccionado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-around items-center text-center p-4 rounded-lg bg-muted">
                    <div>
                        <p className="text-sm text-muted-foreground">Total de Horas</p>
                        <p className="text-2xl font-bold">
                            {summary.totalHours}h
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Valor del Turno</p>
                        <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(summary.grossPay || 0)}
                        </p>
                    </div>
                </div>
                 {summary.grossPay && summary.grossPay > 0 && (
                    <PayrollBreakdown summary={summary} />
                )}

                 {detailedShifts.length > 0 && (
                    <>
                        <Separator />
                        <div className="space-y-2">
                             <h4 className="font-semibold text-center">Detalles Adicionales</h4>
                             <div className="text-sm text-muted-foreground space-y-1">
                                {detailedShifts.flatMap(shift => shift.itemDetails)
                                    .filter(detail => detail?.detail)
                                    .map((detail, index) => (
                                    <div key={index} className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                                        <span className="font-medium">{detail?.itemName}:</span>
                                        <span>{detail?.detail}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

            </CardContent>
        </Card>
    );
}
