'use client';

import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Paintbrush, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

// Defines the structure for CSS variables of a theme
type ThemeProperties = {
  '--background': string;
  '--foreground': string;
  '--card': string;
  '--card-foreground': string;
  '--popover': string;
  '--popover-foreground': string;
  '--primary': string;
  '--primary-foreground': string;
  '--secondary': string;
  '--secondary-foreground': string;
  '--muted': string;
  '--muted-foreground': string;
  '--accent': string;
  '--accent-foreground': string;
  '--border': string;
  '--input': string;
  '--ring': string;
};

// Defines the structure for a complete color theme with light and dark modes
type ColorTheme = {
  name: string;
  color: string; // The raw color for the button swatch
  light: ThemeProperties;
  dark: ThemeProperties;
};

// A list of predefined themes with comprehensive light and dark mode properties
const themes: ColorTheme[] = [
  {
    name: 'blue',
    color: 'hsl(210, 90%, 50%)',
    light: {
      '--background': '210 40% 98%',
      '--foreground': '210 20% 15%',
      '--card': '210 40% 98%',
      '--card-foreground': '210 20% 15%',
      '--popover': '210 40% 98%',
      '--popover-foreground': '210 20% 15%',
      '--primary': '210 90% 50%',
      '--primary-foreground': '210 40% 98%',
      '--secondary': '210 40% 93%',
      '--secondary-foreground': '210 20% 15%',
      '--muted': '210 40% 90%',
      '--muted-foreground': '210 30% 45%',
      '--accent': '210 40% 96%',
      '--accent-foreground': '210 20% 15%',
      '--border': '210 40% 88%',
      '--input': '210 40% 88%',
      '--ring': '210 90% 50%',
    },
    dark: {
      '--background': '210 20% 8%',
      '--foreground': '210 40% 95%',
      '--card': '210 20% 12%',
      '--card-foreground': '210 40% 95%',
      '--popover': '210 20% 8%',
      '--popover-foreground': '210 40% 95%',
      '--primary': '210 90% 50%',
      '--primary-foreground': '210 40% 98%',
      '--secondary': '210 20% 20%',
      '--secondary-foreground': '210 40% 95%',
      '--muted': '210 20% 16%',
      '--muted-foreground': '210 30% 65%',
      '--accent': '210 20% 20%',
      '--accent-foreground': '210 40% 95%',
      '--border': '210 20% 20%',
      '--input': '210 20% 20%',
      '--ring': '210 90% 50%',
    },
  },
  {
    name: 'emerald',
    color: 'hsl(142.1, 76.2%, 36.3%)',
    light: {
      '--background': '142 60% 98%',
      '--foreground': '142 30% 15%',
      '--card': '142 60% 98%',
      '--card-foreground': '142 30% 15%',
      '--popover': '142 60% 98%',
      '--popover-foreground': '142 30% 15%',
      '--primary': '142.1 76.2% 36.3%',
      '--primary-foreground': '142.1 76.2% 96.3%',
      '--secondary': '142 60% 93%',
      '--secondary-foreground': '142 30% 15%',
      '--muted': '142 60% 90%',
      '--muted-foreground': '142 25% 45%',
      '--accent': '142 60% 96%',
      '--accent-foreground': '142 30% 15%',
      '--border': '142 40% 88%',
      '--input': '142 40% 88%',
      '--ring': '142.1 76.2% 36.3%',
    },
    dark: {
      '--background': '142 30% 8%',
      '--foreground': '142 40% 95%',
      '--card': '142 30% 12%',
      '--card-foreground': '142 40% 95%',
      '--popover': '142 30% 8%',
      '--popover-foreground': '142 40% 95%',
      '--primary': '142.1 76.2% 36.3%',
      '--primary-foreground': '142.1 76.2% 96.3%',
      '--secondary': '142 20% 20%',
      '--secondary-foreground': '142 40% 95%',
      '--muted': '142 20% 16%',
      '--muted-foreground': '142 25% 65%',
      '--accent': '142 20% 20%',
      '--accent-foreground': '142 40% 95%',
      '--border': '142 20% 20%',
      '--input': '142 20% 20%',
      '--ring': '142.1 76.2% 36.3%',
    },
  },
  {
    name: 'violet',
    color: 'hsl(262.1, 83.3%, 57.8%)',
    light: {
      '--background': '262 60% 98%',
      '--foreground': '262 30% 15%',
      '--card': '262 60% 98%',
      '--card-foreground': '262 30% 15%',
      '--popover': '262 60% 98%',
      '--popover-foreground': '262 30% 15%',
      '--primary': '262.1 83.3% 57.8%',
      '--primary-foreground': '262.1 83.3% 97.8%',
      '--secondary': '262 60% 93%',
      '--secondary-foreground': '262 30% 15%',
      '--muted': '262 60% 90%',
      '--muted-foreground': '262 25% 45%',
      '--accent': '262 60% 96%',
      '--accent-foreground': '262 30% 15%',
      '--border': '262 40% 88%',
      '--input': '262 40% 88%',
      '--ring': '262.1 83.3% 57.8%',
    },
    dark: {
      '--background': '262 30% 8%',
      '--foreground': '262 40% 95%',
      '--card': '262 30% 12%',
      '--card-foreground': '262 40% 95%',
      '--popover': '262 30% 8%',
      '--popover-foreground': '262 40% 95%',
      '--primary': '262.1 83.3% 57.8%',
      '--primary-foreground': '262.1 83.3% 97.8%',
      '--secondary': '262 20% 20%',
      '--secondary-foreground': '262 40% 95%',
      '--muted': '262 20% 16%',
      '--muted-foreground': '262 25% 65%',
      '--accent': '262 20% 20%',
      '--accent-foreground': '262 40% 95%',
      '--border': '262 20% 20%',
      '--input': '262 20% 20%',
      '--ring': '262.1 83.3% 57.8%',
    },
  },
  {
    name: 'red',
    color: 'hsl(0, 72.2%, 50.6%)',
    light: {
      '--background': '0 60% 98%',
      '--foreground': '0 30% 15%',
      '--card': '0 60% 98%',
      '--card-foreground': '0 30% 15%',
      '--popover': '0 60% 98%',
      '--popover-foreground': '0 30% 15%',
      '--primary': '0 72.2% 50.6%',
      '--primary-foreground': '0 84.2% 95.9%',
      '--secondary': '0 60% 93%',
      '--secondary-foreground': '0 30% 15%',
      '--muted': '0 60% 90%',
      '--muted-foreground': '0 25% 45%',
      '--accent': '0 60% 96%',
      '--accent-foreground': '0 30% 15%',
      '--border': '0 40% 88%',
      '--input': '0 40% 88%',
      '--ring': '0 72.2% 50.6%',
    },
    dark: {
      '--background': '0 30% 8%',
      '--foreground': '0 40% 95%',
      '--card': '0 30% 12%',
      '--card-foreground': '0 40% 95%',
      '--popover': '0 30% 8%',
      '--popover-foreground': '0 40% 95%',
      '--primary': '0 72.2% 50.6%',
      '--primary-foreground': '0 84.2% 95.9%',
      '--secondary': '0 20% 20%',
      '--secondary-foreground': '0 40% 95%',
      '--muted': '0 20% 16%',
      '--muted-foreground': '0 25% 65%',
      '--accent': '0 20% 20%',
      '--accent-foreground': '0 40% 95%',
      '--border': '0 20% 20%',
      '--input': '0 20% 20%',
      '--ring': '0 72.2% 50.6%',
    },
  },
  {
    name: 'orange',
    color: 'hsl(24.6, 95%, 53.1%)',
    light: {
      '--background': '25 60% 98%',
      '--foreground': '25 30% 15%',
      '--card': '25 60% 98%',
      '--card-foreground': '25 30% 15%',
      '--popover': '25 60% 98%',
      '--popover-foreground': '25 30% 15%',
      '--primary': '24.6 95% 53.1%',
      '--primary-foreground': '25 84.2% 95.9%',
      '--secondary': '25 60% 93%',
      '--secondary-foreground': '25 30% 15%',
      '--muted': '25 60% 90%',
      '--muted-foreground': '25 25% 45%',
      '--accent': '25 60% 96%',
      '--accent-foreground': '25 30% 15%',
      '--border': '25 40% 88%',
      '--input': '25 40% 88%',
      '--ring': '24.6 95% 53.1%',
    },
    dark: {
      '--background': '25 30% 8%',
      '--foreground': '25 40% 95%',
      '--card': '25 30% 12%',
      '--card-foreground': '25 40% 95%',
      '--popover': '25 30% 8%',
      '--popover-foreground': '25 40% 95%',
      '--primary': '24.6 95% 53.1%',
      '--primary-foreground': '25 84.2% 95.9%',
      '--secondary': '25 20% 20%',
      '--secondary-foreground': '25 40% 95%',
      '--muted': '25 20% 16%',
      '--muted-foreground': '25 25% 65%',
      '--accent': '25 20% 20%',
      '--accent-foreground': '25 40% 95%',
      '--border': '25 20% 20%',
      '--input': '25 20% 20%',
      '--ring': '24.6 95% 53.1%',
    },
  },
  {
    name: 'rose',
    color: 'hsl(346.8, 77.2%, 49.8%)',
    light: {
      '--background': '347 60% 98%',
      '--foreground': '347 30% 15%',
      '--card': '347 60% 98%',
      '--card-foreground': '347 30% 15%',
      '--popover': '347 60% 98%',
      '--popover-foreground': '347 30% 15%',
      '--primary': '346.8 77.2% 49.8%',
      '--primary-foreground': '347 84.2% 95.9%',
      '--secondary': '347 60% 93%',
      '--secondary-foreground': '347 30% 15%',
      '--muted': '347 60% 90%',
      '--muted-foreground': '347 25% 45%',
      '--accent': '347 60% 96%',
      '--accent-foreground': '347 30% 15%',
      '--border': '347 40% 88%',
      '--input': '347 40% 88%',
      '--ring': '346.8 77.2% 49.8%',
    },
    dark: {
      '--background': '347 30% 8%',
      '--foreground': '347 40% 95%',
      '--card': '347 30% 12%',
      '--card-foreground': '347 40% 95%',
      '--popover': '347 30% 8%',
      '--popover-foreground': '347 40% 95%',
      '--primary': '346.8 77.2% 49.8%',
      '--primary-foreground': '347 84.2% 95.9%',
      '--secondary': '347 20% 20%',
      '--secondary-foreground': '347 40% 95%',
      '--muted': '347 20% 16%',
      '--muted-foreground': '347 25% 65%',
      '--accent': '347 20% 20%',
      '--accent-foreground': '347 40% 95%',
      '--border': '347 20% 20%',
      '--input': '347 20% 20%',
      '--ring': '346.8 77.2% 49.8%',
    },
  },
  {
    name: 'slate',
    color: 'hsl(215.2, 28.2%, 26.5%)',
    light: {
      '--background': '215 30% 98%',
      '--foreground': '215 30% 15%',
      '--card': '215 30% 98%',
      '--card-foreground': '215 30% 15%',
      '--popover': '215 30% 98%',
      '--popover-foreground': '215 30% 15%',
      '--primary': '215.2 28.2% 26.5%',
      '--primary-foreground': '215 40% 98%',
      '--secondary': '215 30% 93%',
      '--secondary-foreground': '215 30% 15%',
      '--muted': '215 30% 90%',
      '--muted-foreground': '215 25% 45%',
      '--accent': '215 30% 96%',
      '--accent-foreground': '215 30% 15%',
      '--border': '215 20% 88%',
      '--input': '215 20% 88%',
      '--ring': '215.2 28.2% 26.5%',
    },
    dark: {
      '--background': '215 28.2% 12.5%',
      '--foreground': '215 20% 95%',
      '--card': '215 28.2% 16.5%',
      '--card-foreground': '215 20% 95%',
      '--popover': '215 28.2% 12.5%',
      '--popover-foreground': '215 20% 95%',
      '--primary': '215 40% 98%',
      '--primary-foreground': '215.2 28.2% 26.5%',
      '--secondary': '215 20% 25%',
      '--secondary-foreground': '215 20% 95%',
      '--muted': '215 20% 21%',
      '--muted-foreground': '215 25% 65%',
      '--accent': '215 20% 25%',
      '--accent-foreground': '215 20% 95%',
      '--border': '215 20% 25%',
      '--input': '215 20% 25%',
      '--ring': '215 20% 95%',
    },
  },
];

/** A component that injects the selected theme's CSS variables into a <style> tag. */
const ThemeStyle = ({ theme }: { theme: ColorTheme }) => {
  const css = `
    :root {
      ${Object.entries(theme.light).map(([key, value]) => `${key}: ${value};`).join('\n')}
    }
    .dark {
      ${Object.entries(theme.dark).map(([key, value]) => `${key}: ${value};`).join('\n')}
    }
  `;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
};

export function ThemeCustomizer() {
  const [mounted, setMounted] = useState(false);
  const [activeTheme, setActiveTheme] = useState<ColorTheme | null>(null);

  // Apply the theme by setting it in state and saving to localStorage
  const applyTheme = (theme: ColorTheme) => {
    localStorage.setItem('color-theme', theme.name);
    setActiveTheme(theme);
  };

  // On component mount, load the saved theme from localStorage or use the default
  useEffect(() => {
    setMounted(true);
    const storedThemeName = localStorage.getItem('color-theme');
    const savedTheme = themes.find(t => t.name === storedThemeName);
    setActiveTheme(savedTheme || themes[0]); // Default to the first theme
  }, []);

  // Avoid rendering on the server to prevent hydration mismatches
  if (!mounted) {
    return null;
  }

  return (
    <>
      {activeTheme && <ThemeStyle theme={activeTheme} />}
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
                          const isActive = activeTheme?.name === theme.name;
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
    </>
  );
}
