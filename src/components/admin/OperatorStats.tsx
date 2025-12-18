
'use client';

import { useState, useEffect } from 'react';
import type { UserProfile, Shift, Company } from '@/types/db-entities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Star, User, UserCheck, Briefcase, Loader2 } from 'lucide-react';

const USER_PROFILES_DB_KEY = 'fake_user_profiles_db';
const SHIFTS_DB_KEY = 'fake_shifts_db';
const COMPANIES_DB_KEY = 'fake_companies_db';

interface Stats {
    totalOperators: number;
    premiumCount: number;
    anonymousCount: number;
    trialCount: number;
    operatorsByCompany: Record<string, number>;
}

export function OperatorStats() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const storedProfiles = localStorage.getItem(USER_PROFILES_DB_KEY);
            const profiles: UserProfile[] = storedProfiles ? JSON.parse(storedProfiles) : [];

            const storedShifts = localStorage.getItem(SHIFTS_DB_KEY);
            const shifts: Shift[] = storedShifts ? JSON.parse(storedShifts) : [];

            const storedCompanies = localStorage.getItem(COMPANIES_DB_KEY);
            const companies: Company[] = storedCompanies ? JSON.parse(storedCompanies) : [];
            const companiesById = companies.reduce((acc, company) => {
                acc[company.id] = company.name;
                return acc;
            }, {} as Record<string, string>);

            const operatorsByCompany = shifts.reduce((acc, shift) => {
                const companyName = companiesById[shift.companyId] || 'Empresa Desconocida';
                if (!acc[companyName]) {
                    acc[companyName] = new Set();
                }
                acc[companyName].add(shift.userId);
                return acc;
            }, {} as Record<string, Set<string>>);
            
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
        } finally {
            setIsLoading(false);
        }
    }, []);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Estadísticas de Operadores</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center items-center h-24">
                    <Loader2 className="animate-spin text-muted-foreground" />
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

