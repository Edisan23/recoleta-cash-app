'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Textarea } from '../ui/textarea';
import { Save, PlusCircle, Trash2 } from 'lucide-react';

interface ShiftFormProps {
    selectedDate: Date;
    userId: string;
    companyId: string;
    shiftsForDay: Shift[];
    companyItems: CompanyItem[];
}

interface DailyShift {
    startTime: string;
    endTime: string;
}

export function ShiftForm({ selectedDate, userId, companyId, shiftsForDay, companyItems }: ShiftFormProps) {
    const [dailyShifts, setDailyShifts] = useState<DailyShift[]>([{ startTime: '', endTime: '' }]);
    const [itemDetails, setItemDetails] = useState<Record<string, string>>({});
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    
    const firestore = useFirestore();
    const { toast } = useToast();

    useEffect(() => {
        if (shiftsForDay.length > 0) {
            setDailyShifts(shiftsForDay.map(s => ({ startTime: s.startTime, endTime: s.endTime })));
            
            const firstShift = shiftsForDay[0];
            const details = firstShift.itemDetails?.reduce((acc, detail) => {
                acc[detail.itemId] = detail.detail;
                return acc;
            }, {} as Record<string, string>) || {};
            setItemDetails(details);
            setNotes(firstShift.notes || '');
        } else {
            setDailyShifts([{ startTime: '', endTime: '' }]);
            setItemDetails({});
            setNotes('');
        }
    }, [shiftsForDay]);

    const handleShiftTimeChange = (index: number, field: 'startTime' | 'endTime', value: string) => {
        const newShifts = [...dailyShifts];
        newShifts[index][field] = value;
        setDailyShifts(newShifts);
    };

    const addShift = () => {
        setDailyShifts([...dailyShifts, { startTime: '', endTime: '' }]);
    };

    const removeShift = (index: number) => {
        const newShifts = dailyShifts.filter((_, i) => i !== index);
        setDailyShifts(newShifts);
    };

    const handleItemDetailChange = (itemId: string, value: string) => {
        setItemDetails(prev => ({...prev, [itemId]: value}));
    };

    const hasShifts = shiftsForDay.length > 0;

    const handleSave = async () => {
        if (!firestore) return;
        
        const shiftsToSave = dailyShifts.filter(s => s.startTime && s.endTime);

        if (shiftsToSave.length === 0 && !hasShifts) {
            toast({
                variant: 'destructive',
                title: 'Campos requeridos',
                description: 'Por favor, ingresa al menos un turno completo (entrada y salida).',
            });
            return;
        }

        if (shiftsToSave.some(s => !s.startTime || !s.endTime)) {
            toast({
                variant: 'destructive',
                title: 'Campos incompletos',
                description: 'Por favor, completa la hora de entrada y salida para todos los turnos.',
            });
            return;
        }

        setIsSaving(true);
        try {
            const batch = writeBatch(firestore);
            
            if (shiftsForDay.length > 0) {
                for (const shift of shiftsForDay) {
                    const shiftDocRef = doc(firestore, 'companies', companyId, 'shifts', shift.id);
                    batch.delete(shiftDocRef);
                }
            }

            for (const shiftData of shiftsToSave) {
                 const newShift: Omit<Shift, 'id'> = {
                    userId,
                    companyId,
                    date: selectedDate.toISOString(),
                    startTime: shiftData.startTime,
                    endTime: shiftData.endTime,
                    notes: notes,
                    itemDetails: companyItems.map(item => ({
                        itemId: item.id,
                        itemName: item.name,
                        detail: itemDetails[item.id] || ''
                    })).filter(detail => detail.detail)
                };
                const newShiftRef = doc(collection(firestore, 'companies', companyId, 'shifts'));
                batch.set(newShiftRef, newShift);
            }

            await batch.commit();
            
            if (shiftsToSave.length > 0) {
                toast({
                    title: hasShifts ? 'Turnos Actualizados' : 'Turnos Guardados',
                    description: `Tus turnos han sido ${hasShifts ? 'actualizados' : 'registrados'} correctamente.`,
                });
            } else {
                 toast({
                    title: 'Turnos Eliminados',
                    description: 'Todos los turnos para este día han sido eliminados.',
                });
            }
        } catch (error) {
            console.error("Error saving shifts: ", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudieron guardar los turnos.',
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
                title: 'Turnos Eliminados',
                description: 'Todos los turnos para este día han sido eliminados.',
            });
            setDailyShifts([{ startTime: '', endTime: '' }]);
            setItemDetails({});
            setNotes('');
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

    return (
        <Card className="relative pb-24">
            <CardHeader>
                <CardTitle>Registro de Actividades</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-4">
                    {dailyShifts.map((shift, index) => (
                        <div key={index} className="grid grid-cols-12 gap-4 items-end p-4 border rounded-lg bg-muted">
                            <div className="col-span-5">
                                <TimeInput
                                    label={`Entrada Turno ${index + 1}`}
                                    value={shift.startTime}
                                    onChange={(value) => handleShiftTimeChange(index, 'startTime', value)}
                                />
                            </div>
                            <div className="col-span-5">
                                <TimeInput
                                    label={`Salida Turno ${index + 1}`}
                                    value={shift.endTime}
                                    onChange={(value) => handleShiftTimeChange(index, 'endTime', value)}
                                />
                            </div>
                            <div className="col-span-2 flex justify-end">
                                {dailyShifts.length > 1 && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeShift(index)}
                                        className="text-destructive hover:text-destructive"
                                        aria-label={`Eliminar Turno ${index + 1}`}
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-start">
                    <Button variant="outline" onClick={addShift} disabled={isSaving || isDeleting}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Añadir otro turno
                    </Button>
                </div>

                 <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger>Detalles Adicionales (Opcional)</AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-4 pt-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                <div className="space-y-2">
                                    <Label htmlFor="notes">Notas del Turno</Label>
                                    <Textarea
                                        id="notes"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Escribe aquí cualquier nota relevante sobre este turno..."
                                    />
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
            
            <div className="absolute bottom-6 right-6 flex items-center gap-4">
                 {hasShifts && (
                    <DeleteShiftDialog onConfirm={handleDelete}>
                        <Button 
                            variant="destructive" 
                            size="icon" 
                            className="h-12 w-12 rounded-full shadow-lg hover:shadow-destructive/40 transition-all duration-300" 
                            disabled={isDeleting || isSaving}
                            aria-label="Eliminar Turnos"
                        >
                            {isDeleting ? <LogoSpinner className="h-6 w-6" /> : <Trash2 className="h-5 w-5" />}
                        </Button>
                    </DeleteShiftDialog>
                )}
                <Button 
                    onClick={handleSave} 
                    disabled={isSaving || isDeleting}
                    size="icon"
                    className="h-16 w-16 rounded-full shadow-lg hover:shadow-primary/40 transition-all duration-300 transform hover:scale-105"
                    aria-label={hasShifts ? 'Actualizar Turnos' : 'Guardar Turnos'}
                >
                    {isSaving ? <LogoSpinner className="h-8 w-8" /> : <Save className="h-7 w-7" />}
                </Button>
            </div>
        </Card>
    );
}
