'use client';
import React from 'react';

export const PayrollVoucher = React.forwardRef<HTMLDivElement, any>((props, ref) => {
    return <div ref={ref} className="hidden" />;
});

PayrollVoucher.displayName = 'PayrollVoucher';
