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
  muted: string;
  border: string;
  color: string; // The raw color for the button background
};

// A list of predefined themes
const themes: ColorTheme[] = [
  { name: 'blue', primary: '210 90% 50%', primaryForeground: '210 40% 98%', accent: '210 40% 94%', muted: '210 40% 92%', border: '210 32% 91%', color: 'hsl(210, 90%, 50%)' },
  { name: 'emerald', primary: '142.1 76.2% 36.3%', primaryForeground: '142.1 76.2% 96.3%', accent: '142.1 40% 94%', muted: '142.1 40% 92%', border: '142.1 32% 91%', color: 'hsl(142.1, 76.2%, 36.3%)' },
  { name: 'violet', primary: '262.1 83.3% 57.8%', primaryForeground: '262.1 83.3% 97.8%', accent: '262.1 40% 94%', muted: '262.1 40% 92%', border: '262.1 32% 91%', color: 'hsl(262.1, 83.3%, 57.8%)' },
  { name: 'red', primary: '0 72.2% 50.6%', primaryForeground: '0 84.2% 95.9%', accent: '0 40% 94%', muted: '0 40% 92%', border: '0 32% 91%', color: 'hsl(0, 72.2%, 50.6%)' },
  { name: 'orange', primary: '24.6 95% 53.1%', primaryForeground: '60 9.1% 97.8%', accent: '24.6 40% 94%', muted: '24.6 40% 92%', border: '24.6 32% 91%', color: 'hsl(24.6, 95%, 53.1%)' },
  { name: 'rose', primary: '346.8 77.2% 49.8%', primaryForeground: '355.7 100% 97.3%', accent: '346.8 40% 94%', muted: '346.8 40% 92%', border: '346.8 32% 91%', color: 'hsl(346.8, 77.2%, 49.8%)' },
  { name: 'slate', primary: '215.2 28.2% 26.5%', primaryForeground: '210 40% 98%', accent: '215.2 20% 94%', muted: '215.2 20% 92%', border: '215.2 20% 91%', color: 'hsl(215.2, 28.2%, 26.5%)' },
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
    root.style.setProperty('--muted', theme.muted);
    root.style.setProperty('--border', theme.border);
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
                <div className="flex flex-wrap gap-4">
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
