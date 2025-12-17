'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DayPicker } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DatePickerProps {
    date: Date | undefined;
    setDate: (date: Date | undefined) => void;
    highlightedDays?: Date[];
}

export function DatePicker({ date, setDate, highlightedDays = [] }: DatePickerProps) {
  
  const footer = date ? <p className='px-4 pt-2 text-sm'>Has seleccionado {format(date, 'PPP', { locale: es })}.</p> : <p className='px-4 pt-2 text-sm'>Por favor, selecciona un día.</p>;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'w-full sm:w-[320px] justify-start text-left font-semibold text-lg py-6',
            !date && 'text-muted-foreground font-normal'
          )}
        >
          <CalendarIcon className="mr-3 h-5 w-5" />
          {date ? format(date, 'PPP', { locale: es }) : <span>Selecciona una fecha</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
          locale={es}
          modifiers={{ highlighted: highlightedDays }}
          modifiersClassNames={{
            highlighted: 'bg-primary/20 rounded-full',
          }}
          footer={footer}
        />
      </PopoverContent>
    </Popover>
  );
}
