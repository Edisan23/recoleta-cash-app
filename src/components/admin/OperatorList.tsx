
'use client';

import { useState, useEffect } from 'react';
import type { UserProfile, Shift } from '@/types/db-entities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Loader2, Trash2, Users } from 'lucide-react';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';

const USER_PROFILES_DB_KEY = 'fake_user_profiles_db';
const SHIFTS_DB_KEY = 'fake_shifts_db';

export function OperatorList() {
    const [operators, setOperators] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const loadOperators = () => {
        setIsLoading(true);
        try {
            const storedProfiles = localStorage.getItem(USER_PROFILES_DB_KEY);
            const profiles: UserProfile[] = storedProfiles ? JSON.parse(storedProfiles) : [];
            
            const storedShifts = localStorage.getItem(SHIFTS_DB_KEY);
            const shifts: Shift[] = storedShifts ? JSON.parse(storedShifts) : [];

            // Get unique user IDs from shifts
            const operatorUids = [...new Set(shifts.map(s => s.userId))];

            const operatorProfiles = operatorUids.map(uid => {
                const profile = profiles.find(p => p.uid === uid);
                return profile || { uid, displayName: `Operador Desconocido (${uid.substring(0, 6)}...)`, photoURL: '', email: '' };
            });

            setOperators(operatorProfiles);

        } catch (error) {
            console.error("Error loading operators from localStorage:", error);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        loadOperators();
    }, []);

    const handleClearOperators = () => {
        try {
            localStorage.removeItem(USER_PROFILES_DB_KEY);
            localStorage.removeItem(SHIFTS_DB_KEY);
            setOperators([]);
            toast({
                title: "¡Listo!",
                description: "Se han eliminado los datos de turnos y operadores.",
            });
        } catch (error) {
            console.error("Error clearing operator data from localStorage:", error);
             toast({
                title: "Error",
                description: "No se pudieron eliminar los datos.",
                variant: "destructive"
            });
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-6 w-6" />
                        Operadores
                    </CardTitle>
                    <Button variant="outline" size="icon" onClick={handleClearOperators} title="Limpiar Operadores y Turnos">
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
                <CardDescription>
                    Lista de operadores que han registrado actividad.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center h-24">
                        <Loader2 className="animate-spin text-muted-foreground" />
                    </div>
                ) : operators.length > 0 ? (
                    <ul className="space-y-4">
                        {operators.map(op => (
                            <li key={op.uid} className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarImage src={op.photoURL} alt={op.displayName} />
                                    <AvatarFallback>{getInitials(op.displayName)}</AvatarFallback>
                                </Avatar>
                                <div className="truncate">
                                    <p className="font-semibold truncate">{op.displayName}</p>
                                    <p className="text-sm text-muted-foreground truncate">{op.email}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-center text-sm text-muted-foreground py-10">
                        No hay operadores con turnos registrados todavía.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
