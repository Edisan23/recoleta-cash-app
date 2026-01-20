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
        // This allows the user to type freely.
        // We will format the time on blur.
        onChange(e.target.value);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        
        // Remove all non-numeric characters to get just the numbers
        const digits = rawValue.replace(/[^0-9]/g, '');

        if (digits.length > 0) {
            // Take the first one or two digits for the hour
            const hourString = digits.slice(0, 2);
            const hour = parseInt(hourString, 10);

            // Validate hour
            if (!isNaN(hour) && hour >= 0 && hour < 24) {
                // Format to HH:00
                const formattedTime = hourString.padStart(2, '0') + ':00';
                onChange(formattedTime);
            } else {
                // If invalid hour entered, clear the field
                onChange('');
            }
        } else {
            // If the field is empty after cleaning, ensure state is an empty string
            onChange('');
        }
    };

    return (
        <div className="grid w-full items-center gap-1.5">
            <Label htmlFor={label.toLowerCase().replace(' ', '_')} className="text-sm font-semibold">{label}</Label>
            <Input
                type="text"
                inputMode="numeric"
                id={label.toLowerCase().replace(' ', '_')}
                value={value} 
                onChange={handleTimeChange}
                onBlur={handleBlur} // Format the time when the user leaves the input
                className="w-full text-base py-6 font-semibold border-2 border-primary/50"
                placeholder="HH:00"
                maxLength={5}
            />
        </div>
    )
}
