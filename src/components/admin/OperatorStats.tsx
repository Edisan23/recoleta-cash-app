'use client';

import { useState, useEffect, useMemo } from 'react';
import type { UserProfile, Shift, Company } from '@/types/db-entities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Star, User, UserCheck, Briefcase } from 'lucide-react';
import { LogoSpinner } from '../LogoSpinner';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

interface Stats {
    totalOperators: number;
    premiumCount: number;
    anonymousCount: number;
    trialCount: number;
    operatorsByCompany: Record<string, number>;
}

export function OperatorStats() {
    const [stats, setStats] = useState<Stats | null>(null);
    const firestore = useFirestore();

    const profilesRef = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
    const { data: profiles, isLoading: profilesLoading } = useCollection<UserProfile>(profilesRef);
    
    // We need all shifts from all companies to map users to companies
    // A better approach for larger scale would be to store companyId on user profile.
    const companiesRef = useMemoFirebase(() => firestore ? collection(firestore, 'companies') : null, [firestore]);
    const { data: companies, isLoading: companiesLoading } = useCollection<Company>(companiesRef);
    
    // This is inefficient but necessary with the current data model.
    const allShiftsRef = useMemoFirebase(() => firestore ? collection(firestore, 'shifts') : null, [firestore]);
    const { data: allShifts, isLoading: shiftsLoading } = useCollection<Shift>(allShiftsRef);

    const isLoading = profilesLoading || companiesLoading; // shiftsLoading is not critical for initial render

    useEffect(() => {
        if (!profiles || !companies) return;

        try {
            const companiesById = companies.reduce((acc, company) => {
                acc[company.id] = company.name;
                return acc;
            }, {} as Record<string, string>);

            // This part is slow and inefficient, especially without all shifts loaded.
            // This logic should be moved to a backend or improved with a better data model.
            // For now, we'll compute it on the client.
            const operatorsByCompany: Record<string, Set<string>> = {};
            if (allShifts) {
                 allShifts.forEach(shift => {
                    const companyName = companiesById[shift.companyId] || 'Empresa Desconocida';
                    if (!operatorsByCompany[companyName]) {
                        operatorsByCompany[companyName] = new Set();
                    }
                    operatorsByCompany[companyName].add(shift.userId);
                 });
            }
            
            const finalOperatorsByCompany: Record<string, number> = {};
            for (const companyName in operatorsByCompany) {
                finalOperatorsByCompany[companyName] = operatorsByCompany[companyName].size;
            }

            setStats({
                totalOperators: profiles.length,
                premiumCount: profiles.filter(p => p.paymentStatus === 'paid').length,
                anonymousCount: profiles.filter(p => p.isAnonymous).length,
                trialCount: profiles.filter(p => p.paymentStatus === 'trial').length,
                operatorsByCompany: finalOperatorsByCompany,
            });

        } catch (error) {
            console.error("Error calculating stats:", error);
        }
    }, [profiles, companies, allShifts]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Estadísticas de Operadores</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center items-center h-24">
                    <LogoSpinner />
                </CardContent>
            </Card>
        );
    }
    
    if (!stats) {
        return null; // Or some error state
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Estadísticas de Operadores</CardTitle>
                <CardDescription>Un resumen de tu base de usuarios.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted rounded-lg flex items-start gap-4">
                    <div className="bg-primary/10 text-primary p-3 rounded-full">
                        <Users className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{stats.totalOperators}</p>
                        <p className="text-sm text-muted-foreground">Operadores Totales</p>
                    </div>
                </div>
                 <div className="p-4 bg-muted rounded-lg flex items-start gap-4">
                    <div className="bg-green-500/10 text-green-600 p-3 rounded-full">
                        <UserCheck className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{stats.premiumCount}</p>
                        <p className="text-sm text-muted-foreground">Cuentas Premium</p>
                    </div>
                </div>
                 <div className="p-4 bg-muted rounded-lg flex items-start gap-4">
                    <div className="bg-yellow-500/10 text-yellow-600 p-3 rounded-full">
                        <Star className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{stats.trialCount}</p>
                        <p className="text-sm text-muted-foreground">Usuarios en Prueba</p>
                    </div>
                </div>
                <div className="p-4 bg-muted rounded-lg flex items-start gap-4">
                     <div className="bg-gray-500/10 text-gray-600 p-3 rounded-full">
                        <User className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{stats.anonymousCount}</p>
                        <p className="text-sm text-muted-foreground">Cuentas Anónimas</p>
                    </div>
                </div>

                {Object.keys(stats.operatorsByCompany).length > 0 && (
                    <div className="col-span-2 md:col-span-4 p-4 border rounded-lg mt-4">
                        <h4 className="font-semibold mb-2 flex items-center gap-2"><Briefcase className="h-5 w-5" /> Operadores por Empresa</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {Object.entries(stats.operatorsByCompany).map(([companyName, count]) => (
                                <div key={companyName}>
                                    <p className="font-medium truncate" title={companyName}>{companyName}</p>
                                    <p className="text-lg font-bold">{count}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
