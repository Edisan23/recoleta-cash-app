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
        let inputValue = e.target.value.replace(/[^0-9]/g, ''); // Remove non-numeric characters
        
        if (inputValue.length > 4) {
            inputValue = inputValue.substring(0, 4);
        }

        if (inputValue.length > 2) {
            inputValue = inputValue.substring(0, 2) + ':' + inputValue.substring(2);
        }

        onChange(inputValue);
    };

    return (
        <div className="grid w-full items-center gap-1.5">
            <Label htmlFor={label.toLowerCase().replace(' ', '_')} className="text-sm font-semibold">{label}</Label>
            <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{2}:[0-9]{2}"
                maxLength={5}
                id={label.toLowerCase().replace(' ', '_')}
                value={value}
                onChange={handleTimeChange}
                className="w-full text-base py-6 font-semibold"
                placeholder="HH:MM"
            />
        </div>
    )
}
