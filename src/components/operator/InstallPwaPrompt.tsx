'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, ArrowDownToLine, Share, X } from 'lucide-react';
import { useTheme } from 'next-themes';

const PWA_PROMPT_DISMISSED_KEY = 'pwa_prompt_dismissed';

export function InstallPwaPrompt() {
    const [isVisible, setIsVisible] = useState(false);
    const [isIos, setIsIos] = useState(false);
    const { theme } = useTheme();

    useEffect(() => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const dismissed = localStorage.getItem(PWA_PROMPT_DISMISSED_KEY);
        
        if (!isStandalone && !dismissed) {
            const userAgent = window.navigator.userAgent.toLowerCase();
            const isMobile = /iphone|ipad|ipod|android/.test(userAgent);
            
            if (isMobile) {
                setIsIos(/iphone|ipad|ipod/.test(userAgent));
                setIsVisible(true);
            }
        }
    }, []);

    const handleDismiss = () => {
        localStorage.setItem(PWA_PROMPT_DISMISSED_KEY, 'true');
        setIsVisible(false);
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 w-[calc(100%-2rem)] max-w-sm">
            <Card className="shadow-2xl animate-in slide-in-from-bottom-10 fade-in-50 duration-500">
                <button 
                    onClick={handleDismiss} 
                    className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground hover:bg-accent"
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Cerrar</span>
                </button>
                <CardHeader className="flex-row items-center gap-4 pb-2">
                    <div className="p-3 bg-primary/10 text-primary rounded-full">
                         <ArrowDownToLine className="h-6 w-6" />
                    </div>
                    <div>
                        <CardTitle className="text-base">Instalar Aplicación</CardTitle>
                        <CardDescription className="text-xs">Accede más rápido desde tu pantalla de inicio.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="text-sm pt-2">
                    {isIos ? (
                        <p>
                            Para instalar la app, toca el icono de <Share className="inline h-4 w-4 mx-1" />
                            Compartir y luego {' '}
                            <strong className="font-semibold">&apos;Añadir a la pantalla de inicio&apos;</strong>.
                        </p>
                    ) : (
                         <p>
                            Para instalar la app, toca el menú (tres puntos) y luego {' '}
                            <strong className="font-semibold">&apos;Instalar aplicación&apos;</strong>.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
