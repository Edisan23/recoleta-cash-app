'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Smartphone, ArrowDownToLine, Share, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// Define the event type for beforeinstallprompt
interface BeforeInstallPromptEvent extends Event {
    readonly platforms: Array<string>;
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed',
        platform: string
    }>;
    prompt(): Promise<void>;
}

export function InstallPwaPrompt() {
    const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault(); // Prevent the mini-infobar
            setInstallPromptEvent(e as BeforeInstallPromptEvent);
        };
        
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
             window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!installPromptEvent) return;
        installPromptEvent.prompt();
    };

    // Determine if we should show the button
    const isStandalone = isClient && window.matchMedia('(display-mode: standalone)').matches;
    const userAgent = isClient ? window.navigator.userAgent.toLowerCase() : '';
    const isMobile = /iphone|ipad|ipod|android/.test(userAgent);
    
    // Don't show if installed or not on a mobile device
    if (!isClient || isStandalone || !isMobile) {
        return null;
    }

    // If install prompt is available (Android), show the direct install button.
    if (installPromptEvent) {
        return (
             <Button
                onClick={handleInstallClick}
                className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-2xl animate-in slide-in-from-bottom-10 fade-in-50 duration-500"
                size="icon"
            >
                <ArrowDownToLine className="h-6 w-6" />
                <span className="sr-only">Instalar Aplicación</span>
            </Button>
        );
    }

    // If on mobile but no prompt (iOS), show the instructions popover.
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-2xl animate-in slide-in-from-bottom-10 fade-in-50 duration-500"
                    size="icon"
                >
                    <ArrowDownToLine className="h-6 w-6" />
                    <span className="sr-only">Instalar Aplicación</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 mr-4 mb-2">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">Instalar Aplicación</h4>
                        <p className="text-sm text-muted-foreground">
                            Para instalar, toca el icono de <Share className="inline h-4 w-4 mx-1" />
                            y luego {' '}
                            <strong className="font-semibold">&apos;Añadir a la pantalla de inicio&apos;</strong>.
                        </p>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
