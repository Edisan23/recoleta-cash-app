'use client';
import React from 'react';
import type { Payroll, Company, UserProfile } from '@/types/db-entities';
import { toDate } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { LogoIcon } from '@/components/icons/logo';

interface PayrollVoucherProps {
    payroll: Payroll | null;
    company: Company | null;
    userProfile: UserProfile | null;
}

function formatCurrency(value: number) {
    if (isNaN(value)) return '$0';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}

const BreakdownRow = ({ label, hours, pay }: { label: string; hours?: number; pay: number }) => {
    if (pay === 0 && (hours === undefined || hours === 0)) return null;
    const hourText = hours !== undefined && hours > 0 ? `(${hours}h)` : '';
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '4px 0', borderBottom: '1px dashed #ddd' }}>
            <span style={{ color: '#555' }}>{label} {hourText}</span>
            <span style={{ fontWeight: 500 }}>{formatCurrency(pay)}</span>
        </div>
    );
};


export const PayrollVoucher = React.forwardRef<HTMLDivElement, PayrollVoucherProps>(({ payroll, company, userProfile }, ref) => {
    if (!payroll || !company || !userProfile) return null;

    const periodStart = toDate(payroll.periodStart);
    const periodEnd = toDate(payroll.periodEnd);
    const generatedAt = toDate(payroll.generatedAt);
    
    // Sort shifts by date
    const sortedShifts = [...payroll.shifts].sort((a, b) => {
        const dateA = toDate(a.date);
        const dateB = toDate(b.date);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
    });

    return (
        <div ref={ref} style={{ width: '800px', padding: '40px', backgroundColor: 'white', color: '#1a1a1a', fontFamily: 'sans-serif' }}>
            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #eee', paddingBottom: '20px', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 5px 0' }}>Comprobante de Pago</h1>
                    <p style={{ fontSize: '14px', color: '#555', margin: 0 }}>
                        {periodStart && periodEnd ? `${format(periodStart, 'd MMM', {locale: es})} - ${format(periodEnd, 'd MMM, yyyy', {locale: es})}` : 'Periodo no definido'}
                    </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    {company.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={company.logoUrl} alt={`${company.name} logo`} style={{ maxWidth: '100px', maxHeight: '100px', marginBottom: '10px', objectFit: 'contain' }} crossOrigin="anonymous" />
                    ) : (
                        <div style={{width: '100px', height: '100px', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           <LogoIcon />
                        </div>
                    )}
                    <p style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>{company.name}</p>
                </div>
            </header>

            {/* Operator Details */}
            <section style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between' }}>
                 <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 10px 0', color: '#555' }}>OPERADOR</h3>
                    <p style={{ margin: '0 0 5px 0' }}>{userProfile.displayName}</p>
                    <p style={{ margin: '0', color: '#555' }}>{userProfile.email}</p>
                </div>
                <div style={{textAlign: 'right'}}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 10px 0', color: '#555' }}>FECHA DE EMISIÓN</h3>
                     <p style={{ margin: '0' }}>{generatedAt ? format(generatedAt, 'PPP', { locale: es }) : 'N/A'}</p>
                </div>
            </section>

            {/* Totals Summary */}
            <section style={{ backgroundColor: '#f9f9f9', borderRadius: '8px', padding: '20px', marginBottom: '30px', textAlign: 'center' }}>
                 <p style={{ fontSize: '14px', color: '#555', margin: '0 0 5px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PAGO NETO</p>
                 <p style={{ fontSize: '42px', fontWeight: 'bold', color: '#16a34a', margin: 0 }}>{formatCurrency(payroll.summary.netPay)}</p>
            </section>

            {/* Calculation Breakdown */}
            <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
                {/* Earnings */}
                <div>
                     <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 10px 0', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>INGRESOS</h3>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', padding: '8px 0', borderBottom: '1px solid #ccc' }}>
                        <span>Pago Bruto</span>
                        <span>{formatCurrency(payroll.summary.grossPay)}</span>
                     </div>
                     <div style={{paddingTop: '10px'}}>
                         <h4 style={{fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '5px'}}>Ingresos por Horas</h4>
                        <BreakdownRow label="Horas Diurnas" hours={payroll.summary.dayHours} pay={payroll.summary.dayPay} />
                        <BreakdownRow label="Horas Nocturnas" hours={payroll.summary.nightHours} pay={payroll.summary.nightPay} />
                        <BreakdownRow label="Extras Diurnas" hours={payroll.summary.dayOvertimeHours} pay={payroll.summary.dayOvertimePay} />
                        <BreakdownRow label="Extras Nocturnas" hours={payroll.summary.nightOvertimeHours} pay={payroll.summary.nightOvertimePay} />
                        <BreakdownRow label="Festivas Diurnas" hours={payroll.summary.holidayDayHours} pay={payroll.summary.holidayDayPay} />
                        <BreakdownRow label="Festivas Nocturnas" hours={payroll.summary.holidayNightHours} pay={payroll.summary.holidayNightPay} />
                        <BreakdownRow label="Extras Festivas Diurnas" hours={payroll.summary.holidayDayOvertimeHours} pay={payroll.summary.holidayDayOvertimePay} />
                        <BreakdownRow label="Extras Festivas Nocturnas" hours={payroll.summary.holidayNightOvertimeHours} pay={payroll.summary.holidayNightOvertimePay} />
                     </div>
                     
                     {payroll.summary.benefitBreakdown.length > 0 && (
                        <div style={{marginTop: '20px'}}>
                            <h4 style={{fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '5px'}}>Beneficios Adicionales</h4>
                             {payroll.summary.benefitBreakdown.map(b => (
                                <div key={b.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px dashed #ddd' }}>
                                    <span style={{ color: '#555' }}>{b.name}</span>
                                    <span style={{ fontWeight: 500, color: '#16a34a' }}>+ {formatCurrency(b.value)}</span>
                                </div>
                            ))}
                             <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', padding: '8px 0', marginTop: '5px' }}>
                                <span>Total Beneficios</span>
                                <span>{formatCurrency(payroll.summary.totalBenefits)}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Deductions */}
                <div>
                     <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 10px 0', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>DEDUCCIONES</h3>
                      {payroll.summary.deductionBreakdown.map(d => (
                        <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px dashed #ddd' }}>
                            <span style={{ color: '#555' }}>{d.name}</span>
                            <span style={{ fontWeight: 500, color: '#dc2626' }}>- {formatCurrency(d.value)}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', padding: '8px 0', borderTop: '1px solid #ccc', marginTop: '10px' }}>
                        <span>Total Deducciones</span>
                        <span>{formatCurrency(payroll.summary.totalDeductions)}</span>
                      </div>
                </div>
            </section>
            
            {/* Shift Details */}
            {sortedShifts.length > 0 && (
                 <section>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 15px 0', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Detalle de Turnos Registrados</h3>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                        {sortedShifts.map(shift => (
                            <div key={shift.id} style={{backgroundColor: '#f9f9f9', borderRadius: '6px', padding: '15px', fontSize: '12px'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontWeight: 'bold'}}>
                                    <span>{format(toDate(shift.date)!, 'EEEE, d \'de\' MMMM', {locale: es})}</span>
                                    <span>{shift.startTime} - {shift.endTime}</span>
                                </div>
                                {(shift.itemDetails && shift.itemDetails.length > 0) && (
                                     <div style={{borderTop: '1px dashed #ddd', paddingTop: '10px', marginBottom: '10px'}}>
                                        {shift.itemDetails.map(detail => (
                                            <p key={detail.itemId} style={{margin: '0 0 5px 0'}}>
                                                <strong style={{color: '#333'}}>{detail.itemName}: </strong>
                                                <span style={{color: '#555'}}>{detail.detail}</span>
                                            </p>
                                        ))}
                                    </div>
                                )}
                                {shift.notes && (
                                    <div style={{borderTop: '1px dashed #ddd', paddingTop: '10px'}}>
                                        <p style={{margin: 0, fontStyle: 'italic', color: '#555'}}>
                                            <strong>Notas: </strong>{shift.notes}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
});
PayrollVoucher.displayName = 'PayrollVoucher';
