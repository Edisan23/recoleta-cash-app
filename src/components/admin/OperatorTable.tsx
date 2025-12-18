
'use client';

import { useState, useEffect } from 'react';
import type { UserProfile } from '@/types/db-entities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Loader2, Trash2, Users, MoreHorizontal, UserCheck, UserX, Star } from 'lucide-react';
import { Button } from '../ui/button';
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

const USER_PROFILES_DB_KEY = 'fake_user_profiles_db';

type StatusVariant = "default" | "secondary" | "destructive" | "outline";

const statusMap: Record<UserProfile['paymentStatus'], { label: string; variant: StatusVariant; icon: React.ReactNode }> = {
    trial: { label: 'Gratis', variant: 'secondary', icon: <Star className="mr-2 h-3 w-3" /> },
    paid: { label: 'Premium', variant: 'default', icon: <UserCheck className="mr-2 h-3 w-3" /> },
    blocked: { label: 'Bloqueado', variant: 'destructive', icon: <UserX className="mr-2 h-3 w-3" /> },
};


export function OperatorTable() {
    const [operators, setOperators] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const loadOperators = () => {
        setIsLoading(true);
        try {
            const storedProfiles = localStorage.getItem(USER_PROFILES_DB_KEY);
            const profiles: UserProfile[] = storedProfiles ? JSON.parse(storedProfiles) : [];
            setOperators(profiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch (error) {
            console.error("Error loading operators from localStorage:", error);
            toast({ title: "Error", description: "No se pudieron cargar los operadores.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadOperators();
    }, [toast]);
    
    const handleClearOperators = () => {
        try {
            localStorage.removeItem(USER_PROFILES_DB_KEY);
            setOperators([]);
            toast({
                title: "¡Listo!",
                description: "Se han eliminado los perfiles de operadores.",
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
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-6 w-6" />
                            Operadores
                        </CardTitle>
                        <CardDescription>
                            Lista de operadores suscritos y su estado de pago.
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleClearOperators} title="Limpiar todos los operadores">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Limpiar
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Operador</TableHead>
                                <TableHead>Tipo de Cuenta</TableHead>
                                <TableHead>Estado de Pago</TableHead>
                                <TableHead>Registrado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <Loader2 className="mx-auto animate-spin text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : operators.length > 0 ? (
                                operators.map((op) => {
                                    const statusInfo = statusMap[op.paymentStatus] || statusMap.blocked;
                                    return (
                                        <TableRow key={op.uid}>
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
                                                {format(parseISO(op.createdAt), 'dd MMM, yyyy', { locale: es })}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                 <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem>Marcar como Premium</DropdownMenuItem>
                                                        <DropdownMenuItem>Marcar como Bloqueado</DropdownMenuItem>
                                                        <DropdownMenuItem>Restablecer a Prueba</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No hay operadores registrados.
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
