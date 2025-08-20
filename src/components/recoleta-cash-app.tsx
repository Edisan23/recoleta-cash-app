"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Download, Moon, Sun, Trash2 } from 'lucide-react';
import html2canvas from 'html2canvas';

interface Entry {
  id: number;
  name: string;
  amount: number;
}

export function RecoletaCashApp() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [nextId, setNextId] = useState(1);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    try {
      const savedEntries = localStorage.getItem('recoleta-cash-entries');
      if (savedEntries) {
        const parsedEntries: Entry[] = JSON.parse(savedEntries);
        setEntries(parsedEntries);
        if (parsedEntries.length > 0) {
          setNextId(Math.max(...parsedEntries.map(e => e.id)) + 1);
        }
      }
      const savedTheme = localStorage.getItem('recoleta-cash-theme');
      if (savedTheme) {
        const newIsDarkMode = savedTheme === 'dark';
        setIsDarkMode(newIsDarkMode);
        document.documentElement.classList.toggle('dark', newIsDarkMode);
      } else {
        document.documentElement.classList.toggle('dark', isDarkMode);
      }
    } catch (error) {
      console.error("Error loading data from localStorage", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('recoleta-cash-entries', JSON.stringify(entries));
    } catch (error) {
      console.error("Error saving data to localStorage", error);
    }
  }, [entries]);

  useEffect(() => {
    try {
       localStorage.setItem('recoleta-cash-theme', isDarkMode ? 'dark' : 'light');
       document.documentElement.classList.toggle('dark', isDarkMode);
    } catch (error) {
      console.error("Error saving theme to localStorage", error);
    }
  }, [isDarkMode]);


  const presetAmounts = [10000, 20000, 30000, 40000];

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && amount) {
      setEntries([...entries, { id: nextId, name: name.trim(), amount: Number(amount) }]);
      setNextId(nextId + 1);
      setName('');
      setAmount('');
    }
  };
  
  const handleRemoveEntry = (id: number) => {
    setEntries(entries.filter(entry => entry.id !== id));
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  }

  const handleDownload = async () => {
    const printableArea = document.getElementById('printable-area');
    if (printableArea) {
      // Add a class to hide elements during image generation
      document.body.classList.add('generating-image');
      
      try {
        const canvas = await html2canvas(printableArea, {
          backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff',
          scale: 2,
          useCORS: true,
        });
        
        const link = document.createElement('a');
        link.download = 'lista-aportes.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (error) {
        console.error('Error generating image:', error);
      } finally {
        // Remove the class after image generation
        document.body.classList.remove('generating-image');
      }
    }
  };

  const totalAmount = entries.reduce((sum, entry) => sum + entry.amount, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <div className="container mx-auto p-4 sm:p-6 md:p-8">
        <header className="no-print flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
          <h1 className="text-4xl md:text-5xl font-headline text-primary text-center sm:text-left">
            Recoleta Cash
          </h1>
          <div className="flex items-center gap-2 justify-center sm:justify-end">
             <Button onClick={toggleTheme} size="icon" variant="outline">
              {isDarkMode ? <Sun /> : <Moon />}
            </Button>
            <Button onClick={handleDownload} size="icon" variant="outline">
              <Download />
            </Button>
          </div>
        </header>

        <main className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 no-print">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Agregar Aporte</CardTitle>
                <CardDescription>
                  Completa los datos para añadir un nuevo aporte a la lista.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleAddEntry}>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-base">Nombre</Label>
                    <Input id="name" placeholder="Ej: Juan Pérez" value={name} onChange={(e) => setName(e.target.value)} required className="text-base"/>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-base">Monto</Label>
                    <Input id="amount" type="number" placeholder="Ej: 20000" value={amount} onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))} required className="text-base"/>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">O selecciona un monto predefinido:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {presetAmounts.map((preset) => (
                        <Button key={preset} variant="outline" type="button" onClick={() => setAmount(preset)}>
                          {formatCurrency(preset)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" size="lg">Agregar a la lista</Button>
                </CardFooter>
              </form>
            </Card>
          </div>

          <div id="printable-area" className="lg:col-span-2">
            <Card className="shadow-lg h-full">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Lista de Aportes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60%] text-base">Nombre</TableHead>
                        <TableHead className="text-right text-base">Monto</TableHead>
                        <TableHead className="text-right text-base no-print">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.length > 0 ? (
                        entries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-medium">{entry.name}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(entry.amount)}</TableCell>
                            <TableCell className="text-right no-print">
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveEntry(entry.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                            Aún no hay aportes registrados.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                    {entries.length > 0 && (
                      <TableFooter>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-base">Total</TableHead>
                          <TableHead className="no-print" />
                          <TableHead className="text-right text-base font-bold font-mono">{formatCurrency(totalAmount)}</TableHead>
                        </TableRow>
                      </TableFooter>
                    )}
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
