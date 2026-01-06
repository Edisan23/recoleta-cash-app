'use client';

import { PayrollSummary, Shift } from "@/types/db-entities";
import { PayrollBreakdown } from "./PayrollBreakdown";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";

interface HistoryDayDetailProps {
    summary: Omit<PayrollSummary, 'netPay' | 'totalBenefits' | 'totalDeductions' | 'benefitBreakdown' | 'deductionBreakdown'> | null;
    shiftsForDay: Shift[];
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}

export function HistoryDayDetail({ summary, shiftsForDay }: HistoryDayDetailProps) {
    const allItemDetails = shiftsForDay.flatMap(shift => shift.itemDetails || []).filter(detail => detail.detail);

    return (
        <Card className="mt-4 border-primary/20">
            <CardHeader>
                <CardTitle>Detalle del Día Seleccionado</CardTitle>
            </CardHeader>
            <CardContent>
                {!summary || summary.grossPay === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No hay actividad registrada para este día.</p>
                ) : (
                    <>
                        <div className="flex justify-around items-center text-center mb-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Horas</p>
                                <p className="text-xl font-bold">{summary.totalHours}h</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Pago del Día</p>
                                <p className="text-xl font-bold text-green-600">{formatCurrency(summary.grossPay)}</p>
                            </div>
                        </div>
                        <PayrollBreakdown summary={summary} />

                        {allItemDetails.length > 0 && (
                            <>
                                <Separator className="my-4" />
                                <div className="space-y-2">
                                     <h4 className="font-semibold">Detalles Adicionales</h4>
                                     <div className="space-y-1 text-sm p-3 bg-muted/50 rounded-md">
                                        {allItemDetails.map((detail, index) => (
                                            <div key={index} className="flex justify-between">
                                                <span className="text-muted-foreground">{detail.itemName}:</span>
                                                <span className="font-medium">{detail.detail}</span>
                                            </div>
                                        ))}
                                     </div>
                                </div>
                            </>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
