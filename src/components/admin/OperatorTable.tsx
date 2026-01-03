'use client';

import { useState, useEffect, useMemo } from 'react';
import type { UserProfile, Shift, Company } from '@/types/db-entities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Users, MoreHorizontal, Building, Search, Trash2 } from 'lucide-react';
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
import { format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogoSpinner } from '../LogoSpinner';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { DeleteUserDialog } from './DeleteUserDialog';

interface OperatorTableProps {
    user: User | null;
}

export function OperatorTable({ user }: OperatorTableProps) {
    const firestore = useFirestore();
    const [searchQuery, setSearchQuery] = useState('');
    const { toast } = useToast();

    // The query will only run if the user is authenticated, as per the `user` dependency.
    const profilesRef = useMemoFirebase(() => firestore && user ? collection(firestore, 'users') : null, [firestore, user]);
    const { data: initialOperators, isLoading: profilesLoading, error: profilesError } = useCollection<UserProfile>(profilesRef);
    
    const [operators, setOperators] = useState<UserProfile[] | null>(null);

    useEffect(() => {
        if(initialOperators) {
            // No need to filter by role here, the security rules handle access.
            // If the query returns data, it means the user is an admin.
            setOperators(initialOperators);
        }
    }, [initialOperators]);

    const companiesRef = useMemoFirebase(() => firestore && user ? collection(firestore, 'companies') : null, [firestore, user]);
    const { data: companies, isLoading: companiesLoading, error: companiesError } = useCollection<Company>(companiesRef);

    // This is inefficient. For a large app, this should be a denormalized field on the user profile.
    const [companyMap, setCompanyMap] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!firestore || !operators || !companies) return;

        // This is a placeholder for a more efficient implementation.
        // It's not scalable as it requires fetching all shifts.
        const buildCompanyMap = async () => {
            const tempMap: Record<string, string> = {};
            // This is where you would ideally have a better query or denormalized data.
            // For now, we will leave it empty as fetching all shifts is too expensive.
            setCompanyMap(tempMap);
        };
        buildCompanyMap();

    }, [firestore, operators, companies]);


    const filteredOperators = useMemo(() => {
        if (!operators) return [];

        const sortedOperators = [...operators].sort((a, b) => {
                const getDate = (profile: UserProfile): Date => {
                    if (!profile.createdAt) return new Date(0);
                    // Firestore Timestamps can be objects with toDate(), or ISO strings
                    if (typeof profile.createdAt === 'string') {
                        const parsed = parseISO(profile.createdAt);
                        return isValid(parsed) ? parsed : new Date(0);
                    }
                    if (typeof (profile.createdAt as any)?.toDate === 'function') {
                        return (profile.createdAt as any).toDate();
                    }
                    return new Date(0);
                }

                const dateA = getDate(a);
                const dateB = getDate(b);
                
                if(!isValid(dateA) || !isValid(dateB)) return 0;
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
    
    const handleDeleteUser = async (userId: string, userName: string) => {
        if (!firestore) return;
        const userDocRef = doc(firestore, 'users', userId);
        try {
            await deleteDoc(userDocRef);
            setOperators(prev => prev ? prev.filter(op => op.id !== userId) : null);
            toast({
                title: "Usuario Eliminado",
                description: `El operador "${userName}" ha sido eliminado.`,
            });
        } catch (error) {
             console.error("Error deleting user:", error);
            toast({ title: "Error", description: "No se pudo eliminar el usuario.", variant: "destructive" });
        }
    };

    const isLoading = profilesLoading || companiesLoading;

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
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Operador</TableHead>
                                <TableHead>Empresa (Último Turno)</TableHead>
                                <TableHead>Tipo de Cuenta</Table-Head>
                                <TableHead>Registrado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <LogoSpinner />
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
                                    const companyName = companyMap[op.uid] || 'No disponible';
                                    
                                    const getCreatedAtDate = (profile: UserProfile): Date | null => {
                                        if (!profile.createdAt) return null;
                                        if (typeof profile.createdAt === 'string') {
                                            const parsed = parseISO(profile.createdAt);
                                            return isValid(parsed) ? parsed : null;
                                        }
                                        if (typeof (profile.createdAt as any).toDate === 'function') {
                                            return (profile.createdAt as any).toDate();
                                        }
                                        return null;
                                    }
                                    const createdAtDate = getCreatedAtDate(op);

                                    return (
                                        <TableRow key={op.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    <Avatar>
                                                        <AvatarImage src={op.photoURL} alt={op.displayName} />
                                                        <AvatarFallback>{getInitials(op.displayName)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-semibold truncate">{op.displayName || 'Usuario sin nombre'}</p>
                                                        <p className="text-sm text-muted-foreground truncate">{op.email || 'No proporcionado'}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className='flex items-center gap-2 text-muted-foreground'>
                                                     <Building className="h-4 w-4" />
                                                    <span>{companyName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={op.isAnonymous ? "secondary" : "outline"}>
                                                    {op.isAnonymous ? "Anónimo" : "Google"}
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
            </CardContent>
        </Card>
    );
}
