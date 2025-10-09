'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { List, Trash2, Calendar as CalendarIcon, Clock, MessageSquare, PlayCircle } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';

interface Commitment {
  id: string;
  title: string;
  date: string;
  time: string;
  message: string;
}

export default function CommitmentsPage() {
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState('09:00');
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedCommitments = localStorage.getItem('commitments');
      if (storedCommitments) {
        setCommitments(JSON.parse(storedCommitments));
      }
    } catch (error) {
      console.error('Error reading from localStorage', error);
      setCommitments([]);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('commitments', JSON.stringify(commitments));
    } catch (error) {
      console.error('Error saving to localStorage', error);
    }
  }, [commitments]);

  const handleAddCommitment = () => {
    if (!title || !date || !time || !message) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Por favor, completa todos los campos.',
      });
      return;
    }
    const newCommitment: Commitment = {
      id: new Date().toISOString(),
      title,
      date: date.toISOString().split('T')[0],
      time,
      message,
    };
    setCommitments([...commitments, newCommitment]);
    setTitle('');
    setMessage('');
    toast({
      title: '¡Éxito!',
      description: 'Compromiso agregado correctamente.',
    });
  };

  const handleDeleteCommitment = (id: string) => {
    setCommitments(commitments.filter((c) => c.id !== id));
    toast({
      title: 'Compromiso eliminado.',
    });
  };
  
  const handlePlayAudio = (text: string) => {
    // This will be implemented in the next step with Genkit
    toast({
        title: 'Función en desarrollo',
        description: 'La generación de audio se implementará a continuación.',
      });
    console.log(`Generando audio para: "${text}"`);
  };

  return (
    <>
      <Toaster />
      <main className="min-h-screen bg-background text-foreground p-4 sm:p-8">
        <div className="mx-auto max-w-6xl">
          <header className="text-center mb-10">
            <h1 className="text-5xl font-bold text-primary">Agenda de Compromisos</h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Tus recordatorios, entregados por una llamada de voz.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Columna para agregar compromisos */}
            <div className="md:col-span-1">
              <Card className="shadow-lg sticky top-8">
                <CardHeader>
                  <CardTitle>Agregar Nuevo Compromiso</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col space-y-4">
                  <Input
                    placeholder="Título del compromiso"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <div className='flex items-center gap-4'>
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        className="rounded-md border"
                        disabled={(d) => d < new Date(new Date().setDate(new Date().getDate() - 1))}
                    />
                    <Input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full"
                    />
                  </div>
                  <Textarea
                    placeholder="Mensaje que se leerá en la llamada"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <Button onClick={handleAddCommitment}>Agregar Compromiso</Button>
                </CardContent>
              </Card>
            </div>

            {/* Columna para listar compromisos */}
            <div className="md:col-span-2">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <List /> Mis Compromisos
              </h2>
              <div className="space-y-4">
                {commitments.length > 0 ? (
                  commitments
                    .sort((a, b) => new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime())
                    .map((commitment) => (
                    <Card key={commitment.id} className="flex items-center justify-between p-4 shadow-md hover:shadow-lg transition-shadow">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg text-primary">{commitment.title}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4" /> {new Date(commitment.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                           <Clock className="h-4 w-4" /> {commitment.time}
                        </p>
                         <p className="text-sm flex items-center gap-2 pt-1">
                          <MessageSquare className="h-4 w-4" /> <em>"{commitment.message}"</em>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handlePlayAudio(commitment.message)} title="Escuchar audio">
                            <PlayCircle className="h-5 w-5 text-green-500" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDeleteCommitment(commitment.id)} title="Eliminar">
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </Card>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">No tienes compromisos agendados.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
