
'use client';

import { useState, useEffect } from 'react';
import type { UserProfile, Company } from '@/types/db-entities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, User, Briefcase } from 'lucide-react';
import { LogoSpinner } from '../LogoSpinner';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, collectionGroup } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';


interface Stats {
    totalOperators: number;
    anonymousCount: number;
    googleCount: number;
    operatorsByCompany: Record<string, number>;
}

interface OperatorStatsProps {
    user: FirebaseUser | null;
}

export function OperatorStats({ user }: OperatorStatsProps) {
    const [stats, setStats] = useState<Stats | null>(null);
    const firestore = useFirestore();

    const profilesRef = useMemoFirebase(() => firestore && user ? collection(firestore, 'users') : null, [firestore, user]);
    const { data: profiles, isLoading: profilesLoading } = useCollection<UserProfile>(profilesRef);
    
    const companiesRef = useMemoFirebase(() => firestore && user ? collection(firestore, 'companies') : null, [firestore, user]);
    const { data: companies, isLoading: companiesLoading } = useCollection<Company>(companiesRef);
    
    // Note: This collectionGroup query is more efficient but requires a composite index in Firestore.
    // The security rules must also allow for collection group queries on 'shifts'.
    const allShiftsRef = useMemoFirebase(() => firestore && user ? collectionGroup(firestore, 'shifts') : null, [firestore, user]);
    const { data: allShifts, isLoading: shiftsLoading } = useCollection<any>(allShiftsRef);

    const isLoading = profilesLoading || companiesLoading || shiftsLoading;

    useEffect(() => {
        if (isLoading || !profiles || !companies || !allShifts) return;

        try {
            const operators = profiles.filter(p => p.role === 'operator');
            const companiesById = companies.reduce((acc, company) => {
                acc[company.id] = company.name;
                return acc;
            }, {} as Record<string, string>);

            const operatorsByCompany: Record<string, Set<string>> = {};
             allShifts.forEach(shift => {
                if (shift.companyId && companiesById[shift.companyId]) {
                    const companyName = companiesById[shift.companyId];
                     if (!operatorsByCompany[companyName]) {
                        operatorsByCompany[companyName] = new Set();
                    }
                    operatorsByCompany[companyName].add(shift.userId);
                }
             });
            
            const finalOperatorsByCompany: Record<string, number> = {};
            for (const companyName in operatorsByCompany) {
                finalOperatorsByCompany[companyName] = operatorsByCompany[companyName].size;
            }

            setStats({
                totalOperators: operators.length,
                anonymousCount: operators.filter(p => p.isAnonymous).length,
                googleCount: operators.filter(p => !p.isAnonymous).length,
                operatorsByCompany: finalOperatorsByCompany,
            });

        } catch (error) {
            console.error("Error calculating stats:", error);
        }
    }, [profiles, companies, allShifts, isLoading]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Estadísticas de Operadores</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center items-center h-24">
                    <LogoSpinner className="h-12 w-12" />
                </CardContent>
            </Card>
        );
    }
    
    if (!stats) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Estadísticas de Operadores</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center items-center h-24">
                   <p className="text-muted-foreground">No se pudieron cargar las estadísticas.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Estadísticas de Operadores</CardTitle>
                <CardDescription>Un resumen de tu base de usuarios.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                        <svg
                          className="h-6 w-6"
                          aria-hidden="true"
                          focusable="false"
                          data-prefix="fab"
                          data-icon="google"
                          role="img"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 488 512"
                        >
                          <path
                            fill="currentColor"
                            d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-69.5 69.5c-24.3-23.6-58.3-38.3-99.8-38.3-87.3 0-157.8 70.5-157.8 157.8s70.5 157.8 157.8 157.8c105.8 0 138.8-78.4 142.8-108.3H248v-85.3h236.1c2.3 12.7 3.9 26.9 3.9 41.4z"
                          ></path>
                        </svg>
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{stats.googleCount}</p>
                        <p className="text-sm text-muted-foreground">Cuentas Google</p>
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
                    <div className="col-span-2 md:col-span-3 p-4 border rounded-lg mt-4">
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
