'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import type { Company } from '@/types/db-entities';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { useMemoFirebase } from '@/firebase/provider';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export function CompanyTable() {
  const firestore = useFirestore();
  const router = useRouter();

  const companiesRef = useMemoFirebase(() => collection(firestore, 'companies'), [firestore]);
  const { data: companies, isLoading } = useCollection<Company>(companiesRef);

  const handleStatusChange = async (companyId: string, isActive: boolean) => {
    const companyDocRef = doc(firestore, 'companies', companyId);
    try {
      await updateDoc(companyDocRef, { isActive: isActive });
    } catch (error) {
      console.error("Error updating company status: ", error);
      // Here you might want to show a toast to the user
    }
  };

  const handleEditClick = (companyId: string) => {
    router.push(`/admin/company/${companyId}`);
  };

  if (isLoading) {
    return <div>Cargando empresas...</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Logo</TableHead>
          <TableHead>Nombre de la Empresa</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {companies && companies.length > 0 ? (
          companies.map((company) => (
            <TableRow key={company.id}>
              <TableCell>
                {company.logoUrl ? (
                    <Image
                        src={company.logoUrl}
                        alt={`${company.name} logo`}
                        width={40}
                        height={40}
                        className="rounded-md object-cover"
                    />
                ) : (
                    <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">
                        Sin logo
                    </div>
                )}
              </TableCell>
              <TableCell className="font-medium">{company.name}</TableCell>
              <TableCell>
                <Badge variant={company.isActive ? 'default' : 'secondary'}>
                  {company.isActive ? 'Activa' : 'Inactiva'}
                </Badge>
              </TableCell>
              <TableCell className="flex justify-end items-center gap-4">
                <Switch
                  checked={company.isActive}
                  onCheckedChange={(checked) => handleStatusChange(company.id, checked)}
                  aria-label="Activar o desactivar empresa"
                />
                <Button variant="outline" size="icon" onClick={() => handleEditClick(company.id)}>
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Editar</span>
                </Button>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={4} className="text-center">
              No hay empresas registradas.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

    