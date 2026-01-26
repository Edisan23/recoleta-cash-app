'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function HistorySheet() {
    return (
        <div className="space-y-8 p-4 sm:p-6 h-full overflow-y-auto">
             <Card>
                <CardHeader>
                    <CardTitle>Historial de Pagos</CardTitle>
                    <CardDescription>Esta función ha sido deshabilitada.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground py-8">La vista de historial ha sido eliminada.</p>
                </CardContent>
            </Card>
        </div>
    );
}
