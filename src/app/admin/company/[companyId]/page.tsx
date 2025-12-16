

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Loader2, Upload, Info, Package, Clock, CalendarDays } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import type { Company, CompanySettings } from '@/types/db-entities';
import { TimeInput } from '@/components/TimeInput';
import { Switch } from '@/components/ui/switch';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { RateInput } from './RateInput';


const LOCAL_STORAGE_KEY_COMPANIES = 'fake_companies_db';
const LOCAL_STORAGE_KEY_SETTINGS = 'fake_company_settings_db';


export default function CompanySettingsPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.companyId as string;
  const { toast } = useToast();

  const [company, setCompany] = useState<Company | null>(null);
  const [settings, setSettings] = useState<Partial<CompanySettings>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
        const storedCompanies = localStorage.getItem(LOCAL_STORAGE_KEY_COMPANIES);
        if (storedCompanies) {
            const allCompanies: Company[] = JSON.parse(storedCompanies);
            const foundCompany = allCompanies.find(c => c.id === companyId);
            if (foundCompany) {
                setCompany(foundCompany);
                setLogoPreview(foundCompany.logoUrl || null);
            }
        }

        const storedSettings = localStorage.getItem(LOCAL_STORAGE_KEY_SETTINGS);
        const allSettings: {[key: string]: CompanySettings} = storedSettings ? JSON.parse(storedSettings) : {};
        const companySettings = allSettings[companyId];

        if (companySettings) {
            setSettings(companySettings);
        } else {
            // Set default values for new companies
            setSettings({ payrollCycle: 'monthly', paymentModel: 'hourly', payrollCycleType: 'automatic' });
        }


    } catch (error) {
        console.error("Could not access localStorage:", error);
    } finally {
        setIsLoading(false);
    }
  }, [companyId]);

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

  const handleStringSettingChange = (name: keyof CompanySettings, value: string) => {
    setSettings(prev => ({ ...prev, [name]: value }));
  }

  const handleNumericSettingChange = (name: keyof CompanySettings, value: number | undefined) => {
    setSettings(prev => ({...prev, [name]: value }))
  }
  
  const handleRadioGroupChange = (name: keyof CompanySettings, value: string) => {
    setSettings(prev => ({ ...prev, [name]: value }));
  }


  const handleSave = async () => {
    if (!company) return;

    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate save

    try {
        const storedCompanies = localStorage.getItem(LOCAL_STORAGE_KEY_COMPANIES);
        let allCompanies: Company[] = storedCompanies ? JSON.parse(storedCompanies) : [];
        const companyIndex = allCompanies.findIndex(c => c.id === companyId);

        if (companyIndex > -1) {
            allCompanies[companyIndex] = {
                ...allCompanies[companyIndex],
                name: company.name,
                themeColor: company.themeColor,
                logoUrl: logoPreview || company.logoUrl,
            };
            localStorage.setItem(LOCAL_STORAGE_KEY_COMPANIES, JSON.stringify(allCompanies));
        }
        
        const storedSettings = localStorage.getItem(LOCAL_STORAGE_KEY_SETTINGS);
        let allSettings: { [key: string]: Partial<CompanySettings> } = storedSettings ? JSON.parse(storedSettings) : {};
        
        // Ensure all settings are included
        const updatedSettings: Partial<CompanySettings> = { 
            id: companyId,
            payrollCycle: settings.payrollCycle || 'monthly',
            payrollCycleType: settings.payrollCycleType || 'automatic',
            monthlyStartDay: settings.monthlyStartDay,
            monthlyEndDay: settings.monthlyEndDay,
            biweeklyFirstStartDay: settings.biweeklyFirstStartDay,
            biweeklyFirstEndDay: settings.biweeklyFirstEndDay,
            biweeklySecondStartDay: settings.biweeklySecondStartDay,
            biweeklySecondEndDay: settings.biweeklySecondEndDay,
            paymentModel: settings.paymentModel || 'hourly',
            nightShiftStart: settings.nightShiftStart,
            normalWorkHours: settings.normalWorkHours,
            dayRate: settings.dayRate,
            nightRate: settings.nightRate,
            dayOvertimeRate: settings.dayOvertimeRate,
            nightOvertimeRate: settings.nightOvertimeRate,
            holidayDayRate: settings.holidayDayRate,
            holidayNightRate: settings.holidayNightRate,
            holidayDayOvertimeRate: settings.holidayDayOvertimeRate,
            holidayNightOvertimeRate: settings.holidayNightOvertimeRate,
        };
        
        allSettings[companyId] = updatedSettings;
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

  const handleThemeColorChange = (value: string) => {
    if (company) {
        setCompany({...company, themeColor: value});
    }
  }

  const paymentModel = settings.paymentModel || 'hourly';
  const payrollCycle = settings.payrollCycle || 'monthly';
  const payrollCycleType = settings.payrollCycleType || 'automatic';

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
    <TooltipProvider>
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <Button variant="ghost" onClick={() => router.push('/admin')} className="mb-4">
            <ArrowLeft className="mr-2" />
            Volver al listado
          </Button>
          <h1 className="text-3xl font-bold">Configuración de la Empresa</h1>
          <Input 
             className="text-2xl font-semibold leading-none tracking-tight border-0 shadow-none focus-visible:ring-0 p-0 h-auto"
             value={company.name}
             onChange={(e) => setCompany({...company, name: e.target.value})}
          />
        </div>
      </header>

      <main className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">

             <Card>
                <CardHeader>
                    <CardTitle>Configuración General</CardTitle>
                    <CardDescription>Define la regla principal de pago para esta empresa.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div>
                        <Label className="text-base font-semibold">Modelo de Pago</Label>
                        <p className="text-sm text-muted-foreground mb-4">Define cómo se calcularán los pagos para los operadores.</p>
                        <RadioGroup 
                            value={paymentModel} 
                            onValueChange={(value) => handleRadioGroupChange('paymentModel', value)}
                        >
                            <div className="flex items-start space-x-2">
                                <RadioGroupItem value="hourly" id="hourly" />
                                <div className='grid gap-1.5'>
                                    <Label htmlFor="hourly" className='font-bold'>Pago por Hora</Label>
                                    <p className="text-sm text-muted-foreground">
                                        El pago se basa en las horas trabajadas (diurnas, nocturnas, extras, festivas).
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-2 mt-4">
                                <RadioGroupItem value="production" id="production" />
                                <div className='grid gap-1.5'>
                                    <Label htmlFor="production" className='font-bold'>Pago por Producción</Label>
                                    <p className="text-sm text-muted-foreground">
                                        El pago se basa en unidades de trabajo completadas (ítems).
                                    </p>
                                </div>
                            </div>
                        </RadioGroup>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Configuración de Nómina</CardTitle>
                    <CardDescription>Establece los períodos de pago para el cálculo de la nómina.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <Label className="text-base font-semibold">Frecuencia de Pago</Label>
                        <p className="text-sm text-muted-foreground mb-4">Establece si el ciclo de pago es mensual o quincenal.</p>
                        <RadioGroup 
                            value={payrollCycle} 
                            onValueChange={(value) => handleRadioGroupChange('payrollCycle', value)}
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="monthly" id="monthly" />
                                <Label htmlFor="monthly">Mensual</Label>
                            </div>
                            <div className="flex items-center space-x-2 mt-2">
                                <RadioGroupItem value="bi-weekly" id="bi-weekly" />
                                <Label htmlFor="bi-weekly">Quincenal</Label>
                            </div>
                        </RadioGroup>
                    </div>
                    <Separator/>
                    <div>
                        <Label className="text-base font-semibold">Definición del Ciclo</Label>
                        <p className="text-sm text-muted-foreground mb-4">Define cómo se determinan los días de inicio y fin del período.</p>
                        <RadioGroup 
                            value={payrollCycleType} 
                            onValueChange={(value) => handleRadioGroupChange('payrollCycleType', value)}
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="automatic" id="automatic" />
                                <Label htmlFor="automatic">Automático</Label>
                            </div>
                            <div className="flex items-center space-x-2 mt-2">
                                <RadioGroupItem value="manual" id="manual" />
                                <Label htmlFor="manual">Manual</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {payrollCycleType === 'manual' && payrollCycle === 'monthly' && (
                        <div className="grid grid-cols-2 gap-4 border p-4 rounded-md">
                            <h4 className="col-span-2 font-semibold text-sm mb-2">Período Mensual Manual</h4>
                            <div className="grid gap-1.5">
                                <Label htmlFor="monthlyStartDay">Día de Inicio</Label>
                                <Input id="monthlyStartDay" type="number" min="1" max="31" value={settings.monthlyStartDay || ''} onChange={(e) => handleNumericSettingChange('monthlyStartDay', parseInt(e.target.value))} />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="monthlyEndDay">Día de Fin</Label>
                                <Input id="monthlyEndDay" type="number" min="1" max="31" value={settings.monthlyEndDay || ''} onChange={(e) => handleNumericSettingChange('monthlyEndDay', parseInt(e.target.value))} />
                            </div>
                        </div>
                    )}

                    {payrollCycleType === 'manual' && payrollCycle === 'bi-weekly' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 border p-4 rounded-md">
                                <h4 className="col-span-2 font-semibold text-sm mb-2">Primera Quincena</h4>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="biweeklyFirstStartDay">Día de Inicio</Label>
                                    <Input id="biweeklyFirstStartDay" type="number" min="1" max="31" value={settings.biweeklyFirstStartDay || ''} onChange={(e) => handleNumericSettingChange('biweeklyFirstStartDay', parseInt(e.target.value))} />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="biweeklyFirstEndDay">Día de Fin</Label>
                                    <Input id="biweeklyFirstEndDay" type="number" min="1" max="31" value={settings.biweeklyFirstEndDay || ''} onChange={(e) => handleNumericSettingChange('biweeklyFirstEndDay', parseInt(e.target.value))} />
                                </div>
                            </div>
                             <div className="grid grid-cols-2 gap-4 border p-4 rounded-md">
                                <h4 className="col-span-2 font-semibold text-sm mb-2">Segunda Quincena</h4>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="biweeklySecondStartDay">Día de Inicio</Label>
                                    <Input id="biweeklySecondStartDay" type="number" min="1" max="31" value={settings.biweeklySecondStartDay || ''} onChange={(e) => handleNumericSettingChange('biweeklySecondStartDay', parseInt(e.target.value))} />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="biweeklySecondEndDay">Día de Fin</Label>
                                    <Input id="biweeklySecondEndDay" type="number" min="1" max="31" value={settings.biweeklySecondEndDay || ''} onChange={(e) => handleNumericSettingChange('biweeklySecondEndDay', parseInt(e.target.value))} />
                                </div>
                            </div>
                        </div>
                    )}

                </CardContent>
            </Card>
            
            {paymentModel === 'hourly' && (
                <>
                <Card>
                    <CardHeader>
                        <CardTitle>Reglas de Horario</CardTitle>
                        <CardDescription>Establece los parámetros para el cálculo de horas.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        <div className='grid gap-2'>
                            <Label>Inicio de Horario Nocturno</Label>
                            <div className='flex items-center gap-4'>
                            <TimeInput 
                            label="Inicio de Horario Nocturno"
                            value={settings.nightShiftStart || '21:00'}
                            onChange={(value) => handleStringSettingChange('nightShiftStart', value)}
                            />
                            </div>
                        </div>
                         <div className='grid gap-2'>
                            <Label htmlFor="normal-work-hours">Inicio de Horas Extras (después de...)</Label>
                            <div className='flex items-center gap-2'>
                            <Input 
                                id="normal-work-hours"
                                type="number"
                                value={settings.normalWorkHours || 8}
                                onChange={(e) => handleNumericSettingChange('normalWorkHours', parseFloat(e.target.value) || undefined)}
                                className="max-w-[80px]"
                                />
                                <span className="text-sm text-muted-foreground">horas</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                </>
            )}

             {paymentModel === 'hourly' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Tarifas de Pago por Hora</CardTitle>
                        <CardDescription>Define el valor a pagar por cada tipo de hora trabajada.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        <RateInput 
                            label="Hora Diurna"
                            value={settings.dayRate}
                            onValueChange={(value) => handleNumericSettingChange('dayRate', value)}
                        />
                        <RateInput 
                            label="Hora Nocturna"
                            value={settings.nightRate}
                            onValueChange={(value) => handleNumericSettingChange('nightRate', value)}
                        />
                        <RateInput 
                            label="Hora Extra Diurna"
                            value={settings.dayOvertimeRate}
                            onValueChange={(value) => handleNumericSettingChange('dayOvertimeRate', value)}
                        />
                        <RateInput 
                            label="Hora Extra Nocturna"
                            value={settings.nightOvertimeRate}
                            onValueChange={(value) => handleNumericSettingChange('nightOvertimeRate', value)}
                        />
                        <Separator className="md:col-span-2 my-2"/>
                         <RateInput 
                            label="Hora Diurna Festiva"
                            value={settings.holidayDayRate}
                            onValueChange={(value) => handleNumericSettingChange('holidayDayRate', value)}
                        />
                         <RateInput 
                            label="Hora Nocturna Festiva"
                            value={settings.holidayNightRate}
                            onValueChange={(value) => handleNumericSettingChange('holidayNightRate', value)}
                        />
                         <RateInput 
                            label="Hora Extra Diurna Festiva"
                            value={settings.holidayDayOvertimeRate}
                            onValueChange={(value) => handleNumericSettingChange('holidayDayOvertimeRate', value)}
                        />
                         <RateInput 
                            label="Hora Extra Nocturna Festiva"
                            value={settings.holidayNightOvertimeRate}
                            onValueChange={(value) => handleNumericSettingChange('holidayNightOvertimeRate', value)}
                        />
                    </CardContent>
                </Card>
             )}
            
            {paymentModel === 'production' && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Ítems de Producción</CardTitle>
                        <CardDescription>Define los productos o servicios que los operadores pueden registrar.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href={`/admin/company/${companyId}/items`} passHref>
                            <Button variant="outline">
                                <Package className="mr-2" />
                                Gestionar Ítems
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            )}

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
                            <Input id="theme-color" type="color" value={company.themeColor || ''} onChange={(e) => handleThemeColorChange(e.target.value)} className="w-12 h-10 p-1"/>
                            <Input type="text" value={company.themeColor || ''} onChange={(e) => handleThemeColorChange(e.target.value)} placeholder="#RRGGBB" />
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
    </TooltipProvider>
  );
}
