'use client';

import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import type { Company } from '@/types/db-entities';
import { useMemoFirebase } from '@/firebase/provider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CompanySettingsPage() {
  const { companyId } = useParams();
  const firestore = useFirestore();

  const companyRef = useMemoFirebase(
    () => (companyId ? doc(firestore, 'companies', companyId as string) : null),
    [firestore, companyId]
  );
  const { data: company, isLoading } = useDoc<Company>(companyRef);

  if (isLoading) {
    return <div>Cargando datos de la empresa...</div>;
  }

  if (!company) {
    return <div>Empresa no encontrada.</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/admin">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Volver</span>
                </Link>
            </Button>
            <div>
                <h1 className="text-3xl font-bold">Configuración de la Empresa</h1>
                <p className="text-muted-foreground">{company.name}</p>
            </div>
        </div>
      </header>

      <Tabs defaultValue="general">
        <TabsList className="mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="paymentRules">Reglas de Pago</TabsTrigger>
          <TabsTrigger value="items">Ítems</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
            <Card>
                <CardHeader>
                    <CardTitle>Información General</CardTitle>
                    <CardDescription>Edita los detalles básicos de la empresa.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Formulario para editar nombre, logo, etc. (próximamente).</p>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="paymentRules">
            <Card>
                <CardHeader>
                    <CardTitle>Reglas de Pago y Condiciones</CardTitle>
                    <CardDescription>Configura tarifas, deducciones y condiciones especiales.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Formulario para editar reglas de pago (próximamente).</p>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="items">
            <Card>
                <CardHeader>
                    <CardTitle>Configuración de Ítems</CardTitle>
                    <CardDescription>Administra los ítems o maquinarias que los operadores pueden registrar.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Tabla y formulario para CRUD de ítems (próximamente).</p>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

    