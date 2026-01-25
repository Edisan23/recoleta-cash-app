'use client';

import { useState, useMemo, useEffect } from 'react';
import type { UserProfile } from '@/types/db-entities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, toDate } from '@/lib/utils';
import { Users, MoreHorizontal, Search, Trash2, CheckCircle, XCircle, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, isValid, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogoSpinner } from '../LogoSpinner';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { DeleteUserDialog } from './DeleteUserDialog';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from "@/components/ui/tooltip";

interface OperatorTableProps {
    isAdmin: boolean;
}

export function OperatorTable({ isAdmin }: OperatorTableProps) {
    const firestore = useFirestore();
    const [searchQuery, setSearchQuery] = useState('');
    const { toast } = useToast();

    const profilesRef = useMemoFirebase(() => (firestore && isAdmin ? collection(firestore, 'users') : null), [firestore, isAdmin]);
    const { data: initialProfiles, isLoading: profilesLoading, error: profilesError } = useCollection<UserProfile>(profilesRef);
    
    const [operators, setOperators] = useState<UserProfile[]>([]);

    useEffect(() => {
        if (initialProfiles) {
            const operatorProfiles = initialProfiles.filter(p => p.role === 'operator');
            setOperators(operatorProfiles);
        }
    }, [initialProfiles]);

    const filteredOperators = useMemo(() => {
        const sortedOperators = [...operators].sort((a, b) => {
            const dateA = toDate(a.createdAt);
            const dateB = toDate(b.createdAt);
            if (!dateA || !dateB || !isValid(dateA) || !isValid(dateB)) return 0;
            return dateB.getTime() - dateA.getTime();
        });

        if (!searchQuery) {
            return sortedOperators;
        }
        return sortedOperators.filter(op => 
            op.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (op.email && op.email.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [operators, searchQuery]);

    const togglePremiumStatus = async (userId: string, currentPremiumUntil: string | undefined) => {
        if (!firestore) return;
        const userDocRef = doc(firestore, 'users', userId);
        
        const premiumUntilDate = toDate(currentPremiumUntil);
        const isCurrentlyPremium = premiumUntilDate && isAfter(premiumUntilDate, new Date());
        
        const newPremiumUntil = isCurrentlyPremium ? new Date().toISOString() : null; // Set to now to expire, or null for lifetime

        try {
            await updateDoc(userDocRef, { premiumUntil: newPremiumUntil });
            setOperators(prev => prev.map(op => op.id === userId ? { ...op, premiumUntil: newPremiumUntil || undefined } : op));
            toast({
                title: "Estado Actualizado",
                description: `El operador ahora es ${newPremiumUntil === null ? 'Premium Vitalicio' : 'de Prueba'}.`,
            });
        } catch (error) {
            console.error("Error updating premium status:", error);
            toast({ title: "Error", description: "No se pudo actualizar el estado del usuario.", variant: "destructive" });
        }
    };
    
    const handleDeleteUser = async (userId: string, userName: string) => {
        if (!firestore) return;
        const userDocRef = doc(firestore, 'users', userId);
        try {
            await deleteDoc(userDocRef);
            setOperators(prev => prev.filter(op => op.id !== userId));
            toast({
                title: "Usuario Eliminado",
                description: `El operador "${userName}" ha sido eliminado.`,
            });
        } catch (error) {
             console.error("Error deleting user:", error);
            toast({ title: "Error", description: "No se pudo eliminar el usuario.", variant: "destructive" });
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-6 w-6" />
                            Operadores Registrados
                        </CardTitle>
                        <CardDescription>
                            Lista de todos los usuarios operadores en el sistema.
                        </CardDescription>
                    </div>
                     <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar por nombre o email..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <TooltipProvider>
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Operador</TableHead>
                                    <TableHead>Tipo de Cuenta</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Registrado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {profilesLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            <LogoSpinner className="h-12 w-12" />
                                        </TableCell>
                                    </TableRow>
                                ) : profilesError ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-red-500">
                                            Error: No tienes permiso para ver los usuarios.
                                        </TableCell>
                                    </TableRow>
                                ) : filteredOperators.length > 0 ? (
                                    filteredOperators.map((op) => {
                                        const createdAtDate = toDate(op.createdAt);
                                        const premiumUntilDate = toDate(op.premiumUntil);
                                        const isPremiumActive = op.premiumUntil === null || (premiumUntilDate && isAfter(premiumUntilDate, new Date()));

                                        return (
                                            <TableRow key={op.id}>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar>
                                                            <AvatarImage src={op.photoURL} alt={op.displayName} />
                                                            <AvatarFallback>{getInitials(op.displayName)}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <p className="font-semibold truncate">{op.displayName || 'Usuario sin nombre'}</p>
                                                                {isPremiumActive && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger>
                                                                            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>Usuario Premium</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-muted-foreground truncate max-w-xs">{op.email || 'No proporcionado'}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={op.isAnonymous ? "secondary" : "outline"}>
                                                        {op.isAnonymous ? "Anónimo" : "Google"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={isPremiumActive ? 'default' : 'secondary'}>
                                                        {isPremiumActive ? (op.premiumUntil === null ? 'Premium Vitalicio' : 'Premium') : 'Prueba'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {createdAtDate && isValid(createdAtDate) ? format(createdAtDate, 'dd MMM, yyyy', { locale: es }) : 'Fecha no disponible'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                                <span className="sr-only">Abrir menú de acciones</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            {isPremiumActive ? (
                                                                <DropdownMenuItem onClick={() => togglePremiumStatus(op.id, op.premiumUntil)}>
                                                                    <XCircle className="mr-2 h-4 w-4" />
                                                                    Quitar Premium
                                                                </DropdownMenuItem>
                                                            ) : (
                                                                <DropdownMenuItem onClick={() => togglePremiumStatus(op.id, op.premiumUntil)}>
                                                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                                                    Activar Premium (Vitalicio)
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuSeparator />
                                                            <DeleteUserDialog
                                                                userName={op.displayName || 'este usuario'}
                                                                onConfirm={() => handleDeleteUser(op.id, op.displayName)}
                                                            >
                                                                <DropdownMenuItem
                                                                    onSelect={(e) => e.preventDefault()}
                                                                    className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/40"
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    Eliminar Usuario
                                                                </DropdownMenuItem>
                                                            </DeleteUserDialog>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            No se encontraron operadores.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TooltipProvider>
            </CardContent>
        </Card>
    );
}
