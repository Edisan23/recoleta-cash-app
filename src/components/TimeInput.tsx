'use client';

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils";

interface TimeInputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
}

export function TimeInput({ label, value, onChange }: TimeInputProps) {

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;

        // Allow user to clear the input
        if (newValue === '') {
            onChange('');
            return;
        }

        // Allow only digits and a single colon
        const filteredValue = newValue.replace(/[^0-9:]/g, '');
        
        // Don't allow more than 5 chars (HH:MM)
        if (filteredValue.length > 5) return;

        // Get just the digits
        const digits = filteredValue.replace(/[^0-9]/g, '');

        // If the user has just typed the second digit (and no colon yet)
        if (digits.length === 2 && !filteredValue.includes(':')) {
            const hour = parseInt(digits, 10);
            if (hour >= 0 && hour < 24) {
                onChange(digits + ':00'); // Auto-format
                return;
            }
        }
        
        // For all other cases (typing the first digit, editing, etc.)
        onChange(filteredValue);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        
        const digits = rawValue.replace(/[^0-9]/g, '');

        if (digits.length > 0) {
            const hourString = digits.slice(0, 2);
            const hour = parseInt(hourString, 10);

            if (!isNaN(hour) && hour >= 0 && hour < 24) {
                const formattedTime = hourString.padStart(2, '0') + ':00';
                onChange(formattedTime);
            } else {
                // If invalid hour entered, clear the field
                onChange('');
            }
        } else {
            // If the field is empty, ensure state is an empty string
            onChange('');
        }
    };

    return (
        <div className="grid w-full items-center gap-1.5">
            <Label htmlFor={label.toLowerCase().replace(' ', '_')} className="text-sm font-semibold">{label}</Label>
            <Input
                type="text"
                inputMode="tel" // Use "tel" for a numeric-like keypad on mobile that still allows ":"
                id={label.toLowerCase().replace(' ', '_')}
                value={value} 
                onChange={handleTimeChange}
                onBlur={handleBlur}
                className="w-full text-base py-6 font-semibold border-2 border-primary/50"
                placeholder="HH:00"
                maxLength={5}
            />
        </div>
    )
}
