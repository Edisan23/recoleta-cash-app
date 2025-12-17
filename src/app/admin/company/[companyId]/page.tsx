
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import type { Company, CompanySettings } from '@/types/db-entities';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const LOCAL_STORAGE_KEY_COMPANIES = 'fake_companies_db';
const LOCAL_STORAGE_KEY_SETTINGS = 'fake_company_settings_db';

const initialSettings: Omit<CompanySettings, 'id'> = {
    payrollCycle: 'monthly',
    paymentModel: 'hourly',
    nightShiftStartHour: 21,
    dayRate: 0,
    nightRate: 0,
    dayOvertimeRate: 0,
    nightOvertimeRate: 0,
    holidayDayRate: 0,
    holidayNightRate: 0,
    holidayDayOvertimeRate: 0,
    holidayNightOvertimeRate: 0,
};

export default function CompanySettingsPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.companyId as string;
  const { toast } = useToast();

  const [company, setCompany] = useState<Company | null>(null);
  const [settings, setSettings] = useState<CompanySettings>({ id: companyId, ...initialSettings });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
        // Load Company
        const storedCompanies = localStorage.getItem(LOCAL_STORAGE_KEY_COMPANIES);
        if (storedCompanies) {
            const allCompanies: Company[] = JSON.parse(storedCompanies);
            const foundCompany = allCompanies.find(c => c.id === companyId);
            if (foundCompany) {
                setCompany(foundCompany);
            }
        }

        // Load Settings
        const storedSettings = localStorage.getItem(LOCAL_STORAGE_KEY_SETTINGS);
        if(storedSettings) {
            let allSettings: CompanySettings[] = JSON.parse(storedSettings);
            // Ensure allSettings is an array
            if (!Array.isArray(allSettings)) {
                allSettings = [allSettings];
            }
            const foundSettings = allSettings.find(s => s.id === companyId);
            if(foundSettings) {
                setSettings(foundSettings);
            }
        }
    } catch (error) {
        console.error("Could not access localStorage:", error);
    } finally {
        setIsLoading(false);
    }
  }, [companyId]);


  const handleSave = async () => {
    if (!company || !settings) return;

    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate save

    try {
        // Save Company Name
        const storedCompanies = localStorage.getItem(LOCAL_STORAGE_KEY_COMPANIES);
        let allCompanies: Company[] = storedCompanies ? JSON.parse(storedCompanies) : [];
        const companyIndex = allCompanies.findIndex(c => c.id === companyId);

        if (companyIndex > -1) {
            allCompanies[companyIndex] = {
                ...allCompanies[companyIndex],
                name: company.name,
            };
            localStorage.setItem(LOCAL_STORAGE_KEY_COMPANIES, JSON.stringify(allCompanies));
        }

        // Save Settings
        const storedSettings = localStorage.getItem(LOCAL_STORAGE_KEY_SETTINGS);
        let allSettings: CompanySettings[] = storedSettings ? JSON.parse(storedSettings) : [];
        if (!Array.isArray(allSettings)) {
            allSettings = []; // If it's not an array, start fresh to avoid errors
        }
        const settingsIndex = allSettings.findIndex(s => s.id === companyId);

        if (settingsIndex > -1) {
            allSettings[settingsIndex] = settings;
        } else {
            allSettings.push(settings);
        }
        localStorage.setItem(LOCAL_STORAGE_KEY_SETTINGS, JSON.stringify(allSettings));
        
        toast({
            title: '¡Guardado!',
            description: `La configuración de ${company?.name} ha sido actualizada.`,
        });
    } catch (error) {
        console.error("Error saving to localStorage:", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudieron guardar los cambios.',
        });
    } finally {
        setIsSaving(false);
        router.push('/admin');
    }
  };

  const handleRateChange = (field: keyof CompanySettings, value: string) => {
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue)) {
        setSettings({ ...settings, [field]: numericValue });
    } else if (value === '') {
        setSettings({ ...settings, [field]: 0 });
    }
  };


  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }

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
        </div>
      </header>

      <main className="space-y-8">
         <Card>
            <CardHeader>
                <CardTitle>Nombre de la Empresa</CardTitle>
            </CardHeader>
            <CardContent>
                <Input 
                    className="text-lg font-semibold leading-none tracking-tight"
                    value={company.name}
                    onChange={(e) => setCompany({...company, name: e.target.value})}
                />
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Configuración de Nómina</CardTitle>
                <CardDescription>Define cómo se calcularán y pagarán los períodos de trabajo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <Label className='text-base'>Frecuencia de Pago</Label>
                    <RadioGroup 
                        value={settings.payrollCycle} 
                        onValueChange={(value) => setSettings({...settings, payrollCycle: value as 'monthly' | 'bi-weekly' })}
                        className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4"
                    >
                        <Label className="flex flex-col items-start gap-4 rounded-lg border p-4 cursor-pointer hover:bg-accent transition-colors">
                            <div className='flex items-center gap-4'>
                                <RadioGroupItem value="monthly" id="monthly" />
                                <div className='text-left'>
                                    <p className="font-semibold">Mensual</p>
                                    <p className="text-sm text-muted-foreground">El período de pago cubre el mes calendario completo (día 1 al 30/31).</p>
                                </div>
                            </div>
                        </Label>
                         <Label className="flex flex-col items-start gap-4 rounded-lg border p-4 cursor-pointer hover:bg-accent transition-colors">
                            <div className='flex items-center gap-4'>
                                <RadioGroupItem value="bi-weekly" id="bi-weekly" />
                                <div className='text-left'>
                                    <p className="font-semibold">Quincenal</p>
                                    <p className="text-sm text-muted-foreground">Dos períodos por mes: del 1 al 15 y del 16 al fin de mes.</p>
                                </div>
                            </div>
                        </Label>
                    </RadioGroup>
                </div>
                 <div>
                    <Label htmlFor="nightShiftStartHour" className='text-base'>Inicio del Turno Nocturno (Hora)</Label>
                    <p className="text-sm text-muted-foreground">Define a partir de qué hora (0-23) se considera turno nocturno.</p>
                    <Input 
                        id="nightShiftStartHour"
                        type="number"
                        min="0"
                        max="23"
                        value={settings.nightShiftStartHour ?? 21}
                        onChange={(e) => {
                            const hour = parseInt(e.target.value);
                            if (hour >= 0 && hour <= 23) {
                                setSettings({...settings, nightShiftStartHour: hour});
                            }
                        }}
                        className="mt-2 max-w-[120px]"
                    />
                </div>
            </CardContent>
        </Card>
        
         <Card>
            <CardHeader>
                <CardTitle>Tarifas de Pago por Hora</CardTitle>
                <CardDescription>Define los valores para cada tipo de hora trabajada.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="dayRate">Hora Diurna</Label>
                    <Input type="number" id="dayRate" placeholder="0.00" value={settings.dayRate || ''} onChange={(e) => handleRateChange('dayRate', e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="nightRate">Hora Nocturna</Label>
                    <Input type="number" id="nightRate" placeholder="0.00" value={settings.nightRate || ''} onChange={(e) => handleRateChange('nightRate', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="dayOvertimeRate">Hora Extra Diurna</Label>
                    <Input type="number" id="dayOvertimeRate" placeholder="0.00" value={settings.dayOvertimeRate || ''} onChange={(e) => handleRateChange('dayOvertimeRate', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="nightOvertimeRate">Hora Extra Nocturna</Label>
                    <Input type="number" id="nightOvertimeRate" placeholder="0.00" value={settings.nightOvertimeRate || ''} onChange={(e) => handleRateChange('nightOvertimeRate', e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="holidayDayRate">Hora Festiva Diurna</Label>
                    <Input type="number" id="holidayDayRate" placeholder="0.00" value={settings.holidayDayRate || ''} onChange={(e) => handleRateChange('holidayDayRate', e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="holidayNightRate">Hora Festiva Nocturna</Label>
                    <Input type="number" id="holidayNightRate" placeholder="0.00" value={settings.holidayNightRate || ''} onChange={(e) => handleRateChange('holidayNightRate', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="holidayDayOvertimeRate">Hora Extra Festiva Diurna</Label>
                    <Input type="number" id="holidayDayOvertimeRate" placeholder="0.00" value={settings.holidayDayOvertimeRate || ''} onChange={(e) => handleRateChange('holidayDayOvertimeRate', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="holidayNightOvertimeRate">Hora Extra Festiva Nocturna</Label>
                    <Input type="number" id="holidayNightOvertimeRate" placeholder="0.00" value={settings.holidayNightOvertimeRate || ''} onChange={(e) => handleRateChange('holidayNightOvertimeRate', e.target.value)} />
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
      </main>
    </div>
  );
}
