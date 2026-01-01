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
        let inputValue = e.target.value.replace(/[^0-9:]/g, ''); // Allow numbers and colon

        // If the user is deleting, allow it
        if (inputValue.length < value.length) {
            onChange(inputValue.split(':')[0]);
            return;
        }

        // Remove colon for pure digit processing
        let digits = inputValue.replace(':', '');

        if (digits.length > 2) {
            digits = digits.slice(0, 2);
        }

        if (digits.length === 2) {
             // Autocomplete when 2 digits are entered
            onChange(`${digits}:00`);
        } else {
            // Show digits as they are typed
            onChange(digits);
        }
    };
    
    // Determine what to display. If it's a partial input (e.g., "0" or "1"), show that. If it's a full time, show that.
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
