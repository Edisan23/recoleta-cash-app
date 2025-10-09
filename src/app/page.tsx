'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, User } from 'lucide-react';

const availableTimes = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
];

export default function SchedulerPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);

  const handleSchedule = () => {
    if (selectedDate && selectedTime && name && phone) {
      setIsScheduled(true);
    } else {
      alert('Por favor, completa todos los campos.');
    }
  };

  if (isScheduled) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-8">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-2xl text-primary">¡Llamada Agendada!</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-4">
              Gracias, {name}. Hemos agendado tu llamada para el{' '}
              {selectedDate?.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}{' '}
              a las {selectedTime}.
            </p>
            <Button onClick={() => setIsScheduled(false)}>Agendar otra llamada</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-center text-4xl font-bold text-primary">Agenda tu Llamada</h1>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Columna Izquierda: Calendario y Horarios */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>1. Selecciona Fecha y Hora</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md"
                disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))}
              />
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {availableTimes.map((time) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? 'default' : 'outline'}
                    onClick={() => setSelectedTime(time)}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Columna Derecha: Formulario y Confirmación */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>2. Ingresa tus Datos</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Nombre completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="Número de teléfono"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="pt-4">
                <Button
                  onClick={handleSchedule}
                  className="w-full"
                  disabled={!selectedDate || !selectedTime || !name || !phone}
                >
                  Confirmar Cita
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
