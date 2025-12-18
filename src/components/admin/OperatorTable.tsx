
'use client';

import { useState, useEffect } from 'react';
import type { UserProfile, Shift, Company } from '@/types/db-entities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Loader2, Users, MoreHorizontal, UserCheck, UserX, Star, Building } from 'lucide-react';
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
const SHIFTS_DB_KEY = 'fake_shifts_db';
const COMPANIES_DB_KEY = 'fake_companies_db';


type StatusVariant = "default" | "secondary" | "destructive" | "outline";

const statusMap: Record<UserProfile['paymentStatus'], { label: string; variant: StatusVariant; icon: React.ReactNode }> = {
    trial: { label: 'Gratis', variant: 'secondary', icon: <Star className="mr-2 h-3 w-3" /> },
    paid: { label: 'Premium', variant: 'default', icon: <UserCheck className="mr-2 h-3 w-3" /> },
    blocked: { label: 'Bloqueado', variant: 'destructive', icon: <UserX className="mr-2 h-3 w-3" /> },
};


export function OperatorTable() {
    const [operators, setOperators] = useState<UserProfile[]>([]);
    const [companyMap, setCompanyMap] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const loadData = () => {
        setIsLoading(true);
        try {
            // Load Profiles
            const storedProfiles = localStorage.getItem(USER_PROFILES_DB_KEY);
            const profiles: UserProfile[] = storedProfiles ? JSON.parse(storedProfiles) : [];
            setOperators(profiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            
            // Load Shifts and Companies to build the map
            const storedShifts = localStorage.getItem(SHIFTS_DB_KEY);
            const shifts: Shift[] = storedShifts ? JSON.parse(storedShifts) : [];

            const storedCompanies = localStorage.getItem(COMPANIES_DB_KEY);
            const companies: Company[] = storedCompanies ? JSON.parse(storedCompanies) : [];
            const companiesById = companies.reduce((acc, company) => {
                acc[company.id] = company.name;
                return acc;
            }, {} as Record<string, string>);

            // Create a map of userId -> companyName from the most recent shift
            const opCompanyMap = shifts
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .reduce((acc, shift) => {
                    if (!acc[shift.userId]) { // Only set the first time (which is the most recent)
                        acc[shift.userId] = companiesById[shift.companyId] || 'Empresa Desconocida';
                    }
                    return acc;
                }, {} as Record<string, string>);
            
            setCompanyMap(opCompanyMap);

        } catch (error) {
            console.error("Error loading operators from localStorage:", error);
            toast({ title: "Error", description: "No se pudieron cargar los datos de los operadores.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [toast]);
    
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
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Operador</TableHead>
                                <TableHead>Empresa</TableHead>
                                <TableHead>Tipo de Cuenta</TableHead>
                                <TableHead>Estado de Pago</TableHead>
                                <TableHead>Registrado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <Loader2 className="mx-auto animate-spin text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : operators.length > 0 ? (
                                operators.map((op) => {
                                    const statusInfo = statusMap[op.paymentStatus] || statusMap.blocked;
                                    const companyName = companyMap[op.uid] || 'No asignada';
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
                                    <TableCell colSpan={6} className="h-24 text-center">
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
