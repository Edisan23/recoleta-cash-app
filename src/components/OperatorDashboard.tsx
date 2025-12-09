'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TimeInput } from './TimeInput';
import { useAuth, useUser, useFirestore, useDoc } from '@/firebase';
import { DatePicker } from './DatePicker';
import { signOut } from 'firebase/auth';
import { LogOut, CalendarCheck, Wallet } from 'lucide-react';
import type { User, Company } from '@/types/db-entities';
import { doc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function getInitials(name: string) {
    const names = name.split(' ');
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}


export function OperatorDashboard() {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Get user profile from Firestore
  const userDocRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile } = useDoc<User>(userDocRef);

  // Get company details from Firestore using companyId from user profile
  const companyDocRef = useMemoFirebase(() => (userProfile?.companyId ? doc(firestore, 'companies', userProfile.companyId) : null), [firestore, userProfile]);
  const { data: company } = useDoc<Company>(companyDocRef);


  const handleSave = () => {
    // TODO: Implement save logic to Firestore
    console.log('Saving shift:', {
      userId: user?.uid,
      date,
      startTime,
      endTime,
    });
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // The user will be redirected automatically by the logic in page.tsx
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gray-100 dark:bg-gray-900">
      <div className="flex-1 w-full max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <header className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-4">
                 <Avatar className="h-16 w-16">
                    <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'}/>
                    <AvatarFallback>
                        {user?.displayName ? getInitials(user.displayName) : 'OP'}
                    </AvatarFallback>
                </Avatar>
                <div className="text-left">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    Bienvenido, {user?.displayName || 'Operador'}
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
                    Registra tu turno
                    </p>
                </div>
            </div>
             <div className="flex flex-col items-end gap-2">
                 {company && (
                    <div className="flex items-center gap-3 text-right">
                        <div>
                            <p className="font-semibold text-lg">{company.name}</p>
                            <p className="text-sm text-muted-foreground">Empresa</p>
                        </div>
                        {company.logoUrl ? (
                            <Image src={company.logoUrl} alt={company.name} width={48} height={48} className="rounded-md object-contain" />
                        ) : (
                             <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">
                                Logo
                            </div>
                        )}
                    </div>
                )}
                <Button variant="ghost" onClick={handleSignOut} aria-label="Cerrar sesión">
                    <LogOut className="mr-2 h-5 w-5" />
                    Cerrar sesión
                </Button>
            </div>
        </header>


        <main className="grid gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Registrar Turno(s)</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
              <DatePicker date={date} setDate={setDate} />
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <TimeInput
                  label="Hora de Entrada"
                  value={startTime}
                  onChange={setStartTime}
                />
                <span className="text-muted-foreground">a</span>
                <TimeInput
                  label="Hora de Salida"
                  value={endTime}
                  onChange={setEndTime}
                />
              </div>
              <div className="mt-4 flex justify-center">
                <Button onClick={handleSave}>Calcular y Guardar Turno</Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">
                  Resumen del Día
                </CardTitle>
                <CalendarCheck className="h-6 w-6 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {/* Placeholder content. Logic to be implemented */}
                <p className="text-sm text-muted-foreground">
                  Aquí se mostrará el desglose del turno una vez guardado.
                </p>
                <div className="mt-4 space-y-2">
                   <div className="flex justify-between"><span>Horas diurnas:</span> <strong>-</strong></div>
                   <div className="flex justify-between"><span>Horas nocturnas:</span> <strong>-</strong></div>
                   <div className="flex justify-between"><span>Total Turno:</span> <strong className="text-xl">-</strong></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">
                  Acumulado Quincenal
                </CardTitle>
                <Wallet className="h-6 w-6 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {/* Placeholder content. Logic to be implemented */}
                <p className="text-sm text-muted-foreground">
                  Aquí se mostrará el acumulado del periodo de pago actual.
                </p>
                <div className="mt-4 space-y-2">
                   <div className="flex justify-between"><span>Total horas:</span> <strong>-</strong></div>
                   <div className="flex justify-between"><span>Salario bruto:</span> <strong>-</strong></div>
                   <div className="flex justify-between"><span>Neto a pagar:</span> <strong className="text-xl">-</strong></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
