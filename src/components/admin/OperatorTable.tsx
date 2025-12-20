'use client';

import { useState, useEffect, useMemo } from 'react';
import type { UserProfile, Shift, Company } from '@/types/db-entities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Users, MoreHorizontal, UserCheck, UserX, Star, Building, Search } from 'lucide-react';
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
import { format, parseISO } from 'date-fns';
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
import { collection, doc, updateDoc } from 'firebase/firestore';

type StatusVariant = "default" | "secondary" | "destructive" | "outline";

const statusMap: Record<UserProfile['paymentStatus'], { label: string; variant: StatusVariant; icon: React.ReactNode }> = {
    trial: { label: 'Gratis', variant: 'secondary', icon: <Star className="mr-2 h-3 w-3" /> },
    paid: { label: 'Premium', variant: 'default', icon: <UserCheck className="mr-2 h-3 w-3" /> },
    blocked: { label: 'Bloqueado', variant: 'destructive', icon: <UserX className="mr-2 h-3 w-3" /> },
};


export function OperatorTable() {
    const firestore = useFirestore();
    const [searchQuery, setSearchQuery] = useState('');
    const { toast } = useToast();

    const profilesRef = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
    const { data: operators, isLoading: profilesLoading, error: profilesError } = useCollection<UserProfile>(profilesRef);
    
    const companiesRef = useMemoFirebase(() => firestore ? collection(firestore, 'companies') : null, [firestore]);
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
        const sortedOperators = operators 
            ? [...operators].sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            })
            : [];

        if (!searchQuery) {
            return sortedOperators;
        }
        return sortedOperators.filter(op => 
            op.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (op.email && op.email.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [operators, searchQuery]);

    const handleStatusChange = async (userId: string, newStatus: UserProfile['paymentStatus']) => {
        if (!firestore) return;
        const userDocRef = doc(firestore, 'users', userId);
        try {
            await updateDoc(userDocRef, { paymentStatus: newStatus });
            toast({
                title: "Estado actualizado",
                description: `El estado del operador ha sido cambiado a ${newStatus}.`
            });
        } catch (error) {
            console.error("Error updating user status:", error);
            toast({ title: "Error", description: "No se pudo actualizar el estado.", variant: "destructive" });
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
                            Lista de operadores suscritos, su estado y empresa.
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
                                <TableHead>Tipo de Cuenta</TableHead>
                                <TableHead>Estado de Pago</TableHead>
                                <TableHead>Registrado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow key="loading-row">
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <LogoSpinner />
                                    </TableCell>
                                </TableRow>
                            ) : filteredOperators.length > 0 ? (
                                filteredOperators.map((op) => {
                                    const statusInfo = statusMap[op.paymentStatus] || statusMap.blocked;
                                    const companyName = companyMap[op.uid] || 'No disponible';
                                    return (
                                        <TableRow key={op.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    <Avatar>
                                                        <AvatarImage src={op.photoURL} alt={op.displayName} />
                                                        <AvatarFallback>{getInitials(op.displayName)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-semibold truncate">{op.displayName}</p>
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
                                            <TableCell>
                                                <Badge variant={statusInfo.variant} className="flex items-center w-fit">
                                                    {statusInfo.icon}
                                                    {statusInfo.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {op.createdAt && typeof op.createdAt === 'string' ? format(parseISO(op.createdAt), 'dd MMM, yyyy', { locale: es }) : 'Fecha no disponible'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                 <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Acciones de Pago</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleStatusChange(op.id, 'paid')}>Marcar como Premium</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleStatusChange(op.id, 'blocked')}>Marcar como Bloqueado</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleStatusChange(op.id, 'trial')}>Restablecer a Prueba</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow key="no-results-row">
                                    <TableCell colSpan={6} className="h-24 text-center">
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
