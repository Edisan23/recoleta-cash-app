'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TimeInput } from '@/components/TimeInput';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import type { Shift, CompanyItem } from '@/types/db-entities';
import { LogoSpinner } from '../LogoSpinner';
import { DeleteShiftDialog } from './DeleteShiftDialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface ShiftFormProps {
    selectedDate: Date;
    userId: string;
    companyId: string;
    shiftsForDay: Shift[];
    companyItems: CompanyItem[];
}

export function ShiftForm({ selectedDate, userId, companyId, shiftsForDay, companyItems }: ShiftFormProps) {
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [itemDetails, setItemDetails] = useState<Record<string, string>>({});
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
            const details = shift.itemDetails?.reduce((acc, detail) => {
                acc[detail.itemId] = detail.detail;
                return acc;
            }, {} as Record<string, string>) || {};
            setItemDetails(details);
        } else {
            // Reset form if there are no shifts for the new date
            setStartTime('');
            setEndTime('');
            setItemDetails({});
        }
    }, [shiftsForDay, selectedDate]);

    const handleItemDetailChange = (itemId: string, value: string) => {
        setItemDetails(prev => ({...prev, [itemId]: value}));
    };

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
            const batch = writeBatch(firestore);
            
            // Delete existing shifts for the day
            if (shiftsForDay.length > 0) {
                for (const shift of shiftsForDay) {
                    const shiftDocRef = doc(firestore, 'companies', companyId, 'shifts', shift.id);
                    batch.delete(shiftDocRef);
                }
            }

            // Add new shift
            const newShift: Omit<Shift, 'id'> = {
                userId,
                companyId,
                date: selectedDate.toISOString(),
                startTime,
                endTime,
                itemDetails: companyItems.map(item => ({
                    itemId: item.id,
                    itemName: item.name,
                    detail: itemDetails[item.id] || ''
                })).filter(detail => detail.detail) // Only save details that have a value
            };

            const newShiftRef = doc(collection(firestore, 'companies', companyId, 'shifts'));
            batch.set(newShiftRef, newShift);

            await batch.commit();
            
            toast({
                title: hasShift ? 'Turno Actualizado' : 'Turno Guardado',
                description: `Tu turno ha sido ${hasShift ? 'actualizado' : 'registrado'} correctamente.`,
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
            const batch = writeBatch(firestore);
            for (const shift of shiftsForDay) {
                const shiftDocRef = doc(firestore, 'companies', companyId, 'shifts', shift.id);
                batch.delete(shiftDocRef);
            }
            await batch.commit();
            
            toast({
                title: 'Turno Eliminado',
                description: 'El turno para este día ha sido eliminado.',
            });
            setStartTime(''); // Clear form
            setEndTime('');
            setItemDetails({});
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
            <CardContent className="space-y-6">
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
                 {companyItems.length > 0 && (
                     <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>Detalles Adicionales (Opcional)</AccordionTrigger>
                            <AccordionContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                                    {companyItems.map(item => (
                                        <div key={item.id} className="space-y-2">
                                            <Label htmlFor={item.id}>{item.name}</Label>
                                            <Input 
                                                id={item.id}
                                                value={itemDetails[item.id] || ''}
                                                onChange={(e) => handleItemDetailChange(item.id, e.target.value)}
                                                placeholder={item.description || '...'}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                )}
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
                    {hasShift ? 'Actualizar Turno' : 'Guardar Turno'}
                </Button>
            </CardFooter>
        </Card>
    );
}
