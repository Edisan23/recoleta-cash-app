'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TimeInput } from '@/components/TimeInput';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc, deleteDoc, doc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import type { Shift } from '@/types/db-entities';
import { LogoSpinner } from '../LogoSpinner';
import { DeleteShiftDialog } from './DeleteShiftDialog';

interface ShiftFormProps {
    selectedDate: Date;
    userId: string;
    companyId: string;
    shiftsForDay: Shift[];
}

export function ShiftForm({ selectedDate, userId, companyId, shiftsForDay }: ShiftFormProps) {
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    
    const firestore = useFirestore();
    const { toast } = useToast();

    // When the selected date or shifts for that day change, update the form
    useEffect(() => {
        if (shiftsForDay.length > 0) {
            const shift = shiftsForDay[0]; // Simplified to handle one shift per day
            setStartTime(shift.startTime);
            setEndTime(shift.endTime);
        } else {
            // Reset form if there are no shifts for the new date
            setStartTime('');
            setEndTime('');
        }
    }, [shiftsForDay, selectedDate]);

    const handleSave = async () => {
        if (!firestore) return;
        if (!startTime || !endTime) {
            toast({
                variant: 'destructive',
                title: 'Campos requeridos',
                description: 'Por favor, ingresa la hora de entrada y salida.',
            });
            return;
        }

        setIsSaving(true);
        try {
            // Since we are simplifying to one shift per day, delete existing shifts for that day before adding a new one.
            const shiftsCollectionRef = collection(firestore, 'companies', companyId, 'shifts');
            
            // Delete existing shifts for the day
            if (shiftsForDay.length > 0) {
                for (const shift of shiftsForDay) {
                    const shiftDocRef = doc(firestore, 'companies', companyId, 'shifts', shift.id);
                    await deleteDoc(shiftDocRef);
                }
            }

            // Add new shift
            const newShift: Omit<Shift, 'id'> = {
                userId,
                companyId,
                date: selectedDate.toISOString(),
                startTime,
                endTime,
            };

            await addDoc(shiftsCollectionRef, newShift);
            
            toast({
                title: 'Turno Guardado',
                description: 'Tu turno ha sido registrado correctamente.',
            });
        } catch (error) {
            console.error("Error saving shift: ", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo guardar el turno.',
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDelete = async () => {
        if (!firestore || shiftsForDay.length === 0) return;

        setIsDeleting(true);
        try {
            for (const shift of shiftsForDay) {
                const shiftDocRef = doc(firestore, 'companies', companyId, 'shifts', shift.id);
                await deleteDoc(shiftDocRef);
            }
            
            toast({
                title: 'Turno Eliminado',
                description: 'El turno para este día ha sido eliminado.',
            });
            setStartTime(''); // Clear form
            setEndTime('');
        } catch (error) {
             console.error("Error deleting shift: ", error);
             toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo eliminar el turno.',
            });
        } finally {
            setIsDeleting(false);
        }
    }

    const hasShift = shiftsForDay.length > 0;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Registro de Actividades</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4">
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
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                {hasShift && (
                    <DeleteShiftDialog onConfirm={handleDelete}>
                        <Button variant="destructive" disabled={isDeleting || isSaving}>
                            {isDeleting ? <LogoSpinner className="mr-2" /> : null}
                            Eliminar Turno
                        </Button>
                    </DeleteShiftDialog>
                )}
                <Button onClick={handleSave} disabled={isSaving || isDeleting}>
                    {isSaving ? <LogoSpinner className="mr-2" /> : null}
                    Guardar Turno
                </Button>
            </CardFooter>
        </Card>
    );
}
