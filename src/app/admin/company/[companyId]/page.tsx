
'use client';

import { useState, useEffect } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Loader2, Upload, Info } from 'lucide-react';
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


const LOCAL_STORAGE_KEY_COMPANIES = 'fake_companies_db';
const LOCAL_STORAGE_KEY_SETTINGS = 'fake_company_settings_db';

type EnabledFields = {
    [K in keyof Omit<CompanySettings, 'id' | 'payrollCycle' | 'nightShiftStart' | 'paymentModel'>]?: boolean;
};

const settingLabels: { [key in keyof EnabledFields]: string } = {
    dayRate: 'Hora Diurna',
    nightRate: 'Hora Nocturna',
    dayOvertimeRate: 'Hora Extra Diurna',
    nightOvertimeRate: 'Hora Extra Nocturna',
    holidayDayRate: 'Hora Festiva Diurna',
    holidayNightRate: 'Hora Festiva Nocturna',
    holidayDayOvertimeRate: 'Hora Extra Festiva Diurna',
    holidayNightOvertimeRate: 'Hora Extra Festiva Nocturna',
    transportSubsidy: 'Subsidio de Transporte',
    otherSubsidies: 'Otros Subsidios',
    healthDeduction: 'Salud (%)',
    pensionDeduction: 'Pensión (%)',
    arlDeduction: 'ARL (%)',
    familyCompensationDeduction: 'Caja Compensación (%)',
    taxWithholding: 'Retención en la Fuente (%)',
    solidarityFundDeduction: 'Fondo de Solidaridad (%)',
};


export default function CompanySettingsPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.companyId as string;
  const { toast } = useToast();

  const [company, setCompany] = useState<Company | null>(null);
  const [settings, setSettings] = useState<Partial<CompanySettings>>({});
  const [enabledFields, setEnabledFields] = useState<EnabledFields>({});
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
            
            const initialEnabled: EnabledFields = {};
            for (const key in settingLabels) {
                if (Object.prototype.hasOwnProperty.call(settingLabels, key)) {
                    const settingKey = key as keyof EnabledFields;
                    initialEnabled[settingKey] = companySettings[settingKey] != null;
                }
            }
            setEnabledFields(initialEnabled);
        } else {
             // If no settings, enable all by default
            const allEnabled: EnabledFields = {};
            for (const key in settingLabels) {
                allEnabled[key as keyof EnabledFields] = true;
            }
            setEnabledFields(allEnabled);
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
  
  const handleSwitchChange = (field: keyof EnabledFields, checked: boolean) => {
    setEnabledFields(prev => ({ ...prev, [field]: checked }));
    if (!checked) {
      setSettings(prev => {
        const newSettings = { ...prev };
        newSettings[field] = undefined; 
        return newSettings;
      });
    }
  };


  const handleSettingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value === '' ? undefined : parseFloat(value) }));
  }

  const handleStringSettingChange = (name: keyof CompanySettings, value: string) => {
    setSettings(prev => ({ ...prev, [name]: value }));
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
        
        const activeSettings: Partial<CompanySettings> = { 
            id: companyId, 
            payrollCycle: settings.payrollCycle, 
            nightShiftStart: settings.nightShiftStart,
            paymentModel: settings.paymentModel || 'hourly'
        };

        for (const key in enabledFields) {
            const settingKey = key as keyof EnabledFields;
            if (enabledFields[settingKey]) {
                if (settings[settingKey] !== undefined) {
                    (activeSettings as any)[settingKey] = settings[settingKey];
                }
            } else {
                (activeSettings as any)[settingKey] = null;
            }
        }
        
        allSettings[companyId] = activeSettings;
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

  const renderSettingInput = (key: keyof EnabledFields, tooltip?: string) => {
    const label = settingLabels[key];
    return (
      <div key={key} className="grid gap-3">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                 <Label htmlFor={key} className={!enabledFields[key] ? 'text-muted-foreground' : ''}>{label}</Label>
                 {tooltip && (
                    <Tooltip>
                        <TooltipTrigger><Info className="w-4 h-4 text-muted-foreground"/></TooltipTrigger>
                        <TooltipContent><p>{tooltip}</p></TooltipContent>
                    </Tooltip>
                 )}
            </div>
            <Switch
                id={`switch-${key}`}
                checked={enabledFields[key] || false}
                onCheckedChange={(checked) => handleSwitchChange(key, checked)}
            />
        </div>
        <Input
          id={key}
          name={key}
          type="number"
          placeholder="0.00"
          value={settings[key] || ''}
          onChange={handleSettingChange}
          disabled={!enabledFields[key]}
          className="transition-opacity"
        />
      </div>
    );
  };
  
  const paymentModel = settings.paymentModel || 'hourly';

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
                    <CardTitle>Modelo de Pago</CardTitle>
                    <CardDescription>Define cómo se calcularán los pagos para los operadores de esta empresa.</CardDescription>
                </CardHeader>
                <CardContent>
                    <RadioGroup 
                        value={paymentModel} 
                        onValueChange={(value) => handleRadioGroupChange('paymentModel', value)}
                    >
                        <div className="flex items-start space-x-2">
                            <RadioGroupItem value="hourly" id="hourly" />
                            <div className='grid gap-1.5'>
                                <Label htmlFor="hourly" className='font-bold'>Pago por Hora</Label>
                                <p className="text-sm text-muted-foreground">
                                    El pago se basa en las horas trabajadas (diurnas, nocturnas, extras, festivas). Ideal para roles de vigilancia, servicios generales, etc.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-2 mt-4">
                            <RadioGroupItem value="production" id="production" />
                             <div className='grid gap-1.5'>
                                <Label htmlFor="production" className='font-bold'>Pago por Producción</Label>
                                 <p className="text-sm text-muted-foreground">
                                    El pago se basa en unidades de trabajo completadas (ej: bultos movidos, viajes realizados, obra terminada). Los ítems y sus valores se definen en otra sección.
                                </p>
                            </div>
                        </div>
                    </RadioGroup>
                </CardContent>
            </Card>


            {paymentModel === 'hourly' && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Tarifas de Pago por Hora</CardTitle>
                        <CardDescription>Activa y define los valores por hora para los diferentes tipos de turno.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <fieldset className="space-y-6 p-4 border rounded-lg">
                            <legend className="text-lg font-medium px-1 mb-4">Horario Normal</legend>
                            {renderSettingInput('dayRate')}
                            {renderSettingInput('nightRate')}
                            {renderSettingInput('dayOvertimeRate')}
                            {renderSettingInput('nightOvertimeRate')}
                        </fieldset>
                        <fieldset className="space-y-6 p-4 border rounded-lg">
                            <legend className="text-lg font-medium px-1 mb-4">Horario Festivo</legend>
                            {renderSettingInput('holidayDayRate')}
                            {renderSettingInput('holidayNightRate')}
                            {renderSettingInput('holidayDayOvertimeRate')}
                            {renderSettingInput('holidayNightOvertimeRate')}
                        </fieldset>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Deducciones y Subsidios</CardTitle>
                    <CardDescription>Activa y configura los porcentajes de deducción y los montos fijos de subsidios. Aplican a todos los modelos de pago.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <fieldset className="space-y-6 p-4 border rounded-lg">
                        <legend className="text-lg font-medium px-1 mb-4">Deducciones Legales (%)</legend>
                        {renderSettingInput('healthDeduction')}
                        {renderSettingInput('pensionDeduction')}
                        {renderSettingInput('arlDeduction')}
                        {renderSettingInput('familyCompensationDeduction')}
                        {renderSettingInput('taxWithholding')}
                        {renderSettingInput('solidarityFundDeduction', 'Se aplica a salarios de 4 SMMLV o más.')}
                    </fieldset>
                     <fieldset className="space-y-6 p-4 border rounded-lg">
                        <legend className="text-lg font-medium px-1 mb-4">Subsidios (Monto Fijo)</legend>
                        {renderSettingInput('transportSubsidy')}
                    </fieldset>
                </CardContent>
            </Card>


            <Card>
                <CardHeader>
                    <CardTitle>Configuración de Nómina</CardTitle>
                    <CardDescription>Establece las reglas generales de la nómina.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     <RadioGroup 
                        value={settings.payrollCycle || 'fortnightly'} 
                        onValueChange={(value) => handleRadioGroupChange('payrollCycle', value as 'monthly' | 'fortnightly')}
                    >
                        <Label>Frecuencia de Pago</Label>
                        <div className="flex items-center space-x-2 mt-2">
                            <RadioGroupItem value="fortnightly" id="fortnightly" />
                            <Label htmlFor="fortnightly">Quincenal</Label>
                        </div>
                        <p className="text-xs text-muted-foreground ml-6">
                            La primera quincena va del día 1 al 15. La segunda, del 16 a fin de mes.
                        </p>
                        <div className="flex items-center space-x-2 mt-4">
                            <RadioGroupItem value="monthly" id="monthly" />
                            <Label htmlFor="monthly">Mensual</Label>
                        </div>
                         <p className="text-xs text-muted-foreground ml-6">
                            El ciclo va desde el primer hasta el último día del mes.
                        </p>
                    </RadioGroup>
                    
                    {paymentModel === 'hourly' && (
                        <>
                        <Separator />
                        <div className='grid gap-2'>
                            <Label>Inicio de Horario Nocturno</Label>
                            <div className='flex items-center gap-4'>
                            <TimeInput 
                            label="Inicio de Horario Nocturno"
                            value={settings.nightShiftStart || '21:00'}
                            onChange={(value) => handleStringSettingChange('nightShiftStart', value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Hora a partir de la cual se considera turno nocturno (formato 24h). Por defecto 21:00.
                            </p>
                            </div>
                        </div>
                        </>
                    )}
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
