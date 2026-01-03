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
        onChange(e.target.value);
    };

    return (
        <div className="grid w-full items-center gap-1.5">
            <Label htmlFor={label.toLowerCase().replace(' ', '_')} className="text-sm font-semibold">{label}</Label>
            <Input
                type="time"
                inputMode="numeric"
                pattern="[0-9]{2}:[0-9]{2}"
                id={label.toLowerCase().replace(' ', '_')}
                value={value}
                onChange={handleTimeChange}
                className="w-full text-base py-6 font-semibold"
                placeholder="HH:MM"
            />
        </div>
    )
}
