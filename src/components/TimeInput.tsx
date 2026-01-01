'use client';

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface TimeInputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
}

export function TimeInput({ label, value, onChange }: TimeInputProps) {

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let inputValue = e.target.value.replace(/[^0-9]/g, '');

        // Limit to 2 digits for the hour
        if (inputValue.length > 2) {
            inputValue = inputValue.slice(0, 2);
        }

        // If two digits are entered, auto-format to HH:00
        if (inputValue.length === 2) {
            onChange(`${inputValue}:00`);
        } else {
            onChange(inputValue);
        }
    };

    const displayValue = value.includes(':') ? value.split(':')[0] : value;

    return (
        <div className="grid w-full items-center gap-1.5">
            <Label htmlFor={label.toLowerCase().replace(' ', '_')} className="text-sm font-semibold">{label}</Label>
            <Input
                type="text"
                inputMode="numeric"
                id={label.toLowerCase().replace(' ', '_')}
                value={displayValue}
                onChange={handleTimeChange}
                placeholder="HH"
                maxLength={2}
                className="w-full text-base py-6 font-semibold"
            />
        </div>
    )
}
