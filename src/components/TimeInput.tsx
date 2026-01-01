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
        const inputValue = e.target.value.replace(/[^0-9]/g, ''); // Only allow numbers

        if (inputValue.length > 2) {
            return; // Don't allow more than 2 digits
        }

        if (inputValue.length === 2) {
             // Autocomplete to HH:00 when 2 digits are entered
            onChange(`${inputValue}:00`);
        } else {
            // Otherwise, just update with the digits typed
            onChange(inputValue);
        }
    };
    
    // Display the formatted value (e.g., "06:00") or the partial input (e.g., "0" or "06")
    const displayValue = value;

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
                maxLength={5} // HH:00
                className="w-full text-base py-6 font-semibold"
            />
        </div>
    )
}
