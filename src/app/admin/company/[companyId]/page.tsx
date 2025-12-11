'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

// FAKE DATA FOR SIMULATION
const FAKE_COMPANIES_DB = {
    '1': { id: '1', name: 'Constructora XYZ', isActive: true, logoUrl: 'https://placehold.co/100x100/e2e8f0/64748b?text=Logo', themeColor: '#2563eb' },
    '2': { id: '2', name: 'Transportes Rápidos', isActive: true, logoUrl: 'https://placehold.co/100x100/e2e8f0/64748b?text=Logo', themeColor: '#e11d48' },
    '3': { id: '3', name: 'Servicios Generales S.A.', isActive: false, logoUrl: 'https://placehold.co/100x100/e2e8f0/64748b?text=Logo', themeColor: '#059669' },
};

const FAKE_SETTINGS_DB = {
    '1': { dayRate: 10, nightRate: 12, dayOvertimeRate: 15, nightOvertimeRate: 18, holidayDayRate: 20, holidayNightRate: 22, holidayDayOvertimeRate: 25, holidayNightOvertimeRate: 28 },
    '2': { dayRate: 11, nightRate: 13, dayOvertimeRate: 16, nightOvertimeRate: 19, holidayDayRate: 21, holidayNightRate: 23, holidayDayOvertimeRate: 26, holidayNightOvertimeRate: 29 },
};


export default function CompanySettingsPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.companyId as string;
  const { toast } = useToast();

  // Simulate fetching data
  const company = FAKE_COMPANIES_DB[companyId as keyof typeof FAKE_COMPANIES_DB] || null;
  const initialSettings = FAKE_SETTINGS_DB[companyId as keyof typeof FAKE_SETTINGS_DB] || {};
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(company?.logoUrl || null);
  const [themeColor, setThemeColor] = useState<string>(company?.themeColor || '#000000');
  const [rates, setRates] = useState(initialSettings);
  const [isSaving, setIsSaving] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRates(prev => ({ ...prev, [name]: value ? parseFloat(value) : 0 }));
  }

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log("Saving data:", {
        companyId,
        logoFile,
        themeColor,
        rates,
    });

    toast({
        title: '¡Guardado!',
        description: `La configuración de ${company?.name} ha sido actualizada.`,
    });
    setIsSaving(false);
  };

  if (!company) {
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <p className="text-xl text-muted-foreground mb-4">Empresa no encontrada.</p>
            <Button onClick={() => router.push('/admin')}>
                <ArrowLeft className="mr-2" />
                Volver al Panel
            </Button>
        </div>
    )
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <Button variant="ghost" onClick={() => router.push('/admin')} className="mb-4">
            <ArrowLeft className="mr-2" />
            Volver al listado
          </Button>
          <h1 className="text-3xl font-bold">Configuración de la Empresa</h1>
          <p className="text-muted-foreground">Editando: {company.name}</p>
        </div>
      </header>

      <main className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Tarifas de Pago</CardTitle>
                    <CardDescription>Define los valores por hora para los diferentes tipos de turno.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <fieldset className="space-y-4 p-4 border rounded-lg">
                        <legend className="text-lg font-medium px-1">Horario Normal</legend>
                        <div className="grid gap-2">
                            <Label htmlFor="dayRate">Hora Diurna</Label>
                            <Input id="dayRate" name="dayRate" type="number" placeholder="0.00" value={rates.dayRate || ''} onChange={handleRateChange} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="nightRate">Hora Nocturna</Label>
                            <Input id="nightRate" name="nightRate" type="number" placeholder="0.00" value={rates.nightRate || ''} onChange={handleRateChange} />
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="dayOvertimeRate">Hora Extra Diurna</Label>
                            <Input id="dayOvertimeRate" name="dayOvertimeRate" type="number" placeholder="0.00" value={rates.dayOvertimeRate || ''} onChange={handleRateChange} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="nightOvertimeRate">Hora Extra Nocturna</Label>
                            <Input id="nightOvertimeRate" name="nightOvertimeRate" type="number" placeholder="0.00" value={rates.nightOvertimeRate || ''} onChange={handleRateChange} />
                        </div>
                    </fieldset>
                    <fieldset className="space-y-4 p-4 border rounded-lg">
                        <legend className="text-lg font-medium px-1">Horario Festivo</legend>
                        <div className="grid gap-2">
                            <Label htmlFor="holidayDayRate">Hora Festiva Diurna</Label>
                            <Input id="holidayDayRate" name="holidayDayRate" type="number" placeholder="0.00" value={rates.holidayDayRate || ''} onChange={handleRateChange} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="holidayNightRate">Hora Festiva Nocturna</Label>
                            <Input id="holidayNightRate" name="holidayNightRate" type="number" placeholder="0.00" value={rates.holidayNightRate || ''} onChange={handleRateChange} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="holidayDayOvertimeRate">Hora Extra Festiva Diurna</Label>
                            <Input id="holidayDayOvertimeRate" name="holidayDayOvertimeRate" type="number" placeholder="0.00" value={rates.holidayDayOvertimeRate || ''} onChange={handleRateChange} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="holidayNightOvertimeRate">Hora Extra Festiva Nocturna</Label>
                            <Input id="holidayNightOvertimeRate" name="holidayNightOvertimeRate" type="number" placeholder="0.00" value={rates.holidayNightOvertimeRate || ''} onChange={handleRateChange} />
                        </div>
                    </fieldset>
                </CardContent>
            </Card>
        </div>

        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Branding</CardTitle>
                    <CardDescription>Personaliza la apariencia de la empresa.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-2">
                        <Label>Logo de la Empresa</Label>
                        <div className="flex items-center gap-4">
                            {logoPreview ? (
                                <Image src={logoPreview} alt="Logo preview" width={64} height={64} className="rounded-md object-contain border" />
                            ) : (
                                <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center text-muted-foreground">
                                    <Upload />
                                </div>
                            )}
                            <Input id="logo-upload" type="file" onChange={handleFileChange} className="hidden" accept="image/*" />
                            <Button type="button" variant="outline" onClick={() => document.getElementById('logo-upload')?.click()}>
                                Cambiar Logo
                            </Button>
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="theme-color">Color del Tema</Label>
                         <div className="flex items-center gap-2">
                            <Input id="theme-color" type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="w-12 h-10 p-1"/>
                            <Input type="text" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} placeholder="#RRGGBB" />
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            <Separator />

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving} size="lg">
                    {isSaving && <Loader2 className="mr-2 animate-spin" />}
                    Guardar Cambios
                </Button>
            </div>
        </div>
      </main>
    </div>
  );
}
