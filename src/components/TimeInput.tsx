'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TimeInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function TimeInput({ label, value, onChange }: TimeInputProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/\D/g, ''); // Remove all non-digit characters

    if (input.length > 4) {
      input = input.substring(0, 4);
    }
    
    let formattedInput = input;
    if (input.length > 2) {
      formattedInput = `${input.substring(0, 2)}:${input.substring(2)}`;
    }

    // Basic validation for 24-hour format
    if (input.length >= 2) {
        const hours = parseInt(input.substring(0, 2), 10);
        if (hours > 23) {
            formattedInput = '23' + (input.length > 2 ? ':' + input.substring(2) : '');
        }
    }
    if (input.length >= 4) {
        const minutes = parseInt(input.substring(2, 4), 10);
        if (minutes > 59) {
            formattedInput = input.substring(0, 2) + ':59';
        }
    }


    onChange(formattedInput);
  };

  return (
    <div className="grid gap-2 text-center">
      <Label htmlFor={label.toLowerCase().replace(' ', '-')}>{label}</Label>
      <Input
        id={label.toLowerCase().replace(' ', '-')}
        type="text"
        placeholder="HH:MM"
        value={value}
        onChange={handleInputChange}
        maxLength={5}
        className="w-32 text-center text-2xl font-mono"
      />
    </div>
  );
}
