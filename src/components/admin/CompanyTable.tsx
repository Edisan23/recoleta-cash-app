'use client';

import Image from 'next/image';
import type { Company } from '@/types/db-entities';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { DeleteCompanyDialog } from './DeleteCompanyDialog';
import { LogoSpinner } from '../LogoSpinner';

interface CompanyTableProps {
    companies: Company[];
    onDeleteCompany: (companyId: string, companyName: string) => void;
    isLoading: boolean;
}

export function CompanyTable({ companies, onDeleteCompany, isLoading }: CompanyTableProps) {
  
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Logo</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                    <LogoSpinner className="h-12 w-12" />
                </TableCell>
            </TableRow>
          ) : companies && companies.length > 0 ? (
            companies.map((company) => (
              <TableRow key={company.id}>
                <TableCell>
                  {company.logoUrl ? (
                    <Image
                      src={company.logoUrl}
                      alt={company.name}
                      width={40}
                      height={40}
                      className="rounded-md object-contain"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">
                      -
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{company.name}</TableCell>
                <TableCell>
                  <Badge variant={company.isActive ? 'default' : 'destructive'}>
                    {company.isActive ? 'Activa' : 'Inactiva'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                   <Link href={`/admin/company/${company.id}`} passHref>
                        <Button variant="ghost" size="icon">
                           <Pencil className="h-4 w-4" />
                        </Button>
                    </Link>
                    <DeleteCompanyDialog 
                      companyName={company.name} 
                      onConfirm={() => onDeleteCompany(company.id, company.name)}
                    >
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                      </Button>
                    </DeleteCompanyDialog>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                No se encontraron empresas. ¡Crea la primera!
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
