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
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import type { Company, CompanySettings, Benefit, Deduction, CompanyItem } from '@/types/db-entities';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const LOCAL_STORAGE_KEY_COMPANIES = 'fake_companies_db';
const LOCAL_STORAGE_KEY_SETTINGS = 'fake_company_settings_db';
const LOCAL_STORAGE_KEY_BENEFITS = 'fake_company_benefits_db';
const LOCAL_STORAGE_KEY_DEDUCTIONS = 'fake_company_deductions_db';
const LOCAL_STORAGE_KEY_ITEMS = 'fake_company_items_db';


const initialSettings: Omit<CompanySettings, 'id'> = {
    payrollCycle: 'monthly',
    paymentModel: 'hourly',
    nightShiftStartHour: 21,
    dailyHourLimit: 8,
    dayRate: 0,
    nightRate: 0,
    dayOvertimeRate: 0,
    nightOvertimeRate: 0,
    holidayDayRate: 0,
    holidayNightRate: 0,
    holidayDayOvertimeRate: 0,
    holidayNightOvertimeRate: 0,
};

const initialBenefits: Omit<Benefit, 'id' | 'companyId'>[] = [
    { name: 'Subsidio de Transporte', type: 'fixed', value: 0, appliesTo: 'all' }
];

const initialDeductions: Omit<Deduction, 'id' | 'companyId'>[] = [
    { name: 'Salud', type: 'percentage', value: 4 },
    { name: 'Pensión', type: 'percentage', value: 4 }
];


export default function CompanySettingsPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.companyId as string;
  const { toast } = useToast();

  const [company, setCompany] = useState<Company | null>(null);
  const [settings, setSettings] = useState<CompanySettings>({ id: companyId, ...initialSettings });
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [items, setItems] = useState<CompanyItem[]>([]);

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
            if (!Array.isArray(allSettings)) {
                allSettings = [allSettings];
            }
            const foundSettings = allSettings.find(s => s.id === companyId);
            if(foundSettings) {
                setSettings(foundSettings);
            }
        }
        
        // Load Benefits
        const storedBenefits = localStorage.getItem(LOCAL_STORAGE_KEY_BENEFITS);
        const allBenefits: Benefit[] = storedBenefits ? JSON.parse(storedBenefits) : [];
        const companyBenefits = allBenefits.filter(b => b.companyId === companyId);
        if (companyBenefits.length > 0) {
            setBenefits(companyBenefits);
        } else {
             setBenefits(initialBenefits.map((b, i) => ({ ...b, id: `benefit_${Date.now()}_${i}`, companyId })));
        }

        // Load Deductions
        const storedDeductions = localStorage.getItem(LOCAL_STORAGE_KEY_DEDUCTIONS);
        const allDeductions: Deduction[] = storedDeductions ? JSON.parse(storedDeductions) : [];
        const companyDeductions = allDeductions.filter(d => d.companyId === companyId);
        if (companyDeductions.length > 0) {
            setDeductions(companyDeductions);
        } else {
            setDeductions(initialDeductions.map((d, i) => ({ ...d, id: `deduction_${Date.now()}_${i}`, companyId })));
        }

        // Load Items
        const storedItems = localStorage.getItem(LOCAL_STORAGE_KEY_ITEMS);
        const allItems: CompanyItem[] = storedItems ? JSON.parse(storedItems) : [];
        const companyItems = allItems.filter(item => item.companyId === companyId);
        setItems(companyItems);

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
            allSettings = [];
        }
        const settingsIndex = allSettings.findIndex(s => s.id === companyId);
        if (settingsIndex > -1) {
            allSettings[settingsIndex] = settings;
        } else {
            allSettings.push(settings);
        }
        localStorage.setItem(LOCAL_STORAGE_KEY_SETTINGS, JSON.stringify(allSettings));

        // Save Benefits
        const storedBenefits = localStorage.getItem(LOCAL_STORAGE_KEY_BENEFITS);
        let allBenefits: Benefit[] = storedBenefits ? JSON.parse(storedBenefits) : [];
        const otherCompanyBenefits = allBenefits.filter(b => b.companyId !== companyId);
        localStorage.setItem(LOCAL_STORAGE_KEY_BENEFITS, JSON.stringify([...otherCompanyBenefits, ...benefits]));

        // Save Deductions
        const storedDeductions = localStorage.getItem(LOCAL_STORAGE_KEY_DEDUCTIONS);
        let allDeductions: Deduction[] = storedDeductions ? JSON.parse(storedDeductions) : [];
        const otherCompanyDeductions = allDeductions.filter(d => d.companyId !== companyId);
        localStorage.setItem(LOCAL_STORAGE_KEY_DEDUCTIONS, JSON.stringify([...otherCompanyDeductions, ...deductions]));

        // Save Items
        const storedItems = localStorage.getItem(LOCAL_STORAGE_KEY_ITEMS);
        let allItems: CompanyItem[] = storedItems ? JSON.parse(storedItems) : [];
        const otherCompanyItems = allItems.filter(item => item.companyId !== companyId);
        localStorage.setItem(LOCAL_STORAGE_KEY_ITEMS, JSON.stringify([...otherCompanyItems, ...items]));
        
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

    const handleBenefitChange = (index: number, field: keyof Benefit, value: string | number) => {
        const updatedBenefits = [...benefits];
        (updatedBenefits[index] as any)[field] = value;
        setBenefits(updatedBenefits);
    };

    const addBenefit = () => {
        const newBenefit: Benefit = {
            id: `benefit_${Date.now()}`,
            companyId,
            name: '',
            type: 'fixed',
            value: 0,
            appliesTo: 'all'
        };
        setBenefits([...benefits, newBenefit]);
    };

    const removeBenefit = (index: number) => {
        const updatedBenefits = benefits.filter((_, i) => i !== index);
        setBenefits(updatedBenefits);
    };
  
  const handleDeductionChange = (index: number, value: string) => {
    const numericValue = parseFloat(value) || 0;
    const updatedDeductions = [...deductions];
    updatedDeductions[index].value = numericValue;
    setDeductions(updatedDeductions);
  };

  const handleItemChange = (index: number, field: keyof CompanyItem, value: string | boolean) => {
    const updatedItems = [...items];
    (updatedItems[index] as any)[field] = value;
    setItems(updatedItems);
  };

  const addItem = () => {
      const newItem: CompanyItem = {
          id: `item_${Date.now()}`,
          companyId,
          name: '',
          description: '',
          requiresSupervisor: false
      };
      setItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
      const updatedItems = items.filter((_, i) => i !== index);
      setItems(updatedItems);
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
                 <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
                    <div>
                        <Label htmlFor="nightShiftStartHour" className='text-base'>Inicio del Turno Nocturno (Hora)</Label>
                        <p className="text-sm text-muted-foreground">Hora (0-23) desde la que aplica el recargo nocturno.</p>
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
                     <div>
                        <Label htmlFor="dailyHourLimit" className='text-base'>Inicio de Horas Extra (Horas)</Label>
                         <p className="text-sm text-muted-foreground">Nº de horas diarias antes de contar como extra.</p>
                        <Input 
                            id="dailyHourLimit"
                            type="number"
                            min="1"
                            max="24"
                            value={settings.dailyHourLimit ?? 8}
                            onChange={(e) => {
                                const hour = parseInt(e.target.value);
                                if (hour > 0 && hour <= 24) {
                                    setSettings({...settings, dailyHourLimit: hour});
                                }
                            }}
                            className="mt-2 max-w-[120px]"
                        />
                    </div>
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

        <Card>
            <CardHeader>
                <CardTitle>Items de Producción y Condiciones Especiales</CardTitle>
                <CardDescription>Define opciones que el operador puede registrar, como el nombre de un supervisor, placa de vehículo, etc.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={addItem}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Añadir Item
                    </Button>
                </div>
                 {items.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 p-2 rounded-lg border bg-muted/50">
                        <div className="col-span-12 sm:col-span-5">
                            <Label htmlFor={`item-name-${item.id}`}>Nombre del Item</Label>
                            <Input
                                id={`item-name-${item.id}`}
                                value={item.name}
                                onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                                placeholder="Ej: Supervisor de Turno"
                            />
                        </div>
                        <div className="col-span-12 sm:col-span-5">
                             <Label htmlFor={`item-desc-${item.id}`}>Descripción (Opcional)</Label>
                            <Input
                                id={`item-desc-${item.id}`}
                                value={item.description}
                                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                placeholder="Instrucciones para el operador"
                            />
                        </div>
                        <div className="col-span-12 sm:col-span-2 flex items-center justify-between pt-5">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id={`item-supervisor-${item.id}`}
                                    checked={item.requiresSupervisor}
                                    onCheckedChange={(checked) => handleItemChange(index, 'requiresSupervisor', !!checked)}
                                />
                                <Label htmlFor={`item-supervisor-${item.id}`} className="text-sm font-normal">Requiere Supervisor</Label>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeItem(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    </div>
                ))}
                {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No hay items definidos para esta empresa.</p>}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Deducciones y Beneficios</CardTitle>
                <CardDescription>Configura subsidios y descuentos de ley para la empresa.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4 p-4 border rounded-lg">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold">Beneficios (Subsidios)</h3>
                        <Button variant="outline" size="sm" onClick={addBenefit}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Añadir Beneficio
                        </Button>
                    </div>
                    {benefits.map((benefit, index) => (
                        <div key={benefit.id} className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 p-2 rounded-lg bg-muted/50">
                            <div className="col-span-12 sm:col-span-4">
                                <Label htmlFor={`benefit-name-${benefit.id}`}>Nombre</Label>
                                <Input
                                    id={`benefit-name-${benefit.id}`}
                                    value={benefit.name}
                                    onChange={(e) => handleBenefitChange(index, 'name', e.target.value)}
                                    placeholder="Ej: Subsidio de Transporte"
                                />
                            </div>
                            <div className="col-span-6 sm:col-span-3">
                                <Label htmlFor={`benefit-type-${benefit.id}`}>Tipo</Label>
                                <Select
                                    value={benefit.type}
                                    onValueChange={(value: 'fixed' | 'percentage' | 'per-hour') => handleBenefitChange(index, 'type', value)}
                                >
                                    <SelectTrigger id={`benefit-type-${benefit.id}`}>
                                        <SelectValue placeholder="Selecciona un tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fixed">Fijo</SelectItem>
                                        <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                                        <SelectItem value="per-hour">Por Hora</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-6 sm:col-span-3">
                                <Label htmlFor={`benefit-value-${benefit.id}`}>Valor</Label>
                                <Input
                                    id={`benefit-value-${benefit.id}`}
                                    type="number"
                                    value={benefit.value}
                                    onChange={(e) => handleBenefitChange(index, 'value', parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="col-span-12 sm:col-span-2 flex items-end justify-end">
                                <Button variant="ghost" size="icon" onClick={() => removeBenefit(index)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </div>
                    ))}
                     {benefits.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No hay beneficios definidos.</p>}
                </div>

                 <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-semibold">Deducciones de Ley</h3>
                     {deductions.map((deduction, index) => (
                        <div key={deduction.id} className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor={`deduction-${deduction.id}`} className="text-right">{deduction.name}</Label>
                            <div className='col-span-2 flex items-center gap-2'>
                                <Input 
                                    type="number" 
                                    id={`deduction-${deduction.id}`} 
                                    value={deduction.value}
                                    onChange={(e) => handleDeductionChange(index, e.target.value)}
                                    placeholder="0.0"
                                />
                                 {deduction.type === 'fixed' && <span className='text-muted-foreground'>COP</span>}
                                {deduction.type === 'percentage' && <span className='text-muted-foreground'>%</span>}
                            </div>
                        </div>
                    ))}
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
