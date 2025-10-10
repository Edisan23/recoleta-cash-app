'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { List, Trash2, Calendar as CalendarIcon, Clock, MessageSquare, PlayCircle, Phone, Loader2, Mic, PhoneCall } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { makePhoneCall } from '@/ai/flows/make-phone-call';


interface Commitment {
  id: string;
  title: string;
  date: string;
  time: string;
  message: string;
  phoneNumber: string;
  voice: string;
}

const voices = [
    { value: 'Algenib', label: 'Español - Femenina' },
    { value: 'Achernar', label: 'Español - Masculina' },
    { value: 'Erinome', label: 'Inglés (EE.UU.) - Femenina' },
    { value: 'Puck', label: 'Inglés (EE.UU.) - Masculina' },
];

export default function CommitmentsPage() {
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState('09:00');
  const [message, setMessage] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [voice, setVoice] = useState(voices[0].value);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [callingId, setCallingId] = useState<string | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
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
    if (!title || !date || !time || !message || !phoneNumber) {
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
      phoneNumber,
      voice,
    };
    setCommitments([...commitments, newCommitment]);
    setTitle('');
    setMessage('');
    setPhoneNumber('');
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
  
  const handlePlayAudio = async (commitment: Commitment) => {
    if (playingId === commitment.id) {
        setPlayingId(null);
        setAudioSrc(null);
        return;
    }
    setPlayingId(commitment.id);
    setAudioSrc(null);
    try {
        const response = await textToSpeech({ text: commitment.message, voice: commitment.voice });
        if (response?.media) {
            setAudioSrc(response.media);
        } else {
            throw new Error('No se recibió audio.');
        }
    } catch (error) {
        console.error('Error generating audio:', error);
        toast({
            variant: 'destructive',
            title: 'Error de audio',
            description: 'No se pudo generar el audio para este compromiso.',
        });
        setPlayingId(null);
    }
  };

  const handleMakeCall = async (commitment: Commitment) => {
    setCallingId(commitment.id);
    try {
        const result = await makePhoneCall({
            to: commitment.phoneNumber,
            message: commitment.message,
            voice: commitment.voice,
        });
        if (result.success) {
            toast({
                title: 'Llamada iniciada',
                description: `Llamando al número ${commitment.phoneNumber}.`,
            });
        } else {
            throw new Error(result.error || 'Error desconocido al iniciar la llamada.');
        }
    } catch (error: any) {
        console.error('Error making phone call:', error);
        toast({
            variant: 'destructive',
            title: 'Error de llamada',
            description: error.message || 'No se pudo realizar la llamada. Revisa las credenciales y el número.',
        });
    } finally {
        setCallingId(null);
    }
  };
  
  const getVoiceLabel = (value: string) => {
    return voices.find(v => v.value === value)?.label || value;
  }

  return (
    <>
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
                  <Input
                    type="tel"
                    placeholder="N° de teléfono (ej: +573001234567)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                  <Select value={voice} onValueChange={setVoice}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona una voz" />
                    </SelectTrigger>
                    <SelectContent>
                        {voices.map((v) => (
                            <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
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
                    <Card key={commitment.id} className="flex flex-col p-4 shadow-md hover:shadow-lg transition-shadow">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="font-semibold text-lg text-primary">{commitment.title}</h3>
                                <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
                                    <span className="flex items-center gap-2">
                                        <CalendarIcon className="h-4 w-4" /> {new Date(commitment.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Clock className="h-4 w-4" /> {commitment.time}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Phone className="h-4 w-4" /> {commitment.phoneNumber}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Mic className="h-4 w-4" /> {getVoiceLabel(commitment.voice)}
                                    </span>
                                </div>
                                <p className="text-sm flex items-center gap-2 pt-1">
                                <MessageSquare className="h-4 w-4" /> <em>"{commitment.message}"</em>
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" onClick={() => handleMakeCall(commitment)} title="Llamar ahora" disabled={callingId === commitment.id}>
                                    {callingId === commitment.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <PhoneCall className="h-5 w-5 text-blue-500" />}
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handlePlayAudio(commitment)} title="Escuchar audio">
                                    {playingId === commitment.id && !audioSrc ? <Loader2 className="h-5 w-5 animate-spin" /> : <PlayCircle className="h-5 w-5 text-green-500" />}
                                </Button>
                                <Button variant="destructive" size="icon" onClick={() => handleDeleteCommitment(commitment.id)} title="Eliminar">
                                <Trash2 className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                        {playingId === commitment.id && audioSrc && (
                            <div className="mt-4">
                                <audio src={audioSrc} controls autoPlay onEnded={() => { setPlayingId(null); setAudioSrc(null); }} className="w-full" />
                            </div>
                        )}
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
