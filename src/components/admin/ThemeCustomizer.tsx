'use client';

import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Paintbrush, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

// Defines the structure for a color theme, using HSL string values
type ColorTheme = {
  name: string;
  primary: string;
  primaryForeground: string;
  accent: string;
  color: string; // The raw color for the button background
};

// A list of predefined themes
const themes: ColorTheme[] = [
  { name: 'blue', primary: '210 90% 50%', primaryForeground: '210 40% 98%', accent: '210 40% 94%', color: 'hsl(210, 90%, 50%)' },
  { name: 'emerald', primary: '142.1 76.2% 36.3%', primaryForeground: '142.1 76.2% 96.3%', accent: '142.1 40% 94%', color: 'hsl(142.1, 76.2%, 36.3%)' },
  { name: 'violet', primary: '262.1 83.3% 57.8%', primaryForeground: '262.1 83.3% 97.8%', accent: '262.1 40% 94%', color: 'hsl(262.1, 83.3%, 57.8%)' },
  { name: 'red', primary: '0 72.2% 50.6%', primaryForeground: '0 84.2% 95.9%', accent: '0 40% 94%', color: 'hsl(0, 72.2%, 50.6%)' },
];

export function ThemeCustomizer() {
  const [mounted, setMounted] = useState(false);
  const [activeTheme, setActiveTheme] = useState(themes[0]);

  // Apply the theme and save it to localStorage
  const applyTheme = (theme: ColorTheme) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--primary-foreground', theme.primaryForeground);
    root.style.setProperty('--accent', theme.accent);
    // Also update the ring color to match the new primary color
    root.style.setProperty('--ring', theme.primary);

    localStorage.setItem('color-theme', theme.name);
    setActiveTheme(theme);
  };

  // On component mount, load the saved theme from localStorage
  useEffect(() => {
    setMounted(true);
    const storedThemeName = localStorage.getItem('color-theme');
    const savedTheme = themes.find(t => t.name === storedThemeName) || themes[0];
    if (savedTheme) {
        applyTheme(savedTheme);
    }
  }, []);

  // Avoid rendering on the server to prevent hydration mismatches
  if (!mounted) {
    return null;
  }

  return (
    <Popover>
        <PopoverTrigger asChild>
            <Button variant="outline" size="icon" title="Cambiar Paleta de Colores">
                <Paintbrush className="h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">Cambiar Paleta de Colores</span>
            </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto">
            <div className="space-y-4">
                <Label>Paleta de Colores</Label>
                <div className="flex gap-4">
                    {themes.map((theme) => {
                        const isActive = activeTheme.name === theme.name;
                        return (
                        <button
                            key={theme.name}
                            onClick={() => applyTheme(theme)}
                            className={cn(
                            'h-10 w-10 rounded-full flex items-center justify-center ring-2 ring-transparent ring-offset-2 ring-offset-background transition-all',
                            isActive && 'ring-primary'
                            )}
                            style={{ backgroundColor: theme.color }}
                            aria-label={`Seleccionar tema ${theme.name}`}
                        >
                            {isActive && <Check className="h-6 w-6 text-primary-foreground" />}
                        </button>
                        );
                    })}
                </div>
            </div>
        </PopoverContent>
    </Popover>
  );
}
