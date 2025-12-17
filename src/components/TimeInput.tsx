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
        let formattedValue = '';
        
        if (inputValue.length <= 2) {
            formattedValue = inputValue;
        } else {
            formattedValue = `${inputValue.slice(0, 2)}:${inputValue.slice(2, 4)}`;
        }
        
        // Add colon automatically after 2 digits if we are erasing the colon
        if (value.length === 3 && formattedValue.length === 2 && !formattedValue.includes(':')) {
             if (e.nativeEvent instanceof InputEvent && e.nativeEvent.inputType === 'deleteContentBackward') {
                // do nothing on backspace
             } else {
                formattedValue += ':';
             }
        }


        onChange(formattedValue);
    };

    return (
        <div className="grid w-full items-center gap-1.5">
            <Label htmlFor={label.toLowerCase().replace(' ', '_')} className="text-sm font-semibold">{label}</Label>
            <Input
                type="text"
                id={label.toLowerCase().replace(' ', '_')}
                value={value}
                onChange={handleTimeChange}
                placeholder="HH:MM"
                maxLength={5}
                className="w-full text-base py-6 font-semibold"
            />
        </div>
    )
}
