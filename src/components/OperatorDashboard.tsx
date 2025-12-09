'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TimeInput } from './TimeInput';
import { useUser } from '@/firebase';

export function OperatorDashboard() {
  const { user } = useUser();
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const handleSave = () => {
    // TODO: Implement save logic to Firestore
    console.log('Saving shift:', {
      userId: user?.uid,
      startTime,
      endTime,
    });
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gray-100 dark:bg-gray-900">
      <div className="flex-1 w-full max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Bienvenido, {user?.displayName || 'Operador'}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
                Registra tu turno
            </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nuevo Turno</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TimeInput
                label="Hora de Entrada"
                value={startTime}
                onChange={setStartTime}
              />
              <TimeInput
                label="Hora de Salida"
                value={endTime}
                onChange={setEndTime}
              />
            </div>
            <div className="mt-8 flex justify-end">
              <Button onClick={handleSave}>Calcular y Guardar Turno</Button>
            </div>
          </CardContent>
        </Card>

        {/* TODO: Add sections for shift history, summaries, etc. */}
      </div>
    </div>
  );
}
