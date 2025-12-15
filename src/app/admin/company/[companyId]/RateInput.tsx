
'use client';

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface RateInputProps {
    label: string;
    value: number | undefined;
    onValueChange: (value: number | undefined) => void;
    className?: string;
}

export function RateInput({ label, value, onValueChange, className }: RateInputProps) {

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        const numericValue = parseFloat(rawValue.replace(/[^0-9.-]+/g,""));
        
        if (isNaN(numericValue)) {
            onValueChange(undefined);
        } else {
            onValueChange(numericValue);
        }
    };

    const formattedValue = value !== undefined && !isNaN(value)
        ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)
        : '';


    return (
        <div className={cn("grid gap-1.5", className)}>
            <Label htmlFor={label}>{label}</Label>
            <Input
                id={label}
                type="text"
                value={formattedValue}
                onChange={handleInputChange}
                placeholder="$ 0"
                className="max-w-xs"
            />
        </div>
    );
}
